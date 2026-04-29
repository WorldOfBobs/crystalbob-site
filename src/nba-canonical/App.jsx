import { useState, useEffect, useCallback } from 'react'
import MLTable from './MLTable'
import SpreadTable from './SpreadTable'
import TotalsTable from './TotalsTable'
import PeriodMarketTable from './PeriodMarketTable'
import AltMarketTable from './AltMarketTable'
import ResultsTable from './ResultsTable'
import PeriodResultsTable from './PeriodResultsTable'
import TopPicksTable from './TopPicksTable'
import SummaryTable from './SummaryTable'
import StatusBar from './StatusBar'
import AdminPage from './AdminPage'
import { anyVisibleLaneHasData, anyVisibleLaneLoading, getLaneStates, getScheduledGamesCount, laneHasData, renderLanePlaceholderBlock } from './laneState'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || ''

const PRIMARY_TABS = [
  { key: 'spread', label: 'Spread' },
  { key: 'ml', label: 'ML' },
  { key: 'totals', label: 'OU' },
  { key: 'altlines-cur-mkts', label: 'Alt Markets', title: 'Alt Markets' },
  { key: 'history', label: 'History' },
]

const PERIOD_TABS = [
  { key: 'qh-spread', label: 'Spread' },
  { key: 'qh-ml', label: 'ML' },
  { key: 'qh-totals', label: 'OU' },
  { key: 'qh-alt-mkts', label: 'Alt Markets', title: 'Quarter / Half Alt Markets' },
  { key: 'qh-history', label: 'History' },
]

const MARKET_VIEWS = {
  toppicks: {
    render: ({ playerdeepPreds, possessionPreds, fourfactorPreds, ensemblePreds, laneStates }) => (
      <TopPicksTable playerdeep={playerdeepPreds} possession={possessionPreds} fourfactor={fourfactorPreds} ensemble={ensemblePreds} laneStates={laneStates} />
    ),
  },
  spread: {
    render: ({ playerdeepPreds, possessionPreds, fourfactorPreds, ensemblePreds, hasPossession, laneStates }) => (
      <SpreadTable playerdeep={playerdeepPreds} possession={possessionPreds} fourfactor={fourfactorPreds} ensemble={ensemblePreds} hasPossession={hasPossession} laneStates={laneStates} />
    ),
  },
  ml: {
    render: ({ playerdeepPreds, possessionPreds, fourfactorPreds, ensemblePreds, hasPossession, laneStates }) => (
      <MLTable playerdeep={playerdeepPreds} possession={possessionPreds} fourfactor={fourfactorPreds} ensemble={ensemblePreds} hasPossession={hasPossession} laneStates={laneStates} />
    ),
  },
  totals: {
    render: ({ playerdeepPreds, possessionPreds, fourfactorPreds, ensemblePreds, hasPossession, laneStates }) => (
      <TotalsTable playerdeep={playerdeepPreds} possession={possessionPreds} fourfactor={fourfactorPreds} ensemble={ensemblePreds} hasPossession={hasPossession} laneStates={laneStates} />
    ),
  },
  'qh-spread': {
    render: ({ possessionPreds, playerdeepPreds, fourfactorPreds, laneStates }) => (
      <PeriodMarketTable
        possessionPreds={possessionPreds}
        playerdeepPreds={playerdeepPreds}
        fourfactorPreds={fourfactorPreds}
        laneStates={laneStates}
        mode="spread"
      />
    ),
  },
  'qh-ml': {
    render: ({ possessionPreds, playerdeepPreds, fourfactorPreds, laneStates }) => (
      <PeriodMarketTable
        possessionPreds={possessionPreds}
        playerdeepPreds={playerdeepPreds}
        fourfactorPreds={fourfactorPreds}
        laneStates={laneStates}
        mode="ml"
      />
    ),
  },
  'qh-totals': {
    render: ({ possessionPreds, playerdeepPreds, fourfactorPreds, laneStates }) => (
      <PeriodMarketTable
        possessionPreds={possessionPreds}
        playerdeepPreds={playerdeepPreds}
        fourfactorPreds={fourfactorPreds}
        laneStates={laneStates}
        mode="total"
      />
    ),
  },
  'altlines-cur-mkts': {
    requiresPossession: true,
    render: ({ possessionPreds, playerdeepPreds }) => <AltMarketTable predictions={[...possessionPreds, ...playerdeepPreds]} variant="game" />,
  },
  'qh-alt-mkts': {
    requiresPossession: true,
    render: ({ possessionPreds, playerdeepPreds }) => <AltMarketTable predictions={[...possessionPreds, ...playerdeepPreds]} variant="period" />,
  },
  history: {
    render: ({ resultsData }) => <ResultsTable results={resultsData} />,
  },
  'qh-history': {
    render: ({ periodResultsData }) => <PeriodResultsTable results={periodResultsData} />,
  },
  summary: {
    render: ({ playerdeepPreds, possessionPreds, fourfactorPreds, ensemblePreds, lineMovement, laneStates }) => (
      <SummaryTable playerdeep={playerdeepPreds} possession={possessionPreds} fourfactor={fourfactorPreds} ensemble={ensemblePreds} lineMovement={lineMovement} laneStates={laneStates} />
    ),
  },
}

