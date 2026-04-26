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

const heroSignals = [
  'NBA live now',
  'MLB launches next',
  'Tennis follows MLB',
]

const exportedBadges = [
  {
    name: 'Base shell',
    note: 'Core brand shell for the whole system',
    file: '/exports/crystalbob-base-shell.svg',
    sportKey: 'core',
  },
  {
    name: 'NBA badge',
    note: 'Live launch badge',
    file: '/exports/crystalbob-nba-badge.svg',
    sportKey: 'nba',
  },
  {
    name: 'MLB badge',
    note: 'Next-up badge',
    file: '/exports/crystalbob-mlb-badge.svg',
    sportKey: 'mlb',
  },
  {
    name: 'Tennis badge',
    note: 'In-build badge',
    file: '/exports/crystalbob-tennis-badge.svg',
    sportKey: 'tennis',
  },
]

const walletChecks = [
  'Wallet connect / disconnect state',
  'Holder verification against collection',
  'Lane unlocks based on owned asset',
  'Member dashboard entry after verify',
]

const memberLaneStates = [
  { lane: 'NBA', access: 'Unlocked now', note: 'Primary live lane for holders' },
  { lane: 'MLB', access: 'Queued next', note: 'Will slot into the same shell' },
  { lane: 'Tennis', access: 'In build', note: 'Structure exists, content follows' },
]

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

function SportCard({ name, description, status, detail, sportKey, bullets }) {
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
      <button className="sport-button">Enter sport</button>
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

function WalletGateSection() {
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
              <h3>Connect wallet to unlock CrystalBob</h3>
            </div>
            <button className="primary-button wallet-button">Verify holder</button>
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
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-inline">
          <CrystalBallMark size="sm" rotate={false} />
          <div className="brand-copy">
            <span className="brand-mark">CrystalBob</span>
            <span className="brand-pill">Token-gated sports club</span>
          </div>
        </div>
        <button className="connect-button">Connect wallet</button>
      </header>

      <main>
        <section className="hero hero-upgraded">
          <div className="hero-copy">
            <p className="eyebrow">CrystalBob.com</p>
            <h1>Premium sports intel inside one crystal-ball system.</h1>
            <p className="hero-text">
              NBA is live now. MLB is next. Tennis follows. Every league drops into the same premium shell so the whole product feels gated, collectible, and dead consistent.
            </p>
            <div className="hero-actions">
              <button className="primary-button">Join with NFT</button>
              <button className="secondary-button">View sports</button>
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
              <SportCard key={sport.name} {...sport} />
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
            <p>
              Connect wallet, verify holder status, then unlock the sport lanes you are supposed to see. Public front door, private intel inside.
            </p>
          </div>
          <div className="gate-card">
            <div className="gate-chip">Phase 1</div>
            <ul>
              <li>Public homepage</li>
              <li>Rotating crystal ball motion system</li>
              <li>League-tab badge architecture</li>
              <li>Wallet access flow next</li>
            </ul>
          </div>
        </section>

        <WalletGateSection />

        <MemberAccessFlow />

        <SocialBannerPreview />

        <section className="final-cta">
          <div>
            <p className="eyebrow">Final pass</p>
            <h2>Homepage direction, badge family, and banner system are finally lined up.</h2>
            <p>Now the public shell and the member product can share one premium visual language instead of feeling pieced together.</p>
          </div>
          <div className="final-cta-actions">
            <button className="primary-button">Lock launch assets</button>
            <button className="secondary-button">Wire wallet gate UI</button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
