import React, { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import EctoplasmConfig from '../config/ectoplasm';

interface StakingStats {
  totalCsprStaked: string;
  totalScsprSupply: string;
  exchangeRate: string;
  apr: string;
  userCsprBalance: string;
  userScsprBalance: string;
  minimumStake: string;
}

interface UnstakeRequest {
  id: number;
  csprAmount: string;
  withdrawableAt: number;
  processed: boolean;
}

export function Earn() {
  const { connected, publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const [stats, setStats] = useState<StakingStats>({
    totalCsprStaked: '0',
    totalScsprSupply: '0',
    exchangeRate: '1.0',
    apr: '16.8',
    userCsprBalance: '0',
    userScsprBalance: '0',
    minimumStake: '100',
  });
  const [unstakeRequests, setUnstakeRequests] = useState<UnstakeRequest[]>([]);

  const stakingManagerHash = EctoplasmConfig.contracts.stakingManager;
  const scsprTokenHash = EctoplasmConfig.contracts.scsprToken;

  useEffect(() => {
    if (connected && publicKey) {
      loadStakingData();
    }
  }, [connected, publicKey]);

  const loadStakingData = async () => {
    // TODO: Implement actual contract calls to fetch staking data
    // For now, showing placeholder data
    console.log('Loading staking data for:', publicKey);
    console.log('Staking Manager:', stakingManagerHash);
    console.log('sCSPR Token:', scsprTokenHash);
  };

  const handleStake = async () => {
    if (!connected || !stakeAmount) return;
    
    setLoading(true);
    try {
      // TODO: Implement actual staking transaction
      console.log('Staking', stakeAmount, 'CSPR');
      alert(`Staking ${stakeAmount} CSPR - Integration in progress`);
    } catch (error) {
      console.error('Staking failed:', error);
      alert('Staking failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async () => {
    if (!connected || !unstakeAmount) return;
    
    setLoading(true);
    try {
      // TODO: Implement actual unstaking transaction
      console.log('Unstaking', unstakeAmount, 'sCSPR');
      alert(`Unstaking ${unstakeAmount} sCSPR - Integration in progress`);
    } catch (error) {
      console.error('Unstaking failed:', error);
      alert('Unstaking failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (requestId: number) => {
    if (!connected) return;
    
    setLoading(true);
    try {
      // TODO: Implement actual withdrawal transaction
      console.log('Withdrawing unstake request', requestId);
      alert(`Withdrawing request ${requestId} - Integration in progress`);
    } catch (error) {
      console.error('Withdrawal failed:', error);
      alert('Withdrawal failed: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value: string, decimals: number = 2) => {
    const num = parseFloat(value);
    if (isNaN(num)) return '0';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const isContractConfigured = stakingManagerHash && scsprTokenHash;

  return (
    <main className="page-earn">
      <section className="hero-section">
        <div className="container">
          <div className="hero-content">
            <p className="eyebrow">Earn · Liquid Staking</p>
            <h1>Stake CSPR, Earn Rewards</h1>
            <p className="hero-description">
              Stake your CSPR tokens to earn staking rewards while receiving sCSPR (Staked CSPR) tokens.
              Your sCSPR tokens represent your staked position and automatically accrue value as rewards are earned.
              Use sCSPR across DeFi while still earning staking rewards.
            </p>
            {!isContractConfigured && (
              <div className="alert warning">
                <strong>⚠️ LST Contracts Not Configured</strong>
                <p>Please add SCSPR_CONTRACT_HASH and STAKING_CONTRACT_HASH to your .env file.</p>
              </div>
            )}
          </div>

          {/* Stats Grid */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon primary">◈</div>
              <div className="stat-content">
                <span className="stat-label">Total CSPR Staked</span>
                <span className="stat-value">{formatNumber(stats.totalCsprStaked, 0)} CSPR</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon alt">%</div>
              <div className="stat-content">
                <span className="stat-label">Current APR</span>
                <span className="stat-value apr-value">{stats.apr}%</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">⇄</div>
              <div className="stat-content">
                <span className="stat-label">Exchange Rate</span>
                <span className="stat-value">1 CSPR = {stats.exchangeRate} sCSPR</span>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon gold">S</div>
              <div className="stat-content">
                <span className="stat-label">Total sCSPR Supply</span>
                <span className="stat-value">{formatNumber(stats.totalScsprSupply, 0)} sCSPR</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="staking-section">
        <div className="container">
          <div className="staking-layout">
            {/* Staking Panel */}
            <div className="panel staking-panel">
              <div className="panel-header">
                <span className="panel-title">Liquid Staking</span>
              </div>

              {/* Tabs */}
              <div className="tabs">
                <button
                  className={`tab ${activeTab === 'stake' ? 'active' : ''}`}
                  onClick={() => setActiveTab('stake')}
                >
                  Stake
                </button>
                <button
                  className={`tab ${activeTab === 'unstake' ? 'active' : ''}`}
                  onClick={() => setActiveTab('unstake')}
                >
                  Unstake
                </button>
              </div>

              {/* Stake Tab */}
              {activeTab === 'stake' && (
                <div className="tab-content">
                  <div className="balance-row">
                    <span className="muted tiny">Available Balance</span>
                    <span className="balance">{formatNumber(stats.userCsprBalance)} CSPR</span>
                  </div>

                  <div className="input-group">
                    <label>Amount to Stake</label>
                    <div className="input-with-max">
                      <input
                        type="number"
                        placeholder="0.0"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        disabled={!connected || loading}
                      />
                      <span className="input-suffix">CSPR</span>
                      <button
                        className="btn-max"
                        onClick={() => setStakeAmount(stats.userCsprBalance)}
                        disabled={!connected || loading}
                      >
                        MAX
                      </button>
                    </div>
                    <span className="muted tiny">Minimum: {stats.minimumStake} CSPR</span>
                  </div>

                  <div className="info-box">
                    <div className="info-row">
                      <span className="muted">You will receive</span>
                      <span className="value">
                        {stakeAmount ? formatNumber((parseFloat(stakeAmount) / parseFloat(stats.exchangeRate)).toString()) : '0'} sCSPR
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="muted">Exchange Rate</span>
                      <span className="value">1 CSPR = {stats.exchangeRate} sCSPR</span>
                    </div>
                    <div className="info-row">
                      <span className="muted">Estimated APR</span>
                      <span className="value apr-value">{stats.apr}%</span>
                    </div>
                  </div>

                  {!connected ? (
                    <button className="btn primary full" disabled>
                      Connect Wallet to Stake
                    </button>
                  ) : !isContractConfigured ? (
                    <button className="btn primary full" disabled>
                      Contracts Not Configured
                    </button>
                  ) : (
                    <button
                      className="btn primary full"
                      onClick={handleStake}
                      disabled={loading || !stakeAmount || parseFloat(stakeAmount) < parseFloat(stats.minimumStake)}
                    >
                      {loading ? 'Staking...' : 'Stake CSPR'}
                    </button>
                  )}

                  <div className="info-note">
                    <p className="muted tiny">
                      ℹ️ Your sCSPR tokens automatically increase in value as staking rewards are earned.
                      You can use sCSPR in other DeFi protocols while still earning rewards.
                    </p>
                  </div>
                </div>
              )}

              {/* Unstake Tab */}
              {activeTab === 'unstake' && (
                <div className="tab-content">
                  <div className="balance-row">
                    <span className="muted tiny">Your sCSPR Balance</span>
                    <span className="balance">{formatNumber(stats.userScsprBalance)} sCSPR</span>
                  </div>

                  <div className="input-group">
                    <label>Amount to Unstake</label>
                    <div className="input-with-max">
                      <input
                        type="number"
                        placeholder="0.0"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        disabled={!connected || loading}
                      />
                      <span className="input-suffix">sCSPR</span>
                      <button
                        className="btn-max"
                        onClick={() => setUnstakeAmount(stats.userScsprBalance)}
                        disabled={!connected || loading}
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  <div className="info-box">
                    <div className="info-row">
                      <span className="muted">You will receive</span>
                      <span className="value">
                        {unstakeAmount ? formatNumber((parseFloat(unstakeAmount) * parseFloat(stats.exchangeRate)).toString()) : '0'} CSPR
                      </span>
                    </div>
                    <div className="info-row">
                      <span className="muted">Exchange Rate</span>
                      <span className="value">1 sCSPR = {stats.exchangeRate} CSPR</span>
                    </div>
                    <div className="info-row">
                      <span className="muted">Unstaking Period</span>
                      <span className="value">~16 hours (7 eras)</span>
                    </div>
                  </div>

                  {!connected ? (
                    <button className="btn primary full" disabled>
                      Connect Wallet to Unstake
                    </button>
                  ) : !isContractConfigured ? (
                    <button className="btn primary full" disabled>
                      Contracts Not Configured
                    </button>
                  ) : (
                    <button
                      className="btn primary full"
                      onClick={handleUnstake}
                      disabled={loading || !unstakeAmount}
                    >
                      {loading ? 'Unstaking...' : 'Unstake sCSPR'}
                    </button>
                  )}

                  <div className="info-note">
                    <p className="muted tiny">
                      ⏱️ After unstaking, there is a ~16 hour waiting period before you can withdraw your CSPR.
                      This is required by the Casper network's staking mechanism.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* User Positions Panel */}
            {connected && (
              <div className="panel positions-panel">
                <div className="panel-header">
                  <span className="panel-title">Your Staking Position</span>
                </div>

                <div className="position-stats">
                  <div className="position-stat">
                    <span className="muted tiny">Staked CSPR</span>
                    <div className="stat-value-large">
                      {formatNumber((parseFloat(stats.userScsprBalance) * parseFloat(stats.exchangeRate)).toString())} CSPR
                    </div>
                  </div>
                  <div className="position-stat">
                    <span className="muted tiny">Your sCSPR</span>
                    <div className="stat-value-large">{formatNumber(stats.userScsprBalance)} sCSPR</div>
                  </div>
                  <div className="position-stat">
                    <span className="muted tiny">Current Value</span>
                    <div className="stat-value-large">
                      ${formatNumber((parseFloat(stats.userScsprBalance) * parseFloat(stats.exchangeRate) * 0.05).toString())}
                    </div>
                  </div>
                </div>

                {/* Pending Unstake Requests */}
                {unstakeRequests.length > 0 && (
                  <div className="unstake-requests">
                    <h4>Pending Withdrawals</h4>
                    {unstakeRequests.map((request) => (
                      <div key={request.id} className="unstake-request-card">
                        <div className="request-info">
                          <span className="request-amount">{formatNumber(request.csprAmount)} CSPR</span>
                          <span className="muted tiny">
                            {request.processed
                              ? 'Ready to withdraw'
                              : `Available in ${Math.max(0, Math.ceil((request.withdrawableAt - Date.now()) / 3600000))} hours`}
                          </span>
                        </div>
                        <button
                          className="btn primary small"
                          onClick={() => handleWithdraw(request.id)}
                          disabled={!request.processed || loading}
                        >
                          {request.processed ? 'Withdraw' : 'Pending'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {unstakeRequests.length === 0 && (
                  <div className="empty-state">
                    <p className="muted">No pending withdrawals</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="info-section">
            <h3>How Liquid Staking Works</h3>
            <div className="info-cards">
              <div className="info-card">
                <div className="info-card-icon">1</div>
                <h4>Stake CSPR</h4>
                <p>Stake your CSPR tokens and receive sCSPR tokens in return. Your CSPR is delegated to validators to earn rewards.</p>
              </div>
              <div className="info-card">
                <div className="info-card-icon">2</div>
                <h4>Earn Rewards</h4>
                <p>Your sCSPR tokens automatically increase in value as staking rewards are earned. No need to claim or compound.</p>
              </div>
              <div className="info-card">
                <div className="info-card-icon">3</div>
                <h4>Stay Liquid</h4>
                <p>Use your sCSPR tokens in DeFi protocols, trade them, or provide liquidity while still earning staking rewards.</p>
              </div>
              <div className="info-card">
                <div className="info-card-icon">4</div>
                <h4>Unstake Anytime</h4>
                <p>Unstake your sCSPR to receive CSPR back. After a ~16 hour unstaking period, withdraw your CSPR plus earned rewards.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Earn;
