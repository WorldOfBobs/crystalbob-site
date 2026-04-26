import { useEffect, useMemo, useState } from 'react'

const liveSports = [
  {
    name: 'NBA',
    status: 'Live now',
    description: 'Pro basketball predictions, edges, and premium dashboards for CrystalBob holders.',
    detail: 'Primary launch sport',
    sportKey: 'nba',
    bullets: ['Daily edges', 'Premium dashboard', 'Holder-only access'],
  },
  {
    name: 'MLB',
    status: 'Up next',
    description: 'Baseball model access, totals intelligence, and deeper daily card breakdowns.',
    detail: 'Next launch lane',
    sportKey: 'mlb',
    bullets: ['Totals intelligence', 'Daily card breakdowns', 'League shell ready'],
  },
  {
    name: 'Tennis',
    status: 'In build',
    description: 'Match, set, and total-game intelligence inside the gated CrystalBob member area.',
    detail: 'After MLB',
    sportKey: 'tennis',
    bullets: ['Match winner', 'Set markets', 'Total games'],
  },
]

const futureSports = [
  { name: 'NHL', label: 'Next season', sportKey: 'nhl' },
  { name: 'NCAAB', label: 'Next season', sportKey: 'ncaab' },
  { name: 'Soccer', label: 'Coming later', sportKey: 'soccer' },
]

const heroSignals = ['NBA live now', 'MLB launches next', 'Tennis follows MLB']

const exportedBadges = [
  { name: 'Base shell', note: 'Core brand shell for the whole system', file: '/exports/crystalbob-base-shell.svg', sportKey: 'core' },
  { name: 'NBA badge', note: 'Live launch badge', file: '/exports/crystalbob-nba-badge.svg', sportKey: 'nba' },
  { name: 'MLB badge', note: 'Next-up badge', file: '/exports/crystalbob-mlb-badge.svg', sportKey: 'mlb' },
  { name: 'Tennis badge', note: 'In-build badge', file: '/exports/crystalbob-tennis-badge.svg', sportKey: 'tennis' },
]

const walletChecks = [
  'Wallet connect / disconnect state',
  'Holder verification against collection',
  'Lane unlocks based on owned asset',
  'Member dashboard entry after verify',
]

const memberLaneStates = [
  { lane: 'NBA', access: 'Unlocked now', note: 'Primary live lane for holders', route: 'lane/nba' },
  { lane: 'MLB', access: 'Queued next', note: 'Will slot into the same shell', route: 'lane/mlb' },
  { lane: 'Tennis', access: 'In build', note: 'Structure exists, content follows', route: 'lane/tennis' },
]

const laneContent = {
  nba: {
    state: 'Live now',
    headline: 'NBA holder dashboard',
    copy: 'This is the flagship lane: live access, premium dashboards, and clean crystal-shell branding all the way through.',
    stats: ['Daily edge board', 'Live holder access', 'Primary launch lane'],
    cta: 'Open premium dashboard',
  },
  mlb: {
    state: 'Queued next',
    headline: 'MLB lane staged inside the same shell',
    copy: 'The route exists now, but it should open with real baseball intel once the lane goes live instead of pretending it is ready today.',
    stats: ['League shell ready', 'Totals-first lane', 'Next launch target'],
    cta: 'Notify on launch',
  },
  tennis: {
    state: 'In build',
    headline: 'Tennis lane reserved for the next rollout',
    copy: 'The member path now holds the place for match, set, and total-game intelligence without breaking the shared premium system.',
    stats: ['Match markets', 'Set markets', 'Shared member shell'],
    cta: 'Track build progress',
  },
}

function getRouteFromHash() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash || 'home'
}

