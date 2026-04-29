import React, { useMemo, useState } from 'react'
import { renderMatchupCell, renderSignalPickCell, renderSupportCell } from './tablePresentation'

const PERIOD_OPTIONS = [
  { key: 'q1', label: 'Q1' },
  { key: 'q2', label: 'Q2' },
  { key: 'q3', label: 'Q3' },
  { key: 'q4', label: 'Q4' },
  { key: 'h1', label: '1H' },
  { key: 'h2', label: '2H' },
]

const MARKET_META = {
  ml: { label: 'ML', color: '#a78bfa', rank: 1 },
  total: { label: 'Total', color: '#4a9eff', rank: 2 },
  spread: { label: 'Spread', color: '#f59e0b', rank: 3 },
  team_total: { label: 'Team Total', color: '#22c55e', rank: 4 },
  player_points: { label: 'Pts Prop', color: '#fb7185', rank: 5 },
  player_rebounds: { label: 'Reb Prop', color: '#60a5fa', rank: 6 },
  player_assists: { label: 'Ast Prop', color: '#34d399', rank: 7 },
  player_threes: { label: '3PT Prop', color: '#f97316', rank: 8 },
  player_steals: { label: 'Stl Prop', color: '#14b8a6', rank: 9 },
  player_blocks: { label: 'Blk Prop', color: '#8b5cf6', rank: 10 },
  player_pr: { label: 'PR Prop', color: '#f43f5e', rank: 11 },
  player_pa: { label: 'PA Prop', color: '#06b6d4', rank: 12 },
  player_ra: { label: 'RA Prop', color: '#84cc16', rank: 13 },
  player_pra: { label: 'PRA Prop', color: '#eab308', rank: 14 },
  double_double: { label: 'Double-Double', color: '#eab308', rank: 15 },
  triple_double: { label: 'Triple-Double', color: '#ef4444', rank: 16 },
  overtime: { label: 'OT Yes/No', color: '#facc15', rank: 17 },
}

const DEFAULT_ENABLED = Object.fromEntries(Object.keys(MARKET_META).map((key) => [key, true]))
const CORE_MARKET_TYPES = new Set(['ml', 'spread', 'total'])

function fmtCents(value) {
  return value == null ? '—' : `${(Number(value) * 100).toFixed(1)}¢`
}

function fmtLine(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(1)
}

function lineKey(value) {
  const num = Number(value)
  return Number.isNaN(num) ? null : num.toFixed(1)
}

