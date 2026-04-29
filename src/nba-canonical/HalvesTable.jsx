import React, { useMemo, useState } from 'react'
import { applyCanonicalGameContext, finalizeCanonicalB2B } from './gameContext'
import {
  buildPolySpreadOptions,
  buildSpreadOptions,
  buildTotalOptions,
  formatDisplayCents,
  getClosestValue,
  getOptionState,
  polyOutcomeToAbbr,
  renderMarketLinePicker,
  renderSpreadPickerValue,
  renderSpreadQuoteSummary,
  renderTotalPickerValue,
  renderTotalQuoteSummary,
} from './quotePresentation'
import { renderMatchupCell } from './tablePresentation'

const HALF_CONFIGS = [
  { period: 'h1', label: '1H' },
  { period: 'h2', label: '2H' },
]

function getHalfQuestionMatcher(period) {
  return period === 'h1'
    ? /\b1h\b|first half/i
    : /\b2h\b|second half/i
}

function getHalfRows(prediction, period) {
  const rows = Array.isArray(prediction?.alt_lines) ? prediction.alt_lines : []
  return {
    total: rows.find(row => row.market === 'half_total' && row.period === period) || null,
    home: rows.find(row => row.market === 'half_team' && row.period === period && row.team === 'home') || null,
    away: rows.find(row => row.market === 'half_team' && row.period === period && row.team === 'away') || null,
  }
}

function getSignalTone(signal) {
  if (signal === 'BET') return 'edge-bet'
  if (signal === 'MONITOR') return 'edge-monitor'
  return 'edge-neutral'
}

function getSignalEmoji(signal) {
  if (signal === 'BET') return '🟢'
  if (signal === 'MONITOR') return '🟡'
  return '⚪'
}

function formatSigned(value, digits = 1, suffix = '') {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  const num = Number(value)
  return `${num >= 0 ? '+' : ''}${num.toFixed(digits)}${suffix}`
}

function formatLine(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return Number(value).toFixed(1)
}

function formatPct(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return `${(Number(value) * 100).toFixed(1)}%`
}

function getSpreadHalfView(game, half) {
  if (!half?.home || !half?.away) return null
  const homeModel = Number(half.home.model_adj ?? half.home.model)
  const awayModel = Number(half.away.model_adj ?? half.away.model)
  const homeVegas = Number(half.home.vegas)
  const awayVegas = Number(half.away.vegas)
  if (!Number.isFinite(homeModel) || !Number.isFinite(awayModel)) return null
  const modelMargin = homeModel - awayModel
  const vegasMargin = Number.isFinite(homeVegas) && Number.isFinite(awayVegas) ? (homeVegas - awayVegas) : null
  const edge = vegasMargin == null ? null : modelMargin - vegasMargin
  const pick = edge == null ? (modelMargin >= 0 ? game.home_team : game.away_team) : (edge >= 0 ? game.home_team : game.away_team)
  const signal = edge == null ? (Math.abs(modelMargin) >= 2 ? 'MONITOR' : 'PASS') : (Math.abs(edge) >= 2 ? 'BET' : Math.abs(edge) >= 0.75 ? 'MONITOR' : 'PASS')
  return {
    pick,
    signal,
    modelFav: modelMargin >= 0 ? game.home_team : game.away_team,
    modelSpread: Math.abs(modelMargin),
    vegasFav: vegasMargin == null ? null : (vegasMargin >= 0 ? game.home_team : game.away_team),
    vegasSpreadAbs: vegasMargin == null ? null : Math.abs(vegasMargin),
    edge,
    homeModel,
    awayModel,
    homeVegas: Number.isFinite(homeVegas) ? homeVegas : null,
    awayVegas: Number.isFinite(awayVegas) ? awayVegas : null,
  }
}

