import React, { useMemo, useState } from 'react'
import { applyCanonicalGameContext, finalizeCanonicalB2B } from './gameContext'
import { renderLanePlaceholderBlock, renderLanePlaceholderCell } from './laneState.jsx'
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
import { renderMatchupCell, renderSignalPickCell } from './tablePresentation'

const PERIODS = [
  { key: 'q1', label: 'Q1', family: 'quarter' },
  { key: 'q2', label: 'Q2', family: 'quarter' },
  { key: 'q3', label: 'Q3', family: 'quarter' },
  { key: 'q4', label: 'Q4', family: 'quarter' },
  { key: 'h1', label: '1H', family: 'half' },
  { key: 'h2', label: '2H', family: 'half' },
]

const MODEL_LANES = [
  { key: 'possession', label: 'Possession' },
  { key: 'playerdeep', label: 'Player Deep' },
  { key: 'fourfactor', label: 'Four-Factor' },
]

function periodMatcher(period) {
  if (period === 'h1') return /\b1h\b|first half/i
  if (period === 'h2') return /\b2h\b|second half/i
  return new RegExp(`\\b${period}\\b`, 'i')
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

function fmtLine(value) {
  return value == null || !Number.isFinite(Number(value)) ? '—' : Number(value).toFixed(1)
}

function fmtSigned(value, suffix = '') {
  return value == null || !Number.isFinite(Number(value)) ? '—' : `${Number(value) >= 0 ? '+' : ''}${Number(value).toFixed(1)}${suffix}`
}

function getPeriodMarketTypes(period, mode) {
  if (mode === 'spread') return [`${period}_spread`, 'spread']
  if (mode === 'ml') return [`${period}_winner`, 'ml']
  return [`${period}_total`, 'total']
}

function getMarkets(prediction, period, mode) {
  const matcher = periodMatcher(period)
  const allowed = getPeriodMarketTypes(period, mode)
  const kalshi = (prediction?.kalshi_markets || []).filter(m => allowed.includes(m?.type) && matcher.test(`${m.question || ''} ${m.title || ''}`))
  const poly = (prediction?.poly_markets || []).filter(m => allowed.includes(m?.type) && matcher.test(`${m.question || ''} ${m.title || ''}`))
  return { kalshi, poly }
}

function getPolyMlSelection(markets, game) {
  const market = (Array.isArray(markets) ? markets : []).find(m => m?.type === 'ml')
  if (!market) return null
  const outcomes = Array.isArray(market.outcomes) ? market.outcomes.map(polyOutcomeToAbbr) : []
  const prices = Array.isArray(market.prices) ? market.prices.map(Number) : []
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

function getPeriodNode(prediction, period) {
  return prediction?.period_markets?.periods?.[period] || null
}

function getModelNode(prediction, period, lane) {
  return getPeriodNode(prediction, period)?.models?.[lane] || null
}

function getFrontendNode(game, period) {
  for (const lane of MODEL_LANES) {
    const frontend = getPeriodNode(game[lane.key], period)?.frontend
    if (frontend) return frontend
  }
  return null
}

function getModelView(game, lane, period, mode) {
  const node = getModelNode(game[lane], period, lane)
  const score = node?.score || null
  const marketKey = mode === 'ml' ? 'moneyline' : mode
  const market = node?.markets?.[marketKey] || null
  const ready = Boolean(node?.ready && (score || market))

  if (!ready) return null

  if (mode === 'spread') {
    const modelFav = market?.favorite || market?.pick || ((score?.margin ?? 0) >= 0 ? game.home_team : game.away_team)
    return {
      pick: market?.pick || modelFav,
      signal: market?.signal || 'PASS',
      modelFav,
      modelSpread: Number(market?.model_line ?? Math.abs(score?.margin ?? 0)),
      vegasFav: null,
      vegasSpreadAbs: Number.isFinite(Number(market?.vegas_line)) ? Number(market.vegas_line) : null,
      edge: Number.isFinite(Number(market?.edge)) ? Number(market.edge) : null,
    }
  }

  if (mode === 'ml') {
    return {
      pick: market?.pick || ((score?.margin ?? 0) >= 0 ? game.home_team : game.away_team),
      signal: market?.signal || 'PASS',
      margin: Number(market?.model_line ?? score?.margin ?? 0),
      homeModel: Number(score?.home),
      awayModel: Number(score?.away),
    }
  }

  return {
    pick: market?.pick || '—',
    signal: market?.signal || 'PASS',
    modelTotal: Number(market?.model_line ?? score?.total ?? null),
    vegasTotal: Number.isFinite(Number(market?.vegas_line)) ? Number(market.vegas_line) : null,
    edge: Number.isFinite(Number(market?.edge)) ? Number(market.edge) : null,
  }
}

function pickDisplaySignal(game, period, mode) {
  for (const lane of MODEL_LANES) {
    const view = getModelView(game, lane.key, period, mode)
    if (view) return view
  }
  return null
}

function sortMagnitude(view, mode) {
  if (!view) return 0
  if (mode === 'ml') return Math.abs(view.margin ?? 0)
  return Math.abs(view.edge ?? view.modelSpread ?? view.modelTotal ?? 0)
}

function buildGames({ possessionPreds = [], playerdeepPreds = [], fourfactorPreds = [] }, mode, period) {
  const gameMap = {}

  for (const [lane, predictions] of Object.entries({
    possession: possessionPreds,
    playerdeep: playerdeepPreds,
    fourfactor: fourfactorPreds,
  })) {
    for (const p of predictions || []) {
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
      gameMap[p.game_id][lane] = p
      if (!gameMap[p.game_id].marketPrediction && ((p.kalshi_markets || []).length || (p.poly_markets || []).length)) {
        gameMap[p.game_id].marketPrediction = p
      }
    }
  }

  return Object.values(gameMap)
    .map(finalizeCanonicalB2B)
    .filter(game => !isLiveOrCompleted(game))
    .map(game => {
      const displayView = pickDisplaySignal(game, period, mode)
      const frontend = getFrontendNode(game, period)
      const marketPrediction = game.marketPrediction || game.possession || game.playerdeep || game.fourfactor || null
      return {
        ...game,
        displayView,
        frontend,
        laneViews: Object.fromEntries(MODEL_LANES.map(({ key }) => [key, getModelView(game, key, period, mode)])),
        markets: marketPrediction ? {
          spread: getMarkets(marketPrediction, period, 'spread'),
          ml: getMarkets(marketPrediction, period, 'ml'),
          total: getMarkets(marketPrediction, period, 'total'),
        } : { spread: { kalshi: [], poly: [] }, ml: { kalshi: [], poly: [] }, total: { kalshi: [], poly: [] } },
      }
    })
    .filter(game => MODEL_LANES.some(({ key }) => game.laneViews[key]))
}

function renderQuote(top, bottom, color, wide = false) {
  return (
    <td className="col-kp market-quote-cell" style={{ textAlign: 'center', color }}>
      {top != null || bottom != null ? (
        <>
          <div className="market-quote-line">{top ?? '—'}</div>
          <div className={`market-quote-costs ${wide ? 'market-quote-costs--wide' : ''}`}>{bottom ?? '—'}</div>
        </>
      ) : <span style={{ color: '#444' }}>—</span>}
    </td>
  )
}

function renderModelCell(view, mode, state, label) {
  if (!view) return renderLanePlaceholderCell(state, label)

  if (mode === 'spread') {
    return (
      <td className="model-cell" style={{ textAlign: 'center' }}>
        <div className="half-support-stack">
          <span className="half-support-main">{view.modelFav} -{Number(view.modelSpread ?? 0).toFixed(1)}</span>
          <span className={`half-support-sub ${getSignalTone(view.signal)}`}>{view.edge != null ? fmtSigned(view.edge, ' pts') : 'model only'}</span>
        </div>
      </td>
    )
  }

  if (mode === 'ml') {
    return (
      <td className="model-cell" style={{ textAlign: 'center' }}>
        <div className="half-support-stack">
          <span className="half-support-main">{view.pick}</span>
          <span className={`half-support-sub ${getSignalTone(view.signal)}`}>by {Math.abs(view.margin ?? 0).toFixed(1)} pts</span>
        </div>
      </td>
    )
  }

  return (
    <td className="model-cell" style={{ textAlign: 'center' }}>
      <div className="half-support-stack">
        <span className="half-support-main">{fmtLine(view.modelTotal)}</span>
        <span className={`half-support-sub ${getSignalTone(view.signal)}`}>{fmtSigned(view.edge, ' pts')}</span>
      </div>
    </td>
  )
}

function PeriodMarketTable({
  possessionPreds = [],
  playerdeepPreds = [],
  fourfactorPreds = [],
  laneStates = {},
  mode = 'spread',
}) {
  const [period, setPeriod] = useState('h1')
  const [selectedLines, setSelectedLines] = useState({})

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  const tomorrow = (() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  })()

  const games = useMemo(() => buildGames({ possessionPreds, playerdeepPreds, fourfactorPreds }, mode, period)
    .sort((a, b) => {
      const da = a.game_date || today
      const db = b.game_date || today
      if (da !== db) return da.localeCompare(db)
      return sortMagnitude(b.displayView, mode) - sortMagnitude(a.displayView, mode)
    }), [possessionPreds, playerdeepPreds, fourfactorPreds, mode, period, today])

  const periodMeta = PERIODS.find(p => p.key === period)
  const note = mode === 'spread'
    ? `${periodMeta?.label} spread view using the shared period contract across all model lanes.`
    : mode === 'ml'
      ? `${periodMeta?.label} ML view using the shared period contract across all model lanes.`
      : `${periodMeta?.label} O/U view using the shared period contract across all model lanes.`

  if (!games.length) {
    const anyLoading = MODEL_LANES.some(({ key }) => laneStates?.[key]?.is_loading || laneStates?.[key]?.status === 'loading')
    if (anyLoading) return renderLanePlaceholderBlock(laneStates.possession || laneStates.playerdeep || laneStates.fourfactor, 'Quarter/Half models')
    return <div className="empty">No {periodMeta?.label} {mode === 'ml' ? 'ML' : mode} data available.</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      <div className="period-toggle-row">
        {PERIODS.map(option => (
          <button
            key={option.key}
            className={`period-toggle ${period === option.key ? 'active' : ''}`}
            onClick={() => setPeriod(option.key)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="summary-note" style={{ flexShrink: 0, padding: '0 0 8px' }}>{note}</div>
      <div className="table-container">
        <table className="predictions-table summary-table summary-table--period">
          <thead>
            <tr>
              <th className="col-rank">#</th>
              <th className="col-matchup sticky-col">Matchup</th>
              <th className="col-time">Time</th>
              <th className="col-pick">Signal</th>
              <th className="col-vegas">{mode === 'ml' ? 'Proj' : 'Vegas'}</th>
              <th className="col-kp">K</th>
              <th className="col-kp">P</th>
              <th className="col-model">Possession</th>
              <th className="col-model">Player Deep</th>
              <th className="col-model">Four-Factor</th>
            </tr>
          </thead>
          <tbody>
            {games.map((game, idx) => {
              const gDate = game.game_date || today
              const prevDate = idx > 0 ? (games[idx - 1].game_date || today) : null
              const showDate = gDate !== prevDate
              const view = game.displayView
              const pick = view?.pick || '—'
              const emoji = getSignalEmoji(view?.signal)
              return (
                <React.Fragment key={`${game.game_id}:${period}`}>
                  {showDate && <tr className="date-header-row"><td colSpan={10} className="date-header-cell">{dateLabel(gDate, today, tomorrow)}</td></tr>}
                  <tr className="prediction-row">
                    <td className="rank-cell">{idx + 1}</td>
                    <td className="matchup-cell sticky-col">{renderMatchupCell(game)}</td>
                    <td className="time-cell">{game.game_time ?? '—'}</td>
                    {renderSignalPickCell({ pick, emoji })}
                    <td className="vegas-cell" style={{ textAlign: 'center' }}>
                      {mode === 'spread' ? (
                        view?.vegasSpreadAbs != null ? <span>{view.vegasSpreadAbs.toFixed(1)}</span> : <span className="dim">—</span>
                      ) : mode === 'ml' ? (
                        <div className="half-support-stack">
                          <span className="half-support-main">{game.away_team} {fmtLine(view?.awayModel)}</span>
                          <span className="half-support-sub">{game.home_team} {fmtLine(view?.homeModel)}</span>
                        </div>
                      ) : (
                        view?.vegasTotal != null ? <span>{fmtLine(view.vegasTotal)}</span> : <span className="dim">—</span>
                      )}
                    </td>
                    {(() => {
                      if (mode === 'spread') {
                        const options = buildSpreadOptions(game.markets.spread.kalshi, game, view?.vegasFav || view?.pick)
                        const key = `${game.game_id}:${period}:k:spread`
                        const target = view?.vegasFav === game.home_team ? -Math.abs(view?.vegasSpreadAbs ?? 0) : view?.vegasFav === game.away_team ? Math.abs(view?.vegasSpreadAbs ?? 0) : null
                        const def = getClosestValue(options, target, o => o.signedLine)
                        const { index, selection } = getOptionState(options, selectedLines[key], def, o => o.signedLine)
                        const top = selection ? renderMarketLinePicker({ variant: 'kalshi', value: renderSpreadPickerValue(view, view.pick, selection, selection.signedLine), onPrev: () => index > 0 && setSelectedLines(prev => ({ ...prev, [key]: options[index - 1].signedLine })), onNext: () => index >= 0 && index < options.length - 1 && setSelectedLines(prev => ({ ...prev, [key]: options[index + 1].signedLine })), prevDisabled: index <= 0, nextDisabled: index < 0 || index >= options.length - 1, prevLabel: 'Previous line', nextLabel: 'Next line' }) : null
                        const wide = selection?.coverAsk != null && selection?.fadeAsk != null && ((selection.coverAsk + selection.fadeAsk) >= 1.10)
                        return renderQuote(top, renderSpreadQuoteSummary(selection), wide ? '#b388ff' : '#666', wide)
                      }
                      if (mode === 'total') {
                        const options = buildTotalOptions(game.markets.total.kalshi)
                        const key = `${game.game_id}:${period}:k:total`
                        const def = getClosestValue(options, view?.vegasTotal, o => o.line)
                        const { index, selection } = getOptionState(options, selectedLines[key], def, o => o.line)
                        const top = selection ? renderMarketLinePicker({ variant: 'kalshi', value: renderTotalPickerValue({ modelTotal: view?.modelTotal }, selection.line), onPrev: () => index > 0 && setSelectedLines(prev => ({ ...prev, [key]: options[index - 1].line })), onNext: () => index >= 0 && index < options.length - 1 && setSelectedLines(prev => ({ ...prev, [key]: options[index + 1].line })), prevDisabled: index <= 0, nextDisabled: index < 0 || index >= options.length - 1, prevLabel: 'Previous line', nextLabel: 'Next line' }) : null
                        const wide = selection?.overAsk != null && selection?.underAsk != null && ((selection.overAsk + selection.underAsk) >= 1.10)
                        return renderQuote(top, renderTotalQuoteSummary(selection), wide ? '#b388ff' : '#666', wide)
                      }
                      return renderQuote(null, null, '#666', false)
                    })()}
                    {(() => {
                      if (mode === 'spread') {
                        const options = buildPolySpreadOptions(game.markets.spread.poly, game, view?.vegasFav || view?.pick)
                        const key = `${game.game_id}:${period}:p:spread`
                        const target = view?.vegasFav === game.home_team ? -Math.abs(view?.vegasSpreadAbs ?? 0) : view?.vegasFav === game.away_team ? Math.abs(view?.vegasSpreadAbs ?? 0) : null
                        const def = getClosestValue(options, target, o => o.signedLine)
                        const { index, selection } = getOptionState(options, selectedLines[key], def, o => o.signedLine)
                        const top = selection ? renderMarketLinePicker({ variant: 'poly', value: renderSpreadPickerValue(view, view.pick, selection, selection.signedLine), onPrev: () => index > 0 && setSelectedLines(prev => ({ ...prev, [key]: options[index - 1].signedLine })), onNext: () => index >= 0 && index < options.length - 1 && setSelectedLines(prev => ({ ...prev, [key]: options[index + 1].signedLine })), prevDisabled: index <= 0, nextDisabled: index < 0 || index >= options.length - 1, prevLabel: 'Previous line', nextLabel: 'Next line' }) : null
                        const wide = selection?.coverAsk != null && selection?.fadeAsk != null && ((selection.coverAsk + selection.fadeAsk) >= 1.10)
                        return renderQuote(top, renderSpreadQuoteSummary(selection), wide ? '#4a9eff' : '#666', wide)
                      }
                      if (mode === 'total') {
                        const options = buildTotalOptions(game.markets.total.poly)
                        const key = `${game.game_id}:${period}:p:total`
                        const def = getClosestValue(options, view?.vegasTotal, o => o.line)
                        const { index, selection } = getOptionState(options, selectedLines[key], def, o => o.line)
                        const top = selection ? renderMarketLinePicker({ variant: 'poly', value: renderTotalPickerValue({ modelTotal: view?.modelTotal }, selection.line), onPrev: () => index > 0 && setSelectedLines(prev => ({ ...prev, [key]: options[index - 1].line })), onNext: () => index >= 0 && index < options.length - 1 && setSelectedLines(prev => ({ ...prev, [key]: options[index + 1].line })), prevDisabled: index <= 0, nextDisabled: index < 0 || index >= options.length - 1, prevLabel: 'Previous line', nextLabel: 'Next line' }) : null
                        const wide = selection?.overAsk != null && selection?.underAsk != null && ((selection.overAsk + selection.underAsk) >= 1.10)
                        return renderQuote(top, renderTotalQuoteSummary(selection), wide ? '#4a9eff' : '#666', wide)
                      }
                      if (mode === 'ml') {
                        const sel = getPolyMlSelection(game.markets.ml.poly, game)
                        return renderQuote(
                          sel?.favorite || null,
                          sel ? <><span className="market-quote-side">{game.away_team} {formatDisplayCents(sel.awayProb)}</span><span className="market-quote-sep">/</span><span className="market-quote-side market-quote-side--fade">{game.home_team} {formatDisplayCents(sel.homeProb)}</span></> : null,
                          '#4a9eff',
                          false,
                        )
                      }
                      return renderQuote(null, null, '#666', false)
                    })()}
                    {MODEL_LANES.map(({ key, label }) => renderModelCell(game.laneViews[key], mode, laneStates[key], label))}
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

export default PeriodMarketTable
