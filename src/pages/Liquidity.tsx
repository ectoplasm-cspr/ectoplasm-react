import React, { useState } from 'react';
import { AddLiquidityForm, PoolCard, PositionsList } from '../components/liquidity';
import { useLiquidity } from '../hooks';
import { useWallet } from '../contexts/WalletContext';

// Demo staking pools data
const STAKING_POOLS = [
  {
    name: 'CSPR Liquid Staking',
    subtitle: 'Auto-compound · No lock',
    token: 'stCSPR',
    tokenA: 'CSPR',
    tokenB: 'USDC',
    tvl: 125800000,
    apr: 16.8,
    minStake: '100 CSPR',
    avatarType: 'primary' as const,
    avatarChar: '◈',
  },
  {
    name: 'ECTO Liquid Staking',
    subtitle: 'Boosted rewards · Flexible',
    token: 'stECTO',
    tokenA: 'ECTO',
    tokenB: 'USDC',
    tvl: 78400000,
    apr: 22.4,
    minStake: '50 ECTO',
    avatarType: 'alt' as const,
    avatarChar: 'E',
  },
  {
    name: 'ETH Liquid Staking',
    subtitle: 'Cross-chain · High yield',
    token: 'stETH',
    tokenA: 'WETH',
    tokenB: 'USDC',
    tvl: 92100000,
    apr: 18.9,
    minStake: '0.1 ETH',
    avatarType: 'blue' as const,
    avatarChar: 'Ξ',
  },
  {
    name: 'BTC Liquid Staking',
    subtitle: 'Bitcoin rewards · Secure',
    token: 'stBTC',
    tokenA: 'WBTC',
    tokenB: 'USDC',
    tvl: 156300000,
    apr: 12.4,
    minStake: '0.01 BTC',
    avatarType: 'gold' as const,
    avatarChar: 'B',
  },
  {
    name: 'Stablecoin Yield Pool',
    subtitle: 'Low risk · Stable returns',
    token: 'ystUSD',
    tokenA: 'USDC',
    tokenB: 'USDC',
    tvl: 64700000,
    apr: 8.2,
    minStake: '100 USD',
    avatarType: 'violet' as const,
    avatarChar: '$',
  },
];

// Demo user positions
const DEMO_POSITIONS = [
  {
    name: 'CSPR Liquid Staking',
    staked: '25,000 CSPR',
    apr: '16.8%',
    earned: '$3,920.40',
    lstToken: '25,125 stCSPR',
  },
  {
    name: 'ECTO Liquid Staking',
    staked: '15,000 ECTO',
    apr: '22.4%',
    earned: '$2,688.00',
    lstToken: '15,336 stECTO',
  },
  {
    name: 'ETH Liquid Staking',
    staked: '8.5 ETH',
    apr: '18.9%',
    earned: '$1,606.50',
    lstToken: '8.661 stETH',
  },
];

type ModalType = 'add' | 'view' | null;

