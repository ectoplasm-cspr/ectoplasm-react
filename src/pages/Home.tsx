import { Link } from 'react-router-dom';
import { LandingSwapCard } from '../components/swap';

export function Home() {
  return (
    <main>
      {/* Hero Section with Swap */}
      <section className="hero swap-hero" id="swap">
        {/* Liquid blob animations */}
        <div className="liquid-container">
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
          <div className="liquid-blob"></div>
        </div>

        <div className="container swap-layout">
          <div className="swap-heading">
            <h1>Swapping when & wherever you want to.</h1>
          </div>

          <LandingSwapCard />

          <div className="hero-copy swap-copy">
            <p className="lead">
              A focused swap card sits front and center. Connect your wallet, set slippage,
              and move between CSPR and ECTO with clear routing and instant feedback.
            </p>
            <div className="hero-cta">
              <a href="#swap" className="btn primary large">Get started</a>
            </div>
            <ul className="trust-list">
              <li><strong id="priceTicker">CSPR $--.--</strong> live price</li>
              <li>Casper mainnet routing</li>
              <li>Wallet status shown inline</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="section">
        <div className="container">
          <div className="section-heading">
            <div className="brand-mark" aria-hidden="true">
              <img src="/assets/electoplasmlogo.png" width="28" height="28" alt="" />
            </div>
            <div>
              <p className="muted small">Everything below the swap</p>
              <h2>Explore the pages that live beneath the swapper</h2>
            </div>
          </div>
          <div className="features-grid refined">
            <article className="feature-card">
              <div className="feature-meta">
                <span className="pill subtle">Core</span>
              </div>
              <h3>Swap</h3>
              <p>Fast Casper-native swapping with slippage control and a clean terminal anchored on the home page.</p>
              <a className="chip" href="#swap">Open swap terminal</a>
            </article>
            <article className="feature-card">
              <div className="feature-meta">
                <span className="pill subtle">Liquidity</span>
              </div>
              <h3>Liquidity & Farming</h3>
              <p>Depth-focused pools and rewards live on a dedicated liquidity page for LPs.</p>
              <Link className="chip" to="/liquidity">View liquidity tools</Link>
            </article>
            <article className="feature-card">
              <div className="feature-meta">
                <span className="pill subtle">Creation</span>
              </div>
              <h3>Launchpad</h3>
              <p>Pump.fun style creation with fifty mock tokens visible in the launchpad library.</p>
              <Link className="chip" to="/launchpad">See launchpad</Link>
            </article>
            <article className="feature-card">
              <div className="feature-meta">
                <span className="pill subtle">Retention</span>
              </div>
              <h3>Gamified Dashboard</h3>
              <p>Daily quests, streaks, and XP designed to pull users back every day.</p>
              <Link className="chip" to="/dashboard">Open dashboard</Link>
            </article>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="section alt">
        <div className="container stats-grid" aria-label="Protocol performance highlights">
          <div className="stat-card">
            <p className="muted">24h Volume</p>
            <strong>$182M</strong>
            <small>Deep liquidity across majors</small>
          </div>
          <div className="stat-card">
            <p className="muted">Total Value Locked</p>
            <strong>$612M</strong>
            <small>Growing Casper-native liquidity</small>
          </div>
          <div className="stat-card">
            <p className="muted">Average Confirmation</p>
            <strong>1.3s</strong>
            <small>Fast finality with safety checks</small>
          </div>
          <div className="stat-card">
            <p className="muted">Uptime</p>
            <strong>99.98%</strong>
            <small>Monitored infra & failover</small>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="section alt">
        <div className="container">
          <h2>How it works</h2>
          <ol className="steps">
            <li><strong>Land on the swapper</strong> — connect and trade immediately.</li>
            <li><strong>Scroll for depth</strong> — see dashboards, liquidity tools, and launchpad access.</li>
            <li><strong>Return daily</strong> — quests, streaks, and on-chain tasks keep users engaged.</li>
          </ol>
        </div>
      </section>

      {/* Roadmap Section */}
      <section id="roadmap" className="section">
        <div className="container">
          <h2>Roadmap</h2>
          <ul className="roadmap">
            <li><strong>Q1:</strong> Mainnet launch, basic swaps, liquidity pools</li>
            <li><strong>Q2:</strong> Limit orders, LP protections, audits</li>
            <li><strong>Q3:</strong> Cross-chain bridges, more assets, governance</li>
          </ul>
        </div>
      </section>

      {/* Security & Audits Section */}
      <section id="audit" className="section alt">
        <div className="container">
          <div className="section-heading">
            <div className="brand-mark" aria-hidden="true">
              <img src="/assets/electoplasmlogo.png" width="28" height="28" alt="" />
            </div>
            <h2>Security & Audits</h2>
          </div>
          <p>
            We prioritize safety. Contracts will be audited by top firms—starting with a planned
            engagement with <a href="https://www.halborn.com/" target="_blank" rel="noreferrer">Halborn</a>—and
            results published on-chain and in our docs.
          </p>
          <div className="audit-logo" aria-label="Halborn audit partner">
            <img src="/assets/halborn-logo-black.svg" alt="Halborn logo" className="halborn-logo-light" />
            <img src="/assets/halborn-logo-green.svg" alt="Halborn logo" className="halborn-logo-dark" />
          </div>
          <ul className="safety-list">
            <li>Deterministic builds and reproducible deployments</li>
            <li>Multi-sig controlled upgrades with time-locked changes</li>
            <li>Continuous monitoring for MEV and sandwich vectors</li>
          </ul>
        </div>
      </section>
    </main>
  );
}

export default Home;
