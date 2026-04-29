import { useEffect, useMemo, useState } from 'react'
import CanonicalNbaApp from './nba-canonical/App'

const BRAND_LOCKUP = '/final-brand-assets/transparent/crystalbob-lockup.png'
const BRAND_ORB = '/final-brand-assets/black-bg/crystalbob-orb.png'

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
        <span className="brand-wordmark"><span className="brand-wordmark-light">Crystal</span><span className="brand-wordmark-bold">Bob</span></span>
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
    <div className={`compact-sport-card ${sport.status}`}>
      <button className="compact-sport-tile" onClick={() => navigate(sport.route)} aria-label={`Open ${sport.name}`}>
        <div className="compact-sport-artwrap">
          <SportArtwork sport={sport} />
        </div>
      </button>
      <div className="compact-sport-meta">
        <strong>{sport.name}</strong>
      </div>
    </div>
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
  return <CanonicalNbaApp />
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
  const isNba = route === '/nba' || route.startsWith('/admin')

  if (isNba) {
    return <NbaPage />
  }

  return (
    <div className={`app-shell ${isHome ? 'home-shell' : ''}`}>
      <Header navigate={navigate} />

      {route === '/' && <HomePage navigate={navigate} />}
      {route !== '/' && activeSport && <ComingSoonPage sport={activeSport} navigate={navigate} />}
      {route !== '/' && !activeSport && <MissingPage navigate={navigate} />}

      {!isHome && <Footer />}
    </div>
  )
}
