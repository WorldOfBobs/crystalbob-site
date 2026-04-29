import React, { useMemo } from 'react'
import { applyCanonicalGameContext, finalizeCanonicalB2B } from './gameContext'
import { getMlModelCellData, getPresentationMlPick, getPresentationMlRefs, renderMlModelCell } from './mlPresentation'
import { annotateMarketGame, compareMarketGames } from './topPicksRanking'
import { hasSignificantInjury, renderMatchupCell, renderSignalPickCell, renderSupportCell } from './tablePresentation'
import { anyVisibleLaneLoading } from './laneState'

function getCanonicalSignal(possession, pickIsTanker) {
  if (!possession) return { sig: 'PASS', emoji: '⚪' }
  const spreadSig = pickIsTanker ? 'MONITOR' : (possession.signal || 'PASS')
  const ouSig = pickIsTanker ? null : (possession.ou_signal || 'PASS')
  const effectiveSig = (spreadSig === 'BET' || ouSig === 'BET') ? 'BET'
    : (spreadSig === 'MONITOR' || ouSig === 'MONITOR') ? 'MONITOR'
    : 'PASS'
  const emoji = effectiveSig === 'BET' ? '🟢'
    : effectiveSig === 'MONITOR' ? '🟡'
    : '⚪'
  return { sig: effectiveSig, emoji }
}

