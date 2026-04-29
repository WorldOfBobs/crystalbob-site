import { formatDistributionValue, formatPercent } from './DistributionPopover'

const ZERO_WINDOW_LOW = -1
const ZERO_WINDOW_HIGH = 1
const APPROX_BANDS = [
  { min: -5, max: -3 },
  { min: -3, max: -1 },
  { min: -1, max: 1 },
  { min: 1, max: 3 },
  { min: 3, max: 5 },
]

function erfApprox(x) {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * ax)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return sign * y
}

function normalCdf(x, mean = 0, std = 1) {
  if (std == null || std <= 0) return x < mean ? 0 : 1
  return 0.5 * (1 + erfApprox((x - mean) / (std * Math.SQRT2)))
}

function sortHistogramRows(distribution) {
  return (Array.isArray(distribution?.histogram) ? distribution.histogram : [])
    .filter(row => (
      Number.isFinite(Number(row?.min)) &&
      Number.isFinite(Number(row?.max)) &&
      Number.isFinite(Number(row?.pct)) &&
      Number(row.pct) > 0
    ))
    .sort((a, b) => Number(a.min) - Number(b.min))
}

function findZeroCenteredWindow(rows) {
  if (!rows.length) return []
  const centerIdx = rows.reduce((bestIdx, row, idx) => {
    const mid = (Number(row.min) + Number(row.max)) / 2
    const best = rows[bestIdx]
    const bestMid = (Number(best.min) + Number(best.max)) / 2
    return Math.abs(mid) < Math.abs(bestMid) ? idx : bestIdx
  }, 0)
  const start = Math.max(0, Math.min(rows.length - 5, centerIdx - 2))
  return rows.slice(start, start + 5).map(row => ({
    min: Number(row.min),
    max: Number(row.max),
    pct: Number(row.pct),
  }))
}

function buildApproxWindow(mean, std) {
  if (!Number.isFinite(Number(mean)) || !Number.isFinite(Number(std)) || Number(std) <= 0) return []
  return APPROX_BANDS.map(({ min, max }) => ({
    min,
    max,
    pct: Math.max(0, normalCdf(max, Number(mean), Number(std)) - normalCdf(min, Number(mean), Number(std))),
  }))
}

function resolveWindowRows(distribution, mean, std) {
  const empiricalRows = sortHistogramRows(distribution)
  if (empiricalRows.length) {
    return {
      mode: 'empirical',
      rows: findZeroCenteredWindow(empiricalRows),
    }
  }

  const approxRows = buildApproxWindow(mean, std)
  if (approxRows.length) {
    return {
      mode: 'approx',
      rows: approxRows,
    }
  }

  return {
    mode: 'missing',
    rows: [],
  }
}

function overlapsZeroBand(row) {
  return row.min < ZERO_WINDOW_HIGH && row.max > ZERO_WINDOW_LOW
}

function getPickWinSign(pick, prediction) {
  if (pick && pick === prediction?.home_team) return 1
  if (pick && pick === prediction?.away_team) return -1
  return 1
}

function classifyRowTone(row, pickWinSign) {
  if (overlapsZeroBand(row)) return 'pivot'
  const midpoint = (row.min + row.max) / 2
  return midpoint * pickWinSign > 0 ? 'win' : 'loss'
}

function formatBandLabel(row) {
  return `${formatDistributionValue(row.min, 'ml-margin')} to ${formatDistributionValue(row.max, 'ml-margin')}`
}

function sumPct(rows, tone) {
  return rows
    .filter(row => row.tone === tone)
    .reduce((total, row) => total + row.pct, 0)
}

export function buildMlShapeSummary({ prediction, distribution, mean, std, pick, sideNote }) {
  const windowState = resolveWindowRows(distribution, mean, std)
  const pickWinSign = getPickWinSign(pick, prediction)
  const rows = windowState.rows.map((row) => ({
    ...row,
    tone: classifyRowTone(row, pickWinSign),
  }))
  const maxPct = Math.max(...rows.map(row => row.pct), 0.001)
  const histogramBins = rows.map((row) => ({
    label: formatBandLabel(row),
    pct: row.pct,
    width: `${Math.max(8, Math.round((row.pct / maxPct) * 100))}%`,
    tone: row.tone,
  }))

  const winWindow = sumPct(rows, 'win')
  const pivotWindow = sumPct(rows, 'pivot')
  const lossWindow = sumPct(rows, 'loss')
  const pickWinsOnPositive = pickWinSign > 0
  const support = windowState.mode === 'empirical'
    ? {
        supportLabel: 'Margin window',
        supportTone: 'supported',
        fallbackTitle: null,
        fallbackDetail: null,
      }
    : windowState.mode === 'approx'
      ? {
          supportLabel: 'Approx window',
          supportTone: 'approx',
          fallbackTitle: null,
          fallbackDetail: null,
        }
      : {
          supportLabel: 'Lane payload',
          supportTone: 'missing',
          fallbackTitle: 'Zero-centered margin window unavailable for this lane.',
          fallbackDetail: 'Win probability stays primary here. Margin-shape detail only appears when a margin histogram or mean-plus-std payload is available.',
        }

  const shapeNote = windowState.mode === 'missing'
    ? null
    : `${pick} wins on the ${pickWinsOnPositive ? 'positive' : 'negative'} side of zero. The five bins stay centered on 0 to show local win/loss shape near the decision boundary.`

  const footerCopy = `${sideNote} Probability metrics above stay primary. The margin window below is a shape check around zero, not a true ML probability distribution.`

  return {
    support,
    histogramBins,
    shapeSummaryRows: windowState.mode === 'missing' ? [] : [
      { label: 'Win window', value: formatPercent(winWindow) },
      { label: 'Near 0', value: formatPercent(pivotWindow) },
      { label: 'Loss window', value: formatPercent(lossWindow) },
    ],
    shapeLabel: 'Margin window near 0',
    shapeNote,
    footerCopy,
    showShape: rows.length > 0,
  }
}