function getMlHalfView(game, half) {
  if (!half?.home || !half?.away) return null
  const homeModel = Number(half.home.model_adj ?? half.home.model)
  const awayModel = Number(half.away.model_adj ?? half.away.model)
  if (!Number.isFinite(homeModel) || !Number.isFinite(awayModel)) return null
  const margin = homeModel - awayModel
  const pick = margin >= 0 ? game.home_team : game.away_team
  return {
    pick,
    signal: Math.abs(margin) >= 3 ? 'BET' : Math.abs(margin) >= 1 ? 'MONITOR' : 'PASS',
    margin,
    homeModel,
    awayModel,
  }
}

function getTotalHalfView(half) {
  if (!half?.total) return null
  const modelTotal = Number(half.total.model_adj ?? half.total.model)
  const vegasTotal = Number(half.total.vegas)
  const edge = Number.isFinite(modelTotal) && Number.isFinite(vegasTotal) ? modelTotal - vegasTotal : null
  return {
    pick: edge == null ? '—' : edge >= 0 ? 'OVER' : 'UNDER',
    signal: half.total.signal || (edge == null ? 'PASS' : Math.abs(edge) >= 2 ? 'BET' : 'MONITOR'),
    modelTotal: Number.isFinite(modelTotal) ? modelTotal : null,
    vegasTotal: Number.isFinite(vegasTotal) ? vegasTotal : null,
    edge,
  }
}

function getPolyMlSelection(markets, game) {
  const market = (Array.isArray(markets) ? markets : []).find(m => m?.type === 'ml')
  if (!market) return null
  const outcomes = Array.isArray(market.outcomes) ? market.outcomes.map(polyOutcomeToAbbr) : []
  const prices = Array.isArray(market.prices) ? market.prices.map(v => Number(v)) : []
  if (outcomes.length !== 2 || prices.length !== 2) return null
  const awayIndex = outcomes.findIndex(team => team === game.away_team)
  const homeIndex = outcomes.findIndex(team => team === game.home_team)
  if (awayIndex < 0 || homeIndex < 0) return null
  return {
    awayProb: prices[awayIndex],
    homeProb: prices[homeIndex],
    favorite: prices[homeIndex] >= prices[awayIndex] ? game.home_team : game.away_team,
  }
}

function getHalfMarkets(prediction, period, type) {
  const matcher = getHalfQuestionMatcher(period)
  const kalshi = (Array.isArray(prediction?.kalshi_markets) ? prediction.kalshi_markets : []).filter(m => m?.type === type && matcher.test(m?.question || m?.title || ''))
  const poly = (Array.isArray(prediction?.poly_markets) ? prediction.poly_markets : []).filter(m => m?.type === type && matcher.test(m?.question || m?.title || ''))
  return { kalshi, poly }
}

function renderHalfSection(label, content, extraClass = '') {
  return (
    <div className={`half-stack-section ${extraClass}`.trim()}>
      <div className="half-stack-label">{label}</div>
      <div className="half-stack-body">{content}</div>
    </div>
  )
}

function renderHalfSignalSection(half, content) {
  if (!half) return renderHalfSection('—', <span className="dim">—</span>)
  return renderHalfSection(half.label, content)
}

function renderInlineQuote(top, bottom, color, isWide = false) {
  return (
    <div className="market-quote-cell" style={{ textAlign: 'center', color }}>
      {top != null || bottom != null ? (
        <>
          <div className="market-quote-line">{top ?? '—'}</div>
          <div className={`market-quote-costs ${isWide ? 'market-quote-costs--wide' : ''}`}>{bottom ?? '—'}</div>
        </>
      ) : <span style={{ color: '#444' }}>—</span>}
    </div>
  )
}

