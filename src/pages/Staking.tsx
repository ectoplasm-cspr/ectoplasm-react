import { useEffect, useState } from 'react';
import { StakingCard } from '../components/staking';
import { useWallet } from '../contexts/WalletContext';

export function Staking() {
  const { balances } = useWallet();
  const [stats] = useState({
    tvl: '2,450,000',
    apy: '8.5',
    exchangeRate: '1.042',
    totalStaked: '2,350,000',
    validators: '12'
  });

  // Add staking-page class to body for page-specific styling
  useEffect(() => {
    document.body.classList.add('staking-page');
    return () => {
      document.body.classList.remove('staking-page');
    };
  }, []);

  return (
    <main>
      <section className="hero staking-hero" id="staking">
        <div className="container staking-layout">
          {/* Header */}
          <div className="staking-heading">
            <h1>Liquid Staking</h1>
            <p className="subtitle">Stake CSPR and receive sCSPR tokens that earn rewards while staying liquid</p>
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-label">Total Value Locked</div>
                <div className="stat-value">{stats.tvl} CSPR</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-label">Current APY</div>
                <div className="stat-value">{stats.apy}%</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🔄</div>
              <div className="stat-content">
                <div className="stat-label">Exchange Rate</div>
                <div className="stat-value">1 sCSPR = {stats.exchangeRate} CSPR</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon">🎯</div>
              <div className="stat-content">
                <div className="stat-label">Active Validators</div>
                <div className="stat-value">{stats.validators}</div>
              </div>
            </div>
          </div>

          {/* Main Staking Card */}
          <StakingCard />

          {/* Info Sections */}
          <div className="info-grid">
            <div className="info-card">
              <h3>🚀 How It Works</h3>
              <ol className="info-list">
                <li>
                  <strong>Stake CSPR</strong>
                  <p>Deposit your CSPR tokens to start earning staking rewards</p>
                </li>
                <li>
                  <strong>Receive sCSPR</strong>
                  <p>Get liquid staking tokens that represent your staked position</p>
                </li>
                <li>
                  <strong>Earn Rewards</strong>
                  <p>sCSPR automatically accrues value from staking rewards</p>
                </li>
                <li>
                  <strong>Use in DeFi</strong>
                  <p>Trade, provide liquidity, or use sCSPR across the ecosystem</p>
                </li>
              </ol>
            </div>

            <div className="info-card">
              <h3>💡 Key Benefits</h3>
              <ul className="benefits-list">
                <li>
                  <span className="benefit-icon">✓</span>
                  <div>
                    <strong>Stay Liquid</strong>
                    <p>No lock-up period - use your tokens while earning</p>
                  </div>
                </li>
                <li>
                  <span className="benefit-icon">✓</span>
                  <div>
                    <strong>Maximize Returns</strong>
                    <p>Earn staking rewards + DeFi yields simultaneously</p>
                  </div>
                </li>
                <li>
                  <span className="benefit-icon">✓</span>
                  <div>
                    <strong>Decentralized</strong>
                    <p>Stake across multiple validators for security</p>
                  </div>
                </li>
                <li>
                  <span className="benefit-icon">✓</span>
                  <div>
                    <strong>Easy Unstaking</strong>
                    <p>Withdraw anytime with a 7 era (~16 hour) cooldown</p>
                  </div>
                </li>
              </ul>
            </div>
          </div>

          {/* Your Position (if connected) */}
          {balances.CSPR && (
            <div className="position-card">
              <h3>Your Position</h3>
              <div className="position-grid">
                <div className="position-item">
                  <div className="position-label">CSPR Balance</div>
                  <div className="position-value">{balances.CSPR.formatted} CSPR</div>
                </div>
                <div className="position-item">
                  <div className="position-label">sCSPR Balance</div>
                  <div className="position-value">{balances.sCSPR?.formatted || '0'} sCSPR</div>
                </div>
                <div className="position-item">
                  <div className="position-label">Staked Value</div>
                  <div className="position-value">
                    {balances.sCSPR ? 
                      (parseFloat(balances.sCSPR.formatted) * parseFloat(stats.exchangeRate)).toFixed(4) 
                      : '0'} CSPR
                  </div>
                </div>
                <div className="position-item">
                  <div className="position-label">Estimated APY</div>
                  <div className="position-value">{stats.apy}%</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default Staking;
