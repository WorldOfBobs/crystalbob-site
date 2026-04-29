import { useEffect, useMemo, useState } from 'react'

const BRAND_LOCKUP = '/final-brand-assets/black-bg/crystalbob-lockup.png'
const BRAND_ORB = '/final-brand-assets/black-bg/crystalbob-orb.png'
const NBA_DASHBOARD_URL = 'https://nba.bobbrowser.com'

const NBA_MARKETS = [
  'Full-game spreads, moneylines, and totals',
  'First-half and second-half spreads, moneylines, and totals',
  'Quarter spreads, moneylines, and totals',
  'Alternate market views',
  'Historical result views and supporting board context',
]

const NBA_MODELS = [
  'Four-Factor team model',
  'Player Deep context model',
  'Possession simulation model',
  'Ensemble decision layer',
]

const NBA_SAMPLE_ROWS = [
  { matchup: 'AWAY @ HOME', market: 'Spread', model: 'Possession', display: 'Sample edge card', status: 'Locked' },
  { matchup: 'AWAY @ HOME', market: 'Moneyline', model: 'Player Deep', display: 'Sample support stack', status: 'Locked' },
  { matchup: 'AWAY @ HOME', market: 'Total', model: 'Ensemble', display: 'Sample market view', status: 'Locked' },
]

const sports = [
  {
    key: 'nba',
    name: 'NBA',
    status: 'live',
    shortStatus: 'NBA Dashboard',
    category: 'Live Now',
    description: 'Model-driven NBA board covering spreads, moneylines, totals, and quarter/half markets.',
    summary: 'Multi-model NBA market surface with locked sample presentation.',
    asset: '/exports/finals/crystalbob-basketball-final.png',
    route: '/nba',
  },
  {
    key: 'mlb',
    name: 'MLB',
    status: 'coming-soon',
    shortStatus: 'Coming Soon',
    category: 'Coming Soon',
    description: '',
    summary: '',
    asset: '/exports/finals/crystalbob-baseball-final.png',
    route: '/mlb',
  },
  {
    key: 'golf',
    name: 'PGA',
    status: 'coming-soon',
    shortStatus: 'Coming Soon',
    category: 'Coming Soon',
    description: '',
    summary: '',
    asset: '/exports/finals/crystalbob-golf-final.png',
    route: '/golf',
  },
  {
    key: 'nhl',
    name: 'NHL',
    status: 'staged',
    shortStatus: 'Staged',
    category: 'Staged',
    description: 'Hockey lane reserved and waiting for the real product pass.',
    summary: 'Structured for sides, totals, and situational reads without clutter.',
    asset: '/exports/finals/crystalbob-hockey-final.png',
    route: '/nhl',
  },
  {
    key: 'tennis',
    name: 'Tennis',
    status: 'staged',
    shortStatus: 'Staged',
    category: 'Staged',
    description: 'Match, set, and total-game intelligence in the same premium shell.',
    summary: 'Built for fast reads on matches, sets, totals, and pressure moments.',
    asset: '/exports/finals/crystalbob-tennis-final.png',
    route: '/tennis',
  },
  {
    key: 'mma',
    name: 'MMA',
    status: 'staged',
    shortStatus: 'Staged',
    category: 'Staged',
    description: 'Fight card lane reserved for eventual event-day drops.',
    summary: 'Event-card format tuned for fast reads instead of bloated fight pages.',
    asset: '/exports/finals/crystalbob-mma-final.png',
    route: '/mma',
  },
  {
    key: 'soccer',
    name: 'Soccer',
    status: 'staged',
    shortStatus: 'Staged',
    category: 'Staged',
    description: 'Global football lane reserved for future rollout.',
    summary: 'Designed for clean card scanning across leagues without a noisy layout.',
    asset: '/exports/finals/crystalbob-soccer-final.png',
    route: '/soccer',
  },
  {
    key: 'cricket',
    name: 'Cricket',
    status: 'staged',
    shortStatus: 'Staged',
    category: 'Staged',
    description: 'Cricket lane reserved for cards, totals, and matchup structure later.',
    summary: 'Built to surface the signal quickly instead of burying it in score noise.',
    asset: '/exports/finals/crystalbob-cricket-final.png',
    route: '/cricket',
  },
  {
    key: 'table-tennis',
    name: 'Table Tennis',
    status: 'staged',
    shortStatus: 'Staged',
    category: 'Staged',
    description: 'Table tennis lane staged inside the same gated shell.',
    summary: 'Fast, high-frequency board style for markets that move hard and early.',
    asset: '/exports/finals/crystalbob-table-tennis-final.png',
    route: '/table-tennis',
  },
  {
    key: 'f1',
    name: 'F1',
    status: 'staged',
    shortStatus: 'Staged',
    category: 'Staged',
    description: 'F1 lane reserved for event-driven drops and future data passes.',
    summary: 'Event-driven view designed for sharp race-day scanning and quick decisions.',
    asset: '/exports/finals/crystalbob-racing-final.png',
    route: '/f1',
  },
  {
    key: 'nascar',
    name: 'NASCAR',
    status: 'staged',
    shortStatus: 'Staged',
    category: 'Staged',
    description: 'NASCAR lane reserved for event-driven drops and future data passes.',
    summary: 'Event-driven view designed for sharp race-day scanning and quick decisions.',
    asset: '/exports/finals/crystalbob-racing-final.png',
    route: '/nascar',
  },
]

