import React from 'react'
import { makeML } from './topPicksRows'
import {
  DistributionDetailsToggle,
  DistributionPopover,
  formatDistributionValue,
  formatPercent,
  getPredictionDistributionState,
} from './DistributionPopover'
import { renderLanePlaceholderCell } from './laneState'

export function getMlEdgeClass(edge) {
  if (edge == null) return 'edge-neutral'
  if (edge > 0.03) return 'edge-bet'
  if (edge > 0.01) return 'edge-monitor'
  return 'edge-neutral'
}

export function getPresentationMlRefs(game) {
  return {
    poss: makeML(game.possession, game),
    pd: makeML(game.playerdeep, game),
    ff: makeML(game.fourfactor, game),
  }
}

export function getPresentationMlPick(game, refs = getPresentationMlRefs(game)) {
  const preferred = game.possession?.best_side || game.playerdeep?.best_side || game.fourfactor?.best_side
  if (preferred === game.home_team || preferred === game.away_team) return preferred
  return refs.poss?.pick || refs.pd?.pick || refs.ff?.pick || ''
}

export function getMlModelCellData(prediction, pick, game) {
  if (!prediction) return null
  const resolvedPick = pick === game.home_team || pick === game.away_team
    ? pick
    : ((prediction.home_win_pct ?? 0) >= (prediction.away_win_pct ?? 0) ? game.home_team : game.away_team)
  const pickIsHome = resolvedPick === game.home_team
  const modelWin = pickIsHome ? prediction.home_win_pct : prediction.away_win_pct
  if (modelWin == null) return null
  const vegasImplied = pickIsHome ? prediction.home_implied : prediction.away_implied
  const edge = (modelWin != null && vegasImplied != null) ? modelWin - vegasImplied : null
  const winStr = `${(modelWin * 100).toFixed(1)}%`
  const edgeStr = edge == null ? '' : `${edge >= 0 ? '+' : ''}${(edge * 100).toFixed(1)}%`
  return {
    pick: resolvedPick,
    modelWin,
    vegasImplied,
    edge,
    winStr,
    edgeStr,
    prediction,
  }
}

function formatFairMoneyline(probability) {
  const p = Number(probability)
  if (!Number.isFinite(p) || p <= 0 || p >= 1) return '—'
  if (p >= 0.5) return `${Math.round((-100 * p) / (1 - p))}`
  return `+${Math.round((100 * (1 - p)) / p)}`
}

function normalCdf(x, mean = 0, std = 1) {
  if (!Number.isFinite(Number(std)) || Number(std) <= 0) return x < mean ? 0 : 1
  const z = (Number(x) - Number(mean)) / (Number(std) * Math.SQRT2)
  const t = 1 / (1 + 0.3275911 * Math.abs(z))
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)
  return 0.5 * (1 + Math.sign(z) * erf)
}

function formatMarginBandLabel(min, max) {
  if (min == null) return `${formatDistributionValue(max, 'ml-margin')} or less`
  if (max == null) return `${formatDistributionValue(min, 'ml-margin')} or more`
  return `${formatDistributionValue(min, 'ml-margin')} to ${formatDistributionValue(max, 'ml-margin')}`
}

function sumHistogramRange(rows, min, max) {
  return rows.reduce((total, row) => {
    const rowMin = Number(row?.min)
    const rowMax = Number(row?.max)
    const pct = Number(row?.pct)
    if (!Number.isFinite(rowMin) || !Number.isFinite(rowMax) || !Number.isFinite(pct) || pct <= 0) return total
    if (min != null && rowMax <= min) return total
    if (max != null && rowMin >= max) return total
    return total + pct
  }, 0)
}

