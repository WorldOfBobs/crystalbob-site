/* eslint-disable react-refresh/only-export-components */
import React from 'react'
import { createPortal } from 'react-dom'

function formatLine(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toFixed(1)
}

export function formatSignedNumber(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  const n = Number(value)
  return `${n > 0 ? '+' : ''}${n.toFixed(1)}`
}

export function formatDistributionValue(value, kind) {
  return kind === 'spread' || kind === 'ml-margin'
    ? formatSignedNumber(value)
    : formatLine(value)
}

export function formatPercent(value) {
  return value != null ? `${(Number(value) * 100).toFixed(1)}%` : '—'
}

export function getPredictionDistributionState(prediction, kind) {
  if (!prediction) return { distribution: null, std: null }

  if (kind === 'spread' || kind === 'ml') {
    return {
      distribution: prediction?.distributions?.margin ?? null,
      std: prediction?.distributions?.margin?.std ?? prediction?.margin_std ?? null,
    }
  }

  return {
    distribution: prediction?.distributions?.total ?? null,
    std: prediction?.distributions?.total?.std ?? prediction?.total_std ?? null,
  }
}

export function getDistributionMedian(distribution, fallbackMean = null) {
  if (distribution?.percentiles?.p50 != null) return distribution.percentiles.p50
  return fallbackMean != null && !Number.isNaN(Number(fallbackMean)) ? Number(fallbackMean) : null
}

function formatShellMetric(label, value) {
  return { label, value: value ?? '—' }
}

function buildNormalApproxPercentiles(mean, std) {
  if (mean == null || std == null || std <= 0) return null
  const bands = {
    50: 0.67448975,
    80: 1.28155157,
    90: 1.64485363,
    95: 1.95996398,
  }
  return Object.fromEntries(Object.entries(bands).map(([band, z]) => [
    band,
    {
      low: Number(mean) - Number(std) * z,
      high: Number(mean) + Number(std) * z,
    },
  ]))
}

function buildIntervalBands(distribution, mean, std) {
  const approx = buildNormalApproxPercentiles(mean, std)
  const pct = distribution?.percentiles
  const empirical = pct ? {
    50: pct.p25 != null && pct.p75 != null ? { low: pct.p25, high: pct.p75 } : null,
    80: pct.p10 != null && pct.p90 != null ? { low: pct.p10, high: pct.p90 } : null,
    90: pct.p05 != null && pct.p95 != null ? { low: pct.p05, high: pct.p95 } : null,
    95: null,
  } : null

  if (empirical && Object.values(empirical).some(Boolean)) {
    return {
      source: 'empirical sim available',
      intervals: {
        ...approx,
        ...empirical,
        95: empirical[95] ?? approx?.[95] ?? null,
      },
    }
  }

  if (approx) return { source: 'normal approx', intervals: approx }
  return { source: 'limited data', intervals: null }
}

function getHistogramRows(distribution) {
  return (Array.isArray(distribution?.histogram) ? distribution.histogram : [])
    .filter(row => Number.isFinite(Number(row?.pct)) && Number(row.pct) > 0)
    .sort((a, b) => Number(a.min) - Number(b.min))
}

function compactHistogramBins(distribution, mean, kind) {
  const sorted = getHistogramRows(distribution)
  if (!sorted.length) return []

  const center = Number.isFinite(Number(mean))
    ? Number(mean)
    : (Number(sorted[0].min) + Number(sorted[sorted.length - 1].max)) / 2
  const centerIdx = sorted.reduce((bestIdx, row, idx) => {
    const mid = (Number(row.min) + Number(row.max)) / 2
    const best = sorted[bestIdx]
    const bestMid = (Number(best.min) + Number(best.max)) / 2
    return Math.abs(mid - center) < Math.abs(bestMid - center) ? idx : bestIdx
  }, 0)
  const start = Math.max(0, Math.min(sorted.length - 5, centerIdx - 2))
  const bins = sorted.slice(start, start + 5)
  const maxPct = Math.max(...bins.map(row => Number(row.pct)), 0.001)

  const valueKind = kind === 'ml' ? 'ml-margin' : kind
  return bins.map(row => ({
    label: `${formatDistributionValue(row.min, valueKind)}-${formatDistributionValue(row.max, valueKind)}`,
    pct: Number(row.pct),
    width: `${Math.max(8, Math.round((Number(row.pct) / maxPct) * 100))}%`,
  }))
}

