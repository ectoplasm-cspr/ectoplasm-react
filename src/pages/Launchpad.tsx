import React, { useState } from 'react';
import { TokenCreationForm, TokenLibrary } from '../components/launchpad';
import { useLaunchpad } from '../hooks';

export function Launchpad() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const {
    filteredTokens,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
  } = useLaunchpad();

  return (
    <main>
      {/* Hero Section */}
      <section className="hero">
        <div className="container">
          <div className="hero-copy">
            <div className="brand-badge">
              <img src="/assets/electoplasmlogo.png" width="26" height="26" alt="" />
              <span>Launch new tokens</span>
            </div>
            <h1>Pump.fun style launchpad</h1>
            <p className="lead">
              Deploy Casper-native memecoins with bonding curves and transparent rules.
              The library below lists {filteredTokens.length} tokens so you can explore the ecosystem.
            </p>
            <div className="hero-cta">
              <button
                className="btn primary large"
                onClick={() => setShowCreateModal(true)}
              >
                Create Token
              </button>
              <a href="#tokenLibrary" className="btn ghost large">
                View {filteredTokens.length} tokens
              </a>
            </div>
            <ul className="trust-list">
              <li><strong>Bonding curve presets</strong></li>
              <li><strong>Auto-liquidity routing</strong></li>
              <li><strong>{filteredTokens.length}</strong> tokens listed</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Token Library Section */}
      <section id="tokenLibrary" className="section">
        <div className="container">
          <div className="section-heading">
            <div className="brand-mark" aria-hidden="true">
              <img src="/assets/electoplasmlogo.png" width="28" height="28" alt="" />
            </div>
            <h2>Launchpad library — {filteredTokens.length} tokens</h2>
          </div>
          <p className="lead">
            Browse the token list to discover new projects. Sort by growth, liquidity, or freshness.
          </p>

          <TokenLibrary
            tokens={filteredTokens}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            sortBy={sortBy}
            onSortChange={setSortBy}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
          />
        </div>
      </section>

      {/* How It Works Section */}
      <section className="section alt">
        <div className="container">
          <h2>How it works</h2>
          <div className="feature-grid">
            <div className="feature-card">
              <div className="feature-icon">1</div>
              <h3>Create Your Token</h3>
              <p>
                Choose a name, symbol, and bonding curve type. Set your initial
                parameters and promotional budget.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">2</div>
              <h3>Bonding Curve Launch</h3>
              <p>
                Your token launches with a bonding curve that determines price
                based on supply. Early buyers get better rates.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">3</div>
              <h3>Automatic Liquidity</h3>
              <p>
                When the bonding curve reaches its cap, liquidity is automatically
                added to the DEX for trading.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bonding Curves Explainer */}
      <section className="section">
        <div className="container">
          <h2>Bonding Curve Types</h2>
          <div className="curve-grid">
            <div className="curve-card">
              <h3>Linear</h3>
              <div className="curve-visual linear"></div>
              <p className="muted">
                Slow, steady price increase. Good for building communities gradually.
                Lower risk, lower reward.
              </p>
              <span className="pill subtle">Conservative</span>
            </div>
            <div className="curve-card featured">
              <h3>Sigmoid</h3>
              <div className="curve-visual sigmoid"></div>
              <p className="muted">
                S-curve with slow start, rapid middle, and plateau. Crowd-friendly
                and fair for most participants.
              </p>
              <span className="pill filled">Recommended</span>
            </div>
            <div className="curve-card">
              <h3>Steep</h3>
              <div className="curve-visual steep"></div>
              <p className="muted">
                Aggressive price curve. High rewards for very early buyers,
                but risky for latecomers.
              </p>
              <span className="pill subtle">Degen</span>
            </div>
          </div>
        </div>
      </section>

      {/* Token Creation Modal */}
      <TokenCreationForm
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </main>
  );
}

export default Launchpad;