function buildMlMarginLens(cell, prediction, distribution, std, pick) {
  const mean = Number(prediction?.avg_margin)
  const resolvedStd = Number(distribution?.std ?? std)
  const pickIsHome = pick === prediction?.home_team
  const orientation = pickIsHome ? 1 : -1
  const sourceRows = Array.isArray(distribution?.histogram) ? distribution.histogram : []
  const orientedRows = sourceRows
    .map((row) => ({
      min: Number(row?.min) * orientation,
      max: Number(row?.max) * orientation,
      pct: Number(row?.pct),
    }))
    .filter((row) => Number.isFinite(row.min) && Number.isFinite(row.max) && Number.isFinite(row.pct) && row.pct > 0)
    .sort((a, b) => a.min - b.min)

  const bins = [
    { min: null, max: -6 },
    { min: -6, max: -1 },
    { min: -1, max: 1 },
    { min: 1, max: 6 },
    { min: 6, max: null },
  ]

  const useApprox = !orientedRows.length && Number.isFinite(mean) && Number.isFinite(resolvedStd) && resolvedStd > 0
  const lensBins = bins.map((bin) => {
    let pct = null
    if (orientedRows.length) {
      pct = sumHistogramRange(orientedRows, bin.min, bin.max)
    } else if (useApprox) {
      const orientedMean = mean * orientation
      const low = bin.min == null ? 0 : normalCdf(bin.min, orientedMean, resolvedStd)
      const high = bin.max == null ? 1 : normalCdf(bin.max, orientedMean, resolvedStd)
      pct = Math.max(0, high - low)
    }
    return {
      label: formatMarginBandLabel(bin.min, bin.max),
      pct,
      width: pct != null ? `${Math.max(10, Math.round(pct * 100))}%` : '10%',
    }
  }).filter((bin) => bin.pct != null)

  const leftTail = lensBins.find((bin) => bin.label === formatMarginBandLabel(null, -6))?.pct ?? null
  const tossUp = lensBins.find((bin) => bin.label === formatMarginBandLabel(-1, 1))?.pct ?? null
  const rightTail = lensBins.find((bin) => bin.label === formatMarginBandLabel(6, null))?.pct ?? null

  return {
    bins: lensBins,
    metrics: [
      { label: 'Win rate', value: formatPercent(cell.modelWin) },
      { label: 'Market implied', value: formatPercent(cell.vegasImplied) },
      { label: 'Edge', value: cell.edgeStr || '—' },
      { label: 'Fair ML', value: formatFairMoneyline(cell.modelWin) },
      { label: 'Loss 6+', value: formatPercent(leftTail) },
      { label: '±1 band', value: formatPercent(tossUp) },
      { label: 'Win 6+', value: formatPercent(rightTail) },
      { label: 'Margin mean', value: formatDistributionValue(orientation * mean, 'ml-margin') },
    ],
    sourceLabel: orientedRows.length ? 'Margin shape' : useApprox ? 'Margin approx' : 'Lane payload',
    sourceTone: orientedRows.length ? 'supported' : useApprox ? 'approx' : 'supported',
    footerDetail: orientedRows.length
      ? 'Histogram bins summarize simulated scoring margins recentered on the picked side, with zero as the win/loss break.'
      : useApprox
        ? 'Compact margin lens is approximated from mean and standard deviation, not a true ML probability distribution.'
        : 'Margin shape is unavailable here, so the popup stays probability-first.',
  }
}

function renderMlToken(label, tone, active = false) {
  return <span className={`ml-stack-token${active ? ` ${tone}` : ' is-muted'}`}>{label}</span>
}

function getMlRowState(prediction) {
  const homePct = prediction?.home_win_pct
  const awayPct = prediction?.away_win_pct
  const homeTone = getMlEdgeClass((prediction?.home_win_pct ?? 0) - (prediction?.home_implied ?? 0))
  const awayTone = getMlEdgeClass((prediction?.away_win_pct ?? 0) - (prediction?.away_implied ?? 0))
  const homeActive = (homePct ?? 0) >= (awayPct ?? 0)
  return { homePct, awayPct, homeTone, awayTone, homeActive }
}

