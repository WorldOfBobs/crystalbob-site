import React, { useEffect, useMemo, useState } from 'react'
import { applyCanonicalGameContext, finalizeCanonicalB2B } from './gameContext'
import {
  getCanonicalSignal,
  makeML,
  makeSpread,
  makeTotal,
  pickIsTanker,
  renderMlTopPickRow,
  renderSpreadTopPickRow,
  renderTotalTopPickRow,
} from './topPicksRows'
import { annotateTopPickRow, compareTopPickComposite } from './topPicksRanking'
import { laneIsLoading } from './laneState'

const STORAGE_KEYS = {
  controls: 'top-picks-controls-v1',
  selectedLines: 'top-picks-selected-lines-v1',
}

const DEFAULT_CONTROLS = {
  threeOnly: false,
  robustOnly: false,
  tightOnly: false,
  simBackedOnly: false,
  betTypes: { spread: true, ml: true, total: true },
  sortMode: 'composite',
}

function isLiveOrCompleted(g) {
  const t = (g.game_time || '').trim().toLowerCase()
  if (t.includes('pm et') || t.includes('am et')) return false
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (g.game_date && g.game_date > todayET) return false
  if (t && t.length > 0) return true
  return false
}

function buildGameMap({ playerdeep, possession, fourfactor, ensemble }) {
  const gameMap = {}
  const addToMap = (preds, key) => {
    for (const p of preds) {
      if (!gameMap[p.game_id]) {
        gameMap[p.game_id] = {
          game_id: p.game_id,
          matchup: p.matchup,
          home_team: p.home_team,
          away_team: p.away_team,
          game_date: p.game_date,
          home_b2b: p.home_b2b,
          away_b2b: p.away_b2b,
          home_stars_out: p.home_stars_out,
          away_stars_out: p.away_stars_out,
          home_starters_out: p.home_starters_out,
          away_starters_out: p.away_starters_out,
          home_rotation_out: p.home_rotation_out,
          away_rotation_out: p.away_rotation_out,
          home_record: p.home_record,
          away_record: p.away_record,
        }
      }
      const g = gameMap[p.game_id]
      applyCanonicalGameContext(g, p)
      g[key] = p
    }
  }

  addToMap(playerdeep, 'playerdeep')
  addToMap(possession, 'possession')
  addToMap(fourfactor, 'fourfactor')

  for (const e of ensemble) {
    if (e.game_id && gameMap[e.game_id]) gameMap[e.game_id].ensemble = e
  }

  return Object.values(gameMap)
    .map(finalizeCanonicalB2B)
    .filter(g => !isLiveOrCompleted(g) && (g.possession || g.playerdeep || g.fourfactor))
    .map(g => ({ ...g, poss: makeSpread(g.possession, g), pd: makeSpread(g.playerdeep, g), ff: makeSpread(g.fourfactor, g), mlPoss: makeML(g.possession, g), mlPd: makeML(g.playerdeep, g), mlFf: makeML(g.fourfactor, g), totalPoss: makeTotal(g.possession), totalPd: makeTotal(g.playerdeep), totalFf: makeTotal(g.fourfactor) }))
}

function buildRows(games, today, tomorrow) {
  const rows = []
  for (const g of games) {
    if (!(g.game_date === today || g.game_date === tomorrow)) continue

    const spreadRef = g.poss || g.pd || g.ff
    const bestSpreadEdge = g.poss?.edge ?? g.pd?.edge ?? g.ff?.edge ?? null
    const coverPick = bestSpreadEdge > 0 ? g.home_team : g.away_team
    const spreadSig = getCanonicalSignal(g.possession, pickIsTanker(g.possession, coverPick, g.home_team, g.away_team)).sig
    if (spreadSig !== 'PASS' && spreadRef?.vegasSpreadAbs != null) {
      rows.push({ kind: 'spread', game: g, game_id: `${g.game_id}-spread`, game_date: g.game_date, signal: spreadSig, conviction: g.possession?.conviction_score ?? 0 })
    }

    const mlRef = g.mlPoss || g.mlPd || g.mlFf
    const mlEdge = mlRef?.edge ?? null
    if (spreadSig === 'BET' && mlEdge != null && Math.abs(mlEdge) > 0.04 && mlRef?.pickML != null) {
      rows.push({ kind: 'ml', game: { ...g, poss: g.mlPoss, pd: g.mlPd, ff: g.mlFf }, game_id: `${g.game_id}-ml`, game_date: g.game_date, signal: spreadSig, conviction: g.possession?.conviction_score ?? 0 })
    }

    const totalRef = g.totalPoss || g.totalPd || g.totalFf
    const totalSig = g.possession?.ou_signal || 'PASS'
    if (totalSig !== 'PASS' && totalRef?.vegasTotal != null) {
      rows.push({ kind: 'total', game: { ...g, poss: g.totalPoss, pd: g.totalPd, ff: g.totalFf }, game_id: `${g.game_id}-total`, game_date: g.game_date, signal: totalSig, conviction: g.possession?.conviction_score ?? 0 })
    }
  }

  return rows
}

