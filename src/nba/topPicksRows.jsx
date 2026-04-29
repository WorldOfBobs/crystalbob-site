import React from 'react'
import { renderMatchupCell } from './tablePresentation'
import { getMlModelCellData, renderMlModelCell } from './mlPresentation'
import { renderSpreadModelCell, renderTotalModelCell } from './modelResultCells'
import { getSpreadModelLineState, getTotalModelLineState } from './modelLineOptions'
import {
  buildPolySpreadOptions,
  buildSpreadOptions,
  buildTotalOptions,
  formatDisplayCents,
  formatQuotePrice,
  formatSignedLine,
  getClosestValue,
  getOptionState,
  renderMarketLinePicker,
  renderQuoteCell,
  renderSpreadPickerValue,
  renderTotalPickerValue,
} from './quotePresentation'

export function getCanonicalSignal(possession, pickIsTanker) {
  if (!possession) return { sig: 'PASS', emoji: '⚪' }
  const sig = pickIsTanker ? 'MONITOR' : (possession.signal || 'PASS')
  const emoji = sig === 'BET' ? '🟢' : sig === 'MONITOR' ? '🟡' : '⚪'
  return { sig, emoji }
}

function roundDisplayCents(price) {
  if (price == null) return null
  return (Number(price) * 100).toFixed(1)
}

export function matchupCell(g) {
  return renderMatchupCell(g)
}

export function pickIsTanker(p, pickTeam, homeTeam, awayTeam) {
  return p?.tank_signal && (
    (pickTeam === homeTeam && p.home_rest_risk === 'HIGH') ||
    (pickTeam === awayTeam && p.away_rest_risk === 'HIGH')
  )
}

const fmtPct = (v) => v != null ? `${(v * 100).toFixed(1)}%` : null
const fmtML = (ml) => ml == null ? null : ml > 0 ? `+${ml}` : `${ml}`

function renderTopPickSupportCell(signal, agree, title) {
  const signalClass = signal === 'BET'
    ? 'support-pill support-pill--bet'
    : signal === 'MONITOR'
      ? 'support-pill support-pill--monitor'
      : 'support-pill support-pill--pass'

  return (
    <td className="model-cell support-cell" style={{ textAlign: 'center', verticalAlign: 'middle' }}>
      <div className="support-stack" title={title}>
        <span className={signalClass}>{signal}</span>
        <div className="support-subline">{agree}/3 agree</div>
      </div>
    </td>
  )
}

function renderTopPickContextCell(flags) {
  if (!flags.length) return <td className="top-picks-context-cell top-picks-context-cell--empty">—</td>
  return <td className="top-picks-context-cell">{flags}</td>
}

