import {
  buildPolySpreadOptions,
  buildSpreadOptions,
  buildTotalOptions,
  getOptionState,
} from './quotePresentation'

function roundLine(value) {
  const num = Number(value)
  return Number.isFinite(num) ? Number(num.toFixed(1)) : null
}

function getClosestOption(options, target, getValue) {
  if (!options.length) return null
  if (target == null) return options[0]
  return options.reduce((best, option) => {
    const bestValue = Number(getValue(best))
    const optionValue = Number(getValue(option))
    if (!Number.isFinite(optionValue)) return best
    if (!Number.isFinite(bestValue)) return option
    return Math.abs(optionValue - target) < Math.abs(bestValue - target) ? option : best
  }, options[0])
}

function uniqOptions(options, keyFn) {
  const map = new Map()
  for (const option of options) {
    const key = keyFn(option)
    if (!key || map.has(key)) continue
    map.set(key, option)
  }
  return [...map.values()]
}

function sortSpreadOptions(options) {
  return [...options].sort((a, b) => {
    const aLine = Number(a?.homeLine)
    const bLine = Number(b?.homeLine)
    if (Number.isFinite(aLine) && Number.isFinite(bLine) && aLine !== bLine) return aLine - bLine
    return String(a?.coverTeam || '').localeCompare(String(b?.coverTeam || ''))
  })
}

function sortTotalOptions(options) {
  return [...options].sort((a, b) => Number(a?.line) - Number(b?.line))
}

export function getSpreadModelLineState(game, ref, coverPick, storedValue) {
  const favoriteTeam = ref?.vegasFav || coverPick
  const options = sortSpreadOptions(uniqOptions([
    ...buildSpreadOptions(game?.possession?.kalshi_markets, game, favoriteTeam),
    ...buildPolySpreadOptions(game?.possession?.poly_markets, game, favoriteTeam),
  ], (option) => option?.selectionKey))

  const targetHomeLine = ref?.vegasFav
    ? (ref.vegasFav === game?.home_team ? -Math.abs(ref?.vegasSpreadAbs ?? 0) : Math.abs(ref?.vegasSpreadAbs ?? 0))
    : null
  const defaultOption = getClosestOption(options, targetHomeLine, option => option.homeLine)
  const defaultValue = defaultOption?.selectionKey ?? null
  return {
    options,
    defaultValue,
    ...getOptionState(options, storedValue, defaultValue, option => option.selectionKey),
  }
}

export function getTotalModelLineState(game, ref, storedValue) {
  const options = sortTotalOptions(uniqOptions([
    ...buildTotalOptions(game?.possession?.kalshi_markets),
    ...buildTotalOptions((Array.isArray(game?.possession?.poly_markets) ? game.possession.poly_markets : []).filter(m => !m.question?.includes('1H'))),
  ], (option) => option?.selectionKey ?? String(roundLine(option?.line))))

  const defaultOption = getClosestOption(options, ref?.vegasTotal ?? null, option => option.line)
  const defaultValue = defaultOption?.selectionKey ?? null
  return {
    options,
    defaultValue,
    ...getOptionState(options, storedValue, defaultValue, option => option.selectionKey ?? String(roundLine(option?.line))),
  }
}
