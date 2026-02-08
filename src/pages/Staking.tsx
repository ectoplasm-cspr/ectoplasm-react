import { useEffect, useState } from 'react';
import { StakingCard } from '../components/staking';
import { useWallet } from '../contexts/WalletContext';

export function Staking() {
  const { balances } = useWallet();

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



          {/* Main Staking Card */}
          <StakingCard />

          {/* Your Position (if connected) */}
          {balances.CSPR && (
            <div className="position-card">
              <h3>💼 Your Position</h3>
              <div className="position-grid">
                <div className="position-item">
                  <div className="position-label">CSPR Balance</div>
                  <div className="position-value">{balances.CSPR.formatted} CSPR</div>
                </div>
                <div className="position-item">
                  <div className="position-label">sCSPR Balance</div>
                  <div className="position-value">{balances.sCSPR?.formatted || '0'} sCSPR</div>
                </div>
              </div>
            </div>
          )}

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


        </div>
      </section>
    </main>
  );
}

export default Staking;
