import React, { useState } from 'react'
import { applyCanonicalGameContext, finalizeCanonicalB2B } from './gameContext'
import { makeTotal } from './topPicksRows'
import { annotateMarketGame, compareMarketGames } from './topPicksRanking'
import { renderTotalModelCell } from './modelResultCells'
import { getTotalModelLineState } from './modelLineOptions'
import {
  buildTotalOptions,
  getClosestValue,
  getOptionState,
  renderMarketLinePicker,
  renderQuoteCell,
  renderTotalPickerValue,
  renderTotalQuoteSummary,
} from './quotePresentation'
import { renderContextCell, renderMatchupCell, renderSignalPickCell, renderSupportCell } from './tablePresentation'
import { anyVisibleLaneLoading } from './laneState'
function TotalsTable({ playerdeep = [], possession = [], fourfactor = [], ensemble = [], laneStates = {} }) {
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
    if (!t || t === 'tbd' || t === 'upcoming') return false
    if (t.includes('pm et') || t.includes('am et')) return false
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    if (g.game_date && g.game_date > today) return false
    return true
  }

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const etDateStr = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) }
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
      poss: makeTotal(g.possession),
      pd: makeTotal(g.playerdeep),
      ff: makeTotal(g.fourfactor),
    })).map(g => annotateMarketGame(g, 'total', {
      signal: g.possession?.ou_signal || 'PASS',
      conviction: g.possession?.conviction_score ?? 0,
    })).sort((a, b) => {
      if ((a.game_date || today) !== (b.game_date || today)) return (a.game_date || today).localeCompare(b.game_date || today)
      return compareMarketGames(a, b)
    })

    if (games.length === 0) return <div className="empty">{anyVisibleLaneLoading(laneStates) ? 'Building totals board…' : 'No totals data available.'}</div>

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="summary-note" style={{ flexShrink: 0, padding: '0 0 8px' }}>
          Model predicted total vs Vegas O/U. <strong>Positive edge</strong> = model says Over; <strong>negative</strong> = Under. <strong>Support</strong> = Decision-layer signal plus model agreement count. Layer view: Possession = live game model, Player Deep = context, Four-Factor = factor.
        </div>
        <div className="table-container">
          <table className="predictions-table summary-table summary-table--core">
            <thead><tr>
              <th className="col-rank">#</th>
              <th className="col-matchup sticky-col">Matchup</th>
              <th className="col-time">Time</th>
              <th className="col-pick">Signal</th>
              <th className="col-support">Support</th>
              <th className="col-context" title="Context flags: tank ⚰️, sharp ⚡, B2B 😩, injury 🚑">Context</th>
              <th className="col-vegas">Vegas</th>
              <th className="col-kp" title="Kalshi quote view. Top = selected line; bottom = over / under asks.">K</th>
              <th className="col-kp" title="Polymarket quote view. Top = selected line; bottom = over / under asks.">P</th>
              <th className="col-model" style={{ opacity: 0.5 }} title="XGBoost shadow model — not yet active.">XGB</th>
              <th className="col-model" style={{ opacity: 0.5 }} title="Random Forest shadow model — not yet active.">RF</th>
              <th className="col-model" title="Possession layer: deepest live game model and default pick source.">Possession</th>
              <th className="col-model" title="Context layer: Player Deep, built from lineup, rotation, and matchup context.">Player Deep</th>
              <th className="col-model" title="Factor layer: Four-Factor matchup model using eFG%, TOV%, ORB%, and FTR.">Four-Factor</th>
            </tr></thead>
            <tbody>
              {games.map((g, idx) => {
                const ref = g.poss || g.pd || g.ff
                const bestEdge = g.poss?.edge ?? g.pd?.edge ?? g.ff?.edge ?? 0
                const pick = bestEdge > 0 ? 'OVER' : 'UNDER'
                const ouSig = g.possession?.ou_signal || 'PASS'
                const circle = ouSig === 'BET' ? '🟢' : ouSig === 'MONITOR' ? '🟡' : '⚪'
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
                        pick,
                        emoji: circle,
                      })}
                      {(() => {
                        const sig = g.possession?.ou_signal || 'PASS'
                        const ouIsOver = pick === 'OVER'
                        let ouAgree = 0
                        for (const mk of ['possession', 'playerdeep', 'fourfactor']) {
                          const mp = g[mk]
                          if (!mp || mp.avg_total == null || mp.vegas_total == null) continue
                          if ((mp.avg_total > mp.vegas_total) === ouIsOver) ouAgree++
                        }
                        return renderSupportCell({
                          signal: sig,
                          agreementText: `${ouAgree}/3 agree`,
                        })
                      })()}
                      {(() => {
                        const p = g.possession
                        const flags = []
                        if (p?.tank_signal) flags.push(<span key="tank" title="Tanking team involved">⚰️</span>)
                        if (p?.sharp_move && p?.sharp_side === (g.possession?.best_side || g.playerdeep?.best_side)) flags.push(<span key="sharp" title={`Sharp agrees: on ${p.sharp_side}`}>⚡</span>)
                        if (g.home_b2b || g.away_b2b) flags.push(<span key="b2b" title={`${g.home_b2b ? g.home_team : g.away_team} B2B`}>😩</span>)
                        if (p?.home_stars_out >= 1 || p?.away_stars_out >= 1) flags.push(<span key="inj" title="Key player(s) out">🚑</span>)
                        return renderContextCell(flags)
                      })()}
                      <td className="vegas-cell" style={{ textAlign: 'center' }}>
                        {ref?.vegasTotal != null
                          ? <span className="vegas-pct">{ref.vegasTotal.toFixed(1)}</span>
                          : <span className="dim">—</span>}
                      </td>
                      {/* K / P columns */}
                      {(() => {
                        const poss = g.possession
                        const vegTotal = ref?.vegasTotal
                        const rowKey = g.game_id || `${g.away_team}@${g.home_team}`
                        const kKey = `${rowKey}:k`
                        const pKey = `${rowKey}:p`
                        const kOptions = buildTotalOptions(poss?.kalshi_markets)
                        const pOptions = buildTotalOptions((Array.isArray(poss?.poly_markets) ? poss.poly_markets : []).filter(m => !m.question?.includes('1H')))
                        const defaultKLine = getClosestValue(kOptions, vegTotal, option => option.line)
                        const defaultPLine = getClosestValue(pOptions, vegTotal, option => option.line)
                        const { index: kIndex, selection: kSel } = getOptionState(kOptions, selectedLines[kKey], defaultKLine, option => option.line)
                        const { index: pIndex, selection: pSel } = getOptionState(pOptions, selectedLines[pKey], defaultPLine, option => option.line)
                        const kWide = kSel?.overAsk != null && kSel?.underAsk != null && ((kSel.overAsk + kSel.underAsk) >= 1.10)
                        const pWide = pSel?.overAsk != null && pSel?.underAsk != null && ((pSel.overAsk + pSel.underAsk) >= 1.10)
                        const kTop = kSel ? renderMarketLinePicker({
                          variant: 'kalshi',
                          value: renderTotalPickerValue(ref, kSel.line),
                          onPrev: () => kIndex > 0 && setSelectedLines(prev => ({ ...prev, [kKey]: kOptions[kIndex - 1].line })),
                          onNext: () => kIndex >= 0 && kIndex < kOptions.length - 1 && setSelectedLines(prev => ({ ...prev, [kKey]: kOptions[kIndex + 1].line })),
                          prevDisabled: kIndex <= 0,
                          nextDisabled: kIndex < 0 || kIndex >= kOptions.length - 1,
                          prevLabel: 'Previous Kalshi total line',
                          nextLabel: 'Next Kalshi total line',
                        }) : null
                        const pTop = pSel ? renderMarketLinePicker({
                          variant: 'poly',
                          value: renderTotalPickerValue(ref, pSel.line),
                          onPrev: () => pIndex > 0 && setSelectedLines(prev => ({ ...prev, [pKey]: pOptions[pIndex - 1].line })),
                          onNext: () => pIndex >= 0 && pIndex < pOptions.length - 1 && setSelectedLines(prev => ({ ...prev, [pKey]: pOptions[pIndex + 1].line })),
                          prevDisabled: pIndex <= 0,
                          nextDisabled: pIndex < 0 || pIndex >= pOptions.length - 1,
                          prevLabel: 'Previous Polymarket total line',
                          nextLabel: 'Next Polymarket total line',
                        }) : null

                        return (<>
                          {renderQuoteCell(
                            kTop,
                            renderTotalQuoteSummary(kSel),
                            kWide ? '#b388ff' : '#666',
                            kWide
                          )}
                          {renderQuoteCell(
                            pTop,
                            renderTotalQuoteSummary(pSel),
                            pWide ? '#4a9eff' : '#666',
                            pWide
                          )}
                        </>)
                      })()}
                      {(() => {
                        const rowKey = g.game_id || `${g.away_team}@${g.home_team}`
                        const modelKey = `${rowKey}:model-total`
                        const modelState = getTotalModelLineState(g, ref, selectedLines[modelKey])
                        const modelLineControl = {
                          ...modelState,
                          onPrev: () => modelState.index > 0 && setSelectedLines(prev => ({ ...prev, [modelKey]: modelState.options[modelState.index - 1].selectionKey })),
                          onNext: () => modelState.index >= 0 && modelState.index < modelState.options.length - 1 && setSelectedLines(prev => ({ ...prev, [modelKey]: modelState.options[modelState.index + 1].selectionKey })),
                          prevDisabled: modelState.index <= 0,
                          nextDisabled: modelState.index < 0 || modelState.index >= modelState.options.length - 1,
                        }
                        return <>
                          <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
                          <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
                          {renderTotalModelCell(g.poss, g.possession, 'Possession', modelLineControl, laneStates.possession)}
                          {renderTotalModelCell(g.pd, g.playerdeep, 'Player Deep', modelLineControl, laneStates.playerdeep)}
                          {renderTotalModelCell(g.ff, g.fourfactor, 'Four-Factor', modelLineControl, laneStates.fourfactor)}
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

export default TotalsTable