function normalCurvePoints(mean, std, count = 32) {
  if (mean == null || std == null || std <= 0) return []
  const points = []
  const min = Number(mean) - (Number(std) * 3)
  const max = Number(mean) + (Number(std) * 3)
  for (let i = 0; i < count; i += 1) {
    const ratio = i / (count - 1)
    const x = min + ((max - min) * ratio)
    const exponent = -0.5 * (((x - Number(mean)) / Number(std)) ** 2)
    const density = Math.exp(exponent)
    points.push({ x, y: density })
  }
  return points
}

function buildDistributionChart(distribution, mean, std) {
  const histogramRows = getHistogramRows(distribution)
  if (histogramRows.length) {
    return {
      mode: 'histogram',
      points: histogramRows.map((row) => ({
        x: (Number(row.min) + Number(row.max)) / 2,
        y: Number(row.pct),
      })),
      xMin: Number(histogramRows[0].min),
      xMax: Number(histogramRows[histogramRows.length - 1].max),
      yMax: Math.max(...histogramRows.map((row) => Number(row.pct)), 0.001),
    }
  }

  const curvePoints = normalCurvePoints(mean, std)
  if (curvePoints.length) {
    return {
      mode: 'normal',
      points: curvePoints,
      xMin: curvePoints[0].x,
      xMax: curvePoints[curvePoints.length - 1].x,
      yMax: Math.max(...curvePoints.map((point) => point.y), 0.001),
    }
  }

  return null
}

function DistributionMiniChart({ chart, mean, selectedValue, kind }) {
  if (!chart?.points?.length) return null
  const width = 248
  const height = 76
  const padX = 8
  const padTop = 10
  const padBottom = 16
  const usableW = width - (padX * 2)
  const usableH = height - padTop - padBottom
  const spanX = Math.max(0.0001, chart.xMax - chart.xMin)
  const maxY = Math.max(0.0001, chart.yMax)
  const toX = (value) => padX + (((value - chart.xMin) / spanX) * usableW)
  const toY = (value) => padTop + (usableH - ((value / maxY) * usableH))
  const linePath = chart.points.map((point, idx) => `${idx === 0 ? 'M' : 'L'} ${toX(point.x).toFixed(1)} ${toY(point.y).toFixed(1)}`).join(' ')
  const areaPath = `${linePath} L ${toX(chart.points[chart.points.length - 1].x).toFixed(1)} ${(height - padBottom).toFixed(1)} L ${toX(chart.points[0].x).toFixed(1)} ${(height - padBottom).toFixed(1)} Z`
  const markerX = selectedValue != null ? toX(selectedValue) : null
  const meanX = mean != null ? toX(Number(mean)) : null
  const displayKind = kind === 'ml' ? 'ml-margin' : kind

  return (
    <span className="dist-hover-chart">
      <svg viewBox={`0 0 ${width} ${height}`} className="dist-hover-chart-svg" role="img" aria-label="Distribution curve">
        <path d={`M ${padX} ${height - padBottom} L ${width - padX} ${height - padBottom}`} className="dist-hover-chart-axis" />
        <path d={areaPath} className={`dist-hover-chart-area dist-hover-chart-area--${chart.mode}`} />
        <path d={linePath} className={`dist-hover-chart-line dist-hover-chart-line--${chart.mode}`} />
        {meanX != null && meanX >= padX && meanX <= width - padX ? <path d={`M ${meanX.toFixed(1)} ${padTop} L ${meanX.toFixed(1)} ${height - padBottom}`} className="dist-hover-chart-mean" /> : null}
        {markerX != null && markerX >= padX && markerX <= width - padX ? <path d={`M ${markerX.toFixed(1)} ${padTop} L ${markerX.toFixed(1)} ${height - padBottom}`} className="dist-hover-chart-selected" /> : null}
        <text x={padX} y={height - 3} className="dist-hover-chart-tick">{formatDistributionValue(chart.xMin, displayKind)}</text>
        <text x={width - padX} y={height - 3} textAnchor="end" className="dist-hover-chart-tick">{formatDistributionValue(chart.xMax, displayKind)}</text>
      </svg>
      <span className="dist-hover-chart-legend">
        <span className="dist-hover-chart-legend-item"><span className="dist-hover-chart-legend-line dist-hover-chart-legend-line--mean" /> mean</span>
        {selectedValue != null ? <span className="dist-hover-chart-legend-item"><span className="dist-hover-chart-legend-line dist-hover-chart-legend-line--selected" /> selected</span> : null}
      </span>
    </span>
  )
}