export function renderSpreadTopPickRow(g, idx, selectedLines, setSelectedLines) {
  const ref = g.poss || g.pd || g.ff
  const vegasSource = g.possession?.vegas_source ?? g.playerdeep?.vegas_source ?? g.fourfactor?.vegas_source
  const bestEdge = g.poss?.edge ?? g.pd?.edge ?? g.ff?.edge ?? 0
  const coverPick = bestEdge > 0 ? g.home_team : g.away_team
  const isTanker = pickIsTanker(g.possession, coverPick, g.home_team, g.away_team)
  const { sig: effectiveSig, emoji: circle } = getCanonicalSignal(g.possession, isTanker)
  return <tr key={g.game_id} className="prediction-row">
    <td className="rank-cell">{idx + 1}</td>
    <td className="matchup-cell sticky-col">{matchupCell(g)}</td>
    <td className="time-cell">{g.game_time ?? '—'}</td>
    <td className="pick-cell"><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}><strong>{coverPick}</strong><div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}><span>{circle}</span>{isTanker && <span title="Picked team is tanking">⚰️</span>}{g.possession?.sharp_move && g.possession?.sharp_side === (g.possession?.best_side || g.playerdeep?.best_side) && <span title={`Sharp agrees: ${g.possession.sharp_side}`}>⚡</span>}</div></div></td>
    {(() => { const agree = ['possession', 'playerdeep', 'fourfactor'].reduce((count, modelKey) => { const mp = g[modelKey]; if (!mp || mp.avg_margin == null) return count; return count + (((mp.avg_margin > 0) === (coverPick === g.home_team)) ? 1 : 0) }, 0); const disagree = ['Possession', 'Player Deep', 'Four-Factor'].filter((label, idx) => { const key = ['possession','playerdeep','fourfactor'][idx]; const mp = g[key]; return !mp || mp.avg_margin == null ? false : (((mp.avg_margin > 0) === (coverPick === g.home_team)) === false) }); const title = `${agree} / 3 live models agree${disagree.length ? `. Disagree: ${disagree.join(', ')}` : ': Possession, Player Deep, Four-Factor'}`; return renderTopPickSupportCell(effectiveSig, agree, title) })()}
    {(() => { const p = g.possession; const flags = []; if (p?.tank_signal) flags.push(<span key="tank" title="Tanking team involved — model may underestimate effort gap">⚰️</span>); if (p?.sharp_move && p?.sharp_side === (g.possession?.best_side || g.playerdeep?.best_side)) flags.push(<span key="sharp" title={`Sharp agrees: on ${p.sharp_side}`}>⚡</span>); if (g.home_b2b || g.away_b2b) flags.push(<span key="b2b" title={`${g.home_b2b ? g.home_team : g.away_team} back-to-back`}>😩</span>); if (p?.home_stars_out >= 1 || p?.away_stars_out >= 1) flags.push(<span key="inj" title="Key player(s) out">🚑</span>); if (p?.zigzag_signal) flags.push(<span key="zig" title="Zigzag pattern: team on loss streak, often bounces back vs spread">↩️</span>); if (g.ff && g.poss && g.ff.modelFav && g.poss.modelFav && g.ff.modelFav !== g.poss.modelFav) flags.push(<span key="split" className="top-picks-context-text" title="Possession and Four-Factor disagree on favorite — treat with caution">split</span>); return renderTopPickContextCell(flags) })()}
    <td className="vegas-cell" style={{ textAlign: 'center' }}>{ref?.vegasFav ? <span className="vegas-pct" title={vegasSource ? `Source: ${vegasSource}` : undefined}>{ref.vegasFav} -{ref.vegasSpreadAbs?.toFixed(1)}</span> : <span className="dim">—</span>}</td>
    {(() => {
      const rowKey = g.game_id || `${g.away_team}@${g.home_team}`
      const kKey = `${rowKey}:k`
      const pKey = `${rowKey}:p`
      const targetLine = -(ref?.vegasSpreadAbs ?? 0)
      const favoriteTeam = ref?.vegasFav || coverPick
      const kOptions = buildSpreadOptions(g.possession?.kalshi_markets, g, favoriteTeam)
      const pOptions = buildPolySpreadOptions(g.possession?.poly_markets, g, favoriteTeam)
      const defaultKLine = getClosestValue(kOptions, targetLine, option => option.signedLine)
      const defaultPLine = getClosestValue(pOptions, targetLine, option => option.line)
      const { index: kIndex, selection: kSel } = getOptionState(kOptions, selectedLines[kKey], defaultKLine, option => option.signedLine)
      const { index: pIndex, selection: pSel } = getOptionState(pOptions, selectedLines[pKey], defaultPLine, option => option.line)
      const kWide = kSel?.coverAsk != null && kSel?.fadeAsk != null && ((kSel.coverAsk + kSel.fadeAsk) >= 1.10)
      const pWide = pSel?.coverAsk != null && pSel?.fadeAsk != null && ((pSel.coverAsk + pSel.fadeAsk) >= 1.10)
      return <>
        {renderQuoteCell(kSel ? renderMarketLinePicker({ variant: 'kalshi', value: renderSpreadPickerValue(ref, coverPick, kSel, kSel.signedLine), onPrev: () => kIndex > 0 && setSelectedLines(prev => ({ ...prev, [kKey]: kOptions[kIndex - 1].signedLine })), onNext: () => kIndex >= 0 && kIndex < kOptions.length - 1 && setSelectedLines(prev => ({ ...prev, [kKey]: kOptions[kIndex + 1].signedLine })), prevDisabled: kIndex <= 0, nextDisabled: kIndex < 0 || kIndex >= kOptions.length - 1, prevLabel: 'Previous Kalshi spread line', nextLabel: 'Next Kalshi spread line' }) : null, kSel ? `${kSel.coverTeam} ${formatDisplayCents(kSel.coverAsk)} / ${kSel.fadeTeam} ${formatDisplayCents(kSel.fadeAsk)}` : null, kWide ? '#b388ff' : '#666')}
        {renderQuoteCell(pSel ? renderMarketLinePicker({ variant: 'poly', value: renderSpreadPickerValue(ref, coverPick, pSel, pSel.line), onPrev: () => pIndex > 0 && setSelectedLines(prev => ({ ...prev, [pKey]: pOptions[pIndex - 1].line })), onNext: () => pIndex >= 0 && pIndex < pOptions.length - 1 && setSelectedLines(prev => ({ ...prev, [pKey]: pOptions[pIndex + 1].line })), prevDisabled: pIndex <= 0, nextDisabled: pIndex < 0 || pIndex >= pOptions.length - 1, prevLabel: 'Previous Polymarket spread line', nextLabel: 'Next Polymarket spread line' }) : null, pSel ? `${pSel.coverTeam} ${formatDisplayCents(pSel.coverAsk)} / ${pSel.fadeTeam} ${formatDisplayCents(pSel.fadeAsk)}` : null, pWide ? '#4a9eff' : '#666')}
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
        <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
        <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
        {renderSpreadModelCell(g.poss, g.possession, 'Possession', modelLineControl)}
        {renderSpreadModelCell(g.pd, g.playerdeep, 'Player Deep', modelLineControl)}
        {renderSpreadModelCell(g.ff, g.fourfactor, 'Four-Factor', modelLineControl)}
      </>
    })()}
  </tr>
}