function App() {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin')
  const [data, setData] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)
  const [marketType, setMarketType] = useState('spread')
  const [resultsData, setResultsData] = useState(null)
  const [periodResultsData, setPeriodResultsData] = useState(null)
  const [lineMovement, setLineMovement] = useState(null)

  const fetchPredictions = useCallback(async ({ background = false } = {}) => {
    try {
      if (background) {
        setRefreshing(true)
      } else {
        setLoading(true)
      }
      setError(null)
      const res = await fetch(`${API_URL}/api/predictions/today`)
      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const json = await res.json()
      setData(json)
    } catch (err) {
      setError(err.message)
    } finally {
      if (background) {
        setRefreshing(false)
      } else {
        setLoading(false)
      }
    }
  }, [])

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/status`)
      if (res.ok) setStatus(await res.json())
    } catch {
      // ignore status refresh failures
    }
  }, [])

  const fetchResults = useCallback(async () => {
    try {
      const [fullRes, periodRes] = await Promise.all([
        fetch(`${API_URL}/api/results`),
        fetch(`${API_URL}/api/results/periods`),
      ])
      if (fullRes.ok) setResultsData(await fullRes.json())
      if (periodRes.ok) setPeriodResultsData(await periodRes.json())
    } catch {
      // ignore results refresh failures
    }
  }, [])

  const fetchLineMovement = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/lines/movement`)
      if (res.ok) setLineMovement(await res.json())
    } catch {
      // ignore line movement refresh failures
    }
  }, [])


  useEffect(() => {
    fetchPredictions().then(fetchStatus)
    fetchResults()
    fetchLineMovement()
    const interval = setInterval(() => {
      fetchPredictions({ background: true }).then(fetchStatus)
      fetchLineMovement()
    }, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchPredictions, fetchStatus, fetchResults, fetchLineMovement])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  })

  const laneStates = getLaneStates(data)
  const hasPossession = laneHasData(laneStates.possession)
  const hasVisibleModelData = anyVisibleLaneHasData(laneStates)
  const scheduledGamesCount = getScheduledGamesCount(laneStates)
  const visibleLanesLoading = anyVisibleLaneLoading(laneStates)
  const isWarming = Boolean(data?.warming)
  const shouldHotPoll = visibleLanesLoading

  const playerdeepPreds = data?.playerdeep_predictions ?? []
  const possessionPreds = data?.possession_predictions ?? []
  const fourfactorPreds = data?.fourfactor_predictions ?? []
  const ensemblePreds = data?.ensemble_predictions ?? []
  const activeView = MARKET_VIEWS[marketType]
  const marketViewProps = {
    laneStates,
    playerdeepPreds,
    possessionPreds,
    fourfactorPreds,
    ensemblePreds,
    hasPossession,
    resultsData,
    periodResultsData,
    lineMovement,
  }

  useEffect(() => {
    if (!shouldHotPoll) return undefined
    const interval = setInterval(() => {
      fetchPredictions({ background: true }).then(fetchStatus)
    }, 3000)
    return () => clearInterval(interval)
  }, [shouldHotPoll, fetchPredictions, fetchStatus])

  const renderContent = () => {
    if (loading && !data) {
      return (
        <div className="loading">
          <span className="spinner large" />
          <p>Running model pipeline...</p>
        </div>
      )
    }

    if (scheduledGamesCount === 0 && !visibleLanesLoading && !hasVisibleModelData) {
      return <div className="empty">No games scheduled today.</div>
    }

    if (activeView?.requiresPossession && !hasPossession) {
      return renderLanePlaceholderBlock(laneStates.possession, 'Possession lane')
    }

    if (activeView) {
      return activeView.render(marketViewProps)
    }

    if (!hasVisibleModelData && (isWarming || visibleLanesLoading)) {
      return (
        <div className="possession-skeleton">
          <div className="skeleton-header">
            <span className="spinner" />
            <span>
              {refreshing && progress?.total > 0
                ? `Analyzing games… ${progress.done}/${progress.total}`
                : isWarming
                  ? 'Visible models are warming in the background — table should populate shortly'
                  : 'Building visible model board — table should populate shortly'}
            </span>
          </div>
          <div className="skeleton-rows">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="skeleton-row">
                <div className="skeleton-cell narrow" />
                <div className="skeleton-cell wide" />
                <div className="skeleton-cell medium" />
                <div className="skeleton-cell medium" />
                <div className="skeleton-cell medium" />
                <div className="skeleton-cell narrow" />
              </div>
            ))}
          </div>
        </div>
      )
    }

    return <div className="empty">No games scheduled today.</div>
  }

  if (isAdminRoute) {
    return <AdminPage />
  }

  return (
    <div className="app">
      <header className="header banner-header">
        <div className="banner-top">
          <div className="banner-brand">
            <div className="banner-copy banner-copy--wide">
              <div className="banner-title-stack">
                <span className="banner-title-text">CrystalBob</span>
              </div>
              <div className="banner-meta">
                <span>Updated {today}</span>
              </div>
            </div>
          </div>

          <div className="banner-right-title">
            <div className="banner-right-lockup" aria-hidden="true">
              <img src="/crystalbob-basketball-header-transparent.png" alt="" className="banner-orb banner-orb--right" />
              <span className="banner-sport-chip">NBA Model</span>
            </div>
          </div>
        </div>

        <div className="banner-bottom banner-bottom--stacked">
          <div className="market-row-block">
            <div className="market-row-label">Full Game</div>
            <div className="market-tabs banner-market-tabs">
              {PRIMARY_TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`market-tab ${marketType === tab.key ? 'active' : ''}`}
                  onClick={() => { setMarketType(tab.key) }}
                  title={tab.title}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="market-row-block">
            <div className="market-row-label">Quarters/Halves</div>
            <div className="market-tabs banner-market-tabs">
              {PERIOD_TABS.map(tab => (
                <button
                  key={tab.key}
                  className={`market-tab ${marketType === tab.key ? 'active' : ''}`}
                  onClick={() => { setMarketType(tab.key) }}
                  title={tab.title}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>
      {refreshing && progress && progress.total > 0 && (
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{ width: `${Math.round((progress.done / progress.total) * 100)}%` }}
          />
          <span className="progress-bar-label">
            {progress.done}/{progress.total} games analyzed
            {progress.current_game ? ` · ${progress.current_game}` : ''}
          </span>
        </div>
      )}

      <main className="main">
        {error && (
          <div className="error-banner">
            Failed to load: {error}
          </div>
        )}

        <div className="content-shell">
          {renderContent()}
        </div>
      </main>

      <StatusBar status={status} />
    </div>
  )
}

export default App
