import React from 'react'
import {
  DistributionDetailsToggle,
  DistributionPopover,
  formatDistributionValue,
  formatPercent,
  getDistributionMedian,
  getPredictionDistributionState,
} from './DistributionPopover'
import {
  formatCoverLine,
  formatLine,
  renderMarketLinePicker,
  renderPickerValue,
} from './quotePresentation'
import { getSpreadLineProbabilities, getTotalLineProbabilities } from './modelProbabilities'
import { renderLanePlaceholderCell } from './laneState'

function getPredictionNote(prediction) {
  if (!prediction) return { title: null }
  const reasons = Array.isArray(prediction.lane_health_reasons) ? prediction.lane_health_reasons : []
  const degradedReasons = Array.isArray(prediction.model_degraded_reasons) ? prediction.model_degraded_reasons : []
  const hasInjuries = Boolean(prediction.home_key_out?.length || prediction.away_key_out?.length)
  const titleParts = []
  if (prediction.model_degraded) {
    titleParts.push(`Per-game fallback: ${formatPerGameFallback(degradedReasons)}`)
  }
  const oddsNote = formatOddsNote(prediction)
  if (oddsNote) titleParts.push(oddsNote)
  if (reasons.length) titleParts.push(reasons.join(', '))
  if (hasInjuries) {
    const injuryParts = []
    if (prediction.away_key_out?.length) injuryParts.push(`${prediction.away_team} out: ${prediction.away_key_out.join(', ')}`)
    if (prediction.home_key_out?.length) injuryParts.push(`${prediction.home_team} out: ${prediction.home_key_out.join(', ')}`)
    if (injuryParts.length) titleParts.push(injuryParts.join(' • '))
  }
  return {
    title: titleParts.length ? titleParts.join(' — ') : null,
  }
}

function formatOddsNote(prediction) {
  if (!prediction) return null
  if (prediction.odds_missing) return 'Odds: unavailable for this game'
  if (!prediction.odds_source) return null
  return `Odds: ${formatOddsSource(prediction.odds_source)}`
}

function formatOddsSource(source) {
  if (!source) return 'unknown'
  const normalized = String(source).toLowerCase()
  if (normalized === 'espn') return 'ESPN'
  if (normalized === 'action_network') return 'Action Network'
  if (normalized === 'odds_api') return 'Odds API'
  if (normalized === 'stub') return 'test stub'
  return String(source).replaceAll('_', ' ')
}

function formatPerGameFallback(reasons) {
  if (!Array.isArray(reasons) || !reasons.length) return 'team-level simple model used for this game'
  return reasons.map((reason) => {
    if (reason === 'player_ratings_unavailable') return 'player ratings unavailable, used team-level simple model'
    if (reason === 'rotation_projection_empty') return 'rotation projection came back empty, used team-level simple model'
    if (reason === 'playerdeep_pipeline_error') return 'player pipeline failed, used team-level simple model'
    if (reason === 'odds_unavailable') return 'odds unavailable for this game'
    return String(reason).replaceAll('_', ' ')
  }).join(', ')
}

function getSpreadEdgeClass(edge) {
  const abs = Math.abs(edge ?? 0)
  if (abs > 3) return 'edge-bet'
  if (abs > 1.5) return 'edge-monitor'
  return 'edge-neutral'
}

function getTotalEdgeClass(edge) {
  const abs = Math.abs(edge ?? 0)
  if (abs > 5) return 'edge-bet'
  if (abs > 2.5) return 'edge-monitor'
  return 'edge-neutral'
}

function getProbTone(probability) {
  if (probability == null) return 'edge-neutral'
  if (probability >= 0.58) return 'edge-bet'
  if (probability >= 0.54) return 'edge-monitor'
  return 'edge-neutral'
}

