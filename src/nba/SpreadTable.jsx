import React, { useState } from 'react'
import { applyCanonicalGameContext, finalizeCanonicalB2B } from './gameContext'
import { makeSpread } from './topPicksRows'
import { annotateMarketGame, compareMarketGames } from './topPicksRanking'
import { renderSpreadModelCell } from './modelResultCells'
import { getSpreadModelLineState } from './modelLineOptions'
import {
  buildPolySpreadOptions,
  buildSpreadOptions,
  getClosestValue,
  getOptionState,
  renderMarketLinePicker,
  renderQuoteCell,
  renderSpreadPickerValue,
  renderSpreadQuoteSummary,
} from './quotePresentation'
import { renderContextCell, renderMatchupCell, renderSignalPickCell, renderSupportCell } from './tablePresentation'
import { anyVisibleLaneLoading } from './laneState'

function getCanonicalSignal(possession, pickIsTanker) {
  // Spread tab: use spread signal only (capped at MONITOR for tankers)
  if (!possession) return { sig: 'PASS', emoji: '⚪' }
  const sig = pickIsTanker ? 'MONITOR' : (possession.signal || 'PASS')
  const emoji = sig === 'BET' ? '🟢' : sig === 'MONITOR' ? '🟡' : '⚪'
  return { sig, emoji }
}