function renderMlPairRow(team, pct, tone, active = false) {
  return (
    <span className="ml-stack-row ml-stack-row--pair">
      {renderMlToken(team, tone, active)}
      <span className="ml-stack-sep">/</span>
      {renderMlToken(formatPercent(pct), tone, active)}
    </span>
  )
}

function renderMlAwayRow(prediction) {
  if (!prediction) return null
  const { awayPct, awayTone, homeActive } = getMlRowState(prediction)
  return renderMlPairRow(prediction.away_team, awayPct, awayTone, !homeActive)
}

function renderMlHomeRow(prediction) {
  if (!prediction) return null
  const { homePct, homeTone, homeActive } = getMlRowState(prediction)
  return renderMlPairRow(prediction.home_team, homePct, homeTone, homeActive)
}

function renderMlTopRow(cell) {
  const cls = getMlEdgeClass(cell?.edge)
  return (
    <span className="ml-top-row">
      <span className="model-win">{cell?.pick}</span>
      {cell?.edgeStr ? <span className={`ml-edge-chip ${cls}`}>{cell.edgeStr}</span> : null}
    </span>
  )
}

function buildMlPopoverConfig(cell, prediction, label) {
  const sideNote = prediction?.best_side && prediction.best_side !== cell.pick ? `Lane pick differs, ${prediction.best_side} is flagged as best side.` : `${cell.pick} is this lane's current ML side.`
  const distributionState = getPredictionDistributionState(prediction, 'ml')
  const lens = buildMlMarginLens(cell, prediction, distributionState.distribution, distributionState.std, cell.pick)

  return {
    title: `${label} ML outlook`,
    subtitle: `${cell.pick} win rate stays primary. The compact margin lens below is centered on zero to show how often this side lands on each side of the win/loss break.`,
    metrics: lens.metrics,
    sections: {
      support: {
        supportLabel: lens.sourceLabel,
        supportTone: lens.sourceTone,
        fallbackTitle: null,
        fallbackDetail: null,
      },
      showIntervals: false,
      showShape: lens.bins.length > 0,
      shapeLabel: 'Margin lens around 0',
      histogramBins: lens.bins,
      shapeNote: 'Negative bins are losses for the picked side, positive bins are wins. This is a margin view, not a standalone ML distribution.',
      footerCopy: `${lens.footerDetail} ${sideNote}`,
    },
  }
}

export function renderMlModelCell(cell, options = {}) {
  if (!cell) return renderLanePlaceholderCell(options.laneState, options.label ?? 'Model')
  const prediction = options.prediction ?? cell.prediction ?? null
  const label = options.label ?? 'Model'
  const distributionState = getPredictionDistributionState(prediction, 'ml')
  const distribution = distributionState.distribution
  const std = distributionState.std
  const hasDetails = Boolean(prediction && (cell.modelWin != null || distribution || std != null))
  const topLabel = renderMlTopRow(cell)
  const awayRow = renderMlAwayRow(prediction)
  const homeRow = renderMlHomeRow(prediction)

  if (!hasDetails) {
    return (
      <td className="model-cell" style={{ textAlign: 'center' }}>
        <span className="model-summary-stack model-summary-stack--ml">
          {topLabel}
          {awayRow}
          {homeRow}
        </span>
      </td>
    )
  }

  const popover = buildMlPopoverConfig(cell, prediction, label)

  return (
    <td className="model-cell" style={{ textAlign: 'center' }}>
      <DistributionDetailsToggle
        label={`${label} ML details`}
        summary={null}
        summaryTop={topLabel}
        summaryBottomTop={awayRow}
        summaryBottomBottom={homeRow}
        toggleRow="top"
        panel={(
          <DistributionPopover
            title={popover.title}
            subtitle={popover.subtitle}
            distribution={distribution}
            mean={prediction?.avg_margin}
            std={std}
            kind="ml"
            metrics={popover.metrics}
            sections={popover.sections}
          />
        )}
      />
    </td>
  )
}