function TopPicksTable({ playerdeep = [], possession = [], fourfactor = [], ensemble = [], laneStates = {} }) {
  const [selectedLines, setSelectedLines] = useState(() => {
    if (typeof window === 'undefined') return {}
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEYS.selectedLines) || '{}')
    } catch {
      return {}
    }
  })
  const [controls, setControls] = useState(() => {
    if (typeof window === 'undefined') return DEFAULT_CONTROLS
    try {
      return { ...DEFAULT_CONTROLS, ...JSON.parse(window.localStorage.getItem(STORAGE_KEYS.controls) || '{}') }
    } catch {
      return DEFAULT_CONTROLS
    }
  })

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  })()

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEYS.selectedLines, JSON.stringify(selectedLines))
  }, [selectedLines])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(STORAGE_KEYS.controls, JSON.stringify(controls))
  }, [controls])

  const games = buildGameMap({ playerdeep, possession, fourfactor, ensemble })
  const baseRows = useMemo(() => buildRows(games, today, tomorrow), [games, today, tomorrow])

  const annotatedRows = useMemo(() => {
    const safePct = (v, digits = 0) => v == null ? null : `${(v * 100).toFixed(digits)}%`
    const safeSigned = (v) => v == null ? '—' : `${v > 0 ? '+' : ''}${v.toFixed(1)}`
    const safeLine = (v) => v == null ? '—' : Number(v).toFixed(1)

    return baseRows.map((row) => {
      const annotated = annotateTopPickRow(row)
      const ref = annotated.game.poss || annotated.game.pd || annotated.game.ff
      const label = row.kind === 'ml'
        ? `${ref?.pick ?? row.game.home_team} ML`
        : row.kind === 'spread'
          ? `${ref?.modelFav ?? row.game.home_team} ${safeSigned(-(ref?.vegasSpreadAbs ?? ref?.modelSpread ?? 0))}`
          : `${(ref?.edge ?? 0) > 0 ? 'Over' : 'Under'} ${safeLine(ref?.vegasTotal)}`
      const supportLabel = `${annotated.support}/3 models agree`
      const spreadOrTotalPercentiles = row.kind === 'ml' ? null : (annotated.rankingMeta.distributionQuality !== 'none' ? (row.kind === 'spread'
        ? annotated.game.possession?.distributions?.margin?.percentiles || annotated.game.playerdeep?.distributions?.margin?.percentiles || annotated.game.fourfactor?.distributions?.margin?.percentiles
        : annotated.game.possession?.distributions?.total?.percentiles || annotated.game.playerdeep?.distributions?.total?.percentiles || annotated.game.fourfactor?.distributions?.total?.percentiles) : null)
      const why = row.kind === 'ml'
        ? `Why it's here: ${ref?.pick ?? row.game.home_team} is at ${safePct(annotated.prob, 1) ?? '—'} to win versus ${safePct(ref?.vegasImplied, 1) ?? '—'} implied, a ${safePct(ref?.edge, 1) ?? '—'} edge, with ${supportLabel.toLowerCase()}.`
        : row.kind === 'spread'
          ? `Why it's here: ${label} shows ${safeSigned(ref?.edge ?? 0)} points versus the market, ${safePct(annotated.prob, 1) ?? '—'} cover, ${supportLabel.toLowerCase()}${spreadOrTotalPercentiles?.p25 != null && spreadOrTotalPercentiles?.p75 != null ? `, and the sim middle 50% lands ${safeSigned(spreadOrTotalPercentiles.p25)} to ${safeSigned(spreadOrTotalPercentiles.p75)}.` : '.'}`
          : `Why it's here: ${label} carries ${safeSigned(ref?.edge ?? 0)} points of total edge, ${safePct(annotated.prob, 1) ?? '—'} hit rate, ${supportLabel.toLowerCase()}${spreadOrTotalPercentiles?.p25 != null && spreadOrTotalPercentiles?.p75 != null ? `, and the sim middle 50% runs ${safeLine(spreadOrTotalPercentiles.p25)} to ${safeLine(spreadOrTotalPercentiles.p75)}.` : '.'}`
      return {
        ...annotated,
        label,
        why,
      }
    })
  }, [baseRows])

  const filteredRows = useMemo(() => {
    const rows = annotatedRows.filter((row) => {
      if (!controls.betTypes[row.kind]) return false
      if (controls.threeOnly && row.support !== 3) return false
      if (controls.robustOnly && row.robustnessTag !== 'Robust') return false
      if (controls.tightOnly && row.rangeTag !== 'Tight') return false
      if (controls.simBackedOnly && !row.simBacked) return false
      return true
    })

    const tier = { BET: 0, MONITOR: 1, PASS: 2 }
    const dayRank = (d) => d === today ? 0 : d === tomorrow ? 1 : 2
    const sorters = {
      composite: compareTopPickComposite,
      edge: (a, b) => b.metric - a.metric || b.compositeScore - a.compositeScore || (b.prob ?? -1) - (a.prob ?? -1) || b.support - a.support,
      hitRate: (a, b) => (b.prob ?? -1) - (a.prob ?? -1) || b.compositeScore - a.compositeScore || b.metric - a.metric || b.support - a.support,
      consensus: (a, b) => b.support - a.support || b.compositeScore - a.compositeScore || (b.prob ?? -1) - (a.prob ?? -1) || b.metric - a.metric,
    }

    return [...rows].sort((a, b) => {
      const dr = dayRank(a.game_date) - dayRank(b.game_date)
      if (dr !== 0) return dr
      const primary = sorters[controls.sortMode]?.(a, b) ?? 0
      if (primary !== 0) return primary
      const td = (tier[a.signal] ?? 9) - (tier[b.signal] ?? 9)
      if (td !== 0) return td
      return b.conviction - a.conviction
    })
  }, [annotatedRows, controls, today, tomorrow])

  const summaryCards = useMemo(() => {
    const kindRank = { spread: 0, ml: 1, total: 2 }
    const takeBest = (items, usedIds, predicate = () => true, sortFn = (a, b) => b.cardScore - a.cardScore || b.metric - a.metric || (kindRank[a.kind] - kindRank[b.kind])) => {
      const pick = items.filter(item => !usedIds.has(item.game_id) && predicate(item)).sort(sortFn)[0]
      if (!pick) return null
      usedIds.add(pick.game_id)
      return pick
    }
    const cards = []
    const usedIds = new Set()
    const bestOverall = takeBest(filteredRows, usedIds)
    if (bestOverall) cards.push({ title: 'B1 · Best overall', ...bestOverall })
    const secondOverall = takeBest(filteredRows, usedIds)
    if (secondOverall) cards.push({ title: 'B2 · Next best', ...secondOverall })
    const bestSpread = takeBest(filteredRows, usedIds, item => item.kind === 'spread')
    if (bestSpread) cards.push({ title: 'Best spread', ...bestSpread })
    const bestMl = takeBest(filteredRows, usedIds, item => item.kind === 'ml', (a, b) => (b.prob ?? 0) - (a.prob ?? 0) || b.metric - a.metric || b.support - a.support)
    if (bestMl) cards.push({ title: 'Best moneyline', ...bestMl })
    const bestTotal = takeBest(filteredRows, usedIds, item => item.kind === 'total')
    if (bestTotal) cards.push({ title: 'Best total', ...bestTotal })
    const bestRemaining = takeBest(filteredRows, usedIds)
    if (bestRemaining && cards.length < 4) cards.push({ title: 'Best remaining', ...bestRemaining })
    return cards.slice(0, 4)
  }, [filteredRows])

  const counts = useMemo(() => ({
    total: annotatedRows.length,
    filtered: filteredRows.length,
    spread: annotatedRows.filter(row => row.kind === 'spread').length,
    ml: annotatedRows.filter(row => row.kind === 'ml').length,
    totalPlays: annotatedRows.filter(row => row.kind === 'total').length,
  }), [annotatedRows, filteredRows])

  const updateToggle = (key) => setControls(prev => ({ ...prev, [key]: !prev[key] }))
  const updateBetType = (key) => setControls(prev => ({ ...prev, betTypes: { ...prev.betTypes, [key]: !prev.betTypes[key] } }))
  const resetControls = () => setControls(DEFAULT_CONTROLS)

  if (annotatedRows.length === 0) return <div className="empty">{laneIsLoading(laneStates.possession) || laneIsLoading(laneStates.playerdeep) || laneIsLoading(laneStates.fourfactor) ? 'Top picks are waiting on advanced lanes…' : 'No BET or MONITOR signals right now.'}</div>

  const dateLabel = (d) => {
    if (d === today) return 'Today'
    if (d === tomorrow) return 'Tomorrow'
    return d
  }

  return <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}><div className="summary-note top-picks-note" style={{ flexShrink: 0, padding: '0 0 8px' }}>Top picks across spread, moneyline, and total, with quick filters for consensus, robustness, distribution backing, and sort priority.</div><div className="top-picks-controls" style={{ flexShrink: 0 }}><div className="top-picks-controls-row"><div className="top-picks-group"><span className="top-picks-group-label">Filters</span><button type="button" className={`top-picks-chip ${controls.threeOnly ? 'is-active' : ''}`} onClick={() => updateToggle('threeOnly')}>3/3 only</button><button type="button" className={`top-picks-chip ${controls.robustOnly ? 'is-active' : ''}`} onClick={() => updateToggle('robustOnly')}>Robust only</button><button type="button" className={`top-picks-chip ${controls.tightOnly ? 'is-active' : ''}`} onClick={() => updateToggle('tightOnly')}>Tight only</button><button type="button" className={`top-picks-chip ${controls.simBackedOnly ? 'is-active' : ''}`} onClick={() => updateToggle('simBackedOnly')}>Dist-backed only</button></div><div className="top-picks-group"><span className="top-picks-group-label">Bet types</span><button type="button" className={`top-picks-chip ${controls.betTypes.spread ? 'is-active' : ''}`} onClick={() => updateBetType('spread')}>Spread <span className="top-picks-chip-count">{counts.spread}</span></button><button type="button" className={`top-picks-chip ${controls.betTypes.ml ? 'is-active' : ''}`} onClick={() => updateBetType('ml')}>ML <span className="top-picks-chip-count">{counts.ml}</span></button><button type="button" className={`top-picks-chip ${controls.betTypes.total ? 'is-active' : ''}`} onClick={() => updateBetType('total')}>Total <span className="top-picks-chip-count">{counts.totalPlays}</span></button></div><div className="top-picks-group top-picks-group-sort"><span className="top-picks-group-label">Sort</span><select className="top-picks-select" value={controls.sortMode} onChange={(e) => setControls(prev => ({ ...prev, sortMode: e.target.value }))}><option value="composite">Best overall</option><option value="edge">Best edge</option><option value="hitRate">Best hit rate</option><option value="consensus">Most consensus</option></select><button type="button" className="top-picks-reset" onClick={resetControls}>Reset</button></div></div><div className="top-picks-controls-row top-picks-controls-row-meta"><span className="top-picks-meta-pill">Showing {counts.filtered} of {counts.total}</span><span className="top-picks-meta-pill">Today + tomorrow only</span><span className="top-picks-meta-pill">Saved on this browser</span></div></div>{summaryCards.length > 0 && <div className="top-picks-card-grid">{summaryCards.map((card, i) => <div key={`${card.title}-${i}`} className="top-picks-card"><div className="top-picks-card-title">{card.title}</div><div className="top-picks-card-label">{card.label}</div><div className="top-picks-card-copy">{card.why}</div><div className="top-picks-card-tags">{card.simTag && <span className="top-picks-card-tag top-picks-card-tag--sim">{card.simTag}</span>}{card.rangeTag && <span className="top-picks-card-tag top-picks-card-tag--neutral">{card.rangeTag}</span>}{card.robustnessTag && <span className={`top-picks-card-tag ${card.robustnessTag === 'Robust' ? 'top-picks-card-tag--robust' : 'top-picks-card-tag--warning'}`}>{card.robustnessTag}</span>}</div></div>)}</div>}{filteredRows.length === 0 ? <div className="empty">No top picks match the current filters.</div> : <div className="table-container"><table className="predictions-table summary-table"><thead><tr><th className="col-rank">#</th><th className="col-matchup sticky-col">Matchup</th><th className="col-time">Time</th><th className="col-pick">Signal</th><th className="col-support">Support</th><th className="col-support">Context</th><th className="col-vegas">Vegas</th><th className="col-kp">K</th><th className="col-kp">P</th><th className="col-model" style={{ opacity: 0.5 }}>XGB</th><th className="col-model" style={{ opacity: 0.5 }}>RF</th><th className="col-model">Possession</th><th className="col-model">Player Deep</th><th className="col-model">Four-Factor</th></tr></thead><tbody>{filteredRows.map((row, idx) => { const prevDate = idx > 0 ? filteredRows[idx - 1].game_date : null; const showDate = row.game_date !== prevDate; return <React.Fragment key={row.game_id}>{showDate && <tr className="date-header-row"><td colSpan={14} className="date-header-cell">{dateLabel(row.game_date)}</td></tr>}{row.kind === 'spread' ? renderSpreadTopPickRow(row.game, idx, selectedLines, setSelectedLines) : row.kind === 'ml' ? renderMlTopPickRow(row.game, idx) : renderTotalTopPickRow(row.game, idx, selectedLines, setSelectedLines)}</React.Fragment> })}</tbody></table></div>}</div>
}

export default TopPicksTable