function describeDistributionShape(distribution, kind) {
  const pct = distribution?.percentiles || {}
  const p10 = Number(pct.p10)
  const p25 = Number(pct.p25)
  const p50 = Number(pct.p50)
  const p75 = Number(pct.p75)
  const p90 = Number(pct.p90)
  const std = Number(distribution?.std)
  if (![p10, p25, p50, p75, p90].every(Number.isFinite)) return null

  const left = p50 - p10
  const right = p90 - p50
  const skew = right > left * 1.2 ? 'right tail' : left > right * 1.2 ? 'left tail' : 'balanced'
  const iqr = p75 - p25
  const intervalKind = kind === 'total' ? 'total' : 'spread'
  const wideCutoff = intervalKind === 'spread' ? 14 : 22
  const tightCutoff = intervalKind === 'spread' ? 8 : 14
  const dispersion = Number.isFinite(std)
    ? std >= wideCutoff ? 'wide' : std <= tightCutoff ? 'tight' : 'normal'
    : iqr >= wideCutoff ? 'wide' : iqr <= tightCutoff ? 'tight' : 'normal'
  const valueKind = kind === 'ml' ? 'ml-margin' : kind
  return `${dispersion} dispersion, ${skew}; middle 50% ${formatDistributionValue(p25, valueKind)} to ${formatDistributionValue(p75, valueKind)}`
}

function getDistributionSupport(distribution, intervalBundle, histogramBins) {
  const hasEmpiricalIntervals = Boolean(distribution?.percentiles && Object.values(distribution.percentiles).some(v => v != null))
  const hasHistogram = histogramBins.length > 0
  const hasApproxOnly = !hasEmpiricalIntervals && Boolean(intervalBundle.intervals)
  const supportLabel = hasHistogram ? 'Empirical shape' : hasEmpiricalIntervals ? 'Empirical intervals' : hasApproxOnly ? 'Approx only' : 'Shell only'
  const supportTone = hasHistogram || hasEmpiricalIntervals ? 'supported' : hasApproxOnly ? 'approx' : 'missing'
  const fallbackTitle = hasHistogram || hasEmpiricalIntervals
    ? null
    : hasApproxOnly
      ? 'Empirical payload unavailable for this market yet.'
      : 'Distribution payload not supported for this market yet.'
  const fallbackDetail = hasHistogram || hasEmpiricalIntervals
    ? null
    : hasApproxOnly
      ? 'Showing a normal approximation from the model mean and standard deviation.'
      : 'Only headline model stats are available here, so interval bands and shape detail stay intentionally hidden.'

  return {
    supportLabel,
    supportTone,
    fallbackTitle,
    fallbackDetail,
    hasHistogram,
    hasEmpiricalIntervals,
    hasApproxOnly,
  }
}