function normalizeName(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function getPeriodFromText(text) {
  const lower = String(text || '').toLowerCase()
  if (/\bq1\b/.test(lower)) return 'q1'
  if (/\bq2\b/.test(lower)) return 'q2'
  if (/\bq3\b/.test(lower)) return 'q3'
  if (/\bq4\b/.test(lower)) return 'q4'
  if (/\b1h\b|first half/.test(lower)) return 'h1'
  if (/\b2h\b|second half/.test(lower)) return 'h2'
  return 'game'
}

function baseType(type) {
  if (type === 'h1_winner' || type === 'h2_winner') return 'ml'
  if (type === 'h1_total' || type === 'h2_total') return 'total'
  if (type === 'h1_spread' || type === 'h2_spread') return 'spread'
  return type
}

function getDisplaySide(market) {
  if (!market) return null
  if (market.type === 'ml' || market.type === 'spread') return market.outcomes?.[0] || market.team || null
  if (market.type === 'team_total') return market.team || null
  if (market.type === 'overtime') return 'Overtime'
  if (market.type?.startsWith('player_')) return market.player || null
  if (market.type === 'double_double' || market.type === 'triple_double') return market.player || market.team || null
  return market.team || market.player || null
}

function makeSubjectKey(market) {
  const type = baseType(market.type)
  if (type === 'ml' || type === 'spread' || type === 'team_total') {
    return `${type}|${market.team || market.outcomes?.[0] || ''}`
  }
  if (type === 'overtime') {
    return 'overtime|game'
  }
  if (type?.startsWith('player_') || type === 'double_double' || type === 'triple_double') {
    return `${type}|${normalizeName(market.player || market.team || '')}`
  }
  return `${type}|${market.team || market.player || ''}`
}

function normalizeMarket(market, pred, source) {
  const rawType = market.type
  const type = baseType(rawType)
  if (!MARKET_META[type]) return null
  const title = market.question || market.title || market.ticker || ''
  const period = getPeriodFromText(title)
  const yesAsk = market.yes_ask ?? market.yes_mid ?? null
  const yesBid = market.yes_bid ?? market.yes_mid ?? null
  const noAsk = market.no_ask ?? market.no_mid ?? null
  const noBid = market.no_bid ?? market.no_mid ?? null
  return {
    source,
    rawType,
    type,
    period,
    line: market.line ?? null,
    team: market.team ?? null,
    player: market.player ?? null,
    title,
    labelSide: getDisplaySide(market),
    yesAsk,
    yesBid,
    noAsk,
    noBid,
    volume: market.volume ?? null,
    raw: market,
    pred,
    subjectKey: makeSubjectKey({ ...market, type }),
  }
}

function findModelMatch(row, source = 'possession') {
  const altLines = (row?.pred?.alt_lines || []).filter(a => (a.model_source || 'possession') === source)
  const rowLineKey = lineKey(row.line)

  if (row.period === 'h1' || row.period === 'h2') {
    if (row.type === 'total') {
      return altLines.find(a => a.market === 'half_total' && a.period === row.period) || null
    }
    if (row.type === 'team_total') {
      const teamKey = row.labelSide === row.pred.home_team ? 'home' : row.labelSide === row.pred.away_team ? 'away' : null
      return altLines.find(a => a.market === 'half_team' && a.period === row.period && a.team === teamKey) || null
    }
  }

  if (row.period === 'q1' || row.period === 'q2' || row.period === 'q3' || row.period === 'q4') {
    if (row.type === 'total') {
      return altLines.find(a => a.market === 'quarter_total' && a.period === row.period) || null
    }
  }

  if (row.type === 'team_total') {
    const teamKey = row.labelSide === row.pred.home_team ? 'home' : row.labelSide === row.pred.away_team ? 'away' : null
    return altLines.find(a => a.market === 'team_total' && a.team === teamKey) || null
  }

  if (row.type === 'overtime' && source === 'possession') {
    const otPct = Number(row.pred?.ot_pct)
    if (!Number.isFinite(otPct)) return null
    const yesPrice = row.kalshi?.yesAsk ?? row.poly?.yesAsk ?? null
    const noPrice = row.kalshi?.noAsk ?? row.poly?.noAsk ?? null
    const yesEdge = yesPrice != null ? otPct - Number(yesPrice) : null
    const noEdge = noPrice != null ? (1 - otPct) - Number(noPrice) : null
    const useYes = yesEdge != null && (noEdge == null || yesEdge >= noEdge)
    const useEdge = useYes ? yesEdge : noEdge
    const pick = useEdge == null ? null : (useYes ? 'YES' : 'NO')
    return {
      market: 'overtime',
      model: otPct,
      model_adj: otPct,
      diff: useEdge,
      edge: pick,
      signal: useEdge == null ? 'PASS' : Math.abs(useEdge) >= 0.05 ? 'BET' : Math.abs(useEdge) >= 0.02 ? 'MONITOR' : 'PASS',
    }
  }

  if (row.type === 'total') {
    return altLines.find(a => a.market === 'quarter_total' && lineKey(a.vegas) === rowLineKey) || null
  }

  if (row.type === 'spread') {
    const side = row.labelSide || ''
    return altLines.find(a => a.market === 'alt_spread' && a.label?.startsWith(side) && Number(a.label.split(' ').slice(-1)[0]) === Math.abs(Number(row.line))) || null
  }

  if (['player_points', 'player_rebounds', 'player_assists', 'player_threes', 'player_steals', 'player_blocks', 'player_pr', 'player_pa', 'player_ra', 'player_pra'].includes(row.type)) {
    const playerName = row.kalshi?.player || row.poly?.player || row.labelSide || ''
    const playerKey = normalizeName(playerName)
    return altLines.find((a) => {
      if (a.market !== row.type) return false
      if (normalizeName(a.player || a.label) !== playerKey) return false
      const vegasKey = lineKey(a.vegas)
      if (vegasKey && vegasKey === rowLineKey) return true
      if (vegasKey && rowLineKey) {
        const adj = (Number(row.line) - 0.5).toFixed(1)
        if (vegasKey === adj) return true
      }
      return false
    }) || null
  }

  if (['double_double', 'triple_double'].includes(row.type)) {
    const playerName = row.kalshi?.player || row.poly?.player || row.labelSide || ''
    const playerKey = normalizeName(playerName)
    return altLines.find((a) => a.market === row.type && normalizeName(a.player || a.label) === playerKey) || null
  }

  return null
}

function formatModelView(match) {
  if (!match) return 'No model'
  if (match.market === 'overtime') return `${((match.model || 0) * 100).toFixed(1)}% OT`
  if (match.market === 'alt_spread') return `${((match.model || 0) * 100).toFixed(1)}% cover`
  if (match.market?.startsWith('player_') || match.market === 'half_total' || match.market === 'team_total' || match.market === 'half_team' || match.market === 'quarter_total') {
    return `${match.diff != null ? (match.diff >= 0 ? 'Over ' : 'Under ') : ''}${Math.abs(Number(match.diff || 0)).toFixed(1)}`
  }
  const modelVal = match.model_adj ?? match.model
  return modelVal != null ? Number(modelVal).toFixed(1) : 'No model'
}

function formatPickText(row) {
  const model = row.modelMatch || row.playerMatch
  if (model?.edge) {
    if (model.edge === 'OVER' || model.edge === 'UNDER') {
      return `${model.edge} ${Math.abs(Number(model.diff || 0)).toFixed(1)}`
    }
    return model.edge
  }
  if (row.type === 'overtime') {
    if (model?.edge === 'YES' || model?.edge === 'NO') return model.edge
    return 'OT?'
  }
  if (row.type === 'spread' && row.labelSide) {
    return row.line != null ? `${row.labelSide} ${Number(row.line) > 0 ? '+' : ''}${fmtLine(row.line)}` : row.labelSide
  }
  if (row.type === 'total') {
    return row.line != null ? `${row.line >= 0 ? 'O/U ' : ''}${fmtLine(row.line)}` : 'Total'
  }
  return row.labelSide || row.marketLabel
}

function signalForRow(row) {
  const sig = row.modelMatch?.signal || row.playerMatch?.signal || 'PASS'
  const emoji = sig === 'BET' ? '🟢' : sig === 'MONITOR' ? '🟡' : '⚪'
  const pick = formatPickText(row)
  return { sig, emoji, pick }
}

function supportText(row) {
  if (row.modelMatch && row.playerMatch) return '2/2 agree'
  if (row.modelMatch) return 'Poss only'
  if (row.playerMatch) return 'PD only'
  return 'No model'
}

function marketLabel(row) {
  const meta = MARKET_META[row.type] || { label: row.type }
  const lineText = row.line != null ? ` ${fmtLine(row.line)}` : ''
  if (row.type === 'overtime') return meta.label
  if (row.type === 'spread' && row.labelSide) return `${row.labelSide}${lineText}`
  if (row.type === 'team_total' && row.labelSide) return `${row.labelSide} TT${lineText}`
  if (row.type === 'total') return `${meta.label}${lineText}`
  if (row.labelSide) return `${meta.label} · ${row.labelSide}${lineText}`
  return `${meta.label}${lineText}`
}

function rowStrength(row) {
  const possEdge = row.modelMatch?.diff != null ? Math.abs(Number(row.modelMatch.diff)) : 0
  const playerEdge = row.playerMatch?.diff != null ? Math.abs(Number(row.playerMatch.diff)) : 0
  return Math.max(possEdge, playerEdge, row.bestWidth || 0, row.crossGap || 0)
}

function getDateLabel(date, today, tomorrow) {
  if (!date || date === today) return 'Today'
  if (date === tomorrow) return 'Tomorrow'
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }).toUpperCase()
}

