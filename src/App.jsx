import { useEffect, useMemo, useState } from 'react'

const PUBLIC_PREVIEW = true
const REQUIRED_ASSET = 'CrystalBob access asset'
const NBA_DASHBOARD_URL = 'https://nba.bobbrowser.com'

const sports = [
  {
    key: 'nba',
    name: 'NBA',
    status: 'live',
    shortStatus: 'Live now',
    description: 'Full public preview of the live NBA dashboard for the next few days.',
    asset: '/exports/crystalbob-nba-badge.svg',
    summary: 'Exact live dashboard from nba.bobbrowser.com inside the CrystalBob shell.',
    route: '/nba',
  },
  {
    key: 'mlb',
    name: 'MLB',
    status: 'coming-soon',
    shortStatus: 'Coming soon',
    description: 'Baseball lane staged next with totals, sides, and card summaries.',
    asset: '/exports/crystalbob-mlb-badge.svg',
    summary: 'First wave after NBA.',
    route: '/mlb',
  },
  {
    key: 'nhl',
    name: 'NHL',
    status: 'coming-soon',
    shortStatus: 'Coming soon',
    description: 'Hockey lane reserved and waiting for the real product pass.',
    summary: 'Queued behind the first rollout.',
    route: '/nhl',
  },
  {
    key: 'ncaab',
    name: 'NCAAB',
    status: 'coming-soon',
    shortStatus: 'Coming soon',
    description: 'College hoops lane reserved for the next serious pass.',
    summary: 'Tournament-ready structure later.',
    route: '/ncaab',
  },
  {
    key: 'tennis',
    name: 'Tennis',
    status: 'coming-soon',
    shortStatus: 'Coming soon',
    description: 'Match, set, and total-game intelligence in the same premium shell.',
    asset: '/exports/crystalbob-tennis-badge.svg',
    summary: 'Asset is ready; product lane follows later.',
    route: '/tennis',
  },
  {
    key: 'golf',
    name: 'Golf',
    status: 'coming-soon',
    shortStatus: 'Coming soon',
    description: 'Tournament and matchup lane reserved.',
    summary: 'Waiting on product pass and visuals.',
    route: '/golf',
  },
  {
    key: 'mma',
    name: 'MMA',
    status: 'coming-soon',
    shortStatus: 'Coming soon',
    description: 'Fight card lane reserved for eventual event-day drops.',
    summary: 'Structure only for now.',
    route: '/mma',
  },
  {
    key: 'soccer',
    name: 'Soccer',
    status: 'coming-soon',
    shortStatus: 'Coming soon',
    description: 'Global football lane reserved for future rollout.',
    summary: 'Will slot into the same access system.',
    route: '/soccer',
  },
  {
    key: 'esports',
    name: 'Esports',
    status: 'coming-soon',
    shortStatus: 'Coming soon',
    description: 'Esports lane reserved once the product is real, not fake-launched.',
    summary: 'Held until it deserves the real treatment.',
    route: '/esports',
  },
]

const accessStates = [
  {
    title: 'Public preview now',
    copy: 'Everyone can open NBA for a few days while the shell, messaging, and access flow get tightened.',
  },
  {
    title: 'Connect wallet next',
    copy: 'Users will still see the page structure, but a clear wallet-connect gate takes over protected results.',
  },
  {
    title: 'Asset check after that',
    copy: `If the wallet does not hold ${REQUIRED_ASSET}, the lane stays faded and locked.`,
  },
]

const launchSequence = [
  { step: '01', title: 'NBA live', note: 'Real dashboard populated now.' },
  { step: '02', title: 'MLB next', note: 'First follow-up lane after launch week.' },
  { step: '03', title: 'Remaining sports staged', note: 'Tennis, Golf, MMA, Soccer, Esports, NHL, and NCAAB stay honest as coming soon.' },
]

const macroTodos = [
  'Wire real wallet connect + disconnect state',
  'Add holder verification against the required asset',
  'Replace public preview with blurred lock overlay once gating starts',
  'Port NBA into a native CrystalBob layout instead of relying on iframe forever',
  'Create final assets for NHL, NCAAB, Golf, MMA, Soccer, and Esports cards',
  'Build real coming-soon pages into launch-ready sport dashboards one by one',
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
      <img src="/brand-kit.png" alt="CrystalBob logo" />
    </div>
  )
}

function Header({ navigate }) {
  return (
    <header className="site-header">
      <button className="brand-button" onClick={() => navigate('/')}>
        <img src="/exports/crystalbob-base-shell.svg" alt="CrystalBob icon" className="brand-icon" />
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
        <strong>NBA is open to everyone for a few days.</strong>
      </div>
      <p>
        Wallet gating is staged next. After preview ends, users will need to connect a wallet and hold the right asset to unlock protected dashboards.
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
  return (
    <main className="page page-home compact-homepage">
      <section className="compact-home-shell">
        <div className="compact-home-left">
          <span className="eyebrow">CrystalBob sports club</span>
          <LogoLockup compact />
          <h1>Sports intel for holders.</h1>
          <p>
            Simple landing page. Wallet connect soon. NBA live now. Everything else staged cleanly.
          </p>
          <div className="hero-actions compact-actions">
            <button className="primary-button" onClick={() => navigate('/nba')}>Open NBA</button>
            <button className="secondary-button">Connect wallet soon</button>
          </div>
          <div className="compact-preview-note">
            <span className="pill pill-live">Public preview</span>
            <span>NBA is open for everyone for a few days.</span>
          </div>
        </div>

        <div className="compact-home-right">
          <div className="compact-sports-grid">
            {sports.map((sport) => (
              <button key={sport.key} className={`compact-sport-card ${sport.status}`} onClick={() => navigate(sport.route)}>
                <div className="compact-sport-top">
                  <strong>{sport.name}</strong>
                  <span className={`compact-status ${sport.status}`}>{sport.status === 'live' ? 'Live' : 'Soon'}</span>
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
          <h1>NBA public preview</h1>
          <p>
            This is the live NBA dashboard inside the CrystalBob shell. It stays public for a few days, then becomes gated with the wallet check flow.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href={NBA_DASHBOARD_URL} target="_blank" rel="noreferrer">Open in new tab</a>
          </div>
        </div>
        <img src="/exports/crystalbob-nba-badge.svg" alt="NBA badge" className="sport-hero-badge" />
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
          <h1>{sport.name} is coming soon</h1>
          <p>
            The route is live, the shell is ready, and the final gated product can drop in here later without rebuilding the site again.
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
          <span className="pill pill-muted">Coming soon</span>
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
        <p>Live NBA preview now. Wallet gating next.</p>
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
