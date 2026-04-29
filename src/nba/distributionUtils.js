export function getDistributionForKind(prediction, kind) {
  return kind === 'spread'
    ? prediction?.distributions?.margin
    : prediction?.distributions?.total
}

export function hasDistributionPayload(distribution) {
  return Boolean(
    distribution?.mean != null ||
    distribution?.std != null ||
    distribution?.percentiles ||
    distribution?.histogram?.length ||
    distribution?.probability_by_line?.length
  )
}

function uniquePredictions(predictions) {
  return predictions.filter((prediction, idx) => (
    prediction && predictions.findIndex(candidate => candidate === prediction) === idx
  ))
}

export function getPreferredDistributionPrediction(game) {
  if (game.poss) return game.possession
  if (game.pd) return game.playerdeep
  if (game.ff) return game.fourfactor
  return game.possession || game.playerdeep || game.fourfactor || null
}

export function resolveDistribution(game, kind, preferredPrediction = getPreferredDistributionPrediction(game)) {
  const candidates = uniquePredictions([
    preferredPrediction,
    game.possession,
    game.playerdeep,
    game.fourfactor,
  ])
  const source = candidates.find(prediction => hasDistributionPayload(getDistributionForKind(prediction, kind)))
  if (source) {
    return {
      prediction: source,
      distribution: getDistributionForKind(source, kind),
      std: kind === 'spread' ? source.margin_std : source.total_std,
    }
  }

  const stdSource = candidates.find(prediction => (
    kind === 'spread' ? prediction?.margin_std != null : prediction?.total_std != null
  ))

  return {
    prediction: stdSource || preferredPrediction || null,
    distribution: null,
    std: stdSource ? (kind === 'spread' ? stdSource.margin_std : stdSource.total_std) : null,
  }
}

export function getBandRange(percentiles) {
  if (!percentiles) return null
  if (percentiles.p25 != null && percentiles.p75 != null) return { low: percentiles.p25, high: percentiles.p75, label: '50%', source: 'percentiles' }
  if (percentiles.p10 != null && percentiles.p90 != null) return { low: percentiles.p10, high: percentiles.p90, label: '80%', source: 'percentiles' }
  return null
}

export function getModelRange(mean, std, percentiles) {
  const band = getBandRange(percentiles)
  if (band) return band
  if (mean != null && std != null) {
    const mid = Number(mean)
    const sigma = Number(std)
    if (!Number.isNaN(mid) && !Number.isNaN(sigma)) {
      return { low: mid - sigma, high: mid + sigma, label: '≈', source: 'stddev' }
    }
  }
  return null
}
