import React from 'react'

const POLY_TEAM_MAP = {
  Hawks: 'ATL', Celtics: 'BOS', Nets: 'BKN', Hornets: 'CHA', Bulls: 'CHI', Cavaliers: 'CLE',
  Mavs: 'DAL', Mavericks: 'DAL', Nuggets: 'DEN', Pistons: 'DET', Warriors: 'GSW', Rockets: 'HOU',
  Pacers: 'IND', Clippers: 'LAC', Lakers: 'LAL', Grizzlies: 'MEM', Heat: 'MIA', Bucks: 'MIL',
  Timberwolves: 'MIN', Wolves: 'MIN', Pelicans: 'NOP', Knicks: 'NYK', Thunder: 'OKC', Magic: 'ORL',
  '76ers': 'PHI', Sixers: 'PHI', Suns: 'PHX', 'Trail Blazers': 'POR', Blazers: 'POR', Kings: 'SAC',
  Spurs: 'SAS', Raptors: 'TOR', Jazz: 'UTA', Wizards: 'WAS',
}

export function formatDisplayCents(price) {
  if (price == null) return '—'
  return `${(Number(price) * 100).toFixed(1)}¢`
}

export function formatCoverLine(team, line) {
  if (!team || line == null) return '—'
  const numeric = Number(line)
  if (!Number.isFinite(numeric)) return '—'
  if (numeric === 0) return `${team} PK`
  return `${team} ${numeric > 0 ? '+' : ''}${numeric.toFixed(1)}`
}

export function formatLine(line) {
  return line != null ? Number(line).toFixed(1) : '—'
}

export function formatSignedLine(line) {
  if (line == null) return '—'
  return `${line > 0 ? '+' : ''}${line.toFixed(1)}`
}

export function formatQuotePrice(price) {
  return price != null ? `${(Number(price) * 100).toFixed(1)}¢` : '—'
}

export function renderQuoteCell(top, bottom, color, isWide = false) {
  return (
    <td className="col-kp market-quote-cell" style={{ textAlign: 'center', color }}>
      {top != null || bottom != null ? (
        <>
          <div className="market-quote-line">{top ?? '—'}</div>
          <div className={`market-quote-costs ${isWide ? 'market-quote-costs--wide' : ''}`}>{bottom ?? '—'}</div>
        </>
      ) : <span style={{ color: '#444' }}>—</span>}
    </td>
  )
}

export function renderSpreadQuoteSummary(selection) {
  if (!selection) return null
  return (
    <>
      <span className="market-quote-side">{selection.coverTeam} {formatDisplayCents(selection.coverAsk)}</span>
      <span className="market-quote-sep">/</span>
      <span className="market-quote-side market-quote-side--fade">{selection.fadeTeam} {formatDisplayCents(selection.fadeAsk)}</span>
    </>
  )
}

export function renderTotalQuoteSummary(selection) {
  if (!selection) return null
  return (
    <>
      <span className="market-quote-side">O {formatDisplayCents(selection.overAsk)}</span>
      <span className="market-quote-sep">/</span>
      <span className="market-quote-side market-quote-side--fade">U {formatDisplayCents(selection.underAsk)}</span>
    </>
  )
}

export function renderPickerValue({ display, title, summary = null }) {
  return (
    <span className="market-line-picker-value" title={title}>
      {display}
      {summary ? <span style={{ display: 'block', fontSize: '0.63rem', color: 'var(--text-dim)' }}>{summary}</span> : null}
    </span>
  )
}

export function renderSpreadPickerValue(ref, coverPick, selection, signedLine) {
  const modelLine = ref?.modelFav
    ? (ref.modelFav === selection?.coverTeam ? -Math.abs(ref?.modelSpread ?? 0) : Math.abs(ref?.modelSpread ?? 0))
    : -(ref?.modelSpread ?? 0)
  return renderPickerValue({
    display: formatCoverLine(selection.coverTeam, selection?.displayLine ?? signedLine),
    title: `Model mean: ${ref?.modelFav || coverPick} ${formatSignedLine(modelLine)}`,
  })
}

export function renderTotalPickerValue(ref, selectedLine) {
  return renderPickerValue({
    display: formatLine(selectedLine),
    title: `Model mean total: ${formatLine(ref?.modelTotal)}`,
  })
}

export function renderMarketLinePicker({
  variant,
  value,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  prevLabel,
  nextLabel,
}) {
  if (value == null) return null
  return (
    <div className={`market-line-picker market-line-picker--${variant}`}>
      <button className="market-line-nav market-line-nav--prev" type="button" onClick={onPrev} disabled={prevDisabled} aria-label={prevLabel}>
        <span aria-hidden="true">‹</span>
      </button>
      {value}
      <button className="market-line-nav market-line-nav--next" type="button" onClick={onNext} disabled={nextDisabled} aria-label={nextLabel}>
        <span aria-hidden="true">›</span>
      </button>
    </div>
  )
}

export function getOptionState(options, storedValue, defaultValue, getValue) {
  const selectedValue = storedValue ?? defaultValue
  const index = options.findIndex(o => getValue(o) === selectedValue)
  const selection = index >= 0 ? options[index] : null
  return { selectedValue, index, selection }
}