function useHashRoute() {
  const [route, setRoute] = useState(() => getRouteFromHash())

  useEffect(() => {
    const onHashChange = () => setRoute(getRouteFromHash())
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const navigate = (nextRoute) => {
    window.location.hash = nextRoute === 'home' ? '/' : `/${nextRoute}`
  }

  return { route, navigate }
}

function CrystalBallMark({ sport = 'core', size = 'md', rotate = true }) {
  return (
    <div className={`crystal-ball crystal-ball-${size} crystal-ball-${sport} ${rotate ? 'is-rotating' : ''}`}>
      <div className="crystal-orb-shell">
        <div className="crystal-orb-glow" />
        <div className="crystal-orb-core">
          <div className="crystal-orb-spin">
            <div className="crystal-orb-inner" />
            <div className="sport-symbol sport-symbol-a" />
            <div className="sport-symbol sport-symbol-b" />
            <div className="sport-symbol sport-symbol-c" />
          </div>
        </div>
        <div className="crystal-chart">
          <span />
          <span />
          <span />
          <span />
          <i />
        </div>
      </div>
      <div className="crystal-base" />
      {sport !== 'core' && <div className="sport-overlay">{sport.toUpperCase()}</div>}
    </div>
  )
}

function RouteButton({ children, onClick, variant = 'primary', className = '', disabled = false }) {
  const buttonClass = variant === 'secondary' ? 'secondary-button' : 'primary-button'
  return (
    <button className={`${buttonClass} ${className}`.trim()} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

function TopBar({ navigate, isMemberUnlocked }) {
  return (
    <header className="topbar">
      <button className="brand-inline brand-inline-button" onClick={() => navigate('home')}>
        <CrystalBallMark size="sm" rotate={false} />
        <div className="brand-copy">
          <span className="brand-mark">CrystalBob</span>
          <span className="brand-pill">Token-gated sports club</span>
        </div>
      </button>
      <div className="topbar-actions">
        <button className="topbar-link" onClick={() => navigate('home')}>Home</button>
        <button className="topbar-link" onClick={() => navigate('member')}>Member gate</button>
        <button className="connect-button" onClick={() => navigate(isMemberUnlocked ? 'member/dashboard' : 'member')}>
          {isMemberUnlocked ? 'Open member area' : 'Connect wallet'}
        </button>
      </div>
    </header>
  )
}

function SportCard({ name, description, status, detail, sportKey, bullets, onEnter }) {
  const badgeClass = `sport-badge sport-badge-${status.toLowerCase().replace(/\s+/g, '-')}`

  return (
    <article className="sport-card sport-card-live">
      <div className="sport-card-top">
        <div>
          <span className={badgeClass}>{status}</span>
          <div className="sport-card-detail">{detail}</div>
        </div>
        <CrystalBallMark sport={sportKey} size="sm" />
      </div>
      <h3>{name}</h3>
      <p>{description}</p>
      <ul className="sport-points">
        {bullets.map((bullet) => (
          <li key={bullet}>{bullet}</li>
        ))}
      </ul>
      <button className="sport-button" onClick={onEnter}>Enter sport</button>
    </article>
  )
}

function FutureSportCard({ name, label, sportKey }) {
  return (
    <article className="sport-card coming-soon future-card">
      <div className="sport-card-top">
        <span className="sport-badge sport-badge-future">{label}</span>
        <CrystalBallMark sport={sportKey} size="sm" rotate={false} />
      </div>
      <h3>{name}</h3>
      <p>Reserved in the system, but intentionally quiet until the product is real.</p>
      <button className="sport-button" disabled>
        Locked
      </button>
    </article>
  )
}

function LeagueSystemPreview() {
  return (
    <section className="league-system-strip">
      <div className="section-heading system-heading">
        <p className="eyebrow">League shell system</p>
        <h2>One outer shell. Different leagues inside it.</h2>
        <p>The crystal ball stays fixed. Only the inner sport cue and league tab change.</p>
      </div>
      <div className="league-system-row">
        <div className="league-shell-card base-shell-card">
          <CrystalBallMark sport="core" size="md" />
          <strong>Base shell</strong>
          <span>Master brand form</span>
        </div>
        <div className="league-shell-card">
          <CrystalBallMark sport="nba" size="md" />
          <strong>NBA</strong>
          <span>League-tab system</span>
        </div>
        <div className="league-shell-card">
          <CrystalBallMark sport="mlb" size="md" />
          <strong>MLB</strong>
          <span>League-tab system</span>
        </div>
        <div className="league-shell-card">
          <CrystalBallMark sport="tennis" size="md" />
          <strong>Tennis</strong>
          <span>League-tab system</span>
        </div>
      </div>
    </section>
  )
}

function ExportCard({ name, note, file, sportKey }) {
  return (
    <article className="export-card">
      <div className="export-card-preview">
        <img src={file} alt={name} />
      </div>
      <div className="export-card-copy">
        <div>
          <span className="export-meta">{sportKey === 'core' ? 'Master shell' : sportKey.toUpperCase()}</span>
          <h3>{name}</h3>
          <p>{note}</p>
        </div>
        <a className="sport-button export-link" href={file} download>
          Download SVG
        </a>
      </div>
    </article>
  )
}

function BrandExports() {
  return (
    <section className="section-block export-section">
      <div className="section-heading">
        <p className="eyebrow">Asset exports</p>
        <h2>Final badge family is now real files, not just a homepage idea.</h2>
        <p>Same outer shell. Clean per-league variants. Ready for socials, product UI, and holder areas.</p>
      </div>
      <div className="export-grid">
        {exportedBadges.map((badge) => (
          <ExportCard key={badge.name} {...badge} />
        ))}
      </div>
    </section>
  )
}

function SocialBannerPreview() {
  return (
    <section className="section-block social-banner-section">
      <div className="section-heading">
        <p className="eyebrow">Social banner</p>
        <h2>X/Twitter banner built off the homepage direction.</h2>
        <p>Left side stays protected for the profile-photo overlap. Branding weight lives center-right where it actually survives the crop.</p>
      </div>
      <div className="banner-grid">
        <div className="social-banner-card">
          <img src="/social/crystalbob-x-banner.svg" alt="CrystalBob X banner preview" />
          <div className="social-banner-actions">
            <span className="banner-note">Original safe-layout export</span>
            <a className="sport-button export-link" href="/social/crystalbob-x-banner.svg" download>
              Download v1
            </a>
          </div>
        </div>
        <div className="social-banner-card featured-banner-card">
          <img src="/social/crystalbob-x-banner-premium.svg" alt="CrystalBob premium X banner preview" />
          <div className="social-banner-actions">
            <span className="banner-note">Sharper premium pass with stronger hierarchy</span>
            <a className="sport-button export-link" href="/social/crystalbob-x-banner-premium.svg" download>
              Download premium
            </a>
          </div>
        </div>
      </div>
    </section>
  )
}

function WalletGateSection({ navigate, isMemberUnlocked, onVerify }) {
  return (
    <section className="section-block wallet-gate-section">
      <div className="section-heading">
        <p className="eyebrow">Wallet member gate</p>
        <h2>The actual holder entry should feel like a premium checkpoint, not a random crypto popup.</h2>
        <p>Public homepage first. Then a clean verify step. Then the member dashboard opens with only the lanes that belong to the holder.</p>
      </div>
      <div className="wallet-gate-grid">
        <article className="wallet-panel wallet-panel-main">
          <div className="wallet-panel-top">
            <div>
              <span className="wallet-status-pill">Member verify</span>
              <h3>{isMemberUnlocked ? 'Wallet verified. Holder area unlocked.' : 'Connect wallet to unlock CrystalBob'}</h3>
            </div>
            <RouteButton className="wallet-button" onClick={isMemberUnlocked ? () => navigate('member/dashboard') : onVerify}>
              {isMemberUnlocked ? 'Open dashboard' : 'Verify holder'}
            </RouteButton>
          </div>
          <p className="wallet-panel-copy">Use one obvious CTA, explain exactly what gets checked, and make the unlock feel immediate once the collection is confirmed.</p>
          <div className="wallet-check-grid">
            {walletChecks.map((check) => (
              <div key={check} className="wallet-check-item">{check}</div>
            ))}
          </div>
        </article>
        <article className="wallet-panel wallet-panel-side">
          <div className="wallet-side-head">
            <span className="wallet-status-pill wallet-status-pill-muted">Lane access</span>
            <strong>Post-verify dashboard states</strong>
          </div>
          <div className="member-lanes-list">
            {memberLaneStates.map((item) => (
              <div key={item.lane} className="member-lane-row">
                <div>
                  <h4>{item.lane}</h4>
                  <p>{item.note}</p>
                </div>
                <span className={`lane-state lane-state-${item.access.toLowerCase().replace(/\s+/g, '-')}`}>{item.access}</span>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function MemberAccessFlow() {
  const steps = [
    { title: 'Connect wallet', text: 'Hit the public front door and prove you are a holder.' },
    { title: 'Verify access', text: 'CrystalBob checks the collection and unlocks the right lanes.' },
    { title: 'Enter your sport', text: 'NBA now, MLB next, then Tennis — all inside the same system.' },
  ]

  return (
    <section className="member-flow section-block">
      <div className="section-heading">
        <p className="eyebrow">Access flow</p>
        <h2>Simple on the outside. Gated where it matters.</h2>
        <p>The unlock path should feel premium, obvious, and fast — not like a confusing Web3 maze.</p>
      </div>
      <div className="member-flow-grid">
        {steps.map((step, index) => (
          <article key={step.title} className="member-flow-card">
            <span className="member-flow-number">0{index + 1}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function HomePage({ navigate, isMemberUnlocked, onVerify }) {
  return (
    <main>
      <section className="hero hero-upgraded">
        <div className="hero-copy">
          <p className="eyebrow">CrystalBob.com</p>
          <h1>Premium sports intel inside one crystal-ball system.</h1>
          <p className="hero-text">
            NBA is live now. MLB is next. Tennis follows. Every league drops into the same premium shell so the whole product feels gated, collectible, and dead consistent.
          </p>
          <div className="hero-actions">
            <RouteButton onClick={isMemberUnlocked ? () => navigate('member/dashboard') : onVerify}>
              {isMemberUnlocked ? 'Open member area' : 'Join with NFT'}
            </RouteButton>
            <RouteButton variant="secondary" onClick={() => navigate('member')}>
              View member gate
            </RouteButton>
          </div>
          <div className="hero-signal-row">
            {heroSignals.map((signal) => (
              <span key={signal} className="hero-signal-chip">{signal}</span>
            ))}
          </div>
        </div>
        <div className="hero-visual hero-visual-animated">
          <div className="hero-crystal-stage">
            <CrystalBallMark sport="core" size="hero" />
            <div className="hero-orb-variants">
              <CrystalBallMark sport="nba" size="xs" />
              <CrystalBallMark sport="mlb" size="xs" />
              <CrystalBallMark sport="tennis" size="xs" />
            </div>
          </div>
        </div>
      </section>

      <LeagueSystemPreview />
      <BrandExports />

      <section className="section-block live-section">
        <div className="section-heading">
          <p className="eyebrow">Launch lanes</p>
          <h2>The first three sports getting real weight</h2>
          <p>These are the active lanes that deserve the strong homepage treatment right now.</p>
        </div>
        <div className="sports-grid live-grid">
          {liveSports.map((sport) => (
            <SportCard key={sport.name} {...sport} onEnter={() => navigate(`lane/${sport.sportKey}`)} />
          ))}
        </div>
      </section>

      <section className="section-block coming-soon-wrap">
        <div className="section-heading">
          <p className="eyebrow">Future lanes</p>
          <h2>Reserved without pretending they are ready</h2>
          <p>They stay in the system, but they do not get fake launch energy.</p>
        </div>
        <div className="sports-grid compact future-grid">
          {futureSports.map((sport) => (
            <FutureSportCard key={sport.name} {...sport} />
          ))}
        </div>
      </section>

      <section className="gate-panel">
        <div>
          <p className="eyebrow">Member gate</p>
          <h2>Token-gated by your collection</h2>
          <p>Connect wallet, verify holder status, then unlock the sport lanes you are supposed to see. Public front door, private intel inside.</p>
        </div>
        <div className="gate-card">
          <div className="gate-chip">Phase 2</div>
          <ul>
            <li>Public homepage</li>
            <li>Real member route flow</li>
            <li>Lane-specific member screens</li>
            <li>Wallet verification UI staged</li>
          </ul>
        </div>
      </section>

      <WalletGateSection navigate={navigate} isMemberUnlocked={isMemberUnlocked} onVerify={onVerify} />
      <MemberAccessFlow />
      <SocialBannerPreview />

      <section className="final-cta">
        <div>
          <p className="eyebrow">Final pass</p>
          <h2>Homepage direction, badge family, banner system, and member routing finally line up.</h2>
          <p>Now the public shell and the routed holder product feel like one product instead of a splash page with nowhere to go.</p>
        </div>
        <div className="final-cta-actions">
          <RouteButton onClick={() => navigate('member/dashboard')}>Open routed member area</RouteButton>
          <RouteButton variant="secondary" onClick={() => navigate('member')}>Review wallet gate</RouteButton>
        </div>
      </section>
    </main>
  )
}

function MemberPage({ navigate, isMemberUnlocked, onVerify }) {
  return (
    <main className="member-page-shell">
      <section className="member-hero-route">
        <div className="member-hero-copy">
          <p className="eyebrow">Member route</p>
          <h1>{isMemberUnlocked ? 'Holder access is unlocked.' : 'Verify once, then enter the holder side.'}</h1>
          <p className="hero-text">
            This route now acts like the real front door for the private side of CrystalBob. It gives the homepage somewhere intentional to send people.
          </p>
          <div className="hero-actions">
            <RouteButton onClick={isMemberUnlocked ? () => navigate('member/dashboard') : onVerify}>
              {isMemberUnlocked ? 'Open dashboard' : 'Verify holder now'}
            </RouteButton>
            <RouteButton variant="secondary" onClick={() => navigate('home')}>Back to homepage</RouteButton>
          </div>
        </div>
        <div className="member-hero-card">
          <div className="member-hero-card-top">
            <CrystalBallMark sport="core" size="md" rotate={isMemberUnlocked} />
            <div>
              <span className={`wallet-status-pill ${isMemberUnlocked ? '' : 'wallet-status-pill-muted'}`}>
                {isMemberUnlocked ? 'Holder verified' : 'Awaiting verify'}
              </span>
              <h3>Member checkpoint</h3>
            </div>
          </div>
          <ul className="member-checkpoint-list">
            <li>Clean route for the gated product</li>
            <li>Verification CTA above the fold</li>
            <li>Direct handoff into live lane pages</li>
          </ul>
        </div>
      </section>

      <WalletGateSection navigate={navigate} isMemberUnlocked={isMemberUnlocked} onVerify={onVerify} />
    </main>
  )
}

function MemberDashboard({ navigate }) {
  return (
    <main className="member-page-shell">
      <section className="dashboard-shell">
        <div className="section-heading">
          <p className="eyebrow">Member dashboard</p>
          <h2>Holder-only lanes, now behind a real route.</h2>
          <p>This is the shared member shell. It can later plug into actual wallet state, data feeds, and gated dashboards without rethinking the whole site structure.</p>
        </div>
        <div className="dashboard-overview-grid">
          {memberLaneStates.map((item) => (
            <button key={item.lane} className="dashboard-lane-card" onClick={() => navigate(item.route)}>
              <div>
                <span className={`lane-state lane-state-${item.access.toLowerCase().replace(/\s+/g, '-')}`}>{item.access}</span>
                <h3>{item.lane}</h3>
                <p>{item.note}</p>
              </div>
              <span className="dashboard-lane-arrow">→</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}

function LanePage({ laneKey, navigate }) {
  const lane = laneContent[laneKey]

  if (!lane) {
    return (
      <main className="member-page-shell">
        <section className="route-not-found">
          <p className="eyebrow">Missing route</p>
          <h2>That lane does not exist.</h2>
          <RouteButton onClick={() => navigate('member/dashboard')}>Back to dashboard</RouteButton>
        </section>
      </main>
    )
  }

  return (
    <main className="member-page-shell">
      <section className="lane-page-shell">
        <div className="lane-page-header">
          <div>
            <p className="eyebrow">{laneKey.toUpperCase()} member lane</p>
            <h1>{lane.headline}</h1>
            <p className="hero-text">{lane.copy}</p>
          </div>
          <CrystalBallMark sport={laneKey} size="md" />
        </div>
        <div className="lane-page-grid">
          <article className="lane-page-card lane-page-card-main">
            <span className={`lane-state lane-state-${lane.state.toLowerCase().replace(/\s+/g, '-')}`}>{lane.state}</span>
            <h3>Lane state</h3>
            <p>This route is now real. Later, the actual data products can slot in here without breaking the top-level experience.</p>
            <button className="sport-button">{lane.cta}</button>
          </article>
          <article className="lane-page-card">
            <h3>What belongs here</h3>
            <ul className="lane-stat-list">
              {lane.stats.map((stat) => (
                <li key={stat}>{stat}</li>
              ))}
            </ul>
            <button className="secondary-button lane-back-button" onClick={() => navigate('member/dashboard')}>
              Back to dashboard
            </button>
          </article>
        </div>
      </section>
    </main>
  )
}

function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-left">
        <CrystalBallMark size="sm" rotate={false} />
        <div>
          <strong>CrystalBob</strong>
          <p>Premium sports intel inside one crystal-ball system.</p>
        </div>
      </div>
      <div className="site-footer-right">
        <span>NBA live</span>
        <span>MLB next</span>
        <span>Tennis in build</span>
      </div>
    </footer>
  )
}

export default function App() {
  const { route, navigate } = useHashRoute()
  const [isMemberUnlocked, setIsMemberUnlocked] = useState(false)

  const normalizedRoute = route === '' ? 'home' : route
  const activeView = useMemo(() => {
    if (normalizedRoute === 'home') return 'home'
    if (normalizedRoute === 'member') return 'member'
    if (normalizedRoute === 'member/dashboard') return 'dashboard'
    if (normalizedRoute.startsWith('lane/')) return 'lane'
    return 'missing'
  }, [normalizedRoute])

  const activeLane = normalizedRoute.startsWith('lane/') ? normalizedRoute.split('/')[1] : null

  const verifyAndEnter = () => {
    setIsMemberUnlocked(true)
    navigate('member/dashboard')
  }

  return (
    <div className="page-shell">
      <TopBar navigate={navigate} isMemberUnlocked={isMemberUnlocked} />

      {activeView === 'home' && <HomePage navigate={navigate} isMemberUnlocked={isMemberUnlocked} onVerify={verifyAndEnter} />}
      {activeView === 'member' && <MemberPage navigate={navigate} isMemberUnlocked={isMemberUnlocked} onVerify={verifyAndEnter} />}
      {activeView === 'dashboard' && <MemberDashboard navigate={navigate} />}
      {activeView === 'lane' && <LanePage laneKey={activeLane} navigate={navigate} />}
      {activeView === 'missing' && <LanePage laneKey={null} navigate={navigate} />}

      <SiteFooter />
    </div>
  )
}