function renderSpreadQuoteBook({ game, half, markets, selectedLines, setSelectedLines, book, color }) {
  const rowKey = `${game.game_id}:${half.period}:${book}:spread`
  const ref = half.spread
  if (!ref) return renderHalfSection(half.label, <span className="dim">—</span>)
  const favoriteTeam = ref.vegasFav || ref.pick
  const options = book === 'k'
    ? buildSpreadOptions(markets.kalshi, game, favoriteTeam)
    : buildPolySpreadOptions(markets.poly, game, favoriteTeam)
  const targetLine = ref.vegasFav === game.home_team ? -Math.abs(ref.vegasSpreadAbs ?? 0) : ref.vegasFav === game.away_team ? Math.abs(ref.vegasSpreadAbs ?? 0) : null
  const defaultLine = getClosestValue(options, targetLine, option => option.signedLine)
  const { index, selection } = getOptionState(options, selectedLines[rowKey], defaultLine, option => option.signedLine)
  const top = selection ? renderMarketLinePicker({
    variant: book === 'k' ? 'kalshi' : 'poly',
    value: renderSpreadPickerValue(ref, ref.pick, selection, selection.signedLine),
    onPrev: () => index > 0 && setSelectedLines(prev => ({ ...prev, [rowKey]: options[index - 1].signedLine })),
    onNext: () => index >= 0 && index < options.length - 1 && setSelectedLines(prev => ({ ...prev, [rowKey]: options[index + 1].signedLine })),
    prevDisabled: index <= 0,
    nextDisabled: index < 0 || index >= options.length - 1,
    prevLabel: `Previous ${half.label} ${book === 'k' ? 'Kalshi' : 'Polymarket'} spread line`,
    nextLabel: `Next ${half.label} ${book === 'k' ? 'Kalshi' : 'Polymarket'} spread line`,
  }) : null
  const wide = selection?.coverAsk != null && selection?.fadeAsk != null && ((selection.coverAsk + selection.fadeAsk) >= 1.10)
  return renderHalfSection(half.label, renderInlineQuote(top, renderSpreadQuoteSummary(selection), wide ? color : '#666', wide))
}

function renderTotalQuoteBook({ half, markets, selectedLines, setSelectedLines, book, color }) {
  const rowKey = `${half.gameId}:${half.period}:${book}:total`
  const ref = half.totalView
  if (!ref) return renderHalfSection(half.label, <span className="dim">—</span>)
  const options = buildTotalOptions(book === 'k' ? markets.kalshi : markets.poly)
  const defaultLine = getClosestValue(options, ref.vegasTotal, option => option.line)
  const { index, selection } = getOptionState(options, selectedLines[rowKey], defaultLine, option => option.line)
  const top = selection ? renderMarketLinePicker({
    variant: book === 'k' ? 'kalshi' : 'poly',
    value: renderTotalPickerValue({ modelTotal: ref.modelTotal }, selection.line),
    onPrev: () => index > 0 && setSelectedLines(prev => ({ ...prev, [rowKey]: options[index - 1].line })),
    onNext: () => index >= 0 && index < options.length - 1 && setSelectedLines(prev => ({ ...prev, [rowKey]: options[index + 1].line })),
    prevDisabled: index <= 0,
    nextDisabled: index < 0 || index >= options.length - 1,
    prevLabel: `Previous ${half.label} ${book === 'k' ? 'Kalshi' : 'Polymarket'} total line`,
    nextLabel: `Next ${half.label} ${book === 'k' ? 'Kalshi' : 'Polymarket'} total line`,
  }) : null
  const wide = selection?.overAsk != null && selection?.underAsk != null && ((selection.overAsk + selection.underAsk) >= 1.10)
  return renderHalfSection(half.label, renderInlineQuote(top, renderTotalQuoteSummary(selection), wide ? color : '#666', wide))
}

function renderMlQuoteBook({ game, half, markets, color }) {
  const selection = getPolyMlSelection(markets.poly, game)
  if (!selection) return renderHalfSection(half.label, <span className="dim">—</span>)
  const awayFav = selection.favorite === game.away_team
  return renderHalfSection(half.label, (
    <div className="half-ml-market">
      <div className="half-ml-top">{selection.favorite}</div>
      <div className="half-ml-row">
        <span className={awayFav ? color : 'var(--text-dim)'}>{game.away_team}</span>
        <span>/</span>
        <span className={awayFav ? color : 'var(--text-dim)'}>{formatDisplayCents(selection.awayProb)}</span>
      </div>
      <div className="half-ml-row">
        <span className={!awayFav ? color : 'var(--text-dim)'}>{game.home_team}</span>
        <span>/</span>
        <span className={!awayFav ? color : 'var(--text-dim)'}>{formatDisplayCents(selection.homeProb)}</span>
      </div>
    </div>
  ))
}

