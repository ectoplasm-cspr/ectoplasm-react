import React from 'react';

export function Launchpad() {
  return (
    <main>
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
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pump-card">
            <h2>Token Library</h2>
            <p className="muted">Launchpad features coming soon...</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Launchpad;
