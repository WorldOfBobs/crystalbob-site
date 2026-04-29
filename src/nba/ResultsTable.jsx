import React from 'react'
import { getModelRange } from './distributionUtils'

const STATUS_LABEL = { final: '✅ Final', in: '😩 Live', pre: '⏳ Pending', pending: '⏳ Pending' }

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

function ResultCell({ result, label }) {
  if (result === null || result === undefined) return <td className="result-cell">—</td>
  if (result === true)  return <td className="result-cell result-win">✅ {label || 'W'}</td>
  if (result === false) return <td className="result-cell result-loss">❌ {label || 'L'}</td>
  if (result === 'push')  return <td className="result-cell">PUSH</td>
  return <td className="result-cell">—</td>
}

function formatSigned(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—'
  const num = Number(value)
  return `${num > 0 ? '+' : ''}${num.toFixed(1)}`
}

function formatRange(low, high, prefix = '') {
  if (low === null || low === undefined || high === null || high === undefined) return null
  return `${prefix}${formatSigned(low)} to ${formatSigned(high)}`
}

function compareActualToRange(actual, range, kind) {
  if (actual == null || !range) return null
  const num = Number(actual)
  if (Number.isNaN(num)) return null
  if (num < range.low) {
    return {
      className: 'result-loss',
      shortLabel: kind === 'spread' ? 'M low' : 'T low',
      detail: `${kind === 'spread' ? 'Margin' : 'Total'} under range by ${(range.low - num).toFixed(1)}`,
    }
  }
  if (num > range.high) {
    return {
      className: 'result-loss',
      shortLabel: kind === 'spread' ? 'M high' : 'T high',
      detail: `${kind === 'spread' ? 'Margin' : 'Total'} over range by ${(num - range.high).toFixed(1)}`,
    }
  }
  return {
    className: 'result-win',
    shortLabel: kind === 'spread' ? 'M in' : 'T in',
    detail: `${kind === 'spread' ? 'Margin' : 'Total'} finished inside range`,
  }
}

function normalizeStoredRangeOutcome(raw, kind) {
  if (!raw || typeof raw !== 'object') return null
  const direction = raw.direction || raw.miss_direction || (raw.hit === true || raw.in_range === true ? 'in' : null)
  const hit = raw.hit ?? raw.in_range ?? raw.range_hit
  if (hit === undefined && !direction) return null
  const isHit = hit !== undefined ? Boolean(hit) : direction === 'in'
  const missBy = raw.miss_by ?? raw.miss_amount
  return {
    className: isHit ? 'result-win' : 'result-loss',
    shortLabel: kind === 'spread' ? (isHit ? 'M in' : direction === 'high' ? 'M high' : 'M low') : (isHit ? 'T in' : direction === 'high' ? 'T high' : 'T low'),
    hit: isHit,
    direction: isHit ? 'in' : direction || 'miss',
    detail: `${kind === 'spread' ? 'Margin' : 'Total'} ${isHit ? 'finished inside range' : `missed ${direction || 'range'}${missBy != null ? ` by ${Number(missBy).toFixed(1)}` : ''}`}`,
  }
}

function getStoredRangeOutcome(game, kind) {
  const key = kind === 'spread' ? 'spread' : 'total'
  const altKey = kind === 'spread' ? 'margin' : 'total'
  return normalizeStoredRangeOutcome(
    game.range_outcomes?.[key]
      || game.range_outcomes?.[altKey]
      || game[`${altKey}_range_outcome`]
      || game[`${key}_range_outcome`],
    kind,
  )
}

function actualValueForRange(game, kind) {
  if (game.home_score != null && game.away_score != null) {
    return kind === 'spread'
      ? Number(game.home_score) - Number(game.away_score)
      : Number(game.home_score) + Number(game.away_score)
  }
  if (!game.score || typeof game.score !== 'string') return null
  const parts = game.score.replace(/\s/g, '').split('-')
  if (parts.length !== 2 || !parts.every(p => /^-?\d+$/.test(p))) return null
  const away = Number(parts[0])
  const home = Number(parts[1])
  return kind === 'spread' ? home - away : home + away
}

function getRangeOutcome(game, kind) {
  const stored = getStoredRangeOutcome(game, kind)
  if (stored) return stored
  const range = kind === 'spread'
    ? getModelRange(game.model_spread_mean, game.model_margin_std, game.model_margin_percentiles)
    : getModelRange(game.model_total_mean, game.model_total_std, game.model_total_percentiles)
  return compareActualToRange(actualValueForRange(game, kind), range, kind)
}

function RangeOutcomeLine({ outcome }) {
  if (!outcome) return null
  return <div className={outcome.className}>{outcome.shortLabel}</div>
}