function isCapturedByCoreTabs(row, variant) {
  if (!CORE_MARKET_TYPES.has(row.type)) return false
  if (variant === 'game') return row.period === 'game'
  return row.period !== 'game'
}

function buildRows(predictions, variant, period) {
  const rows = []
  for (const pred of predictions) {
    const grouped = new Map()
    for (const km of pred.kalshi_markets || []) {
      const normalized = normalizeMarket(km, pred, 'kalshi')
      if (!normalized) continue
      const key = `${normalized.period}|${normalized.type}|${normalized.subjectKey}|${normalized.line ?? ''}`
      const entry = grouped.get(key) || {
        key: `${pred.game_id}|${key}`,
        pred,
        type: normalized.type,
        period: normalized.period,
        line: normalized.line,
        subjectKey: normalized.subjectKey,
        labelSide: normalized.labelSide,
        kalshi: null,
        poly: null,
      }
      entry.kalshi = normalized
      grouped.set(key, entry)
    }
    for (const pm of pred.poly_markets || []) {
      const normalized = normalizeMarket(pm, pred, 'poly')
      if (!normalized) continue
      const key = `${normalized.period}|${normalized.type}|${normalized.subjectKey}|${normalized.line ?? ''}`
      const entry = grouped.get(key) || {
        key: `${pred.game_id}|${key}`,
        pred,
        type: normalized.type,
        period: normalized.period,
        line: normalized.line,
        subjectKey: normalized.subjectKey,
        labelSide: normalized.labelSide,
        kalshi: null,
        poly: null,
      }
      entry.poly = normalized
      grouped.set(key, entry)
    }

    for (const row of grouped.values()) {
      const hasK = !!row.kalshi
      const hasP = !!row.poly
      const periodGroup = variant === 'period' ? row.period !== 'game' : row.period === 'game'
      if (!periodGroup) continue
      if (variant === 'period' && row.period !== period) continue
      const kWidth = hasK && row.kalshi.yesAsk != null && row.kalshi.yesBid != null ? row.kalshi.yesAsk - row.kalshi.yesBid : null
      const pWidth = hasP && row.poly.yesAsk != null && row.poly.yesBid != null ? row.poly.yesAsk - row.poly.yesBid : null
      const crossGap = hasK && hasP && row.kalshi.yesAsk != null && row.poly.yesAsk != null ? Math.abs(row.kalshi.yesAsk - row.poly.yesAsk) : null
      const modelMatch = findModelMatch({ ...row, pred }, 'possession')
      const playerMatch = findModelMatch({ ...row, pred }, 'playerdeep')
      rows.push({
        ...row,
        marketLabel: marketLabel(row),
        marketMeta: MARKET_META[row.type] || { color: '#888', rank: 99 },
        hasK,
        hasP,
        both: hasK && hasP,
        kOnly: hasK && !hasP,
        pOnly: !hasK && hasP,
        kWidth,
        pWidth,
        bestWidth: Math.max(kWidth || 0, pWidth || 0) || null,
        crossGap,
        modelMatch,
        playerMatch,
      })
    }
  }
  return rows.sort((a, b) => {
    if ((a.pred.game_date || '') !== (b.pred.game_date || '')) return (a.pred.game_date || '').localeCompare(b.pred.game_date || '')
    const diff = rowStrength(b) - rowStrength(a)
    if (diff !== 0) return diff
    if (a.marketMeta.rank !== b.marketMeta.rank) return a.marketMeta.rank - b.marketMeta.rank
    return (a.pred.game_time || '').localeCompare(b.pred.game_time || '')
  }).map((row, idx) => ({ ...row, rank: idx + 1 }))
}