const sportGroups = [
  { key: 'live', label: 'Live Now' },
  { key: 'coming-soon', label: 'Coming Soon' },
  { key: 'staged', label: 'Staged' },
]

function normalizeRoute(pathname) {
  if (!pathname || pathname === '/') return '/'
  return pathname.replace(/\/+$/, '') || '/'
}

function usePathRoute() {
  const [route, setRoute] = useState(() => normalizeRoute(window.location.pathname))

  useEffect(() => {
    const onPopState = () => setRoute(normalizeRoute(window.location.pathname))
    window.addEventListener('popstate', onPopState)
    return () => window.removeEventListener('popstate', onPopState)
  }, [])

  const navigate = (nextRoute) => {
    const normalized = normalizeRoute(nextRoute)
    if (normalized === route) return
    window.history.pushState({}, '', normalized)
    setRoute(normalized)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return { route, navigate }
}

function LogoLockup({ compact = false }) {
  return (
    <div className={`logo-lockup ${compact ? 'compact' : ''}`}>
      <img src={BRAND_LOCKUP} alt="CrystalBob logo" />
    </div>
  )
}

function Header({ navigate }) {
  return (
    <header className="site-header">
      <button className="brand-button" onClick={() => navigate('/')}>
        <img src={BRAND_ORB} alt="CrystalBob icon" className="brand-icon" />
        <span className="brand-wordmark">CrystalBob</span>
      </button>

      <div className="header-actions">
        <button className="social-placeholder" type="button" aria-label="Discord">
          <img src="/final-brand-assets/social/crystalbob-discord-icon-final.png" alt="Discord" className="social-icon-image" />
        </button>
        <button className="social-placeholder" type="button" aria-label="X">
          <img src="/final-brand-assets/social/crystalbob-x-icon-final.png" alt="X" className="social-icon-image" />
        </button>
        <button className="wallet-button" type="button">Connect wallet</button>
      </div>
    </header>
  )
}

function SportArtwork({ sport }) {
  if (sport.asset) {
    return <img src={sport.asset} alt={`${sport.name} badge`} className="sport-art" />
  }

  return (
    <div className={`fallback-badge fallback-${sport.key}`}>
      <span>{sport.name}</span>
    </div>
  )
}

function SportCard({ sport, navigate }) {
  return (
    <button className={`compact-sport-card ${sport.status}`} onClick={() => navigate(sport.route)}>
      <div className="compact-sport-artwrap">
        <SportArtwork sport={sport} />
      </div>
      <div className="compact-sport-meta">
        <strong>{sport.name}</strong>
        <span className={`compact-status ${sport.status}`}>{sport.shortStatus}</span>
      </div>
    </button>
  )
}

function HomePage({ navigate }) {
  const groupedSports = sportGroups.map((group) => ({
    ...group,
    sports: sports.filter((sport) => sport.status === group.key),
  }))

  return (
    <main className="page page-home compact-homepage">
      <section className="home-hero-simple">
        <LogoLockup />
        <p className="hero-tagline">Model-driven sports market interfaces.</p>
      </section>

      <section className="sports-icon-section" id="staged-lanes">
        <div className="sports-groups-wrap">
          {groupedSports.map((group) => (
            <section key={group.key} className="sports-group-block">
              <div className="sports-group-head">
                <h3>{group.label}</h3>
              </div>
              <div className="compact-sports-grid grouped-grid">
                {group.sports.map((sport) => (
                  <SportCard key={sport.key} sport={sport} navigate={navigate} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}

function NbaPage() {
  return (
    <main className="page sport-page">
      <section className="sport-hero live-sport">
        <div>
          <span className="eyebrow">CrystalBob NBA</span>
          <h1>NBA market intelligence</h1>
          <p>
            CrystalBob NBA covers full-game, half, quarter, and alternate market structure across spreads, moneylines, and totals.
            The page below is a locked product sample that shows the board format without exposing live recommendations.
          </p>
        </div>
        <img src="/exports/finals/crystalbob-basketball-final.png" alt="NBA badge" className="sport-hero-badge" />
      </section>

      <section className="structure-grid">
        <article className="structure-card">
          <span className="pill pill-muted">Markets</span>
          <h3>Lines covered</h3>
          <ul>
            {NBA_MARKETS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="structure-card">
          <span className="pill pill-muted">Models</span>
          <h3>Models used</h3>
          <ul>
            {NBA_MODELS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="dashboard-frame-shell">
        <div className="frame-topbar">
          <div>
            <strong>NBA Dashboard</strong>
            <p>Live CrystalBob NBA board embedded directly into the CrystalBob site.</p>
          </div>
          <a className="primary-button dashboard-open-link" href={NBA_DASHBOARD_URL} target="_blank" rel="noreferrer">
            Open NBA Dashboard
          </a>
        </div>
        <div className="iframe-wrap">
          <iframe src={NBA_DASHBOARD_URL} title="CrystalBob NBA Dashboard" loading="lazy" />
        </div>
      </section>
    </main>
  )
}

function ComingSoonPage({ sport, navigate }) {
  return (
    <main className="page sport-page">
      <section className="sport-hero">
        <div>
          <span className="eyebrow">{sport.name}</span>
          <h1>{sport.name} is staged</h1>
          <p>
            The route and brand shell are ready, but this sport is not live yet. It stays visible so the full CrystalBob product map is clear without pretending the underlying dashboard exists today.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate('/nba')}>View NBA overview</button>
            <button className="secondary-button" onClick={() => navigate('/')}>Back home</button>
          </div>
        </div>
        <SportArtwork sport={sport} />
      </section>

      <section className="coming-soon-panel">
        <div className="coming-soon-copy">
          <span className="pill pill-muted">Staged</span>
          <h2>{sport.name} will plug into the same CrystalBob shell</h2>
          <p>{sport.description}</p>
        </div>

        <div className="coming-soon-checks">
          <div className="check-card">Shared shell, sport-specific logic.</div>
          <div className="check-card">Same product language, different market engine.</div>
          <div className="check-card">This route stays visible so the expansion map is clear.</div>
        </div>
      </section>
    </main>
  )
}

function MissingPage({ navigate }) {
  return (
    <main className="page sport-page">
      <section className="sport-hero">
        <div>
          <span className="eyebrow">Missing page</span>
          <h1>That route does not exist.</h1>
          <p>Go back home and use the sport grid.</p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate('/')}>Back home</button>
          </div>
        </div>
      </section>
    </main>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div>
        <strong>CrystalBob</strong>
        <p>Model-driven sports market interfaces.</p>
      </div>
      <div className="footer-meta">
        <button className="social-placeholder footer-social" type="button" aria-label="Discord">
          <img src="/final-brand-assets/social/crystalbob-discord-icon-final.png" alt="Discord" className="social-icon-image" />
        </button>
        <button className="social-placeholder footer-social" type="button" aria-label="X">
          <img src="/final-brand-assets/social/crystalbob-x-icon-final.png" alt="X" className="social-icon-image" />
        </button>
        <span>About</span>
        <span>Contact</span>
        <span>© 2026 CrystalBob. All rights reserved.</span>
      </div>
    </footer>
  )
}

export default function App() {
  const { route, navigate } = usePathRoute()

  const activeSport = useMemo(() => sports.find((sport) => sport.route === route), [route])
  const isHome = route === '/'

  return (
    <div className={`app-shell ${isHome ? 'home-shell' : ''}`}>
      <Header navigate={navigate} />

      {route === '/' && <HomePage navigate={navigate} />}
      {route === '/nba' && <NbaPage />}
      {route !== '/' && route !== '/nba' && activeSport && <ComingSoonPage sport={activeSport} navigate={navigate} />}
      {route !== '/' && !activeSport && route !== '/nba' && <MissingPage navigate={navigate} />}

      {!isHome && <Footer />}
    </div>
  )
}
