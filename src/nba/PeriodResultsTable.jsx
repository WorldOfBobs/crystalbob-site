import React, { useMemo, useState } from 'react'

const PERIODS = [
  { key: 'q1', label: 'Q1' },
  { key: 'q2', label: 'Q2' },
  { key: 'q3', label: 'Q3' },
  { key: 'q4', label: 'Q4' },
  { key: 'h1', label: '1H' },
  { key: 'h2', label: '2H' },
]

const STATUS_LABEL = { final: '✅ Final', in: '😩 Live', pre: '⏳ Pending', pending: '⏳ Pending' }
const TYPE_LABEL = { moneyline: 'ML', spread: 'Spread', total: 'OU' }

function SourceStatusBadge({ sourceCounts, normalizedReady }) {
  if (!sourceCounts) return null

  const preferred = sourceCounts.preferred_source || (normalizedReady ? 'normalized' : 'legacy')
  const normalizedCount = typeof sourceCounts.normalized_predictions === 'number' ? sourceCounts.normalized_predictions : null
  const legacyCount = typeof sourceCounts.legacy_predictions === 'number' ? sourceCounts.legacy_predictions : null
  const gamesCount = typeof sourceCounts.normalized_games === 'number' ? sourceCounts.normalized_games : null
  const isNormalized = preferred === 'normalized'

  const lines = [
    isNormalized ? 'Normalized tracking tables are the active source.' : 'Legacy predictions table is still the active source.',
    normalizedCount != null ? `Normalized prediction rows: ${normalizedCount}` : null,
    legacyCount != null ? `Legacy prediction rows: ${legacyCount}` : null,
    gamesCount != null ? `Normalized games: ${gamesCount}` : null,
    normalizedReady === true ? 'Normalized read path is ready.' : 'Normalized read path is not ready yet.',
  ].filter(Boolean)

  return (
    <span
      className={`results-source-pill ${isNormalized ? 'is-normalized' : 'is-legacy'}`}
      title={lines.join('\n')}
      aria-label={`Results source: ${preferred}`}
    >
      <span className="results-source-pill-dot" aria-hidden="true" />
      <span>{isNormalized ? 'Normalized' : 'Legacy'}</span>
    </span>
  )
}