function SummaryTable({ playerdeep = [], possession = [], fourfactor = [], ensemble = [], laneStates = {} }) {

  const games = useMemo(() => {
    const gameMap = {}
    const addToMap = (preds, key) => {
      for (const p of preds) {
        if (!gameMap[p.game_id]) {
          gameMap[p.game_id] = {
            game_id: p.game_id,
            matchup: p.matchup,
            home_team: p.home_team,
            away_team: p.away_team,
            home_b2b: p.home_b2b,
            away_b2b: p.away_b2b,
            game_date: p.game_date,
            home_record: p.home_record,
            away_record: p.away_record,
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
    return Object.values(gameMap).map(finalizeCanonicalB2B)
  }, [playerdeep, possession, fourfactor, ensemble])

  // Use ET for date labels
  const etDateStr = (offset = 0) => {
    const d = new Date()
    d.setDate(d.getDate() + offset)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  }
  const today = etDateStr(0)
  const tomorrowStr = etDateStr(1)
  const dateLabel = (d) => {
    if (!d || d === today) return 'Today'
    if (d === tomorrowStr) return 'Tomorrow'
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }).toUpperCase()
  }

  const isLiveOrCompleted = (g) => {
    const t = (g.game_time || '').trim().toLowerCase()
    if (!t || t === 'tbd' || t === 'upcoming') return false
    if (t.includes('pm et') || t.includes('am et')) return false
    if (g.game_date && g.game_date > today) return false
    return true
  }

  const filtered = games.filter(g => {
    if (!g.playerdeep && !g.possession && !g.fourfactor) return false
    if (isLiveOrCompleted(g)) return false
    return true
  }).map(g => {
    const refs = getPresentationMlRefs(g)
    const pick = getPresentationMlPick(g, refs)
    const pickIsTanker = g.possession?.tank_signal && (
      (pick === g.home_team && g.possession?.home_rest_risk === 'HIGH') ||
      (pick === g.away_team && g.possession?.away_rest_risk === 'HIGH')
    )
    const { sig } = getCanonicalSignal(g.possession, pickIsTanker)
    return annotateMarketGame(g, 'ml', {
      signal: sig,
      conviction: g.possession?.conviction_score ?? 0,
    })
  })

  filtered.sort((a, b) => {
    const da = a.game_date || today
    const db = b.game_date || today
    if (da !== db) return da.localeCompare(db)
    return compareMarketGames(a, b)
  })

  const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : '—'

  const renderModelSupportCell = (g, pickIsTanker) => {
    const agree = g.marketRanking?.support
    const conf = g.ensemble?.ensemble_confidence
    const { sig: effectiveSig } = getCanonicalSignal(g.possession, pickIsTanker)
    return renderSupportCell({
      signal: effectiveSig,
      confidence: conf,
      agreementText: agree != null ? `${agree}/3 agree${agree >= 3 ? ' · strong' : ''}` : '—',
    })
  }

  if (filtered.length === 0) {
    return <div className="empty">{anyVisibleLaneLoading(laneStates) ? 'Building summary board…' : 'No positive-edge games found across any model.'}</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="summary-note" style={{ flexShrink: 0, padding: '0 0 8px' }}>
        All upcoming games, sorted by <strong>Possession</strong> edge. Each model column shows the picked side’s <strong>win %</strong> and <strong>edge vs Vegas</strong>. <strong>Support</strong> combines the decision signal with live-model agreement so you can scan conviction faster.
      </div>
      <div className="table-container">
      <table className="predictions-table summary-table">
        <thead>
          <tr>
            <th className="col-rank">#</th>
            <th className="col-matchup sticky-col">Matchup</th>
            <th className="col-time">Time</th>
            <th className="col-pick">Signal</th>
            <th className="col-vegas">Vegas</th>
            <th className="col-model" title="Decision layer: ensemble/support logic that turns model output into signal strength.">Support</th>
            <th className="col-model" title="Possession layer: deepest live game model and default pick source.">Possession</th>
            <th className="col-model" title="Context layer: Player Deep, built from lineup, rotation, and matchup context.">Player Deep</th>
            <th className="col-model" title="Factor layer: Four-Factor matchup model using eFG%, TOV%, ORB%, and FTR.">Four-Factor</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((g, idx) => {
            const pick = getPresentationMlPick(g)
            const aCell = getMlModelCellData(g.playerdeep, pick, g)
            const pCell = getMlModelCellData(g.possession, pick, g)
            const fCell = getMlModelCellData(g.fourfactor, pick, g)

            const ref = g.possession || g.playerdeep || g.fourfactor
            const isPickHome = pick === g.home_team

            // Pick cell logic
            const pickIsTanker = g.possession?.tank_signal && (
              (pick === g.home_team && g.possession?.home_rest_risk === 'HIGH') ||
              (pick === g.away_team && g.possession?.away_rest_risk === 'HIGH')
            )
            const { emoji: circle } = getCanonicalSignal(g.possession, pickIsTanker)
            const conv = g.possession?.conviction_score || 0

            // Injury flag for pick cell
            const pickSide = isPickHome ? 'home' : 'away'
            const pickStarsOut = ref?.[`${pickSide}_stars_out`] ?? g[`${pickSide}_stars_out`] ?? 0
            const pickStartersOut = ref?.[`${pickSide}_starters_out`] ?? g[`${pickSide}_starters_out`] ?? 0
            const pickRotOut = ref?.[`${pickSide}_rotation_out`] ?? g[`${pickSide}_rotation_out`] ?? 0
            const pickHasInj = hasSignificantInjury(pickStarsOut, pickStartersOut, pickRotOut)
            const pickB2B = isPickHome ? g.home_b2b : g.away_b2b

            // Vegas cell: ML odds + implied % for picked side, pub% on second line
            const impliedPct = isPickHome ? ref?.home_implied : ref?.away_implied
            const vr = ref?.vegas_range
            const mlHome = vr?.ml_home_min ?? vr?.ml_home_max ?? null
            const mlAway = vr?.ml_away_min ?? vr?.ml_away_max ?? null
            const pickML = isPickHome ? mlHome : mlAway
            const pubPct = isPickHome ? vr?.ml_home_public_pct : (vr?.ml_home_public_pct != null ? 100 - vr.ml_home_public_pct : null)
            const fmtML = (ml) => ml == null ? null : (ml > 0 ? `+${ml}` : `${ml}`)

            // Date header
            const gameDate = g.game_date || today
            const prevDate = idx > 0 ? (filtered[idx - 1].game_date || today) : null
            const showDate = gameDate !== prevDate

            return (
              <React.Fragment key={g.game_id}>
                {showDate && (
                  <tr className="date-header-row">
                    <td colSpan="9" className="date-header-cell">{dateLabel(gameDate)}</td>
                  </tr>
                )}
                <tr className="prediction-row">
                  <td className="rank-cell">{idx + 1}</td>
                  <td className="matchup-cell sticky-col">{renderMatchupCell(g, { layout: 'stacked' })}</td>
                  <td className="time-cell">{g.game_time ?? '—'}</td>
                  {renderSignalPickCell({
                    pick,
                    conviction: conv,
                    emoji: circle,
                    badges: [
                      pickHasInj ? { key: 'inj', title: 'Key player(s) out', icon: '🚑' } : null,
                      pickB2B ? { key: 'b2b', title: `${pick} back-to-back`, icon: '😩' } : null,
                      pickIsTanker ? { key: 'tank', title: 'Picked team is tanking', icon: '⚰️' } : null,
                      g.possession?.sharp_move ? { key: 'sharp', title: `Sharp money on ${g.possession.sharp_side}`, icon: '⚡' } : null,
                      g.possession?.contrarian ? { key: 'contrarian', title: 'Contrarian signal', icon: '🔀' } : null,
                      g.possession?.premium ? { key: 'premium', title: 'Premium pick', icon: '⭐' } : null,
                      g.possession?.zigzag_signal === 'BOUNCE' ? { key: 'bounce', title: 'Zig-zag bounce', icon: '📈' } : null,
                      g.possession?.zigzag_signal === 'FADE' ? { key: 'fade', title: 'Zig-zag fade', icon: '📉' } : null,
                    ].filter(Boolean),
                  })}
                  <td className="vegas-cell">
                    {impliedPct != null ? (
                      <>
                        <div style={{ display: 'flex', gap: '5px', alignItems: 'baseline', flexWrap: 'wrap' }}>
                          {fmtML(pickML) && <span className="vegas-ml">{fmtML(pickML)}</span>}
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{fmtPct(impliedPct)} imp</span>
                        </div>
                        {pubPct != null && (
                          <div style={{ fontSize: '0.68rem', color: '#555', marginTop: '1px' }}>
                            {pubPct}% pub
                          </div>
                        )}
                      </>
                    ) : <span className="dim">—</span>}
                  </td>
                  {renderModelSupportCell(g, pickIsTanker)}
                  {renderMlModelCell(pCell, { showEdgeLabel: true, prediction: g.possession, label: 'Possession', laneState: laneStates.possession })}
                  {renderMlModelCell(aCell, { showEdgeLabel: true, prediction: g.playerdeep, label: 'Player Deep', laneState: laneStates.playerdeep })}
                  {renderMlModelCell(fCell, { showEdgeLabel: true, prediction: g.fourfactor, label: 'Four-Factor', laneState: laneStates.fourfactor })}
                </tr>
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
      </div>
    </div>
  )
}

export default SummaryTable