function renderSpreadToggle(ref, label, lineControl) {
  const selection = lineControl?.selection
  if (!selection) return null
  return renderMarketLinePicker({
    variant: 'model-spread',
    value: renderPickerValue({
      display: formatCoverLine(selection.coverTeam, selection.displayLine),
      title: `${label} exact cover probability`,
    }),
    onPrev: lineControl.onPrev,
    onNext: lineControl.onNext,
    prevDisabled: lineControl.prevDisabled,
    nextDisabled: lineControl.nextDisabled,
    prevLabel: `Previous ${label} spread line`,
    nextLabel: `Next ${label} spread line`,
  })
}

function renderTotalToggle(label, lineControl) {
  const selection = lineControl?.selection
  if (!selection) return null
  return renderMarketLinePicker({
    variant: 'model-total',
    value: renderPickerValue({
      display: formatLine(selection.line),
      title: `${label} exact total probability`,
    }),
    onPrev: lineControl.onPrev,
    onNext: lineControl.onNext,
    prevDisabled: lineControl.prevDisabled,
    nextDisabled: lineControl.nextDisabled,
    prevLabel: `Previous ${label} total line`,
    nextLabel: `Next ${label} total line`,
  })
}

function buildSections(predictionNote, extraItems) {
  const items = []
  if (extraItems?.length) items.push(...extraItems)
  if (predictionNote.title) items.push({ title: 'Notes', body: predictionNote.title })
  return items.length ? { items } : null
}

function renderMeanLine(kind, value, prediction = null) {
  if (kind === 'spread') {
    const mean = Number(value)
    const homeTeam = prediction?.home_team
    const awayTeam = prediction?.away_team
    if (Number.isFinite(mean) && homeTeam && awayTeam) {
      const favTeam = mean >= 0 ? homeTeam : awayTeam
      const favLine = `-${Math.abs(mean).toFixed(1)}`
      return <span className="model-mean-subline"><span className="model-mean-subline-label">mean</span> {favTeam} {favLine}</span>
    }
  }
  return <span className="model-mean-subline"><span className="model-mean-subline-label">mean</span> {formatDistributionValue(value, kind)}</span>
}

function renderSplitToken(label, pct, tone, active = false) {
  return (
    <span className={`model-line-split-token${active ? ` ${tone}` : ' is-muted'}`}>
      <span className="model-line-split-label">{label}</span>
      <span className="model-line-split-pct">{formatPercent(pct)}</span>
    </span>
  )
}

function renderSpreadProbRow(selection, lineProb) {
  if (!selection || !lineProb) return null
  const coverTone = getProbTone(lineProb.coverPct)
  const fadeTone = getProbTone(lineProb.fadePct)
  const coverActive = (lineProb.coverPct ?? 0) >= (lineProb.fadePct ?? 0)
  return (
    <span className="model-line-split-row">
      {renderSplitToken(selection.coverTeam, lineProb.coverPct, coverTone, coverActive)}
      <span className="model-line-split-sep">/</span>
      {renderSplitToken(selection.fadeTeam, lineProb.fadePct, fadeTone, !coverActive)}
    </span>
  )
}

function renderTotalProbRow(lineProb) {
  if (!lineProb) return null
  const overTone = getProbTone(lineProb.overPct)
  const underTone = getProbTone(lineProb.underPct)
  const overActive = (lineProb.overPct ?? 0) >= (lineProb.underPct ?? 0)
  return (
    <span className="model-line-split-row">
      {renderSplitToken('O', lineProb.overPct, overTone, overActive)}
      <span className="model-line-split-sep">/</span>
      {renderSplitToken('U', lineProb.underPct, underTone, !overActive)}
    </span>
  )
}

