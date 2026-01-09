import { useState } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { StakeTab } from './StakeTab';
import { UnstakeTab } from './UnstakeTab';
import './staking.css';

export function StakingCard() {
  const [activeTab, setActiveTab] = useState<'stake' | 'unstake'>('stake');
  const { connected } = useWallet();

  return (
    <div className="staking-card card">
      <div className="card-header">
        <div className="tab-buttons">
          <button
            className={`tab-button ${activeTab === 'stake' ? 'active' : ''}`}
            onClick={() => setActiveTab('stake')}
          >
            Stake
          </button>
          <button
            className={`tab-button ${activeTab === 'unstake' ? 'active' : ''}`}
            onClick={() => setActiveTab('unstake')}
          >
            Unstake
          </button>
        </div>
      </div>

      <div className="card-body">
        {!connected ? (
          <div className="connect-wallet-prompt">
            <p>Please connect your wallet to stake CSPR</p>
          </div>
        ) : (
          <>
            {activeTab === 'stake' && <StakeTab />}
            {activeTab === 'unstake' && <UnstakeTab />}
          </>
        )}
      </div>
    </div>
  );
}