function SpreadTable({ playerdeep = [], possession = [], fourfactor = [], ensemble = [], laneStates = {} }) {
  const [selectedLines, setSelectedLines] = useState({})
  const gameMap = {}

  const addToMap = (preds, key) => {
    for (const p of preds) {
      if (!gameMap[p.game_id]) {
        gameMap[p.game_id] = {
          game_id: p.game_id, matchup: p.matchup,
          home_team: p.home_team, away_team: p.away_team,
          game_date: p.game_date,
          home_b2b: p.home_b2b, away_b2b: p.away_b2b,
          home_stars_out: p.home_stars_out, away_stars_out: p.away_stars_out,
          home_starters_out: p.home_starters_out, away_starters_out: p.away_starters_out,
          home_rotation_out: p.home_rotation_out, away_rotation_out: p.away_rotation_out,
          home_record: p.home_record, away_record: p.away_record,
        }
      }
      const g = gameMap[p.game_id]
      applyCanonicalGameContext(g, p)
      gameMap[p.game_id][key] = p
    }
  }

  addToMap(playerdeep, 'playerdeep')
  addToMap(possession, 'possession')
  addToMap(fourfactor, 'fourfactor')
  for (const e of ensemble) {
    if (e.game_id && gameMap[e.game_id]) {
      gameMap[e.game_id].ensemble = e
    }
  }

  const isLiveOrCompleted = (g) => {
    const t = (g.game_time || '').trim().toLowerCase()
    if (t.includes('pm et') || t.includes('am et')) return false
    const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    if (g.game_date && g.game_date > todayET) return false
    if (t && t.length > 0) return true
    return false
  }

  // Use ET (America/New_York) for date labels — avoids UTC midnight shift
  const etDateStr = (offset = 0) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) // YYYY-MM-DD
  }
  const today = etDateStr(0)
  const tomorrowStr = etDateStr(1)
  const dateLabel = (d) => {
    if (!d || d === today) return 'Today'
    if (d === tomorrowStr) return 'Tomorrow'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }).toUpperCase()
  }

  // ── PRIMARY VIEW: show all 3 models in columns ──────────────────────────────────
  {
    const games = Object.values(gameMap).map(finalizeCanonicalB2B).filter(g => {
      if (isLiveOrCompleted(g)) return false
      return !!(g.possession || g.playerdeep || g.fourfactor)
    }).map(g => ({
      ...g,
      poss: makeSpread(g.possession, g),
      pd: makeSpread(g.playerdeep, g),
      ff: makeSpread(g.fourfactor, g),
    })).map(g => {
      const coverPick = (g.poss?.edge ?? g.pd?.edge ?? g.ff?.edge ?? 0) > 0 ? g.home_team : g.away_team
      const isTanker = g.possession?.tank_signal && (
        (coverPick === g.home_team && g.possession?.home_rest_risk === 'HIGH') ||
        (coverPick === g.away_team && g.possession?.away_rest_risk === 'HIGH')
      )
      const { sig } = getCanonicalSignal(g.possession, isTanker)
      return annotateMarketGame(g, 'spread', { signal: sig, conviction: g.possession?.conviction_score ?? 0 })
    }).sort((a, b) => {
      if ((a.game_date || today) !== (b.game_date || today)) return (a.game_date || today).localeCompare(b.game_date || today)
      return compareMarketGames(a, b)
    })

    if (games.length === 0) return <div className="empty">{anyVisibleLaneLoading(laneStates) ? 'Building spread board…' : 'No spread data available.'}</div>

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="summary-note" style={{ flexShrink: 0, padding: '0 0 8px' }}>
          Model predicted spread vs Vegas. <strong>TEAM -X</strong> = favorite by X pts. Edge = pts the model disagrees with Vegas. <strong>Support</strong> = Decision-layer signal plus model agreement count. Layer view: Possession = live game model, Player Deep = context, Four-Factor = factor.
        </div>
        <div className="table-container">
          <table className="predictions-table summary-table summary-table--core">
            <thead><tr>
              <th className="col-rank">#</th>
              <th className="col-matchup sticky-col">Matchup</th>
              <th className="col-time">Time</th>
              <th className="col-pick">Signal</th>
              <th className="col-support">Support</th>
              <th className="col-context" title="Context flags: tank ⚰️ = tanking team involved, sharp ⚡ = sharp money detected, B2B = back-to-back, inj 🚑 = key injuries, split = models disagree">Context</th>
              <th className="col-vegas">Vegas</th>
              <th className="col-kp" title="Kalshi quote view. Top = selected line; bottom = cover/fade asks.">K</th>
              <th className="col-kp" title="Polymarket quote view. Top = selected line; bottom = cover/fade asks.">P</th>
              <th className="col-model" style={{ opacity: 0.5 }} title="XGBoost shadow model — not yet active. Will override possession when trained on 500+ games.">XGB</th>
              <th className="col-model" style={{ opacity: 0.5 }} title="Random Forest shadow model — not yet active.">RF</th>
              <th className="col-model" title="Possession layer: deepest live game model and default pick source.">Possession</th>
              <th className="col-model" title="Context layer: Player Deep, built from lineup-level analysis, rotations, and matchup context.">Player Deep</th>
              <th className="col-model" title="Factor layer: Four-Factor matchup model using eFG%, TOV%, ORB%, and FTR.">Four-Factor</th>
            </tr></thead>
            <tbody>
              {games.map((g, idx) => {
                const ref = g.poss || g.pd || g.ff
                const vegasSource = g.possession?.vegas_source ?? g.playerdeep?.vegas_source ?? g.fourfactor?.vegas_source
                const bestEdge = g.poss?.edge ?? g.pd?.edge ?? g.ff?.edge ?? 0
                const coverPick = bestEdge > 0 ? g.home_team : g.away_team
                const pickIsTanker = g.possession?.tank_signal && (
                  (coverPick === g.home_team && g.possession?.home_rest_risk === 'HIGH') ||
                  (coverPick === g.away_team && g.possession?.away_rest_risk === 'HIGH')
                )
                const { emoji: circle } = getCanonicalSignal(g.possession, pickIsTanker)
                const gDate = g.game_date || today
                const prevDate = idx > 0 ? (games[idx - 1].game_date || today) : null
                const showDate = gDate !== prevDate
                return (
                  <>
                    {showDate && <tr key={`d-${gDate}`} className="date-header-row"><td colSpan={14} className="date-header-cell">{dateLabel(gDate)}</td></tr>}
                    <tr key={g.game_id} className="prediction-row">
                      <td className="rank-cell">{idx + 1}</td>
                      <td className="matchup-cell sticky-col">{renderMatchupCell(g)}</td>
                      <td className="time-cell">{g.game_time ?? '—'}</td>
                      {renderSignalPickCell({
                        pick: coverPick,
                        emoji: circle,
                        badges: [
                          pickIsTanker ? { key: 'tank', title: 'Picked team is tanking', icon: '⚰️' } : null,
                          g.possession?.sharp_move && g.possession?.sharp_side === (g.possession?.best_side || g.playerdeep?.best_side)
                            ? { key: 'sharp', title: `Sharp agrees: ${g.possession.sharp_side}`, icon: '⚡' }
                            : null,
                        ].filter(Boolean),
                      })}
                      {(() => {
                        const { sig: effectiveSig } = getCanonicalSignal(g.possession, pickIsTanker)
                        const coverIsHome = coverPick === g.home_team
                        let spreadAgree = 0
                        for (const modelKey of ['possession', 'playerdeep', 'fourfactor']) {
                          const mp = g[modelKey]
                          if (!mp || mp.avg_margin == null) continue
                          const modelFavorsHome = mp.avg_margin > 0
                          if (modelFavorsHome === coverIsHome) spreadAgree++
                        }
                        return renderSupportCell({
                          signal: effectiveSig,
                          agreementText: `${spreadAgree}/3 agree`,
                        })
                      })()}
                      {(() => {
                        const p = g.possession
                        const flags = []
                        if (p?.tank_signal) flags.push(<span key="tank" title="Tanking team involved — model may underestimate effort gap">⚰️</span>)
                        if (p?.sharp_move && p?.sharp_side === (g.possession?.best_side || g.playerdeep?.best_side)) flags.push(<span key="sharp" title={`Sharp agrees: on ${p.sharp_side}`}>⚡</span>)
                        if (g.home_b2b || g.away_b2b) flags.push(<span key="b2b" title={`${g.home_b2b ? g.home_team : g.away_team} back-to-back`}>😩</span>)
                        if (p?.home_stars_out >= 1 || p?.away_stars_out >= 1) flags.push(<span key="inj" title="Key player(s) out">🚑</span>)
                        if (p?.zigzag_signal) flags.push(<span key="zig" title="Zigzag pattern: team on loss streak, often bounces back vs spread">↩️</span>)
                        const ffp = g.ff; const posp = g.poss
                        if (ffp && posp && ffp.modelFav && posp.modelFav && ffp.modelFav !== posp.modelFav) {
                          flags.push(<span key="split" className="top-picks-context-text" title="Possession and Four-Factor disagree on favorite — treat with caution">split</span>)
                        }
                        return renderContextCell(flags)
                      })()}
                      <td className="vegas-cell" style={{ textAlign: 'center' }}>
                        {ref?.vegasFav
                          ? <span className="vegas-pct" title={vegasSource ? `Source: ${vegasSource}` : undefined}>{ref.vegasFav} -{ref.vegasSpreadAbs?.toFixed(1)}</span>
                          : <span className="dim">—</span>}
                      </td>
                      {(() => {
                        const poss = g.possession
                        const rowKey = g.game_id || `${g.away_team}@${g.home_team}`
                        const kKey = `${rowKey}:k`
                        const pKey = `${rowKey}:p`
                        const targetLine = -(ref?.vegasSpreadAbs ?? 0)

                        const favoriteTeam = ref?.vegasFav || coverPick
                        const kOptions = buildSpreadOptions(poss?.kalshi_markets, g, favoriteTeam)
                        const pOptions = buildPolySpreadOptions(poss?.poly_markets, g, favoriteTeam)

                        const defaultKLine = getClosestValue(kOptions, targetLine, option => option.signedLine)
                        const defaultPLine = getClosestValue(pOptions, targetLine, option => option.line)
                        const { index: kIndex, selection: kSel } = getOptionState(kOptions, selectedLines[kKey], defaultKLine, option => option.signedLine)
                        const { index: pIndex, selection: pSel } = getOptionState(pOptions, selectedLines[pKey], defaultPLine, option => option.line)
                        const kWide = kSel?.coverAsk != null && kSel?.fadeAsk != null && ((kSel.coverAsk + kSel.fadeAsk) >= 1.10)
                        const pWide = pSel?.coverAsk != null && pSel?.fadeAsk != null && ((pSel.coverAsk + pSel.fadeAsk) >= 1.10)

                        const kTop = kSel ? renderMarketLinePicker({
                          variant: 'kalshi',
                          value: renderSpreadPickerValue(ref, coverPick, kSel, kSel.signedLine),
                          onPrev: () => kIndex > 0 && setSelectedLines(prev => ({ ...prev, [kKey]: kOptions[kIndex - 1].signedLine })),
                          onNext: () => kIndex >= 0 && kIndex < kOptions.length - 1 && setSelectedLines(prev => ({ ...prev, [kKey]: kOptions[kIndex + 1].signedLine })),
                          prevDisabled: kIndex <= 0,
                          nextDisabled: kIndex < 0 || kIndex >= kOptions.length - 1,
                          prevLabel: 'Previous Kalshi spread line',
                          nextLabel: 'Next Kalshi spread line',
                        }) : null
                        const pTop = pSel ? renderMarketLinePicker({
                          variant: 'poly',
                          value: renderSpreadPickerValue(ref, coverPick, pSel, pSel.line),
                          onPrev: () => pIndex > 0 && setSelectedLines(prev => ({ ...prev, [pKey]: pOptions[pIndex - 1].line })),
                          onNext: () => pIndex >= 0 && pIndex < pOptions.length - 1 && setSelectedLines(prev => ({ ...prev, [pKey]: pOptions[pIndex + 1].line })),
                          prevDisabled: pIndex <= 0,
                          nextDisabled: pIndex < 0 || pIndex >= pOptions.length - 1,
                          prevLabel: 'Previous Polymarket spread line',
                          nextLabel: 'Next Polymarket spread line',
                        }) : null

                        return <>
                          {renderQuoteCell(
                            kTop,
                            renderSpreadQuoteSummary(kSel),
                            kWide ? '#b388ff' : '#666',
                            kWide
                          )}
                          {renderQuoteCell(
                            pTop,
                            renderSpreadQuoteSummary(pSel),
                            pWide ? '#4a9eff' : '#666',
                            pWide
                          )}
                        </>
                      })()}
                      {(() => {
                        const rowKey = g.game_id || `${g.away_team}@${g.home_team}`
                        const modelKey = `${rowKey}:model-spread`
                        const modelState = getSpreadModelLineState(g, ref, coverPick, selectedLines[modelKey])
                        const modelLineControl = {
                          ...modelState,
                          onPrev: () => modelState.index > 0 && setSelectedLines(prev => ({ ...prev, [modelKey]: modelState.options[modelState.index - 1].selectionKey })),
                          onNext: () => modelState.index >= 0 && modelState.index < modelState.options.length - 1 && setSelectedLines(prev => ({ ...prev, [modelKey]: modelState.options[modelState.index + 1].selectionKey })),
                          prevDisabled: modelState.index <= 0,
                          nextDisabled: modelState.index < 0 || modelState.index >= modelState.options.length - 1,
                        }
                        return <>
                          {/* XGB / RF shadow columns — not yet active on NBA */}
                          <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
                          <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
                          {renderSpreadModelCell(g.poss, g.possession, 'Possession', modelLineControl, laneStates.possession)}
                          {renderSpreadModelCell(g.pd, g.playerdeep, 'Player Deep', modelLineControl, laneStates.playerdeep)}
                          {renderSpreadModelCell(g.ff, g.fourfactor, 'Four-Factor', modelLineControl, laneStates.fourfactor)}
                        </>
                      })()}
                    </tr>
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

}

export default SpreadTable