export function DistributionDetailsToggle({ summary, summaryTop = null, summaryBottomTop = null, summaryBottomBottom = null, toggleRow = 'bottom', panel, label = 'Show details' }) {
  const [open, setOpen] = React.useState(false)
  const [panelStyle, setPanelStyle] = React.useState(null)
  const panelId = React.useId()
  const triggerRef = React.useRef(null)
  const panelRef = React.useRef(null)

  React.useLayoutEffect(() => {
    if (!open) return undefined

    const updatePosition = () => {
      const trigger = triggerRef.current
      if (!trigger) return
      const rect = trigger.getBoundingClientRect()
      const width = Math.min(360, Math.max(290, Math.round(window.innerWidth * 0.3)))
      const left = Math.min(
        window.innerWidth - width - 12,
        Math.max(12, rect.left + (rect.width / 2) - (width / 2))
      )
      const top = Math.min(window.innerHeight - 12, rect.bottom + 10)
      setPanelStyle({ top, left, width })
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [open])

  React.useEffect(() => {
    if (!open) return undefined

    const onPointerDown = (event) => {
      const trigger = triggerRef.current
      const pop = panelRef.current
      if (trigger?.contains(event.target) || pop?.contains(event.target)) return
      setOpen(false)
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const hasSplitSummary = Boolean(summaryTop || summaryBottomTop || summaryBottomBottom)

  return (
    <div className={`model-detail-stack${open ? ' is-open' : ''}`}>
      <div className={`model-detail-head${hasSplitSummary ? '' : ' model-detail-head--inline'}`}>
        {hasSplitSummary ? (
          <>
            {summaryTop ? (
              <div className={`model-detail-summary${toggleRow === 'top' ? ' model-detail-summary--top-inline' : ''}`}>
                <span>{summaryTop}</span>
                {toggleRow === 'top' ? (
                  <button
                    ref={triggerRef}
                    type="button"
                    className="model-detail-toggle"
                    onClick={() => setOpen(prev => !prev)}
                    aria-expanded={open}
                    aria-controls={panelId}
                    title={label}
                    aria-label={label}
                  >
                    📊
                  </button>
                ) : null}
              </div>
            ) : null}
            {(summaryBottomTop || summaryBottomBottom) ? (
              <div className="model-detail-summary model-detail-summary--lower">
                {summaryBottomTop ? <span className="model-detail-prob-row">{summaryBottomTop}</span> : null}
                {summaryBottomBottom ? (
                  <span className="model-detail-mean-inline">
                    <span className="model-detail-mean-row">{summaryBottomBottom}</span>
                    {toggleRow !== 'top' ? (
                      <button
                        ref={triggerRef}
                        type="button"
                        className="model-detail-toggle"
                        onClick={() => setOpen(prev => !prev)}
                        aria-expanded={open}
                        aria-controls={panelId}
                        title={label}
                        aria-label={label}
                      >
                        📊
                      </button>
                    ) : null}
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <div className="model-detail-summary">{summary}</div>
            <button
              ref={triggerRef}
              type="button"
              className="model-detail-toggle"
              onClick={() => setOpen(prev => !prev)}
              aria-expanded={open}
              aria-controls={panelId}
              title={label}
              aria-label={label}
            >
              📊
            </button>
          </>
        )}
      </div>
      {open && typeof document !== 'undefined' && createPortal(
        <div className="model-detail-overlay">
          <div
            ref={panelRef}
            id={panelId}
            className="model-detail-panel-wrap model-detail-panel-wrap--overlay"
            style={panelStyle ?? undefined}
          >
            {panel}
          </div>
        </div>,
        document.querySelector('.nba-native') || document.body,
      )}
    </div>
  )
}

export function DistributionPopover({ title, subtitle, distribution, mean, std, kind, metrics = [], sections = null, selectedValue = null }) {
  const popoverId = React.useId()
  const resolvedMean = distribution?.mean ?? mean
  const resolvedStd = distribution?.std ?? std
  const intervalBundle = buildIntervalBands(distribution, resolvedMean, resolvedStd)
  const displayKind = kind === 'ml' ? 'ml-margin' : kind
  const defaultIntervalRows = [50, 80, 90, 95].map((band) => ({ band, range: intervalBundle.intervals?.[band] || null }))
  const defaultHistogramBins = compactHistogramBins(distribution, resolvedMean, kind)
  const defaultShapeNote = describeDistributionShape(distribution, kind)
  const defaultChart = buildDistributionChart(distribution, resolvedMean, resolvedStd)
  const baseSupport = getDistributionSupport(distribution, intervalBundle, defaultHistogramBins)
  const support = sections?.support ? { ...baseSupport, ...sections.support } : baseSupport
  const metricRows = metrics.length > 0
    ? metrics.map(metric => formatShellMetric(metric.label, metric.value))
    : [
        formatShellMetric('Mean', formatDistributionValue(resolvedMean, displayKind)),
        formatShellMetric('Median', formatDistributionValue(getDistributionMedian(distribution, resolvedMean), displayKind)),
        formatShellMetric('Std dev', resolvedStd != null ? Number(resolvedStd).toFixed(1) : null),
      ]
  const intervalRows = sections?.intervalRows ?? defaultIntervalRows
  const showIntervals = sections?.showIntervals ?? true
  const intervalLabel = sections?.intervalLabel ?? 'Intervals'
  const intervalEmpty = sections?.intervalEmpty ?? 'No interval bands available for this market yet.'
  const histogramBins = sections?.histogramBins ?? defaultHistogramBins
  const shapeNote = sections?.shapeNote ?? defaultShapeNote
  const chart = sections?.chart ?? defaultChart
  const showShape = sections?.showShape ?? (histogramBins.length > 0 || Boolean(chart))
  const shapeLabel = sections?.shapeLabel ?? 'Shape'
  const footerCopy = sections?.footerCopy ?? (support.hasHistogram
    ? 'Empirical histogram is live from landed possession samples.'
    : support.hasEmpiricalIntervals
      ? 'Empirical interval bands are live. Shape detail has not landed for this market yet.'
      : support.hasApproxOnly
        ? 'Fallback is explicit here so approximate ranges do not read like empirical simulation output.'
        : 'This hover stays available for consistency, but it does not imply hidden distribution data exists.')
  const extraSections = Array.isArray(sections)
    ? sections.filter(section => section?.title || section?.body)
    : Array.isArray(sections?.items)
      ? sections.items.filter(section => section?.title || section?.body)
      : []

  return (
    <div id={popoverId} className="dist-hover-popover" role="group" aria-label={title}>
      <span className="dist-hover-header-row">
        <span className="dist-hover-eyebrow">Distribution</span>
        <span className={`dist-hover-badge dist-hover-badge--${support.supportTone}`}>{support.supportLabel}</span>
      </span>
      <span className="dist-hover-title">{title}</span>
      {subtitle && <span className="dist-hover-subtitle">{subtitle}</span>}
      <span className="dist-hover-shell-grid">
        {metricRows.map(metric => (
          <span key={metric.label} className="dist-hover-shell-stat">
            <span className="dist-hover-shell-label">{metric.label}</span>
            <span className="dist-hover-shell-value">{metric.value}</span>
          </span>
        ))}
      </span>
      {support.fallbackTitle && (
        <span className={`dist-hover-fallback dist-hover-fallback--${support.supportTone}`}>
          <span className="dist-hover-fallback-title">{support.fallbackTitle}</span>
          <span className="dist-hover-fallback-copy">{support.fallbackDetail}</span>
        </span>
      )}
      {showIntervals && (
        <span className="dist-hover-intervals">
          <span className="dist-hover-intervals-label">{intervalLabel}</span>
          {intervalRows.some(row => row.range) ? intervalRows.map(({ band, range }) => (
            <span key={band} className="dist-hover-interval-row">
              <span className="dist-hover-interval-band">{band}%</span>
              <span className="dist-hover-interval-range">{range ? `${formatDistributionValue(range.low, displayKind)} to ${formatDistributionValue(range.high, displayKind)}` : '—'}</span>
            </span>
          )) : (
            <span className="dist-hover-interval-empty">{intervalEmpty}</span>
          )}
        </span>
      )}
      {showShape && (
        <span className="dist-hover-shape">
          <span className="dist-hover-shape-label">{shapeLabel}</span>
          {chart && <DistributionMiniChart chart={chart} mean={resolvedMean} selectedValue={selectedValue} kind={kind} />}
          {histogramBins.length > 0 && (
            <span className="dist-hover-histogram">
              {histogramBins.map(bin => (
                <span key={bin.label} className="dist-hover-bin">
                  <span className="dist-hover-bin-label">{bin.label}</span>
                  <span className="dist-hover-bin-bar-wrap">
                    <span className="dist-hover-bin-bar" style={{ width: bin.width }} />
                  </span>
                  <span className="dist-hover-bin-pct">{(bin.pct * 100).toFixed(0)}%</span>
                </span>
              ))}
            </span>
          )}
          {shapeNote && <span className="dist-hover-shape-note">{shapeNote}</span>}
        </span>
      )}
      {extraSections.length > 0 && (
        <div className="dist-hover-notes">
          {extraSections.map((section, idx) => (
            <div key={`${section.title || 'section'}-${idx}`} className="dist-hover-note-block">
              {section.title ? <div className="dist-hover-note-title">{section.title}</div> : null}
              {section.body ? <div className="dist-hover-note-body">{section.body}</div> : null}
            </div>
          ))}
        </div>
      )}
      <span className="dist-hover-shell-footer">
        Source: {intervalBundle.source}. {footerCopy}
      </span>
    </div>
  )
}