export function getClosestValue(options, target, getValue) {
  if (!options.length) return null
  if (target == null) return getValue(options[0])
  return getValue(options.reduce((best, cur) => (
    Math.abs(getValue(cur) - target) < Math.abs(getValue(best) - target) ? cur : best
  ), options[0]))
}

export function isFullGameSpreadMarket(market) {
  const q = (market?.question || '').toLowerCase()
  return market?.type === 'spread' && !q.includes('1h') && !q.includes('2h')
}

export function polyOutcomeToAbbr(outcome) {
  return POLY_TEAM_MAP[(outcome || '').trim()] || null
}

export function polyCoverTeam(market, outcomes) {
  const questionMatch = String(market?.question || '').match(/Spread:\s*([^()]+)\s*\(/i)
  const fromQuestion = polyOutcomeToAbbr(questionMatch?.[1] || '')
  if (fromQuestion) return fromQuestion
  if (Number(market?.line) < 0) return outcomes[0] || null
  if (Number(market?.line) > 0) return outcomes[1] || null
  return outcomes[0] || null
}

export function orderSpreadOptions(options, favoriteTeam) {
  const fav = []
  const dog = []
  for (const option of options) {
    if (option.coverTeam === favoriteTeam) fav.push(option)
    else dog.push(option)
  }
  fav.sort((a, b) => Math.abs(b.signedLine ?? b.line) - Math.abs(a.signedLine ?? a.line))
  dog.sort((a, b) => Math.abs(a.signedLine ?? a.line) - Math.abs(b.signedLine ?? b.line))
  return [...fav, ...dog]
}

export function buildSpreadOptions(markets, game, favoriteTeam) {
  return orderSpreadOptions((Array.isArray(markets) ? markets : [])
    .filter(m => m?.type === 'spread' && m?.line != null && m?.team)
    .map(m => {
      const lineAbs = Number(m.line) + 0.5
      const coverIsHome = m.team === game.home_team
      const homeLine = coverIsHome ? -lineAbs : lineAbs
      const displayLine = coverIsHome ? homeLine : -homeLine
      return {
        signedLine: displayLine,
        homeLine,
        displayLine,
        selectionKey: `${m.team}:${displayLine.toFixed(1)}`,
        coverAsk: m.yes_ask,
        fadeAsk: m.no_ask,
        coverTeam: m.team,
        fadeTeam: m.team === game.home_team ? game.away_team : game.home_team,
      }
    }), favoriteTeam)
}

export function buildPolySpreadOptions(markets, game, favoriteTeam) {
  return orderSpreadOptions((Array.isArray(markets) ? markets : [])
    .filter(isFullGameSpreadMarket)
    .map(m => {
      const outcomes = Array.isArray(m.outcomes) ? m.outcomes.map(polyOutcomeToAbbr) : []
      const prices = Array.isArray(m.prices) ? m.prices.map(v => Number(v)) : []
      if (outcomes.length !== 2 || prices.length !== 2) return null
      const coverTeam = polyCoverTeam(m, outcomes)
      if (!coverTeam) return null
      const i = outcomes.findIndex(t => t === coverTeam)
      if (i < 0) return null
      const displayedLine = Math.abs(Number(m.line))
      const coverIsHome = coverTeam === game.home_team
      const homeLine = coverIsHome ? -displayedLine : displayedLine
      const displayLine = coverIsHome ? homeLine : -homeLine
      return {
        line: displayLine,
        signedLine: displayLine,
        homeLine,
        displayLine,
        selectionKey: `${coverTeam}:${displayLine.toFixed(1)}`,
        coverAsk: prices[i],
        fadeAsk: prices[1 - i],
        coverTeam,
        fadeTeam: i === 0 ? outcomes[1] : outcomes[0],
      }
    })
    .filter(Boolean), favoriteTeam)
}

export function normalizeKalshiTotalLine(market) {
  const rawLine = Number(market?.line)
  if (!Number.isFinite(rawLine)) return null
  const ticker = String(market?.ticker || '')
  const isNbaKalshiTotal = /^KXNBATOTAL-/.test(ticker)
  if (!isNbaKalshiTotal) return rawLine
  const tickerTail = Number(ticker.split('-').pop())
  if (!Number.isFinite(tickerTail)) return rawLine
  return tickerTail - 0.5
}

export function buildTotalOptions(markets) {
  return (Array.isArray(markets) ? markets : [])
    .filter(m => m?.type === 'total' && m?.line != null)
    .map(m => ({
      line: normalizeKalshiTotalLine(m),
      selectionKey: String(normalizeKalshiTotalLine(m)?.toFixed?.(1) ?? normalizeKalshiTotalLine(m)),
      overAsk: m.yes_ask ?? null,
      underAsk: m.no_ask ?? null,
      question: m.question ?? '',
      ticker: m.ticker ?? '',
    }))
    .filter(m => m.line != null)
    .sort((a, b) => a.line - b.line)
}