function AltMarketTable({ predictions = [], variant = 'game' }) {
  const [enabled, setEnabled] = useState(DEFAULT_ENABLED)
  const [period, setPeriod] = useState('h1')
  const [bookFilter, setBookFilter] = useState('all')
  const [modelFilter, setModelFilter] = useState('all')

  const allRows = useMemo(() => buildRows(predictions, variant, period), [predictions, variant, period])
  const altRows = useMemo(() => allRows.filter((row) => !isCapturedByCoreTabs(row, variant)), [allRows, variant])
  const coveredRows = useMemo(() => allRows.filter((row) => isCapturedByCoreTabs(row, variant)), [allRows, variant])
  const availableMarkets = useMemo(() => {
    const present = new Set(altRows.map(row => row.type))
    return Object.entries(MARKET_META)
      .filter(([key]) => present.has(key))
      .map(([key, meta]) => ({ key, ...meta, count: altRows.filter((row) => row.type === key).length }))
      .sort((a, b) => a.rank - b.rank)
  }, [altRows])

  const filteredRows = useMemo(() => altRows.filter(row => {
    if (enabled[row.type] === false) return false
    if (bookFilter === 'k' && !row.kOnly) return false
    if (bookFilter === 'p' && !row.pOnly) return false
    if (bookFilter === 'both' && !row.both) return false
    if (modelFilter === 'supported' && !(row.modelMatch || row.playerMatch)) return false
    return true
  }), [altRows, enabled, bookFilter, modelFilter])

  const coveredCounts = useMemo(() => {
    const counts = new Map()
    for (const row of coveredRows) counts.set(row.type, (counts.get(row.type) || 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [coveredRows])

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const tomorrow = new Date(Date.now() + 86400000).toLocaleDateString('en-CA', { timeZone: 'America/New_York' })

  const note = variant === 'period'
    ? 'Quarter/half Alt Markets now mean non-core inventory only. Core Q/H ML, Spread, and OU stay in their dedicated tabs; this page shows everything else cleanly and honestly.'
    : 'Full-game Alt Markets now mean inventory outside the main ML / Spread / OU tabs. Core markets stay in their dedicated tabs; this page is for the rest.'

  const showPeriodEmptyState = variant === 'period' && altRows.length === 0

  if (!predictions.length) return <div className="empty">No alt market inventory available yet.</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {variant === 'period' ? (
        <div className="period-toggle-row">
          {PERIOD_OPTIONS.map(option => (
            <button key={option.key} className={`period-toggle ${period === option.key ? 'active' : ''}`} onClick={() => setPeriod(option.key)}>
              {option.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="summary-note" style={{ flexShrink: 0, padding: '0 0 8px' }}>{note}</div>

      <div className="summary-note alt-market-inventory-note" style={{ flexShrink: 0, padding: '0 0 10px' }}>
        <div><strong>Live alt-only types here:</strong> {availableMarkets.length ? availableMarkets.map((market) => `${market.label} (${market.count})`).join(' • ') : 'none right now'}</div>
        {coveredCounts.length > 0 ? <div style={{ marginTop: 4 }}><strong>Already covered in other tabs, hidden here:</strong> {coveredCounts.map(([type, count]) => `${MARKET_META[type]?.label || type} (${count})`).join(' • ')}</div> : null}
      </div>

      {showPeriodEmptyState ? null : (
        <div style={{ display: 'flex', gap: '6px', padding: '0 0 8px', flexWrap: 'wrap', alignItems: 'center', flexShrink: 0 }}>
          {[
            ['all', 'All books'],
            ['k', 'K only'],
            ['p', 'P only'],
            ['both', 'Both'],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setBookFilter(key)}
              className={`period-toggle ${bookFilter === key ? 'active' : ''}`}
            >
              {label}
            </button>
          ))}

          <div style={{ width: 1, height: 20, background: '#333', margin: '0 4px' }} />

          {availableMarkets.map((market) => (
            <button
              key={market.key}
              onClick={() => setEnabled(prev => ({ ...prev, [market.key]: !prev[market.key] }))}
              style={{
                padding: '5px 10px', fontSize: '0.74rem', borderRadius: '999px', border: '1px solid #333', cursor: 'pointer',
                background: enabled[market.key] ? `${market.color}22` : '#171717', color: enabled[market.key] ? market.color : '#777', fontWeight: enabled[market.key] ? 700 : 500,
              }}
            >
              {market.label}
            </button>
          ))}

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.72rem', color: '#888' }}>Focus</span>
            <select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} style={{ background: '#171717', color: '#ddd', border: '1px solid #333', borderRadius: '4px', padding: '4px 8px', fontSize: '0.75rem' }}>
              <option value="all">All rows</option>
              <option value="supported">Model support</option>
            </select>
          </div>
        </div>
      )}

      {showPeriodEmptyState ? (
        <div className="table-container" style={{ display: 'flex', alignItems: 'stretch' }}>
          <div style={{
            width: '100%',
            margin: '0 auto',
            border: '1px solid #2b2b2b',
            borderRadius: 12,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.01) 100%)',
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <div>
                <div style={{ color: '#f3f4f6', fontWeight: 800, fontSize: '1rem' }}>No non-core {PERIOD_OPTIONS.find((option) => option.key === period)?.label || period.toUpperCase()} alt markets live</div>
                <div style={{ color: '#9ca3af', fontSize: '0.84rem', marginTop: 4 }}>That’s expected right now. Core {PERIOD_OPTIONS.find((option) => option.key === period)?.label || period.toUpperCase()} ML / Spread / OU is already handled in the regular period tabs.</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {coveredCounts.map(([type, count]) => (
                  <span key={type} style={{ padding: '4px 9px', borderRadius: 999, border: '1px solid #353535', background: '#171717', color: '#d1d5db', fontSize: '0.72rem', fontWeight: 700 }}>
                    {MARKET_META[type]?.label || type} {count}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ color: '#6b7280', fontSize: '0.78rem' }}>
              If non-core period inventory appears later, it’ll populate here automatically with the same locked-table layout as the other tabs.
            </div>
          </div>
        </div>
      ) : (
        <div className="table-container">
        <table className="predictions-table summary-table summary-table--alt">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-matchup sticky-col">Matchup</th>
              <th className="col-time">Time</th>
              <th className="col-pick">Signal</th>
              <th className="col-support">Support</th>
              <th className="col-market">Market</th>
              <th className="col-books">Books</th>
              <th className="col-kp">Kalshi</th>
              <th className="col-kp">Polymarket</th>
              <th className="col-model">Possession</th>
              <th className="col-model">Player Deep</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr><td colSpan={11} style={{ textAlign: 'center', color: '#666', padding: '20px' }}>{variant === 'period' ? 'No non-core Q/H alt markets are live right now. Core period ML / Spread / OU stays in the other tabs.' : 'No alt-only markets match these filters.'}</td></tr>
            ) : filteredRows.map((row, idx) => {
              const { sig, emoji, pick } = signalForRow(row)
              const rowDate = row.pred.game_date || today
              const prevDate = idx > 0 ? (filteredRows[idx - 1].pred.game_date || today) : null
              const showDate = rowDate !== prevDate
              return (
                <React.Fragment key={row.key}>
                  {showDate ? (
                    <tr className="date-header-row">
                      <td colSpan={11} className="date-header-cell">{getDateLabel(rowDate, today, tomorrow)}</td>
                    </tr>
                  ) : null}
                  <tr className="prediction-row">
                    <td className="rank-cell">{row.rank}</td>
                    <td className="matchup-cell sticky-col">{renderMatchupCell(row.pred)}</td>
                    <td className="time-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{row.pred.game_time ?? '—'}</span>
                        {variant === 'period' ? <span style={{ fontSize: '0.66rem', color: '#777' }}>{row.period.toUpperCase()}</span> : null}
                      </div>
                    </td>
                    {renderSignalPickCell({ pick, emoji })}
                    {renderSupportCell({ signal: sig, agreementText: supportText(row) })}
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <span style={{ display: 'inline-block', width: 'fit-content', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: '4px', background: `${row.marketMeta.color}22`, color: row.marketMeta.color, border: `1px solid ${row.marketMeta.color}55` }}>{row.marketLabel}</span>
                        <span style={{ fontSize: '0.66rem', color: '#666' }}>{row.kalshi?.title || row.poly?.title || '—'}</span>
                      </div>
                    </td>
                    <td className="context-cell">{row.both ? 'Both live' : row.kOnly ? 'Kalshi only' : row.pOnly ? 'Polymarket only' : '—'}</td>
                    <td className="vegas-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{row.hasK ? `${fmtCents(row.kalshi.yesAsk)} ask / ${fmtCents(row.kalshi.yesBid)} bid` : '—'}</span>
                        <span style={{ fontSize: '0.66rem', color: '#777' }}>Width {fmtCents(row.kWidth)}</span>
                      </div>
                    </td>
                    <td className="vegas-cell">
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span>{row.hasP ? `${fmtCents(row.poly.yesAsk)} ask / ${fmtCents(row.poly.yesBid)} bid` : '—'}</span>
                        <span style={{ fontSize: '0.66rem', color: '#777' }}>Width {fmtCents(row.pWidth)}</span>
                      </div>
                    </td>
                    <td className="model-cell" style={{ textAlign: 'center', color: row.modelMatch ? '#e5e7eb' : '#666' }}>{formatModelView(row.modelMatch)}</td>
                    <td className="model-cell" style={{ textAlign: 'center', color: row.playerMatch ? '#e5e7eb' : '#666' }}>{formatModelView(row.playerMatch)}</td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
      )}
    </div>
  )
}

export default AltMarketTable
