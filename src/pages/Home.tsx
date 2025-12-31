import React from 'react';
import { SwapCard } from '../components/swap';

export function Home() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <div className="hero-copy">
            <div className="brand-badge">
              <img src="/assets/electoplasmlogo.png" width="26" height="26" alt="" />
              <span>Powered by Casper</span>
            </div>
            <h1>Trade tokens instantly</h1>
            <p className="lead">
              Swap tokens with minimal slippage on the Casper Network.
              Low fees, fast finality, and transparent pricing.
            </p>
            <ul className="trust-list">
              <li><strong>0.3%</strong> swap fee</li>
              <li><strong>~2s</strong> finality</li>
              <li><strong>AMM</strong> powered</li>
            </ul>
          </div>
          <div className="hero-swap">
            <SwapCard />
          </div>
        </div>
      </section>

      <section className="section features">
        <div className="container">
          <h2>Why Ectoplasm?</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Low Fees</h3>
              <p>Only 0.3% per swap, no hidden costs.</p>
            </div>
            <div className="feature-card">
              <h3>Fast Finality</h3>
              <p>Transactions confirm in seconds on Casper Network.</p>
            </div>
            <div className="feature-card">
              <h3>Secure</h3>
              <p>Built on proven AMM mechanics with audited smart contracts.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Home;
