const liveSports = [
  {
    name: 'NBA',
    status: 'Live soon',
    description: 'Pro basketball predictions, edges, and premium dashboards for CrystalBob holders.',
  },
  {
    name: 'MLB',
    status: 'Live soon',
    description: 'Baseball model access, totals intelligence, and deeper daily card breakdowns.',
  },
  {
    name: 'NHL',
    status: 'Live soon',
    description: 'Hockey forecasting and sharp board views inside the token-gated member area.',
  },
  {
    name: 'NCAAB',
    status: 'Live soon',
    description: 'College hoops signals and tournament-style angle tracking for members.',
  },
]

const comingSoonSports = [
  {
    name: 'NFL',
    description: 'Coming soon',
  },
  {
    name: 'WNBA',
    description: 'Coming soon',
  },
  {
    name: 'Soccer',
    description: 'Coming soon',
  },
]

function SportCard({ name, description, status, comingSoon = false }) {
  return (
    <article className={`sport-card ${comingSoon ? 'coming-soon' : ''}`}>
      <div className="sport-card-top">
        <span className="sport-badge">{comingSoon ? 'Coming soon' : status}</span>
        <span className="sport-icon">✦</span>
      </div>
      <h3>{name}</h3>
      <p>{description}</p>
      <button className="sport-button" disabled={comingSoon}>
        {comingSoon ? 'Locked' : 'Enter sport'}
      </button>
    </article>
  )
}

export default function App() {
  return (
    <div className="page-shell">
      <header className="topbar">
        <div className="brand-inline">
          <span className="brand-mark">CrystalBob</span>
          <span className="brand-pill">Token-gated sports club</span>
        </div>
        <button className="connect-button">Connect wallet</button>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">CrystalBob.com</p>
            <h1>Crystal ball energy for every sport.</h1>
            <p className="hero-text">
              A premium token-gated home for sports intel, dashboards, and community access powered by your NFT collection.
            </p>
            <div className="hero-actions">
              <button className="primary-button">Join with NFT</button>
              <button className="secondary-button">View sports</button>
            </div>
            <div className="hero-notes">
              <span>4 sports ready for launch</span>
              <span>3 more queued up</span>
              <span>Wallet gate coming next</span>
            </div>
          </div>
          <div className="hero-visual">
            <img src="/brand-kit.png" alt="CrystalBob brand kit" />
          </div>
        </section>

        <section className="section-block">
          <div className="section-heading">
            <p className="eyebrow">Live sports</p>
            <h2>Choose your lane</h2>
            <p>The homepage starts simple, but the structure is ready for each sport to become its own gated experience.</p>
          </div>
          <div className="sports-grid">
            {liveSports.map((sport) => (
              <SportCard key={sport.name} {...sport} />
            ))}
          </div>
        </section>

        <section className="section-block coming-soon-wrap">
          <div className="section-heading">
            <p className="eyebrow">Expansion board</p>
            <h2>Next up</h2>
            <p>More sports are already planned, but they stay clearly marked until the product is real.</p>
          </div>
          <div className="sports-grid compact">
            {comingSoonSports.map((sport) => (
              <SportCard key={sport.name} {...sport} comingSoon />
            ))}
          </div>
        </section>

        <section className="gate-panel">
          <div>
            <p className="eyebrow">Member gate</p>
            <h2>Token-gated by your collection</h2>
            <p>
              This first version is the public front door. Next step is connecting wallet auth so holders unlock private dashboards, picks, and community-only tools.
            </p>
          </div>
          <div className="gate-card">
            <div className="gate-chip">Phase 1</div>
            <ul>
              <li>Public homepage</li>
              <li>Sport routing structure</li>
              <li>Wallet gate placeholder</li>
              <li>NFT access flow next</li>
            </ul>
          </div>
        </section>
      </main>
    </div>
  )
}
