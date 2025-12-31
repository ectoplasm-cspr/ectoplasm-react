import React from 'react';
import { useWallet } from '../contexts/WalletContext';

export function Dashboard() {
  const { connected, balances } = useWallet();

  return (
    <main>
      <section className="hero">
        <div className="container">
          <div className="hero-copy">
            <div className="brand-badge">
              <img src="/assets/electoplasmlogo.png" width="26" height="26" alt="" />
              <span>Your dashboard</span>
            </div>
            <h1>Track your progress</h1>
            <p className="lead">
              Complete quests, earn XP, and unlock rewards as you trade on Ectoplasm.
            </p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {connected ? (
            <div className="dashboard-grid">
              <div className="pump-card">
                <h3>Your Balances</h3>
                <ul className="balance-list">
                  {Object.entries(balances).map(([symbol, balance]) => (
                    <li key={symbol}>
                      <span>{symbol}</span>
                      <strong>{balance.formatted}</strong>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pump-card">
                <h3>Quests</h3>
                <p className="muted">Quest system coming soon...</p>
              </div>

              <div className="pump-card">
                <h3>Achievements</h3>
                <p className="muted">Achievement system coming soon...</p>
              </div>
            </div>
          ) : (
            <div className="pump-card">
              <h2>Connect your wallet</h2>
              <p className="muted">Connect your wallet to view your dashboard.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
