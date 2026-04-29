function roundLine(value) {
  const num = Number(value)
  return Number.isFinite(num) ? Number(num.toFixed(1)) : null
}

function normalCdf(x, mean, std) {
  if (!(std > 0)) return x >= mean ? 0.5 : 0
  const z = (Number(x) - Number(mean)) / (Number(std) * Math.sqrt(2))
  return 0.5 * (1 + erf(z))
}

function erf(x) {
  const sign = x < 0 ? -1 : 1
  const abs = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * abs)
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-abs * abs)
  return sign * y
}

function findProbabilityRow(distribution, targetLine) {
  const rows = Array.isArray(distribution?.probability_by_line) ? distribution.probability_by_line : []
  if (!rows.length) return null
  const roundedTarget = roundLine(targetLine)
  return rows.find((row) => roundLine(row?.line) === roundedTarget) || null
}

function clamp(value) {
  return Math.max(0, Math.min(1, Number(value)))
}

export function getSpreadLineProbabilities(prediction, option) {
  const distribution = prediction?.distributions?.margin
  const mean = distribution?.mean ?? prediction?.avg_margin
  const std = distribution?.std ?? prediction?.margin_std
  const homeLine = roundLine(option?.homeLine)
  if (homeLine == null) return null

  const row = findProbabilityRow(distribution, homeLine)
  let homeCover = row?.home_cover_pct
  if (homeCover == null && mean != null && std != null) {
    homeCover = clamp(1 - normalCdf(-homeLine, mean, std))
  }
  if (homeCover == null) return null

  const awayCover = row?.away_cover_pct ?? clamp(1 - homeCover)
  const coverIsHome = option?.coverTeam === prediction?.home_team
  return {
    lineSource: row ? 'empirical' : 'normal',
    coverPct: coverIsHome ? homeCover : awayCover,
    fadePct: coverIsHome ? awayCover : homeCover,
    homeCoverPct: homeCover,
    awayCoverPct: awayCover,
  }
}

export function getTotalLineProbabilities(prediction, option) {
  const distribution = prediction?.distributions?.total
  const mean = distribution?.mean ?? prediction?.avg_total ?? prediction?.model_total
  const std = distribution?.std ?? prediction?.total_std
  const line = roundLine(option?.line)
  if (line == null) return null

  const row = findProbabilityRow(distribution, line)
  let over = row?.over_pct
  if (over == null && mean != null && std != null) {
    over = clamp(1 - normalCdf(line, mean, std))
  }
  if (over == null) return null

  const under = row?.under_pct ?? clamp(1 - over)
  return {
    lineSource: row ? 'empirical' : 'normal',
    overPct: over,
    underPct: under,
    selectedPct: option?.side === 'under' ? under : over,
    oppositePct: option?.side === 'under' ? over : under,
  }
}