function buildGameRows(predictions) {
  const gameMap = {}
  for (const p of predictions) {
    if (!gameMap[p.game_id]) {
      gameMap[p.game_id] = {
        game_id: p.game_id,
        matchup: p.matchup,
        home_team: p.home_team,
        away_team: p.away_team,
        game_date: p.game_date,
        game_time: p.game_time,
        home_b2b: p.home_b2b,
        away_b2b: p.away_b2b,
        home_stars_out: p.home_stars_out,
        away_stars_out: p.away_stars_out,
        home_starters_out: p.home_starters_out,
        away_starters_out: p.away_starters_out,
        home_rotation_out: p.home_rotation_out,
        away_rotation_out: p.away_rotation_out,
        home_record: p.home_record,
        away_record: p.away_record,
      }
    }
    applyCanonicalGameContext(gameMap[p.game_id], p)
    gameMap[p.game_id].possession = p
  }
  return Object.values(gameMap).map(finalizeCanonicalB2B)
}

function isLiveOrCompleted(game) {
  const t = (game.game_time || '').trim().toLowerCase()
  if (!t || t === 'tbd' || t === 'upcoming') return false
  if (t.includes('pm et') || t.includes('am et')) return false
  const todayET = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (game.game_date && game.game_date > todayET) return false
  return true
}

function dateLabel(date, today, tomorrow) {
  if (!date || date === today) return 'Today'
  if (date === tomorrow) return 'Tomorrow'
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }).toUpperCase()
}

function renderSignalBlock(mode, half) {
  if (mode === 'spread' && half.spread) {
    return <span className={`half-signal-chip ${getSignalTone(half.spread.signal)}`}>{getSignalEmoji(half.spread.signal)} {half.spread.pick}</span>
  }
  if (mode === 'ml' && half.ml) {
    return <span className={`half-signal-chip ${getSignalTone(half.ml.signal)}`}>{getSignalEmoji(half.ml.signal)} {half.ml.pick}</span>
  }
  if (mode === 'total' && half.totalView) {
    return <span className={`half-signal-chip ${getSignalTone(half.totalView.signal)}`}>{getSignalEmoji(half.totalView.signal)} {half.totalView.pick}</span>
  }
  return <span className="dim">—</span>
}

function renderSupportBlock(mode, half) {
  if (mode === 'spread' && half.spread) {
    return (
      <div className="half-support-stack">
        <span className="half-support-main">{half.spread.modelFav} -{half.spread.modelSpread.toFixed(1)}</span>
        <span className={`half-support-sub ${getSignalTone(half.spread.signal)}`}>{formatSigned(half.spread.edge, 1, ' pts')}</span>
      </div>
    )
  }
  if (mode === 'ml' && half.ml) {
    return (
      <div className="half-support-stack">
        <span className="half-support-main">{half.ml.pick}</span>
        <span className={`half-support-sub ${getSignalTone(half.ml.signal)}`}>by {Math.abs(half.ml.margin).toFixed(1)} pts</span>
      </div>
    )
  }
  if (mode === 'total' && half.totalView) {
    return (
      <div className="half-support-stack">
        <span className="half-support-main">{formatLine(half.totalView.modelTotal)}</span>
        <span className={`half-support-sub ${getSignalTone(half.totalView.signal)}`}>{formatSigned(half.totalView.edge, 1, ' pts')}</span>
      </div>
    )
  }
  return <span className="dim">—</span>
}