function ModelRangeCell({ game }) {
  const spreadMean = game.model_spread_mean
  const totalMean = game.model_total_mean
  const spreadRange = getModelRange(game.model_spread_mean, game.model_margin_std, game.model_margin_percentiles)
  const totalRange = getModelRange(game.model_total_mean, game.model_total_std, game.model_total_percentiles)
  const spreadOutcome = getRangeOutcome(game, 'spread')
  const totalOutcome = getRangeOutcome(game, 'total')

  const distributionModel = game.model_distribution_model || null
  const lines = [
    spreadMean != null ? `Spread mean: ${formatSigned(spreadMean)}` : null,
    totalMean != null ? `Total mean: ${Number(totalMean).toFixed(1)}` : null,
    spreadRange ? `${spreadRange.label} spread ${formatRange(spreadRange.low, spreadRange.high)}` : null,
    totalRange ? `${totalRange.label} total ${formatRange(totalRange.low, totalRange.high, '')}` : null,
    spreadOutcome?.detail,
    totalOutcome?.detail,
    spreadRange?.source === 'percentiles' || totalRange?.source === 'percentiles'
      ? `Using ${distributionModel || 'best available model'} distribution percentiles.`
      : null,
    spreadRange?.source === 'stddev' || totalRange?.source === 'stddev'
      ? `Approximation from ${distributionModel || 'best available model'} mean ± 1 std dev.`
      : null,
  ].filter(Boolean)

  if (spreadMean == null && totalMean == null && !spreadRange && !totalRange) {
    return <td className="model-cell" style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>—</td>
  }

  return (
    <td className="model-cell" style={{ fontSize: '0.72rem', lineHeight: 1.25, whiteSpace: 'nowrap' }} title={lines.join('\n')}>
      <div><strong>S</strong> {spreadMean != null ? formatSigned(spreadMean) : '—'}</div>
      <div style={{ color: 'var(--text-dim)' }}><strong>T</strong> {totalMean != null ? Number(totalMean).toFixed(1) : '—'}</div>
      {(spreadOutcome || totalOutcome) && (
        <div style={{ marginTop: 2 }}>
          <RangeOutcomeLine outcome={spreadOutcome} />
          <RangeOutcomeLine outcome={totalOutcome} />
        </div>
      )}
    </td>
  )
}

function ModelPickCell({ pick, correct }) {
  if (!pick) return <td className="pick-cell">—</td>
  const cls = correct === true ? 'result-win' : correct === false ? 'result-loss' : ''
  const badge = correct === true ? ' ✅' : correct === false ? ' ❌' : ''
  return <td className={`pick-cell ${cls}`.trim()}><strong>{pick}</strong>{badge}</td>
}