export function Liquidity() {
  const { connected } = useWallet();
  const { positions } = useLiquidity();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'apr' | 'tvl' | 'stake'>('apr');
  const [autoCompound, setAutoCompound] = useState(true);
  const [highApr, setHighApr] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [selectedPool, setSelectedPool] = useState<typeof STAKING_POOLS[0] | null>(null);

  // Filter pools
  const filteredPools = STAKING_POOLS.filter((pool) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pool.name.toLowerCase().includes(query) ||
      pool.token.toLowerCase().includes(query) ||
      pool.tokenA.toLowerCase().includes(query)
    );
  }).filter((pool) => {
    if (highApr && pool.apr < 15) return false;
    return true;
  });

  // Sort pools
  const sortedPools = [...filteredPools].sort((a, b) => {
    switch (sortBy) {
      case 'apr':
        return b.apr - a.apr;
      case 'tvl':
        return b.tvl - a.tvl;
      case 'stake':
        return 0;
      default:
        return 0;
    }
  });

  const formatTVL = (tvl: number) => {
    if (tvl >= 1000000) {
      return `$${(tvl / 1000000).toFixed(1)}M`;
    }
    return `$${(tvl / 1000).toFixed(0)}K`;
  };

  const openViewPool = (pool: typeof STAKING_POOLS[0]) => {
    setSelectedPool(pool);
    setModalType('view');
  };

  const openAddLiquidity = (pool: typeof STAKING_POOLS[0]) => {
    setSelectedPool(pool);
    setModalType('add');
  };

  const closeModal = () => {
    setModalType(null);
    setSelectedPool(null);
  };

  // Calculate liquidity provided to DEX (simulated as ~78% of TVL)
  const getLiquidityProvided = (tvl: number) => {
    const utilization = 0.78;
    const provided = tvl * utilization;
    return {
      amount: provided >= 1000000 ? `$${(provided / 1000000).toFixed(1)}M` : `$${(provided / 1000).toFixed(0)}K`,
      percent: Math.round(utilization * 100)
    };
  };

  // Use real positions if connected, otherwise show demo
  const displayPositions = connected && positions.length > 0 ? positions : null;

  return (
    <main>
      {/* Hero Section */}
      <section className="page-hero liquidity-hero">
        <div className="container">
          <div className="hero-grid hero-balanced">
            {/* Left: Copy */}
            <div className="hero-copy">
              <p className="eyebrow">Earn · Liquid Staking</p>
              <h1>Earn rewards through liquid staking pools</h1>
              <p className="lead">
                Stake your assets to earn rewards while providing liquidity for our swaps.
                Receive liquid staking tokens (LSTs) that represent your staked position
                and can be traded or used across DeFi. Your staked assets power our DEX
                liquidity, enabling seamless swaps while you earn auto-compounding rewards.
              </p>
              <div className="hero-actions">
                <div className="hero-buttons">
                  <a href="#pools" className="btn primary large">View Pools</a>
                  <a href="/swap" className="btn ghost large">Learn more</a>
                </div>
                <div className="hero-chips">
                  <span className="chip active">Powers DEX liquidity</span>
                  <span className="chip">Auto-compounding</span>
                  <span className="chip">LST tokens</span>
                </div>
              </div>
            </div>

            {/* Right: Positions Card */}
            <div className="hero-card panel">
              <div className="panel-header">
                <span className="panel-title">Your Liquid Staking Positions</span>
              </div>
              <div className="panel-body">
                {displayPositions ? (
                  // Real positions from blockchain
                  displayPositions.map((pos, idx) => (
                    <div key={idx} className="position-item">
                      <div className="position-header">
                        <strong>{pos.pairName}</strong>
                        <span className="pill subtle">Auto-compound</span>
                      </div>
                      <div className="position-grid">
                        <div>
                          <span className="muted tiny">Staked</span>
                          <div>{pos.tokenAAmount} {pos.tokenA}</div>
                        </div>
                        <div>
                          <span className="muted tiny">APR</span>
                          <div className="apr-value">--</div>
                        </div>
                        <div>
                          <span className="muted tiny">Earned</span>
                          <div>--</div>
                        </div>
                      </div>
                      <div className="position-footer">
                        <span className="muted tiny">LP tokens: {pos.lpBalance}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  // Demo positions when not connected
                  DEMO_POSITIONS.map((pos, idx) => (
                    <div key={idx} className="position-item">
                      <div className="position-header">
                        <strong>{pos.name}</strong>
                        <span className="pill subtle">Auto-compound</span>
                      </div>
                      <div className="position-grid">
                        <div>
                          <span className="muted tiny">Staked</span>
                          <div>{pos.staked}</div>
                        </div>
                        <div>
                          <span className="muted tiny">APR</span>
                          <div className="apr-value">{pos.apr}</div>
                        </div>
                        <div>
                          <span className="muted tiny">Earned</span>
                          <div>{pos.earned}</div>
                        </div>
                      </div>
                      <div className="position-footer">
                        <span className="muted tiny">Liquid token: {pos.lstToken}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Controls Section */}
      <section className="liquidity-controls section alt">
        <div className="container">
          <div className="controls-row">
            <button className="pill filled">Liquid Staking Pools</button>
            <div className="toolbar-field">
              <label className="muted" htmlFor="poolSearch">Search</label>
              <div className="input shell">
                <input
                  id="poolSearch"
                  type="search"
                  placeholder="Search staking pools or tokens"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <span className="suffix muted">⌘K</span>
              </div>
            </div>
            <div className="toolbar-filters">
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={autoCompound}
                  onChange={(e) => setAutoCompound(e.target.checked)}
                />
                <span>Auto-compound</span>
              </label>
              <label className="toggle">
                <input
                  type="checkbox"
                  checked={highApr}
                  onChange={(e) => setHighApr(e.target.checked)}
                />
                <span>High APR</span>
              </label>
              <div className="select">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'apr' | 'tvl' | 'stake')}
                  aria-label="Sort pools"
                >
                  <option value="apr">Sort by APR</option>
                  <option value="tvl">Sort by TVL</option>
                  <option value="stake">Sort by Min. stake</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pools Section */}
      <section id="pools" className="section">
        <div className="container">
          <div className="section-header">
            <div>
              <p className="eyebrow">Liquid Staking Pools</p>
              <h2>Stake assets to power swap liquidity and earn rewards</h2>
              <p className="muted">
                These liquid staking pools provide the liquidity backbone for our DEX swaps.
                When you stake, you receive LST tokens representing your position while your
                assets enable seamless trading.
              </p>
            </div>
            <div className="pill-row tight">
              <span className="pill subtle">Powers swap liquidity</span>
              <span className="pill subtle">Auto-compounding rewards</span>
              <span className="pill subtle">Tradeable LST tokens</span>
            </div>
          </div>

          {/* Pool Table */}
          <div className="pool-table" role="table" aria-label="Liquid staking pools">
            <div className="pool-row pool-head" role="row">
              <div className="col pair" role="columnheader">Staking Pool</div>
              <div className="col fee" role="columnheader">Token</div>
              <div className="col tvl" role="columnheader">TVL</div>
              <div className="col vol" role="columnheader">Min. Stake</div>
              <div className="col apr" role="columnheader">APR</div>
              <div className="col action" role="columnheader">Action</div>
            </div>

            {sortedPools.map((pool, index) => (
              <div key={index} className="pool-row" role="row">
                <div className="col pair" role="cell">
                  <div className="pair-label">
                    <div className={`avatar ${pool.avatarType}`}>{pool.avatarChar}</div>
                    <div>
                      <strong>{pool.name}</strong>
                      <div className="muted tiny">{pool.subtitle}</div>
                    </div>
                  </div>
                </div>
                <div className="col fee" role="cell">
                  <span className="pill subtle">{pool.token}</span>
                </div>
                <div className="col tvl" role="cell">{formatTVL(pool.tvl)}</div>
                <div className="col vol" role="cell">{pool.minStake}</div>
                <div className="col apr" role="cell">
                  <div className="apr">{pool.apr}%</div>
                </div>
                <div className="col action" role="cell">
                  <div className="action-buttons">
                    <button
                      className="btn ghost small"
                      onClick={() => openViewPool(pool)}
                    >
                      View Pool
                    </button>
                    <button
                      className="btn primary small"
                      onClick={() => openAddLiquidity(pool)}
                    >
                      Add
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {sortedPools.length === 0 && (
              <div className="pool-empty">
                <p className="muted">No pools found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* View Pool Modal */}
      {modalType === 'view' && selectedPool && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content modal-view-pool" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{selectedPool.name}</h3>
              <button className="btn ghost tiny" onClick={closeModal}>✕</button>
            </div>
            <div className="pool-info-grid">
              <div className="pool-info-item">
                <span className="muted tiny">Total Value Locked</span>
                <span className="pool-info-value">{formatTVL(selectedPool.tvl)}</span>
              </div>
              <div className="pool-info-item">
                <span className="muted tiny">APR</span>
                <span className="pool-info-value apr-value">{selectedPool.apr}%</span>
              </div>
              <div className="pool-info-item">
                <span className="muted tiny">Min. Stake</span>
                <span className="pool-info-value">{selectedPool.minStake}</span>
              </div>
              <div className="pool-info-item">
                <span className="muted tiny">LST Token</span>
                <span className="pool-info-value">{selectedPool.token}</span>
              </div>
            </div>
            <div className="pool-info-section">
              <span className="muted tiny">Liquidity Provided to DEX</span>
              <span className="pool-info-value">
                {getLiquidityProvided(selectedPool.tvl).amount} ({getLiquidityProvided(selectedPool.tvl).percent}% utilized)
              </span>
            </div>
            <div className="pool-info-section">
              <span className="muted tiny">Pool Features</span>
              <div className="pool-features">
                <span className="pill subtle">Auto-compound</span>
                <span className="pill subtle">No lock</span>
                <span className="pill subtle active">Live</span>
              </div>
            </div>
            <button
              className="btn primary full"
              onClick={() => {
                setModalType('add');
              }}
            >
              Add Liquidity
            </button>
          </div>
        </div>
      )}

      {/* Add Liquidity Modal */}
      {modalType === 'add' && selectedPool && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add Liquidity - {selectedPool.name}</h3>
              <button className="btn ghost tiny" onClick={closeModal}>✕</button>
            </div>
            <AddLiquidityForm
              defaultTokenA={selectedPool.tokenA}
              defaultTokenB={selectedPool.tokenB}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default Liquidity;