export function renderMlTopPickRow(g, idx) {
  const ref = g.poss || g.pd || g.ff
  const pick = ref?.pick || ''
  const isTanker = pickIsTanker(g.possession, pick, g.home_team, g.away_team)
  const { sig: effectiveSig, emoji: circle } = getCanonicalSignal(g.possession, isTanker)
  const sharpMove = g.possession?.sharp_move
  const vegasML = fmtML(ref?.pickML)
  const vegasImplied = ref?.vegasImplied
  return <tr key={g.game_id} className="prediction-row">
    <td className="rank-cell">{idx + 1}</td>
    <td className="matchup-cell sticky-col">{matchupCell(g)}</td>
    <td className="time-cell">{g.game_time ?? '—'}</td>
    <td className="pick-cell"><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}><strong>{pick}</strong><div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}><span>{circle}</span>{isTanker && <span title="Picked team is tanking">⚰️</span>}{sharpMove && <span title={`Sharp money on ${g.possession.sharp_side}`}>⚡</span>}</div></div></td>
    {(() => { const agree = ['possession', 'playerdeep', 'fourfactor'].reduce((count, k) => { const mp = g.ensemble?.model_picks?.[k]; if (!mp) return count; return count + (((mp === g.home_team) === (pick === g.home_team)) ? 1 : 0) }, 0); const labels = ['Possession', 'Player Deep', 'Four-Factor']; const disagree = labels.filter((label, idx) => { const key = ['possession','playerdeep','fourfactor'][idx]; const mp = g.ensemble?.model_picks?.[key]; return mp ? (((mp === g.home_team) === (pick === g.home_team)) === false) : false }); const title = `${agree} / 3 live models agree${disagree.length ? `. Disagree: ${disagree.join(', ')}` : ': Possession, Player Deep, Four-Factor'}`; return renderTopPickSupportCell(effectiveSig, agree, title) })()}
    {(() => { const p = g.possession; const flags = []; if (p?.tank_signal) flags.push(<span key="tank" title="Tanking team involved">⚰️</span>); if (p?.sharp_move && p?.sharp_side === (g.possession?.best_side || g.playerdeep?.best_side)) flags.push(<span key="sharp" title={`Sharp agrees: on ${p.sharp_side}`}>⚡</span>); if (g.home_b2b || g.away_b2b) flags.push(<span key="b2b" title={`${g.home_b2b ? g.home_team : g.away_team} B2B`}>😩</span>); if (p?.home_stars_out >= 1 || p?.away_stars_out >= 1) flags.push(<span key="inj" title="Key player(s) out">🚑</span>); return renderTopPickContextCell(flags) })()}
    <td className="vegas-cell" style={{ textAlign: 'center' }}>{vegasML ? <><span className="vegas-ml">{vegasML}</span>{vegasImplied != null && <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '1px' }}>{fmtPct(vegasImplied)} imp</div>}</> : <span className="dim">—</span>}</td>
    {(() => { const poss = g.possession; const pHomeAsk = poss?.poly_home_price ?? null; const pAwayAsk = poss?.poly_away_price ?? null; const kAwayDisp = poss?.kalshi_away_ask != null ? roundDisplayCents(poss.kalshi_away_ask) : null; const kHomeDisp = poss?.kalshi_home_ask != null ? roundDisplayCents(poss.kalshi_home_ask) : null; const pAwayDisp = pAwayAsk != null ? roundDisplayCents(pAwayAsk) : null; const pHomeDisp = pHomeAsk != null ? roundDisplayCents(pHomeAsk) : null; let kNote = null; let pNote = null; const kHomeBid = poss?.kalshi_home_bid ?? null; const kAwayBid = poss?.kalshi_away_bid ?? null; const pHomeBid = pHomeAsk != null ? (1 - pHomeAsk) : null; const pAwayBid = pAwayAsk != null ? (1 - pAwayAsk) : null; const crossA = (kAwayDisp != null && pHomeDisp != null) ? (kAwayDisp + pHomeDisp) : null; const crossB = (kHomeDisp != null && pAwayDisp != null) ? (kHomeDisp + pAwayDisp) : null; const sameK = (kHomeBid != null && kAwayBid != null) ? (kHomeBid + kAwayBid) : null; const sameP = (pHomeBid != null && pAwayBid != null) ? (pHomeBid + pAwayBid) : null; const crossArb = (crossA != null && crossA <= 99) || (crossB != null && crossB <= 99); const kMaker = sameK != null && sameK >= 1.10; const pMaker = sameP != null && sameP >= 1.10; if (crossArb) { kNote = '↔️ crss mrkt arb'; pNote = '↔️ crss mrkt arb' } else { if (kMaker) kNote = '🔃 mrkt mkr opp'; if (pMaker) pNote = '🔃 mrkt mkr opp' } return <>{renderQuoteCell(pick ? `${pick} side` : null, poss?.kalshi_home_ask != null && poss?.kalshi_away_ask != null ? `A ${kAwayDisp}¢ / H ${kHomeDisp}¢` : kNote, '#b388ff')}{renderQuoteCell(pick ? `${pick} side` : null, pHomeAsk != null && pAwayAsk != null ? `A ${pAwayDisp}¢ / H ${pHomeDisp}¢` : pNote, '#4a9eff')}</> })()}
    <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
    <td className="model-cell dim" style={{ textAlign: 'center', opacity: 0.4 }}>—</td>
    {renderMlModelCell(getMlModelCellData(g.possession, pick, g), { prediction: g.possession, label: 'Possession' })}
    {renderMlModelCell(getMlModelCellData(g.playerdeep, pick, g), { prediction: g.playerdeep, label: 'Player Deep' })}
    {renderMlModelCell(getMlModelCellData(g.fourfactor, pick, g), { prediction: g.fourfactor, label: 'Four-Factor' })}
  </tr>
}