/** Conviction badge: 🟢 ≥80 BET, 🟡 ≥60 WATCH, ⚪ <60 */
function ConvBadge({ score, className = '' }) {
  if (!score && score !== 0) return <td className={`conv-cell ${className}`} style={{ textAlign: 'center', fontSize: '0.75rem' }}>—</td>
  const emoji = score >= 80 ? '🟢' : score >= 60 ? '🟡' : '⚪'
  const label = score >= 80 ? 'BET' : score >= 60 ? 'WATCH' : ''
  const cls = score >= 80 ? 'signal-bet' : score >= 60 ? 'signal-monitor' : 'signal-pass'
  return (
    <td className={`conv-cell ${className}`} style={{ textAlign: 'center', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
      {emoji} <span className={cls}>{score}</span>{label && <span style={{ marginLeft: 2, fontSize: '0.65rem' }}>{label}</span>}
    </td>
  )
}

/** Evaluate O/U result: did model's pick match what actually happened vs Vegas? */
function evaluateOUResult(totalPick, vegasTotal, score) {
  if (!totalPick || vegasTotal == null || !score) return null
  const parts = score.replace(/\s/g, '').split('-')
  if (parts.length !== 2 || !parts.every(p => /^\d+$/.test(p))) return null
  const actual = parseInt(parts[0]) + parseInt(parts[1])
  const modelSaidOver = totalPick.toUpperCase().includes('OVER')
  const actualWentOver = actual > vegasTotal
  if (actual === vegasTotal) return 'push'
  return modelSaidOver === actualWentOver
}

/** Get date string N days ago in YYYY-MM-DD (ET approx) */
function getDaysAgoStr(n) {
  const now = new Date()
  const et = new Date(now.getTime() - 4 * 60 * 60 * 1000)
  et.setDate(et.getDate() - n)
  return et.toISOString().slice(0, 10)
}

function ResultsTable({ results }) {
  if (!results || !results.games || results.games.length === 0) {
    return <div className="empty">No results yet. Graded games will appear here after results are in.</div>
  }

  const todayStr = getDaysAgoStr(0)
  const sourceCounts = results.meta?.source_counts || null
  const normalizedReady = results.meta?.normalized_ready === true

  // Show games that are final/in-progress, OR pending only for today
  // Past dates that are still pending = orphaned predictions with no score yet (hide them)
  const allGames = results.games.filter(g =>
    g.status === 'final' || g.status === 'in' ||
    (g.status === 'pending' || g.status === 'pre') && g.date === todayStr
  )

  // Group by date
  const byDate = {}
  for (const g of allGames) {
    const d = g.date || 'Unknown'
    if (!byDate[d]) byDate[d] = []
    byDate[d].push(g)
  }

  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a))
  for (const d of sortedDates) {
    byDate[d].sort((a, b) => (a.game_time || a.matchup || '').localeCompare(b.game_time || b.matchup || ''))
  }


  const renderRow = (g, idx) => {
    const statusLabel = STATUS_LABEL[g.status] || g.status || '⏳'
    const isPending = g.status !== 'final'
    const ouCorrect = isPending ? null : evaluateOUResult(g.total_pick, g.vegas_total, g.score)

    return (
      <tr key={`${g.game_id}-${idx}`} className={`prediction-row ${isPending ? 'row-pending' : ''}`}>
        <td className="matchup-cell sticky-col"><strong>{g.matchup}</strong></td>
        <td className="time-cell">{statusLabel}{g.score ? ` ${g.score}` : ''}</td>

        <ModelPickCell pick={g.simple_pick} correct={isPending ? null : g.simple_pick_correct} />
        <ModelPickCell pick={g.advanced_pick} correct={isPending ? null : g.advanced_pick_correct} />
        <ModelPickCell pick={g.possession_pick} correct={isPending ? null : g.possession_pick_correct} />
        <ModelRangeCell game={g} />

        {/* === SPREAD section === */}
        <ConvBadge score={g.spread_conv} className="section-start" />
        <td className="vegas-cell" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>
          {g.vegas_spread != null ? `${g.vegas_spread > 0 ? '+' : ''}${g.vegas_spread}` : '—'}
        </td>
        <td className="pick-cell">{g.spread_pick || '—'}</td>
        <ResultCell result={isPending ? null : g.spread_result} label={g.spread_result ? 'W' : 'L'} />

        {/* === O/U section === */}
        <ConvBadge score={g.ou_conv} className="section-start" />
        <td className="vegas-cell" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>
          {g.vegas_total != null ? g.vegas_total : '—'}
        </td>
        <td className="pick-cell">{g.total_pick || '—'}</td>
        <ResultCell result={ouCorrect} label={ouCorrect === true ? 'W' : 'L'} />

        {/* === ML section === */}
        <ConvBadge score={g.ml_conv} className="section-start" />
        <td className="vegas-cell" style={{ fontSize: '0.78rem', whiteSpace: 'nowrap', color: 'var(--text-dim)' }}>
          {g.vegas_pct != null ? `${(g.vegas_pct * 100).toFixed(0)}%` : '—'}
        </td>
        <td className="pick-cell">{g.ml_pick || '—'}</td>
        <ResultCell result={isPending ? null : g.model_pick_correct} label={g.model_pick_correct ? 'W' : 'L'} />

        <td className="model-cell">{g.margin_error != null ? `${g.margin_error.toFixed(1)}` : '—'}</td>
      </tr>
    )
  }

  return (
    <div className="table-container results-scroll-container">
      {(() => {
        // Compute conviction-filtered records from actual game data
        const final = allGames.filter(g => g.status === 'final')
        const THRESHOLD = 60

        // ATS: games with spread_conv >= threshold
        const atsQualified = final.filter(g => (g.spread_conv || 0) >= THRESHOLD && g.spread_result != null)
        const atsW = atsQualified.filter(g => g.spread_result === true).length
        const atsL = atsQualified.filter(g => g.spread_result === false).length

        // O/U: games with ou_conv >= threshold
        const ouQualified = final.filter(g => (g.ou_conv || 0) >= THRESHOLD && g.total_pick)
        let ouW = 0, ouL = 0
        for (const g of ouQualified) {
          const r = evaluateOUResult(g.total_pick, g.vegas_total, g.score)
          if (r === true) ouW++
          else if (r === false) ouL++
        }

        // ML: games with ml_conv >= threshold
        const mlQualified = final.filter(g => (g.ml_conv || 0) >= THRESHOLD && g.model_pick_correct != null)
        const mlW = mlQualified.filter(g => g.model_pick_correct === true).length
        const mlL = mlQualified.filter(g => g.model_pick_correct === false).length

        const pct = (w, l) => (w + l) > 0 ? `(${((w / (w + l)) * 100).toFixed(0)}%)` : ''
        const rangeStats = {
          spread: { total: 0, hit: 0, low: 0, high: 0 },
          total: { total: 0, hit: 0, low: 0, high: 0 },
        }
        for (const g of final) {
          for (const kind of ['spread', 'total']) {
            const outcome = getRangeOutcome(g, kind)
            if (!outcome) continue
            const bucket = rangeStats[kind]
            bucket.total += 1
            if (outcome.hit === true || outcome.direction === 'in') bucket.hit += 1
            else if (outcome.direction === 'high') bucket.high += 1
            else bucket.low += 1
          }
        }
        const overallRangeTotal = rangeStats.spread.total + rangeStats.total.total
        const overallRangeHit = rangeStats.spread.hit + rangeStats.total.hit
        const rangePct = (hit, total) => total > 0 ? `${((hit / total) * 100).toFixed(0)}%` : '—'
        const rangeLabel = (stat) => stat.total > 0 ? `${stat.hit}/${stat.total} (${rangePct(stat.hit, stat.total)})` : '—'

        return (
          <>
            <div className="results-summary-bar">
              <span className="results-stat" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Conv ≥{THRESHOLD} only:</span>
              <span className="results-stat"><strong>ATS:</strong> {atsW}W-{atsL}L {pct(atsW, atsL)}</span>
              <span className="results-stat"><strong>O/U:</strong> {ouW}W-{ouL}L {pct(ouW, ouL)}</span>
              <span className="results-stat"><strong>ML:</strong> {mlW}W-{mlL}L {pct(mlW, mlL)}</span>
              <span className="results-stat" style={{ color: 'var(--text-dim)' }}><strong>Games:</strong> {final.length} graded</span>
              {sourceCounts && (
                <span className="results-stat results-source-stat">
                  <strong>Source:</strong>
                  <SourceStatusBadge sourceCounts={sourceCounts} normalizedReady={normalizedReady} />
                </span>
              )}
            </div>
            {overallRangeTotal > 0 && (
              <div className="results-summary-bar results-range-summary" title="Range hits use stored range outcome markers when available, otherwise the visible model range calculation.">
                <span className="results-stat" style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Range check:</span>
                <span className="results-stat"><strong>Margin in-range:</strong> {rangeLabel(rangeStats.spread)}</span>
                <span className="results-stat"><strong>Total in-range:</strong> {rangeLabel(rangeStats.total)}</span>
                <span className="results-stat"><strong>Overall:</strong> {overallRangeHit}/{overallRangeTotal} ({rangePct(overallRangeHit, overallRangeTotal)})</span>
                <span className="results-stat" style={{ color: 'var(--text-dim)' }}>
                  Misses: M low {rangeStats.spread.low}, M high {rangeStats.spread.high}, T low {rangeStats.total.low}, T high {rangeStats.total.high}
                </span>
              </div>
            )}
          </>
        )
      })()}

      <table className="predictions-table results-table">
        <thead>
          <tr className="group-header-row">
            <th className="sticky-col" rowSpan={2}>Matchup</th>
            <th rowSpan={2}>Score</th>
            <th colSpan={4} style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px' }}>MODEL PICKS</th>
            <th colSpan={4} className="section-start" style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px' }}>SPREAD (ATS)</th>
            <th colSpan={4} className="section-start" style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px' }}>OVER / UNDER</th>
            <th colSpan={4} className="section-start" style={{ textAlign: 'center', fontWeight: 700, letterSpacing: '0.5px' }}>MONEYLINE</th>
            <th rowSpan={2}>Margin Err</th>
          </tr>
          <tr>
            <th>Simple</th>
            <th>Player Deep</th>
            <th>Possession</th>
            <th>Range</th>
            <th className="section-start">Conv</th>
            <th>Vegas</th>
            <th>Pick</th>
            <th>Result</th>
            <th className="section-start">Conv</th>
            <th>Vegas</th>
            <th>Pick</th>
            <th>Result</th>
            <th className="section-start">Conv</th>
            <th>Vegas</th>
            <th>Pick</th>
            <th>Result</th>
          </tr>
        </thead>
        <tbody>
          {sortedDates.map(date => {
            const dayGames = byDate[date]
            const hasPending = dayGames.some(g => g.status !== 'final')
            const label = date === todayStr
              ? `⏳ ${date} — Today`
              : hasPending ? `😩 ${date}` : `✅ ${date}`
            return (
              <React.Fragment key={date}>
                <tr className="section-header-row"><td colSpan={19}>{label}</td></tr>
                {dayGames.map((g, i) => renderRow(g, i))}
              </React.Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default ResultsTable