function fmtSigned(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}`
}

function fmtValue(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(1)
}

function resultState(row) {
  if (row.status !== 'final') return null
  if (row.grade_status === 'win') return 'win'
  if (row.grade_status === 'loss') return 'loss'
  if (row.grade_status === 'push') return 'push'
  if (row.market_type === 'moneyline') {
    const home = Number(row.period_home_score)
    const away = Number(row.period_away_score)
    if (!Number.isFinite(home) || !Number.isFinite(away)) return null
    if (home === away) return 'push'
    const winner = home > away ? 'home' : 'away'
    return winner === row.pick_side ? 'win' : 'loss'
  }
  return null
}

function resultLabel(row) {
  const state = resultState(row)
  if (state === 'win') return '✅ W'
  if (state === 'loss') return '❌ L'
  if (state === 'push') return 'PUSH'
  return '—'
}

function getPickLabel(row) {
  if (row.market_type === 'total') {
    return (row.selection_key || row.pick_side || '—').toString().toUpperCase()
  }
  if (row.pick_side === 'home') return row.home_team
  if (row.pick_side === 'away') return row.away_team
  return '—'
}

function getModelLabel(row) {
  if (row.market_type === 'moneyline') {
    const team = row.pick_side === 'home' ? row.home_team : row.pick_side === 'away' ? row.away_team : '—'
    return `${team}${row.predicted_line != null ? ` (${fmtSigned(row.predicted_line)})` : ''}`
  }
  if (row.predicted_line == null) return '—'
  return row.market_type === 'spread' ? fmtSigned(row.predicted_line) : fmtValue(row.predicted_line)
}

function getMarketLabel(row) {
  if (row.line_value == null) return '—'
  return row.market_type === 'spread' ? fmtSigned(row.line_value) : fmtValue(row.line_value)
}

function getActualLabel(row) {
  if (row.market_type === 'moneyline') {
    if (row.period_home_score == null || row.period_away_score == null) return '—'
    const home = Number(row.period_home_score)
    const away = Number(row.period_away_score)
    if (home === away) return 'TIE'
    return home > away ? row.home_team : row.away_team
  }
  if (row.actual_value == null) return '—'
  return row.market_type === 'spread' ? fmtSigned(row.actual_value) : fmtValue(row.actual_value)
}

function getTodayStr() {
  const now = new Date()
  const et = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  return et.toISOString().slice(0, 10)
}

function signalMeta(signal, score) {
  const normalized = String(signal || '').toUpperCase()
  if (normalized === 'BET') return { emoji: '🟢', className: 'signal-bet', label: 'BET', score: score ?? '—' }
  if (normalized === 'MONITOR') return { emoji: '🟡', className: 'signal-monitor', label: 'MON', score: score ?? '—' }
  return { emoji: '⚪', className: 'signal-pass', label: 'PASS', score: score ?? '—' }
}

function getEdgeMeta(row) {
  if (row.predicted_edge != null && !Number.isNaN(Number(row.predicted_edge))) {
    const value = Number(row.predicted_edge)
    return {
      value,
      label: fmtSigned(value),
      color: value > 0 ? '#22c55e' : value < 0 ? '#ef4444' : 'var(--text-dim)',
      source: 'stored',
      sourceLabel: 'stored',
      detail: `Stored model edge from normalized prediction row.${row.market_type !== 'moneyline' && row.predicted_line != null && row.line_value != null ? ` Model ${fmtValue(row.predicted_line)} vs market ${fmtValue(row.line_value)}.` : ''}`,
    }
  }
  if (row.market_type !== 'moneyline' && row.predicted_line != null && row.line_value != null) {
    const value = Number(row.predicted_line) - Number(row.line_value)
    return {
      value,
      label: fmtSigned(value),
      color: value > 0 ? '#22c55e' : value < 0 ? '#ef4444' : 'var(--text-dim)',
      source: 'fallback',
      sourceLabel: 'Δ',
      detail: `Fallback delta: predicted line minus tracked market line because no stored predicted_edge was available. ${fmtValue(row.predicted_line)} - ${fmtValue(row.line_value)} = ${fmtSigned(value)}.`,
    }
  }
  return {
    value: null,
    label: '—',
    color: 'var(--text-dim)',
    source: 'none',
    sourceLabel: null,
    detail: 'No edge available for this row.',
  }
}

export default function PeriodResultsTable({ results }) {
  const [period, setPeriod] = useState('q1')

  const { rows, grouped, sortedDates, summary } = useMemo(() => {
    const all = results?.games || []
    const filtered = all
      .filter(row => row.period === period)
      .sort((a, b) => {
        const dateCmp = (b.date || '').localeCompare(a.date || '')
        if (dateCmp) return dateCmp
        const matchupCmp = (a.matchup || '').localeCompare(b.matchup || '')
        if (matchupCmp) return matchupCmp
        const typeOrder = { spread: 0, total: 1, moneyline: 2 }
        return (typeOrder[a.market_type] ?? 9) - (typeOrder[b.market_type] ?? 9)
      })

    const byDate = {}
    for (const row of filtered) {
      const date = row.date || 'Unknown'
      if (!byDate[date]) byDate[date] = []
      byDate[date].push(row)
    }

    const finalRows = filtered.filter(row => row.status === 'final')
    const pendingRows = filtered.filter(row => row.status !== 'final')
    const betRows = filtered.filter(row => String(row.signal || '').toUpperCase() === 'BET')
    const monitorRows = filtered.filter(row => String(row.signal || '').toUpperCase() === 'MONITOR')
    const edgeRows = filtered.filter(row => getEdgeMeta(row).value != null)
    const byType = { spread: { w: 0, l: 0, p: 0 }, total: { w: 0, l: 0, p: 0 }, moneyline: { w: 0, l: 0, p: 0 } }
    for (const row of finalRows) {
      const state = resultState(row)
      if (!state || !byType[row.market_type]) continue
      if (state === 'win') byType[row.market_type].w += 1
      else if (state === 'loss') byType[row.market_type].l += 1
      else if (state === 'push') byType[row.market_type].p += 1
    }

    return {
      rows: filtered,
      grouped: byDate,
      sortedDates: Object.keys(byDate).sort((a, b) => b.localeCompare(a)),
      summary: {
        tracked: filtered.length,
        graded: finalRows.length,
        pending: pendingRows.length,
        bet: betRows.length,
        monitor: monitorRows.length,
        edged: edgeRows.length,
        byType,
      },
    }
  }, [period, results])

  if (!results || !Array.isArray(results.games)) {
    return <div className="empty">Loading quarter/half history…</div>
  }

  const todayStr = getTodayStr()
  const periodLabel = PERIODS.find(p => p.key === period)?.label || period.toUpperCase()
  const olderBackfillAvailable = Boolean(results?.meta?.older_backfill_available)
  const legacyBackfillRows = Number(results?.meta?.source_counts?.legacy_period_backfill_rows || 0)
  const sourceCounts = results?.meta?.source_counts || null
  const normalizedReady = results?.meta?.normalized_ready === true

  return (
    <div className="table-container results-scroll-container">
      <div className="market-subtabs" style={{ marginBottom: 12 }}>
        {PERIODS.map(p => (
          <button
            key={p.key}
            className={`market-subtab ${period === p.key ? 'active' : ''}`}
            onClick={() => setPeriod(p.key)}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="results-summary-bar">
        <span className="results-stat" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{periodLabel} history:</span>
        <span className="results-stat"><strong>Tracked:</strong> {summary.tracked}</span>
        <span className="results-stat"><strong>Graded:</strong> {summary.graded}</span>
        <span className="results-stat"><strong>Pending:</strong> {summary.pending}</span>
        <span className="results-stat"><strong>BET:</strong> {summary.bet}</span>
        <span className="results-stat"><strong>MON:</strong> {summary.monitor}</span>
        <span className="results-stat" title="Stored edge rows use normalized predicted_edge directly. Rows without it fall back to predicted line minus tracked market line."><strong>Edge rows:</strong> {summary.edged}</span>
        <span
          className="results-stat"
          style={{ color: olderBackfillAvailable ? 'inherit' : 'var(--text-dim)' }}
          title={olderBackfillAvailable
            ? `${legacyBackfillRows} retro-backfilled rows synthesized from legacy full-game captures using calibrated period splits and historical NBA boxscores.`
            : 'No older period rows could be backfilled from legacy captures in the current range.'}
        >
          <strong>Older backfill:</strong> {olderBackfillAvailable ? 'available' : 'not available from old captures'}
        </span>
        {sourceCounts && (
          <span className="results-stat results-source-stat">
            <strong>Source:</strong>
            <SourceStatusBadge sourceCounts={sourceCounts} normalizedReady={normalizedReady} />
          </span>
        )}
      </div>

      <div className="results-summary-bar results-range-summary">
        <span className="results-stat"><strong>Spread:</strong> {summary.byType.spread.w}W-{summary.byType.spread.l}L{summary.byType.spread.p ? `-${summary.byType.spread.p}P` : ''}</span>
        <span className="results-stat"><strong>O/U:</strong> {summary.byType.total.w}W-{summary.byType.total.l}L{summary.byType.total.p ? `-${summary.byType.total.p}P` : ''}</span>
        <span className="results-stat"><strong>ML:</strong> {summary.byType.moneyline.w}W-{summary.byType.moneyline.l}L{summary.byType.moneyline.p ? `-${summary.byType.moneyline.p}P` : ''}</span>
      </div>

      {rows.length === 0 ? (
        <div className="empty">No real {periodLabel} history yet. It’ll populate as tracked period rows get captured and graded.</div>
      ) : (
        <table className="predictions-table results-table">
          <thead>
            <tr className="group-header-row">
              <th className="sticky-col" rowSpan={2}>Matchup</th>
              <th rowSpan={2}>Score</th>
              <th colSpan={3} style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px' }}>MARKET</th>
              <th colSpan={5} className="section-start" style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px' }}>MODEL</th>
              <th rowSpan={2}>Result</th>
            </tr>
            <tr>
              <th>Type</th>
              <th>Line</th>
              <th>Pick</th>
              <th className="section-start">Sig</th>
              <th>Conv</th>
              <th>Edge</th>
              <th>Model</th>
              <th>Actual</th>
            </tr>
          </thead>
          <tbody>
            {sortedDates.map(date => {
              const dayRows = grouped[date]
              const hasPending = dayRows.some(row => row.status !== 'final')
              const label = date === todayStr
                ? `⏳ ${date} — Today`
                : hasPending ? `😩 ${date}` : `✅ ${date}`
              return (
                <React.Fragment key={date}>
                  <tr className="section-header-row"><td colSpan={10}>{label}</td></tr>
                  {dayRows.map((row, idx) => {
                    const sig = signalMeta(row.signal, row.conviction_score)
                    const edge = getEdgeMeta(row)
                    return (
                      <tr key={`${row.prediction_id || row.game_id}-${idx}`} className={`prediction-row ${row.status !== 'final' ? 'row-pending' : ''}`}>
                        <td className="matchup-cell sticky-col"><strong>{row.matchup}</strong></td>
                        <td className="time-cell">{STATUS_LABEL[row.status] || row.status}{row.score ? ` ${row.score}` : ''}</td>
                        <td className="vegas-cell"><span style={{ fontWeight: 700 }}>{TYPE_LABEL[row.market_type] || row.market_type}</span></td>
                        <td className="vegas-cell">{getMarketLabel(row)}</td>
                        <td className="pick-cell">{getPickLabel(row)}</td>
                        <td className={`model-cell section-start ${sig.className}`} style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{sig.emoji} {sig.label}</td>
                        <td className="model-cell" style={{ whiteSpace: 'nowrap', fontWeight: 700 }}>{row.conviction_score ?? '—'}</td>
                        <td className="model-cell" title={edge.detail}>
                          <span className={`results-edge-chip ${edge.source === 'fallback' ? 'is-fallback' : edge.source === 'stored' ? 'is-stored' : 'is-empty'}`} style={{ color: edge.color }}>
                            <span>{edge.label}</span>
                            {edge.sourceLabel ? <span className="results-edge-chip-tag">{edge.sourceLabel}</span> : null}
                          </span>
                        </td>
                        <td className="model-cell">{getModelLabel(row)}</td>
                        <td className="model-cell">{getActualLabel(row)}</td>
                        <td className={`result-cell ${resultState(row) === 'win' ? 'result-win' : resultState(row) === 'loss' ? 'result-loss' : ''}`} style={{ fontWeight: 700 }}>{resultLabel(row)}</td>
                      </tr>
                    )
                  })}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