export function renderTotalTopPickRow(g, idx, selectedLines, setSelectedLines) {
  const ref = g.poss || g.pd || g.ff
  const bestEdge = g.poss?.edge ?? g.pd?.edge ?? g.ff?.edge ?? 0
  const pick = bestEdge > 0 ? 'OVER' : 'UNDER'
  const sig = g.possession?.ou_signal || 'PASS'
  const circle = sig === 'BET' ? '🟢' : sig === 'MONITOR' ? '🟡' : '⚪'
  return <tr key={g.game_id} className="prediction-row">
    <td className="rank-cell">{idx + 1}</td>
    <td className="matchup-cell sticky-col">{matchupCell(g)}</td>
    <td className="time-cell">{g.game_time ?? '—'}</td>
    <td className="pick-cell"><div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}><strong>{pick}</strong><div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: '2px', fontSize: '0.75rem' }}><span>{circle}</span></div></div></td>
    {(() => { const agree = ['possession', 'playerdeep', 'fourfactor'].reduce((count, mk) => { const mp = g[mk]; if (!mp || mp.avg_total == null || mp.vegas_total == null) return count; return count + (((mp.avg_total > mp.vegas_total) === (pick === 'OVER')) ? 1 : 0) }, 0); const labels = ['Possession', 'Player Deep', 'Four-Factor']; const disagree = labels.filter((label, idx) => { const key = ['possession','playerdeep','fourfactor'][idx]; const mp = g[key]; return !mp || mp.avg_total == null || mp.vegas_total == null ? false : (((mp.avg_total > mp.vegas_total) === (pick === 'OVER')) === false) }); const title = `${agree} / 3 live models agree${disagree.length ? `. Disagree: ${disagree.join(', ')}` : ': Possession, Player Deep, Four-Factor'}`; return renderTopPickSupportCell(sig, agree, title) })()}
    {(() => { const p = g.possession; const flags = []; if (p?.tank_signal) flags.push(<span key="tank" title="Tanking team involved">⚰️</span>); if (p?.sharp_move && p?.sharp_side === (g.possession?.best_side || g.playerdeep?.best_side)) flags.push(<span key="sharp" title={`Sharp agrees: on ${p.sharp_side}`}>⚡</span>); if (g.home_b2b || g.away_b2b) flags.push(<span key="b2b" title={`${g.home_b2b ? g.home_team : g.away_team} B2B`}>😩</span>); if (p?.home_stars_out >= 1 || p?.away_stars_out >= 1) flags.push(<span key="inj" title="Key player(s) out">🚑</span>); return renderTopPickContextCell(flags) })()}
    <td className="vegas-cell" style={{ textAlign: 'center' }}>{ref?.vegasTotal != null ? <span className="vegas-pct">{ref.vegasTotal.toFixed(1)}</span> : <span className="dim">—</span>}</td>
    {(() => { const vegTotal = ref?.vegasTotal; const rowKey = g.game_id || `${g.away_team}@${g.home_team}`; const kKey = `${rowKey}:k-total`; const pKey = `${rowKey}:p-total`; const kOptions = buildTotalOptions(g.possession?.kalshi_markets); const pOptions = buildTotalOptions((Array.isArray(g.possession?.poly_markets) ? g.possession.poly_markets : []).filter(m => !m.question?.includes('1H'))); const defaultKLine = getClosestValue(kOptions, vegTotal, option => option.line); const defaultPLine = getClosestValue(pOptions, vegTotal, option => option.line); const { index: kIndex, selection: kSel } = getOptionState(kOptions, selectedLines[kKey], defaultKLine, option => option.line); const { index: pIndex, selection: pSel } = getOptionState(pOptions, selectedLines[pKey], defaultPLine, option => option.line); const kWide = kSel?.overAsk != null && kSel?.underAsk != null && ((kSel.overAsk + kSel.underAsk) >= 1.10); const pWide = pSel?.overAsk != null && pSel?.underAsk != null && ((pSel.overAsk + pSel.underAsk) >= 1.10); return <>{renderQuoteCell(kSel ? renderMarketLinePicker({ variant: 'kalshi', value: renderTotalPickerValue(ref, kSel.line), onPrev: () => kIndex > 0 && setSelectedLines(prev => ({ ...prev, [kKey]: kOptions[kIndex - 1].line })), onNext: () => kIndex >= 0 && kIndex < kOptions.length - 1 && setSelectedLines(prev => ({ ...prev, [kKey]: kOptions[kIndex + 1].line })), prevDisabled: kIndex <= 0, nextDisabled: kIndex < 0 || kIndex >= kOptions.length - 1, prevLabel: 'Previous Kalshi total line', nextLabel: 'Next Kalshi total line' }) : null, kSel ? `O ${formatDisplayCents(kSel.overAsk)} / U ${formatDisplayCents(kSel.underAsk)}` : null, kWide ? '#b388ff' : '#666')}{renderQuoteCell(pSel ? renderMarketLinePicker({ variant: 'poly', value: renderTotalPickerValue(ref, pSel.line), onPrev: () => pIndex > 0 && setSelectedLines(prev => ({ ...prev, [pKey]: pOptions[pIndex - 1].line })), onNext: () => pIndex >= 0 && pIndex < pOptions.length - 1 && setSelectedLines(prev => ({ ...prev, [pKey]: pOptions[pIndex + 1].line })), prevDisabled: pIndex <= 0, nextDisabled: pIndex < 0 || pIndex >= pOptions.length - 1, prevLabel: 'Previous Polymarket total line', nextLabel: 'Next Polymarket total line' }) : null, pSel ? `O ${formatDisplayCents(pSel.overAsk)} / U ${formatDisplayCents(pSel.underAsk)}` : null, pWide ? '#4a9eff' : '#666')}</> })()}
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
        {renderTotalModelCell(g.poss, g.possession, 'Possession', modelLineControl)}
        {renderTotalModelCell(g.pd, g.playerdeep, 'Player Deep', modelLineControl)}
        {renderTotalModelCell(g.ff, g.fourfactor, 'Four-Factor', modelLineControl)}
      </>
    })()}
  </tr>
}