function renderRefBlock(mode, game, half) {
  if (mode === 'spread' && half.spread) {
    return half.spread.vegasFav
      ? <span>{half.spread.vegasFav} -{half.spread.vegasSpreadAbs?.toFixed(1)}</span>
      : <span className="dim">—</span>
  }
  if (mode === 'ml' && half.ml) {
    return (
      <div className="half-support-stack">
        <span className="half-support-main">{game.away_team} {formatLine(half.ml.awayModel)}</span>
        <span className="half-support-sub">{game.home_team} {formatLine(half.ml.homeModel)}</span>
      </div>
    )
  }
  if (mode === 'total' && half.totalView) {
    return <span>{formatLine(half.totalView.vegasTotal)}</span>
  }
  return <span className="dim">—</span>
}

function renderModelBlock(mode, game, half) {
  if (mode === 'spread' && half.spread) {
    return (
      <div className="half-support-stack">
        <span className="half-support-main">{game.away_team} {formatLine(half.spread.awayModel)}</span>
        <span className="half-support-sub">{game.home_team} {formatLine(half.spread.homeModel)}</span>
      </div>
    )
  }
  if (mode === 'ml' && half.ml) {
    return (
      <div className="half-support-stack">
        <span className="half-support-main">{game.away_team} {formatLine(half.ml.awayModel)}</span>
        <span className="half-support-sub">{game.home_team} {formatLine(half.ml.homeModel)}</span>
      </div>
    )
  }
  if (mode === 'total' && half.totalView) {
    return (
      <div className="half-support-stack">
        <span className="half-support-main">Mean {formatLine(half.totalView.modelTotal)}</span>
        <span className={`half-support-sub ${getSignalTone(half.totalView.signal)}`}>{formatSigned(half.totalView.edge, 1, ' pts')}</span>
      </div>
    )
  }
  return <span className="dim">—</span>
}

