import { resolveDistribution, getPreferredDistributionPrediction } from './distributionUtils'

const KIND_THRESHOLDS = {
  spread: { robust: 2.0, elite: 4.0, tight: 9, normal: 12 },
  total: { robust: 3.0, elite: 6.0, tight: 14, normal: 20 },
  ml: { robust: 0.05, elite: 0.09, tight: 0.08, normal: 0.12 },
}

export function getSupportCount(row) {
  if (row.kind === 'ml') {
    return ['possession', 'playerdeep', 'fourfactor'].reduce((count, key) => {
      const mp = row.game.ensemble?.model_picks?.[key]
      return mp ? count + 1 : count
    }, 0)
  }

  const ref = row.game.poss || row.game.pd || row.game.ff
  if (row.kind === 'spread') {
    const pick = (ref?.edge ?? 0) > 0 ? row.game.home_team : row.game.away_team
    return ['possession', 'playerdeep', 'fourfactor'].reduce((count, key) => {
      const mp = row.game[key]
      if (!mp || mp.avg_margin == null) return count
      return count + ((((mp.avg_margin > 0) ? row.game.home_team : row.game.away_team) === pick) ? 1 : 0)
    }, 0)
  }

  const pick = (ref?.edge ?? 0) > 0 ? 'OVER' : 'UNDER'
  return ['possession', 'playerdeep', 'fourfactor'].reduce((count, key) => {
    const mp = row.game[key]
    if (!mp || mp.avg_total == null || mp.vegas_total == null) return count
    return count + ((((mp.avg_total > mp.vegas_total) ? 'OVER' : 'UNDER') === pick) ? 1 : 0)
  }, 0)
}

function getProbability(row, ref) {
  if (row.kind === 'ml') return ref?.modelWin ?? null
  if (row.kind === 'spread') return (ref?.edge ?? 0) > 0 ? ref?.coverPct : (ref?.coverPct != null ? 1 - ref.coverPct : null)
  return (ref?.edge ?? 0) > 0 ? ref?.overPct : (ref?.overPct != null ? 1 - ref.overPct : null)
}

function getDispersion(row, distributionState) {
  const distribution = distributionState.distribution
  return distribution?.std ?? distributionState.std ?? null
}

function getRangeTag(kind, dispersion) {
  if (dispersion == null) return null
  const thresholds = KIND_THRESHOLDS[kind]
  if (dispersion <= thresholds.tight) return 'Tight'
  if (dispersion <= thresholds.normal) return 'Normal'
  return 'Wide'
}

function getRobustnessTag(kind, metric) {
  return metric >= KIND_THRESHOLDS[kind].robust ? 'Robust' : 'Fragile'
}

function getDistributionQuality(distribution, distributionState) {
  const hasLineProbabilities = Boolean(distribution?.probability_by_line?.length)
  const hasPercentiles = Boolean(distribution?.percentiles)
  const hasHistogram = Boolean(distribution?.histogram?.length)
  const hasStdOnly = !hasLineProbabilities && !hasPercentiles && !hasHistogram && distributionState.std != null
  if (hasLineProbabilities || hasHistogram) return { label: 'strong', score: 1 }
  if (hasPercentiles) return { label: 'solid', score: 0.7 }
  if (hasStdOnly) return { label: 'light', score: 0.35 }
  return { label: 'none', score: 0 }
}

function getContextAdjustments(row) {
  const p = row.game.possession
  const pickTeam = row.kind === 'spread'
    ? (((row.game.poss?.edge ?? row.game.pd?.edge ?? row.game.ff?.edge ?? 0) > 0) ? row.game.home_team : row.game.away_team)
    : row.kind === 'ml'
      ? (row.game.poss?.pick || row.game.pd?.pick || row.game.ff?.pick)
      : null

  const riskyTank = Boolean(p?.tank_signal && pickTeam && (
    (pickTeam === row.game.home_team && p.home_rest_risk === 'HIGH') ||
    (pickTeam === row.game.away_team && p.away_rest_risk === 'HIGH')
  ))
  const b2bCount = (row.game.home_b2b ? 1 : 0) + (row.game.away_b2b ? 1 : 0)
  const sharpAligned = Boolean(p?.sharp_move && p?.sharp_side && p?.sharp_side === (p?.best_side || row.game.playerdeep?.best_side))

  return {
    riskyTank,
    sharpAligned,
    b2bCount,
    score: (sharpAligned ? 0.45 : 0) - (riskyTank ? 0.7 : 0) - (b2bCount >= 2 ? 0.2 : 0),
  }
}

