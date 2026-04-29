import { applyCanonicalGameContext, finalizeCanonicalB2B } from './gameContext'
import { getMlEdgeClass, getMlModelCellData, getPresentationMlPick, getPresentationMlRefs, renderMlModelCell } from './mlPresentation'
import { annotateMarketGame, compareMarketGames } from './topPicksRanking'
import { renderMatchupCell, renderSignalPickCell, renderSupportCell } from './tablePresentation'
import { anyVisibleLaneLoading } from './laneState'


function roundDisplayCents(price) {
  if (price == null) return null
  return (Number(price) * 100).toFixed(1)
}

function renderQuoteCell({ top, awayRow, homeRow, edge, edgeClass, color, fallback = null }) {
  return (
    <td className="col-kp market-quote-cell" style={{ textAlign: 'center', color }}>
      {top != null || awayRow != null || homeRow != null || fallback != null ? (
        <span className="model-summary-stack model-summary-stack--ml">
          <div className="market-quote-line ml-top-row">
            <span>{top ?? '—'}</span>
            {edge ? <span className={`ml-edge-chip ${edgeClass}`}>{edge}</span> : null}
          </div>
          {awayRow ? <div className="market-quote-meta">{awayRow}</div> : null}
          {homeRow ? <div className="market-quote-costs">{homeRow}</div> : (fallback ? <div className="market-quote-costs">{fallback}</div> : null)}
        </span>
      ) : <span style={{ color: '#444' }}>—</span>}
    </td>
  )
}
function getCanonicalSignal(possession, pickIsTanker) {
  if (!possession) return { sig: 'PASS', emoji: '⚪' }
  const sig = pickIsTanker ? 'MONITOR' : (possession.signal || 'PASS')
  const emoji = sig === 'BET' ? '🟢' : sig === 'MONITOR' ? '🟡' : '⚪'
  return { sig, emoji }
}

