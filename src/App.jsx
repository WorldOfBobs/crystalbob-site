import { useEffect, useMemo, useState } from 'react'

const PUBLIC_PREVIEW = true
const REQUIRED_ASSET = 'CrystalBob access asset'
const NBA_DASHBOARD_URL = 'https://nba.bobbrowser.com'
const BRAND_LOCKUP = '/final-brand-assets/black-bg-alt/crystalbob-lockup.png'
const BRAND_ORB = '/final-brand-assets/transparent/crystalbob-orb.png'

const sports = [
  {
    key: 'nba',
    name: 'NBA',
    status: 'live',
    shortStatus: 'Live now',
    description: 'Full public preview of the live NBA dashboard for the next few days.',
    asset: '/exports/finals/crystalbob-basketball-final.jpg',
    summary: 'Exact live dashboard from nba.bobbrowser.com inside the CrystalBob shell.',
    route: '/nba',
  },
  {
    key: 'mlb',
    name: 'MLB',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Baseball lane staged next with totals, sides, and card summaries.',
    asset: '/exports/finals/crystalbob-baseball-final.png',
    summary: 'Next serious lane after NBA.',
    route: '/mlb',
  },
  {
    key: 'nhl',
    name: 'NHL',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Hockey lane reserved and waiting for the real product pass.',
    asset: '/exports/finals/crystalbob-hockey-final.png',
    summary: 'Staged, not live yet.',
    route: '/nhl',
  },
  {
    key: 'tennis',
    name: 'Tennis',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Match, set, and total-game intelligence in the same premium shell.',
    asset: '/exports/finals/crystalbob-tennis-final.png',
    summary: 'Brand-ready, product later.',
    route: '/tennis',
  },
  {
    key: 'golf',
    name: 'Golf',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Tournament and matchup lane reserved.',
    asset: '/exports/finals/crystalbob-golf-final.png',
    summary: 'Staged, not live yet.',
    route: '/golf',
  },
  {
    key: 'mma',
    name: 'MMA',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Fight card lane reserved for eventual event-day drops.',
    asset: '/exports/finals/crystalbob-mma-final.png',
    summary: 'Brand-ready, product later.',
    route: '/mma',
  },
  {
    key: 'soccer',
    name: 'Soccer',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Global football lane reserved for future rollout.',
    asset: '/exports/finals/crystalbob-soccer-final.png',
    summary: 'Staged, not live yet.',
    route: '/soccer',
  },
  {
    key: 'cricket',
    name: 'Cricket',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Cricket lane reserved for cards, totals, and matchup structure later.',
    asset: '/exports/finals/crystalbob-cricket-final.png',
    summary: 'Brand-ready, product later.',
    route: '/cricket',
  },
  {
    key: 'table-tennis',
    name: 'Table Tennis',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Table tennis lane staged inside the same gated shell.',
    asset: '/exports/finals/crystalbob-table-tennis-final.png',
    summary: 'Staged, not live yet.',
    route: '/table-tennis',
  },
  {
    key: 'racing',
    name: 'Racing',
    status: 'coming-soon',
    shortStatus: 'Staged',
    description: 'Racing lane reserved for event-driven drops and future data passes.',
    asset: '/exports/finals/crystalbob-racing-final.png',
    summary: 'Staged, not live yet.',
    route: '/racing',
  },
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
        <span>CrystalBob</span>
      </button>

      <nav className="header-nav">
        <button onClick={() => navigate('/')}>Home</button>
        <button onClick={() => navigate('/nba')}>NBA</button>
        <a href="#access">Access</a>
      </nav>
    </header>
  )
}

function PreviewBanner() {
  return (
    <div className="preview-banner" id="access">
      <div>
        <span className="pill pill-live">Public preview live</span>
        <strong>NBA is the first live CrystalBob lane.</strong>
      </div>
      <p>
        Wallet gating is still staged. For now, the focus is getting the shared shell and the live sport dashboards cleaned up and moved over one by one.
      </p>
    </div>
  )
}

function WalletCard() {
  return (
    <aside className="wallet-card">
      <span className="pill pill-muted">Access layer</span>
      <h3>Connect wallet</h3>
      <p>
        For now this is public preview mode. Next phase adds wallet verification and checks for <strong>{REQUIRED_ASSET}</strong> before showing protected results.
      </p>
      <button className="primary-button">Connect wallet soon</button>
      <ul>
        <li>Public preview now</li>
        <li>Wallet verify next</li>
        <li>Asset gate after preview</li>
      </ul>
    </aside>
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
    <button className={`sport-card ${sport.status}`} onClick={() => navigate(sport.route)}>
      <div className="sport-card-top">
        <span className={`pill ${sport.status === 'live' ? 'pill-live' : 'pill-muted'}`}>{sport.shortStatus}</span>
      </div>
      <SportArtwork sport={sport} />
      <div className="sport-card-copy">
        <h3>{sport.name}</h3>
        <p>{sport.description}</p>
        <small>{sport.summary}</small>
      </div>
    </button>
  )
}