function HalvesTable({ predictions = [], mode = 'spread' }) {
  const [selectedLines, setSelectedLines] = useState({})

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  })()

  const games = useMemo(() => buildGameRows(predictions)
    .filter(game => !isLiveOrCompleted(game))
    .map(game => {
      const halves = HALF_CONFIGS.map(cfg => {
        const rows = getHalfRows(game.possession, cfg.period)
        return {
          ...cfg,
          gameId: game.game_id,
          rows,
          spread: getSpreadHalfView(game, rows),
          ml: getMlHalfView(game, rows),
          totalView: getTotalHalfView(rows),
          markets: {
            spread: getHalfMarkets(game.possession, cfg.period, 'spread'),
            total: getHalfMarkets(game.possession, cfg.period, 'total'),
            ml: getHalfMarkets(game.possession, cfg.period, 'ml'),
          },
        }
      })
      return { ...game, halves }
    })
    .filter(game => game.halves.some(half => half[mode === 'total' ? 'totalView' : mode]))
    .sort((a, b) => {
      const da = a.game_date || today
      const db = b.game_date || today
      if (da !== db) return da.localeCompare(db)
      const strength = (game) => Math.max(...game.halves.map(half => {
        if (mode === 'spread') return Math.abs(half.spread?.edge ?? 0)
        if (mode === 'ml') return Math.abs(half.ml?.margin ?? 0)
        return Math.abs(half.totalView?.edge ?? 0)
      }))
      return strength(b) - strength(a)
    }), [predictions, mode, today])

  if (!games.length) return <div className="empty">No half {mode === 'total' ? 'O/U' : mode} data available.</div>

  const note = mode === 'spread'
    ? 'Combined half-spread view. 1H and 2H are stacked inside each matchup row. Spread refs are derived from the half team-total lanes already in the possession payload.'
    : mode === 'ml'
      ? 'Combined half-ML view. Because the backend does not emit native half win probabilities yet, this lane uses projected half score lead plus live prediction-market prices where available.'
      : 'Combined half-total view. 1H and 2H stay in one matchup row, with live market line pickers when half markets exist.'

  const refHeader = mode === 'ml' ? 'Proj' : 'Vegas'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="summary-note" style={{ flexShrink: 0, padding: '0 0 8px' }}>{note}</div>
      <div className="table-container">
        <table className="predictions-table summary-table">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-matchup sticky-col">Matchup</th>
              <th className="col-time">Time</th>
              <th className="col-pick">Signal</th>
              <th className="col-support">Support</th>
              <th className="col-support">Context</th>
              <th className="col-vegas">{refHeader}</th>
              <th className="col-kp">K</th>
              <th className="col-kp">P</th>
              <th className="col-model">Possession</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, idx) => {
              const gDate = game.game_date || today
              const prevDate = idx > 0 ? (games[idx - 1].game_date || today) : null
              const showDate = gDate !== prevDate
              const flags = []
              const p = game.possession
              if (p?.tank_signal) flags.push(<span key="tank" title="Tanking team involved">⚰️</span>)
              if (p?.sharp_move) flags.push(<span key="sharp" title={`Sharp move: ${p.sharp_side || 'tracked'}`}>⚡</span>)
              if (game.home_b2b || game.away_b2b) flags.push(<span key="b2b" title={`${game.home_b2b ? game.home_team : game.away_team} back-to-back`}>😩</span>)
              if (p?.home_stars_out >= 1 || p?.away_stars_out >= 1) flags.push(<span key="inj" title="Key player(s) out">🚑</span>)

              return (
                <React.Fragment key={game.game_id}>
                  {showDate && <tr className="date-header-row"><td colSpan={10} className="date-header-cell">{dateLabel(gDate, today, tomorrow)}</td></tr>}
                  <tr className="prediction-row prediction-row--halves">
                    <td className="rank-cell">{idx + 1}</td>
                    <td className="matchup-cell sticky-col">{renderMatchupCell(game)}</td>
                    <td className="time-cell">{game.game_time ?? '—'}</td>
                    <td className="signal-cell half-stack-cell">
                      {game.halves.map(half => renderHalfSignalSection(half, renderSignalBlock(mode, half)))}
                    </td>
                    <td className="model-cell half-stack-cell">
                      {game.halves.map(half => renderHalfSignalSection(half, renderSupportBlock(mode, half)))}
                    </td>
                    <td className={`context-cell${flags.length ? '' : ' context-cell--empty'}`}>{flags.length ? flags : '—'}</td>
                    <td className="vegas-cell half-stack-cell">
                      {game.halves.map(half => renderHalfSignalSection(half, renderRefBlock(mode, game, half)))}
                    </td>
                    <td className="market-quote-cell half-stack-cell">
                      {game.halves.map(half => {
                        if (mode === 'spread') return <React.Fragment key={`k-${half.period}`}>{renderSpreadQuoteBook({ game, half, markets: half.markets.spread, selectedLines, setSelectedLines, book: 'k', color: '#b388ff' })}</React.Fragment>
                        if (mode === 'ml') return <React.Fragment key={`k-${half.period}`}>{renderHalfSection(half.label, <span className="dim">—</span>)}</React.Fragment>
                        return <React.Fragment key={`k-${half.period}`}>{renderTotalQuoteBook({ half, markets: half.markets.total, selectedLines, setSelectedLines, book: 'k', color: '#b388ff' })}</React.Fragment>
                      })}
                    </td>
                    <td className="market-quote-cell half-stack-cell">
                      {game.halves.map(half => {
                        if (mode === 'spread') return <React.Fragment key={`p-${half.period}`}>{renderSpreadQuoteBook({ game, half, markets: half.markets.spread, selectedLines, setSelectedLines, book: 'p', color: '#4a9eff' })}</React.Fragment>
                        if (mode === 'ml') return <React.Fragment key={`p-${half.period}`}>{renderMlQuoteBook({ game, half, markets: half.markets.ml, color: 'var(--accent)' })}</React.Fragment>
                        return <React.Fragment key={`p-${half.period}`}>{renderTotalQuoteBook({ half, markets: half.markets.total, selectedLines, setSelectedLines, book: 'p', color: '#4a9eff' })}</React.Fragment>
                      })}
                    </td>
                    <td className="model-cell half-stack-cell">
                      {game.halves.map(half => renderHalfSignalSection(half, renderModelBlock(mode, game, half)))}
                    </td>
                  </tr>
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default HalvesTable