export function renderSpreadModelCell(cell, prediction, label, lineControl = null, laneState = null) {
  if (!cell) return renderLanePlaceholderCell(laneState, label)
  const edgeClass = getSpreadEdgeClass(cell.edge)
  const distributionState = getPredictionDistributionState(prediction, 'spread')
  const distribution = distributionState.distribution
  const std = distributionState.std
  const hasDetails = Boolean(prediction || distribution || std != null)
  const predictionNote = getPredictionNote(prediction)
  const selection = lineControl?.selection
  const lineProb = selection ? getSpreadLineProbabilities(prediction, selection) : null
  const detailSummaryTop = selection ? renderSpreadToggle(cell, label, lineControl) : null
  const detailSummaryBottomTop = selection ? renderSpreadProbRow(selection, lineProb) : null
  const detailSummaryBottomBottom = selection ? renderMeanLine('spread', distribution?.mean ?? prediction?.avg_margin, prediction) : null
  const summary = selection ? (
    <span className="model-summary-stack">
      {detailSummaryTop}
      {detailSummaryBottomTop}
      {detailSummaryBottomBottom}
    </span>
  ) : (
    <>
      <span className="model-win">{cell.modelFav} -{cell.modelSpread.toFixed(1)}</span>
      <span className={`model-edge ${edgeClass}`}>{cell.edge != null ? `${cell.edge >= 0 ? '+' : ''}${cell.edge.toFixed(1)} pts vs Vegas` : '(no odds)'}</span>
    </>
  )

  if (!hasDetails) {
    return (
      <td className="model-cell" style={{ textAlign: 'center' }}>
        <div className="model-detail-summary">{summary}</div>
      </td>
    )
  }

  const lineLabel = selection ? formatCoverLine(selection.coverTeam, selection.displayLine) : `${cell.modelFav} -${cell.modelSpread.toFixed(1)}`
  const selectedSubtitle = selection
    ? `${label} says ${formatPercent(lineProb?.coverPct)} ${selection.coverTeam} covers ${selection.displayLine > 0 ? '+' : ''}${selection.displayLine.toFixed(1)}`
    : `Mean ${formatDistributionValue(distribution?.mean ?? prediction?.avg_margin, 'spread')} vs market ${prediction?.vegas_spread != null ? formatDistributionValue(-prediction.vegas_spread, 'spread') : '—'}`

  return (
    <td className="model-cell" style={{ textAlign: 'center' }}>
      <DistributionDetailsToggle
        label={`${label} spread details`}
        summary={selection ? null : summary}
        summaryTop={detailSummaryTop}
        summaryBottomTop={detailSummaryBottomTop}
        summaryBottomBottom={detailSummaryBottomBottom}
        panel={(
          <DistributionPopover
            title={`${label} spread outlook`}
            subtitle={selectedSubtitle}
            distribution={distribution}
            mean={prediction?.avg_margin}
            std={std}
            kind="spread"
            selectedValue={selection?.homeLine ?? null}
            metrics={selection ? [
              { label: 'Line', value: lineLabel },
              { label: 'Cover', value: formatPercent(lineProb?.coverPct) },
              { label: 'Fade', value: formatPercent(lineProb?.fadePct) },
              { label: 'Mean', value: formatDistributionValue(distribution?.mean ?? prediction?.avg_margin, 'spread') },
              { label: 'Std dev', value: std != null ? Number(std).toFixed(1) : '—' },
            ] : [
              { label: 'Mean', value: formatDistributionValue(distribution?.mean ?? prediction?.avg_margin, 'spread') },
              { label: 'Median', value: formatDistributionValue(getDistributionMedian(distribution, distribution?.mean ?? prediction?.avg_margin), 'spread') },
              { label: 'Std dev', value: std != null ? Number(std).toFixed(1) : '—' },
              { label: 'Edge', value: cell.edge != null ? `${cell.edge >= 0 ? '+' : ''}${cell.edge.toFixed(1)} pts` : '—' },
            ]}
            sections={buildSections(predictionNote, selection ? [{ title: 'Selected line', body: `Exact cover odds for ${lineLabel}. ${lineProb?.lineSource === 'normal' ? 'Using normal fallback because this line is outside the landed empirical grid.' : 'Using landed line simulation for this exact number.'}` }] : null)}
          />
        )}
      />
    </td>
  )
}