export function makeSpread(p, g) {
  if (!p || p.avg_margin == null) return null
  const modelMargin = p.avg_margin
  const vegasSpread = p.vegas_spread ?? null
  const edge = vegasSpread != null ? modelMargin - (-vegasSpread) : null
  return { modelFav: modelMargin >= 0 ? g.home_team : g.away_team, modelSpread: Math.abs(modelMargin), vegasFav: vegasSpread != null ? (vegasSpread <= 0 ? g.home_team : g.away_team) : null, vegasSpreadAbs: vegasSpread != null ? Math.abs(vegasSpread) : null, edge, coverPct: p.home_cover_pct, hasOdds: vegasSpread != null }
}

export function makeML(p, g) {
  if (!p) return null
  const homeWin = p.home_win_pct
  const awayWin = p.away_win_pct
  if (homeWin == null && awayWin == null) return null
  const pick = (homeWin ?? 0) >= (awayWin ?? 0) ? g.home_team : g.away_team
  const pickIsHome = pick === g.home_team
  const modelWin = pickIsHome ? homeWin : awayWin
  const vegasImplied = pickIsHome ? p.home_implied : p.away_implied
  const edge = (modelWin != null && vegasImplied != null) ? modelWin - vegasImplied : null
  const vr = p.vegas_range
  const pickML = pickIsHome ? (vr?.ml_home_min ?? vr?.ml_home_max ?? null) : (vr?.ml_away_min ?? vr?.ml_away_max ?? null)
  return { pick, pickIsHome, modelWin, vegasImplied, edge, pickML }
}

export function makeTotal(p) {
  if (!p) return null
  const modelTotal = p.avg_total ?? p.model_total
  if (modelTotal == null) return null
  const vegasTotal = p.vegas_total ?? null
  const edge = vegasTotal != null ? modelTotal - vegasTotal : null
  return { modelTotal, vegasTotal, edge, overPct: p.over_pct, hasOdds: vegasTotal != null }
}

export { formatQuotePrice, formatSignedLine }