export function annotateTopPickRow(row) {
  const ref = row.game.poss || row.game.pd || row.game.ff
  const metric = Math.abs(ref?.edge ?? 0)
  const distributionState = row.kind === 'ml'
    ? { distribution: null, std: null, prediction: null }
    : resolveDistribution(row.game, row.kind, getPreferredDistributionPrediction(row.game))
  const distribution = distributionState.distribution
  const dispersion = getDispersion(row, distributionState)
  const prob = getProbability(row, ref)
  const support = getSupportCount(row)
  const rangeTag = getRangeTag(row.kind, dispersion)
  const robustnessTag = getRobustnessTag(row.kind, metric)
  const distributionQuality = getDistributionQuality(distribution, distributionState)
  const context = getContextAdjustments(row)
  const normalizedEdge = Math.min(metric / KIND_THRESHOLDS[row.kind].elite, 1)
  const normalizedProb = prob == null ? 0.45 : Math.max(0, Math.min((prob - 0.5) / 0.2, 1))
  const supportScore = support / 3
  const rangeScore = rangeTag === 'Tight' ? 1 : rangeTag === 'Normal' ? 0.7 : rangeTag === 'Wide' ? 0.25 : 0.45
  const signalScore = row.signal === 'BET' ? 1 : row.signal === 'MONITOR' ? 0.58 : 0.2
  const compositeScore =
    signalScore * 2.2 +
    normalizedEdge * 2.1 +
    normalizedProb * 1.5 +
    supportScore * 1.4 +
    rangeScore * 0.7 +
    distributionQuality.score * 0.6 +
    context.score

  return {
    ...row,
    metric,
    prob,
    support,
    rangeTag,
    robustnessTag,
    simBacked: distributionQuality.score >= 0.7,
    simTag: distributionQuality.label === 'strong' ? 'Sim-backed' : distributionQuality.label === 'solid' ? 'Dist-backed' : null,
    rankingMeta: {
      dispersion,
      distributionQuality: distributionQuality.label,
      normalizedEdge,
      normalizedProb,
      supportScore,
      rangeScore,
      signalScore,
      context,
    },
    compositeScore,
    cardScore: compositeScore,
  }
}

export function compareTopPickComposite(a, b) {
  return b.compositeScore - a.compositeScore ||
    b.metric - a.metric ||
    (b.prob ?? -1) - (a.prob ?? -1) ||
    b.support - a.support
}

export function annotateMarketGame(game, kind, { signal = 'PASS', conviction = 0 } = {}) {
  const row = annotateTopPickRow({
    kind,
    game,
    game_id: `${game.game_id}-${kind}`,
    game_date: game.game_date,
    signal,
    conviction,
  })

  return {
    ...game,
    marketRanking: {
      compositeScore: row.compositeScore,
      metric: row.metric,
      prob: row.prob,
      support: row.support,
      rangeTag: row.rangeTag,
      robustnessTag: row.robustnessTag,
      simBacked: row.simBacked,
      rankingMeta: row.rankingMeta,
    },
  }
}

export function compareMarketGames(a, b) {
  const ar = a.marketRanking
  const br = b.marketRanking
  if (ar && br) {
    const ranked = compareTopPickComposite(ar, br)
    if (ranked !== 0) return ranked
  }
  if (br && !ar) return 1
  if (ar && !br) return -1

  return (b.possession?.conviction_score ?? 0) - (a.possession?.conviction_score ?? 0)
}
