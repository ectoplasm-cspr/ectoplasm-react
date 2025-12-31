import React from 'react';

export function Liquidity() {
  return (
    <main>
      <section className="hero">
        <div className="container">
          <div className="hero-copy">
            <div className="brand-badge">
              <img src="/assets/electoplasmlogo.png" width="26" height="26" alt="" />
              <span>Provide liquidity</span>
            </div>
            <h1>Earn fees as a liquidity provider</h1>
            <p className="lead">
              Add liquidity to trading pairs and earn a share of swap fees.
              Your liquidity helps enable seamless trading on Casper.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="pump-card">
            <h2>Add Liquidity</h2>
            <p className="muted">Liquidity features coming soon...</p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Liquidity;
