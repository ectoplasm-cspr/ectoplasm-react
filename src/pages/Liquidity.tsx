import React, { useState } from 'react';
import { AddLiquidityForm, PoolCard, PositionsList } from '../components/liquidity';
import { useLiquidity, DEMO_POOLS } from '../hooks';

type TabType = 'add' | 'positions';

export function Liquidity() {
  const [activeTab, setActiveTab] = useState<TabType>('add');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'apr' | 'tvl' | 'stake'>('apr');
  const { positions } = useLiquidity();

  // Filter pools by search
  const filteredPools = DEMO_POOLS.filter((pool) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      pool.name.toLowerCase().includes(query) ||
      pool.tokenA.toLowerCase().includes(query) ||
      pool.tokenB.toLowerCase().includes(query) ||
      pool.lstToken.toLowerCase().includes(query)
    );
  });

  // Sort pools
  const sortedPools = [...filteredPools].sort((a, b) => {
    switch (sortBy) {
      case 'apr':
        return b.apr - a.apr;
      case 'tvl':
        return b.tvl - a.tvl;
      case 'stake':
        return a.minStake - b.minStake;
      default:
        return 0;
    }
  });

  return (
    <main>
      {/* Hero Section */}
      <section className="hero liquidity-hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-copy">
              <p className="eyebrow">Earn · Liquid Staking</p>
              <h1>Earn rewards through liquid staking pools</h1>
              <p className="lead">
                Stake your assets to earn rewards while providing liquidity for our swaps.
                Receive liquid staking tokens (LSTs) that represent your staked position
                and can be traded or used across DeFi.
              </p>
              <div className="hero-chips">
                <span className="chip active">Powers DEX liquidity</span>
                <span className="chip">Auto-compounding</span>
                <span className="chip">LST tokens</span>
              </div>
            </div>

            {/* Add Liquidity Card */}
            <div className="hero-card pump-card">
              <div className="lp-tabs">
                <button
                  className={`pill ${activeTab === 'add' ? 'filled' : ''}`}
                  onClick={() => setActiveTab('add')}
                >
                  Add Liquidity
                </button>
                <button
                  className={`pill ${activeTab === 'positions' ? 'filled' : ''}`}
                  onClick={() => setActiveTab('positions')}
                >
                  Your Positions
                </button>
              </div>

              {activeTab === 'add' ? (
                <AddLiquidityForm />
              ) : (
                <PositionsList positions={positions} />
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Pool Controls */}
      <section className="section alt">
        <div className="container">
          <div className="pool-controls">
            <div className="pill-row">
              <button className="pill filled">Liquid Staking Pools</button>
            </div>
            <div className="toolbar">
              <div className="toolbar-field">
                <label className="muted" htmlFor="poolSearch">Search</label>
                <input
                  id="poolSearch"
                  type="search"
                  placeholder="Search pools or tokens"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
              <div className="toolbar-filters">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'apr' | 'tvl' | 'stake')}
                  className="sort-select"
                  aria-label="Sort pools"
                >
                  <option value="apr">Sort by APR</option>
                  <option value="tvl">Sort by TVL</option>
                  <option value="stake">Sort by Min. Stake</option>
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
              <PoolCard
                key={index}
                name={pool.name}
                tokenA={pool.tokenA}
                tokenB={pool.tokenB}
                tvl={pool.tvl}
                apr={pool.apr}
                minStake={pool.minStake}
                lstToken={pool.lstToken}
                features={pool.features}
              />
            ))}

            {sortedPools.length === 0 && (
              <div className="pool-empty">
                <p className="muted">No pools found matching your search.</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

export default Liquidity;