export function renderTotalModelCell(cell, prediction, label, lineControl = null, laneState = null) {
  if (!cell) return renderLanePlaceholderCell(laneState, label)
  const edgeClass = cell.edge != null ? getTotalEdgeClass(cell.edge) : ''
  const distributionState = getPredictionDistributionState(prediction, 'total')
  const distribution = distributionState.distribution
  const std = distributionState.std
  const hasDetails = Boolean(prediction || distribution || std != null)
  const predictionNote = getPredictionNote(prediction)
  const selection = lineControl?.selection
  const lineProb = selection ? getTotalLineProbabilities(prediction, selection) : null
  const selectedSide = lineProb ? (lineProb.overPct >= lineProb.underPct ? 'over' : 'under') : (cell.edge < 0 ? 'under' : 'over')
  const selectedPct = selection ? (selectedSide === 'under' ? lineProb?.underPct : lineProb?.overPct) : null
  const detailSummaryTop = selection ? renderTotalToggle(label, lineControl) : null
  const detailSummaryBottomTop = selection ? renderTotalProbRow(lineProb) : null
  const detailSummaryBottomBottom = selection ? renderMeanLine('total', distribution?.mean ?? prediction?.avg_total ?? prediction?.model_total) : null
  const summary = selection ? (
    <span className="model-summary-stack">
      {detailSummaryTop}
      {detailSummaryBottomTop}
      {detailSummaryBottomBottom}
    </span>
  ) : (
    <>
      <span className="model-win">{cell.modelTotal.toFixed(1)}</span>
      <span className={`model-edge ${edgeClass}`}>{cell.edge != null ? `${cell.edge >= 0 ? '+' : ''}${cell.edge.toFixed(1)} pts vs Vegas` : '(no odds)'}</span>
    </>
  )

  if (!hasDetails) {
    return (
      <td className="model-cell" style={{ textAlign: 'center' }}>
        <div className="model-detail-summary">{summary}</div>
      </td>
    )
  }

  const selectedSubtitle = selection
    ? `${label} says ${formatPercent(selectedPct)} ${selectedSide} ${selection.line.toFixed(1)}`
    : `Mean ${formatDistributionValue(distribution?.mean ?? prediction?.avg_total ?? prediction?.model_total, 'total')} vs market ${prediction?.vegas_total != null ? formatDistributionValue(prediction.vegas_total, 'total') : '—'}`

  return (
    <td className="model-cell" style={{ textAlign: 'center' }}>
      <DistributionDetailsToggle
        label={`${label} total details`}
        summary={selection ? null : summary}
        summaryTop={detailSummaryTop}
        summaryBottomTop={detailSummaryBottomTop}
        summaryBottomBottom={detailSummaryBottomBottom}
        panel={(
          <DistributionPopover
            title={`${label} total outlook`}
            subtitle={selectedSubtitle}
            distribution={distribution}
            mean={prediction?.avg_total ?? prediction?.model_total}
            std={std}
            kind="total"
            selectedValue={selection?.line ?? null}
            metrics={selection ? [
              { label: 'Line', value: formatLine(selection.line) },
              { label: 'Over', value: formatPercent(lineProb?.overPct) },
              { label: 'Under', value: formatPercent(lineProb?.underPct) },
              { label: 'Mean', value: formatDistributionValue(distribution?.mean ?? prediction?.avg_total ?? prediction?.model_total, 'total') },
              { label: 'Std dev', value: std != null ? Number(std).toFixed(1) : '—' },
            ] : [
              { label: 'Mean', value: formatDistributionValue(distribution?.mean ?? prediction?.avg_total ?? prediction?.model_total, 'total') },
              { label: 'Median', value: formatDistributionValue(getDistributionMedian(distribution, distribution?.mean ?? prediction?.avg_total ?? prediction?.model_total), 'total') },
              { label: 'Std dev', value: std != null ? Number(std).toFixed(1) : '—' },
              { label: 'Edge', value: cell.edge != null ? `${cell.edge >= 0 ? '+' : ''}${cell.edge.toFixed(1)} pts` : '—' },
            ]}
            sections={buildSections(predictionNote, selection ? [{ title: 'Selected line', body: `Exact over/under split for ${formatLine(selection.line)}. ${lineProb?.lineSource === 'normal' ? 'Using normal fallback because this line is outside the landed empirical grid.' : 'Using landed line simulation for this exact number.'}` }] : null)}
          />
        )}
      />
    </td>
  )
}