function HomePage({ navigate }) {
  const liveSports = sports.filter((sport) => sport.status === 'live')
  const stagedSports = sports.filter((sport) => sport.status !== 'live')

  return (
    <main className="page page-home compact-homepage">
      <section className="compact-home-shell">
        <div className="compact-home-left">
          <span className="eyebrow">Live model dashboards</span>
          <LogoLockup compact />
          <h1>Serious sports model dashboards, all under one roof.</h1>
          <p>
            CrystalBob is the live shell for Gravy&apos;s sports model suite. NBA is live now. The rest of the lanes stay staged until each dashboard is ready for a real product pass.
          </p>
          <div className="hero-actions compact-actions">
            <button className="primary-button" onClick={() => navigate('/nba')}>Open NBA</button>
            <a className="secondary-button" href="#staged-lanes">View staged lanes</a>
          </div>
          <div className="compact-preview-note">
            <span className="pill pill-live">Public preview</span>
            <span>{liveSports.length} live lane · {stagedSports.length} staged lanes</span>
          </div>
          <div className="lane-summary" id="staged-lanes">
            <strong>Currently staged:</strong>
            <span>{stagedSports.map((sport) => sport.name).join(' · ')}</span>
          </div>
        </div>

        <div className="compact-home-right">
          <div className="compact-sports-grid">
            {sports.map((sport) => (
              <button key={sport.key} className={`compact-sport-card ${sport.status}`} onClick={() => navigate(sport.route)}>
                <div className="compact-sport-top">
                  <strong>{sport.name}</strong>
                  <span className={`compact-status ${sport.status}`}>{sport.status === 'live' ? 'Live' : 'Staged'}</span>
                </div>
                <div className="compact-sport-artwrap">
                  <SportArtwork sport={sport} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

function GatePreviewOverlay({ enabled }) {
  if (PUBLIC_PREVIEW || !enabled) return null

  return (
    <div className="gate-overlay">
      <div className="gate-overlay-card">
        <span className="pill pill-live">Connect wallet</span>
        <h3>Protected page</h3>
        <p>Connect a wallet to continue. If the wallet does not hold {REQUIRED_ASSET}, this page stays locked.</p>
      </div>
    </div>
  )
}

function NbaPage() {
  return (
    <main className="page sport-page">
      <section className="sport-hero live-sport">
        <div>
          <span className="eyebrow">NBA lane</span>
          <h1>NBA live now</h1>
          <p>
            This is the first live CrystalBob dashboard. It is running publicly right now while the new shared shell and the rest of the sport lanes get migrated behind it.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href={NBA_DASHBOARD_URL} target="_blank" rel="noreferrer">Open in new tab</a>
          </div>
        </div>
        <img src="/exports/finals/crystalbob-basketball-final.jpg" alt="NBA badge" className="sport-hero-badge" />
      </section>

      <PreviewBanner />

      <section className="dashboard-frame-shell">
        <div className="frame-topbar">
          <div>
            <strong>Live dashboard</strong>
            <p>{NBA_DASHBOARD_URL}</p>
          </div>
          <span className="pill pill-live">Preview unlocked</span>
        </div>
        <div className="iframe-wrap">
          <iframe src={NBA_DASHBOARD_URL} title="CrystalBob NBA dashboard" />
          <GatePreviewOverlay enabled />
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
          <span className="eyebrow">{sport.name} lane</span>
          <h1>{sport.name} is staged</h1>
          <p>
            The route and brand shell are ready, but this lane is not live yet. It stays visible so the full CrystalBob product map is clear without pretending the underlying dashboard exists today.
          </p>
          <div className="hero-actions">
            <button className="primary-button" onClick={() => navigate('/nba')}>View live NBA preview</button>
            <button className="secondary-button" onClick={() => navigate('/')}>Back home</button>
          </div>
        </div>
        <SportArtwork sport={sport} />
      </section>

      <section className="coming-soon-panel">
        <div className="coming-soon-copy">
          <span className="pill pill-muted">Staged lane</span>
          <h2>{sport.name} will plug into the same wallet-gated shell</h2>
          <p>{sport.description}</p>
        </div>

        <div className="coming-soon-checks">
          <div className="check-card">Public preview mode keeps this page visible for now.</div>
          <div className="check-card">Later state: results faded with a wallet-connect overlay.</div>
          <div className="check-card">If wallet lacks {REQUIRED_ASSET}, the lane stays locked.</div>
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
        <p>NBA live now. Additional lanes staged honestly.</p>
      </div>
      <span>crystalbob.com</span>
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