function MLTable({ playerdeep = [], possession = [], fourfactor = [], ensemble = [], laneStates = {} }) {
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

  const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : null
  const fmtEdge = (v) => v != null ? `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%` : null
  const fmtML = (ml) => ml == null ? null : ml > 0 ? `+${ml}` : `${ml}`
  const renderStackToken = (label, active = false, tone = 'edge-neutral') => <span className={`ml-stack-token${active ? ` ${tone}` : ' is-muted'}`}>{label}</span>
  const renderPairRow = (team, pct, active, tone) => <div className="ml-stack-row ml-stack-row--pair"><span>{renderStackToken(team, active, tone)}</span><span className="ml-stack-sep">/</span><span>{renderStackToken(fmtPct(pct), active, tone)}</span></div>

  // ── PRIMARY VIEW: all core models in columns ─────────────────────────────────────────
  {
    const games = Object.values(gameMap).map(finalizeCanonicalB2B).filter(g => {
      if (isLiveOrCompleted(g)) return false
      return !!(g.possession || g.playerdeep || g.fourfactor)
    }).map(g => {
      const refs = getPresentationMlRefs(g)
      return {
        ...g,
        ...refs,
        presentationPick: getPresentationMlPick(g, refs),
      }
    }).map(g => {
      const pick = g.presentationPick || ''
      const isTanker = g.possession?.tank_signal && (
        (pick === g.home_team && g.possession?.home_rest_risk === 'HIGH') ||
        (pick === g.away_team && g.possession?.away_rest_risk === 'HIGH')
      )
      const { sig } = getCanonicalSignal(g.possession, isTanker)
      return annotateMarketGame(g, 'ml', { signal: sig, conviction: g.possession?.conviction_score ?? 0 })
    }).sort((a, b) => {
      const da = a.game_date || today
      const db = b.game_date || today
      if (da !== db) return da.localeCompare(db)
      return compareMarketGames(a, b)
    })

    if (games.length === 0) return <div className="empty">{anyVisibleLaneLoading(laneStates) ? 'Building moneyline board…' : 'No ML data available.'}</div>

    return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <div className="summary-note" style={{ flexShrink: 0, padding: '0 0 8px' }}>
          Model win probability vs Vegas implied. <strong>TEAM X%</strong> = model's win chance. Edge = model minus Vegas implied. <strong>Support</strong> = Decision-layer signal plus model agreement count. Layer view: Possession = live game model, Player Deep = context, Four-Factor = factor.
        </div>
        <div className="table-container">
          <table className="predictions-table summary-table summary-table--core">
            <thead><tr>
              <th className="col-rank">#</th>
              <th className="col-matchup sticky-col">Matchup</th>
              <th className="col-time">Time</th>
              <th className="col-pick">Signal</th>
              <th className="col-support">Support</th>
              <th className="col-context" title="Context flags: tank ⚰️, sharp ⚡, B2B 😩, injury 🚑, split models">Context</th>
              <th className="col-vegas">Vegas</th>
              <th className="col-kp" title="Kalshi quote view. Top = displayed side prices; bottom = maker/arb note when relevant.">K</th>
              <th className="col-kp" title="Polymarket quote view. Top = displayed side prices; bottom = maker/arb note when relevant.">P</th>
              <th className="col-model" style={{ opacity: 0.5 }} title="XGBoost shadow model — not yet active.">XGB</th>
              <th className="col-model" style={{ opacity: 0.5 }} title="Random Forest shadow model — not yet active.">RF</th>
              <th className="col-model" title="Possession layer: deepest live game model and default pick source.">Possession</th>
              <th className="col-model" title="Context layer: Player Deep, built from lineup, rotation, and matchup context.">Player Deep</th>
              <th className="col-model" title="Factor layer: Four-Factor matchup model using eFG%, TOV%, ORB%, and FTR.">Four-Factor</th>
            </tr></thead>
            <tbody>
              {games.map((g, idx) => {
                // Consensus pick from best available model
                const ref = g.poss || g.pd || g.ff
                const pick = g.presentationPick || ''

                const pickIsTanker = g.possession?.tank_signal && (
                  (pick === g.home_team && g.possession?.home_rest_risk === 'HIGH') ||
                  (pick === g.away_team && g.possession?.away_rest_risk === 'HIGH')
                )
                const { sig: effectiveSig, emoji: circle } = getCanonicalSignal(g.possession, pickIsTanker)
                const sharpMove = g.possession?.sharp_move

                // Vegas cell: ML odds + implied% for picked side
                const vegasML = fmtML(ref?.pickML)
                const vegasImplied = ref?.vegasImplied

                const gDate = g.game_date || today
                const prevDate = idx > 0 ? (games[idx - 1].game_date || today) : null
                const showDate = gDate !== prevDate

                return (
                  <>
                    {showDate && (
                      <tr key={`d-${gDate}`} className="date-header-row">
                        <td colSpan={14} className="date-header-cell">{dateLabel(gDate)}</td>
                      </tr>
                    )}
                    <tr key={g.game_id} className="prediction-row">
                      <td className="rank-cell">{idx + 1}</td>
                      <td className="matchup-cell sticky-col">{renderMatchupCell(g)}</td>
                      <td className="time-cell">{g.game_time ?? '—'}</td>
                      {renderSignalPickCell({
                        pick,
                        emoji: circle,
                        badges: [
                          pickIsTanker ? { key: 'tank', title: 'Picked team is tanking', icon: '⚰️' } : null,
                          sharpMove ? { key: 'sharp', title: `Sharp money on ${g.possession.sharp_side}`, icon: '⚡' } : null,
                        ].filter(Boolean),
                      })}
                      {/* Model Support */}
                      {renderSupportCell({
                        signal: effectiveSig,
                        agreementText: `${g.marketRanking?.support ?? 0}/3`,
                      })}
                      {/* Context column */}
                      {(() => {
                        const p = g.possession
                        const flags = []
                        if (p?.tank_signal) flags.push(<span key="tank" title="Tanking team involved">⚰️</span>)
                        if (p?.sharp_move && p?.sharp_side === (g.possession?.best_side || g.playerdeep?.best_side)) flags.push(<span key="sharp" title={`Sharp agrees: on ${p.sharp_side}`}>⚡</span>)
                        if (g.home_b2b || g.away_b2b) flags.push(<span key="b2b" title={`${g.home_b2b ? g.home_team : g.away_team} B2B`}>😩</span>)
                        if (p?.home_stars_out >= 1 || p?.away_stars_out >= 1) flags.push(<span key="inj" title="Key player(s) out">🚑</span>)
                        if (flags.length === 0) return <td style={{ textAlign: 'center', color: '#444' }}>—</td>
                        return <td style={{ textAlign: 'center', fontSize: '0.85rem', letterSpacing: 1 }}>{flags}</td>
                      })()}
                      {(() => {
                        const awayImp = ref?.awayImplied ?? g.possession?.away_implied ?? null
                        const homeImp = ref?.homeImplied ?? g.possession?.home_implied ?? null
                        const homeFav = (homeImp ?? -1) >= (awayImp ?? -1)
                        const top = homeImp != null && awayImp != null ? (homeFav ? g.home_team : g.away_team) : (pick || vegasML || null)
                        return renderQuoteCell({
                          top,
                          awayRow: awayImp != null ? renderPairRow(g.away_team, awayImp, !homeFav, 'edge-neutral') : null,
                          homeRow: homeImp != null ? renderPairRow(g.home_team, homeImp, homeFav, 'edge-neutral') : null,
                          edge: null,
                          edgeClass: 'edge-neutral',
                          color: 'var(--text)',
                          fallback: vegasML,
                        })
                      })()}
                      {/* K / P columns */}
                      {(() => {
                        const poss = g.possession
                        const pHomeAsk = poss?.poly_home_price ?? null
                        const pAwayAsk = poss?.poly_away_price ?? null
                        const kAwayDisp = poss?.kalshi_away_ask != null ? roundDisplayCents(poss.kalshi_away_ask) : null
                        const kHomeDisp = poss?.kalshi_home_ask != null ? roundDisplayCents(poss.kalshi_home_ask) : null
                        const pAwayDisp = pAwayAsk != null ? roundDisplayCents(pAwayAsk) : null
                        const pHomeDisp = pHomeAsk != null ? roundDisplayCents(pHomeAsk) : null
                        let kNote = null
                        let pNote = null
                        const kHomeBid = poss?.kalshi_home_bid ?? null
                        const kAwayBid = poss?.kalshi_away_bid ?? null
                        const pHomeBid = pHomeAsk != null ? (1 - pHomeAsk) : null
                        const pAwayBid = pAwayAsk != null ? (1 - pAwayAsk) : null
                        const crossA = (kAwayDisp != null && pHomeDisp != null) ? (kAwayDisp + pHomeDisp) : null
                        const crossB = (kHomeDisp != null && pAwayDisp != null) ? (kHomeDisp + pAwayDisp) : null
                        const sameK = (kHomeBid != null && kAwayBid != null) ? (kHomeBid + kAwayBid) : null
                        const sameP = (pHomeBid != null && pAwayBid != null) ? (pHomeBid + pAwayBid) : null
                        const crossArb = (crossA != null && crossA <= 99) || (crossB != null && crossB <= 99)
                        const kMaker = sameK != null && sameK >= 1.10
                        const pMaker = sameP != null && sameP >= 1.10
                        if (crossArb) {
                          kNote = '↔️ crss mrkt arb'
                          pNote = '↔️ crss mrkt arb'
                        } else {
                          if (kMaker) kNote = '🔃 mrkt mkr opp'
                          if (pMaker) pNote = '🔃 mrkt mkr opp'
                        }
                        const kHomeProb = poss?.kalshi_home_ask ?? null
                        const kAwayProb = poss?.kalshi_away_ask ?? null
                        const kHomeEdge = (kHomeProb != null && poss?.home_implied != null) ? (kHomeProb - poss.home_implied) : null
                        const kAwayEdge = (kAwayProb != null && poss?.away_implied != null) ? (kAwayProb - poss.away_implied) : null
                        const kHomeFav = (kHomeProb ?? -1) >= (kAwayProb ?? -1)
                        const kTop = kHomeProb != null && kAwayProb != null ? (kHomeFav ? g.home_team : g.away_team) : (pick || null)
                        const kTopEdge = kHomeProb != null && kAwayProb != null ? (kHomeFav ? kHomeEdge : kAwayEdge) : null
                        const kEdgeClass = getMlEdgeClass(kTopEdge)

                        const pHomeEdgeNow = (pHomeAsk != null && poss?.home_implied != null) ? (pHomeAsk - poss.home_implied) : null
                        const pAwayEdgeNow = (pAwayAsk != null && poss?.away_implied != null) ? (pAwayAsk - poss.away_implied) : null
                        const pHomeFav = (pHomeAsk ?? -1) >= (pAwayAsk ?? -1)
                        const pTop = pHomeAsk != null && pAwayAsk != null ? (pHomeFav ? g.home_team : g.away_team) : (pick || null)
                        const pTopEdge = pHomeAsk != null && pAwayAsk != null ? (pHomeFav ? pHomeEdgeNow : pAwayEdgeNow) : null
                        const pEdgeClass = getMlEdgeClass(pTopEdge)

                        return <>
                          {renderQuoteCell({
                            top: kTop,
                            awayRow: kAwayProb != null ? renderPairRow(g.away_team, kAwayProb, !kHomeFav, getMlEdgeClass(kAwayEdge)) : null,
                            homeRow: kHomeProb != null ? renderPairRow(g.home_team, kHomeProb, kHomeFav, getMlEdgeClass(kHomeEdge)) : null,
                            edge: fmtEdge(kTopEdge),
                            edgeClass: kEdgeClass,
                            fallback: kNote,
                            color: '#b388ff',
                          })}
                          {renderQuoteCell({
                            top: pTop,
                            awayRow: pAwayAsk != null ? renderPairRow(g.away_team, pAwayAsk, !pHomeFav, getMlEdgeClass(pAwayEdgeNow)) : null,
                            homeRow: pHomeAsk != null ? renderPairRow(g.home_team, pHomeAsk, pHomeFav, getMlEdgeClass(pHomeEdgeNow)) : null,
                            edge: fmtEdge(pTopEdge),
                            edgeClass: pEdgeClass,
                            fallback: pNote,
                            color: '#4a9eff',
                          })}
                        </>
                      })()}
                      <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
                      <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
                      {renderMlModelCell(getMlModelCellData(g.possession, pick, g), { prediction: g.possession, label: 'Possession', laneState: laneStates.possession })}
                      {renderMlModelCell(getMlModelCellData(g.playerdeep, pick, g), { prediction: g.playerdeep, label: 'Player Deep', laneState: laneStates.playerdeep })}
                      {renderMlModelCell(getMlModelCellData(g.fourfactor, pick, g), { prediction: g.fourfactor, label: 'Four-Factor', laneState: laneStates.fourfactor })}
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

export default MLTable
