import { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { createStakeDeploy, signAndSendDeploy } from '../../services/lstService';
import { Toast } from './Toast';

export function StakeTab() {
  const { publicKey, balances, refreshBalances } = useWallet();
  const [csprAmount, setCsprAmount] = useState('');
  const [csprBalance, setCsprBalance] = useState('0');
  const [scsprAmount, setScsprAmount] = useState('0');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [isStaking, setIsStaking] = useState(false);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'; deployHash?: string} | null>(null);

  // Fetch CSPR balance from wallet context
  useEffect(() => {
    if (publicKey && balances.CSPR) {
      // Convert from motes to CSPR (9 decimals)
      const balanceInCspr = Number(balances.CSPR.raw) / 1_000_000_000;
      setCsprBalance(balanceInCspr.toString());
    } else {
      setCsprBalance('0');
    }
  }, [publicKey, balances]);

  // Fetch exchange rate
  useEffect(() => {
    // TODO: Fetch actual exchange rate from staking manager
    setExchangeRate('1.0');
  }, []);

  // Calculate sCSPR amount based on CSPR input
  useEffect(() => {
    if (csprAmount && !isNaN(parseFloat(csprAmount))) {
      const cspr = parseFloat(csprAmount);
      const rate = parseFloat(exchangeRate);
      const scspr = cspr / rate;
      setScsprAmount(scspr.toFixed(6));
    } else {
      setScsprAmount('0');
    }
  }, [csprAmount, exchangeRate]);

  const handleStake = async () => {
    if (!csprAmount || parseFloat(csprAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (parseFloat(csprAmount) < 100) {
      alert('Minimum stake amount is 100 CSPR');
      return;
    }

    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setIsStaking(true);
    try {
      // Get wallet provider
      const w = window as any;
      const casperWallet = w.CasperWalletProvider?.();
      const csprClick = w.csprclick || w.CsprClickUI;

      if (!casperWallet && !csprClick) {
        throw new Error('No wallet found');
      }

      // Use a real Casper testnet validator
      const validatorAddress = 'account-hash-1b9f322c07b06cd303c98bf109cd8c9a4a57354bafa6194503ecde33d07133a1';

      console.log('Creating stake deploy...');
      
      // Create the stake deploy
      const deploy = await createStakeDeploy({
        publicKey,
        amount: csprAmount,
        validatorAddress,
      });

      console.log('Signing and sending deploy...');
      
      // Sign and send the deploy
      const deployHash = await signAndSendDeploy(deploy, publicKey);

      console.log('Deploy sent:', deployHash);
      
      // Show success toast
      setToast({
        message: `Staking ${csprAmount} CSPR → ${scsprAmount} sCSPR\n\nTransaction submitted! Balances will update in ~1-2 minutes.`,
        type: 'success',
        deployHash
      });

      // Clear the input
      setCsprAmount('');
      
      // Refresh balances after a delay to allow transaction to process
      setTimeout(() => {
        console.log('Refreshing balances...');
        refreshBalances();
      }, 3000);
      
      // Refresh again after 30 seconds
      setTimeout(() => {
        console.log('Refreshing balances again...');
        refreshBalances();
      }, 30000);
    } catch (error: any) {
      console.error('Staking failed:', error);
      setToast({
        message: `Staking failed: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsStaking(false);
    }
  };

  const handleMaxClick = () => {
    // Reserve some CSPR for gas
    const maxAmount = Math.max(0, parseFloat(csprBalance) - 10);
    setCsprAmount(maxAmount.toString());
  };

  return (
    <div className="stake-tab">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          deployHash={toast.deployHash}
          onClose={() => setToast(null)}
        />
      )}
      <div className="input-section">
        <div className="input-header">
          <label>Stake CSPR</label>
          <div className="balance-row">
            <span className="balance">Balance: {parseFloat(csprBalance).toFixed(2)} CSPR</span>
            <button className="refresh-button" onClick={() => refreshBalances()} title="Refresh balance">
              🔄
            </button>
          </div>
        </div>
        <div className="input-wrapper">
          <input
            type="number"
            value={csprAmount}
            onChange={(e) => setCsprAmount(e.target.value)}
            placeholder="0.0"
            min="0"
            step="any"
          />
          <div className="input-actions">
            <button className="max-button" onClick={handleMaxClick}>
              MAX
            </button>
            <span className="token-symbol">CSPR</span>
          </div>
        </div>
      </div>

      <div className="exchange-info">
        <div className="exchange-arrow">↓</div>
        <div className="exchange-rate">
          1 sCSPR = {exchangeRate} CSPR
        </div>
      </div>

      <div className="output-section">
        <div className="output-header">
          <label>Receive sCSPR</label>
        </div>
        <div className="output-wrapper">
          <div className="output-value">{scsprAmount}</div>
          <span className="token-symbol">sCSPR</span>
        </div>
      </div>

      <div className="info-section">
        <div className="info-row">
          <span>Minimum Stake:</span>
          <span>100 CSPR</span>
        </div>
        <div className="info-row">
          <span>Exchange Rate:</span>
          <span>1 sCSPR = {exchangeRate} CSPR</span>
        </div>
        <div className="info-row">
          <span>You will receive:</span>
          <span>{scsprAmount} sCSPR</span>
        </div>
      </div>

      <button
        className="stake-button primary-button"
        onClick={handleStake}
        disabled={isStaking || !csprAmount || parseFloat(csprAmount) < 100}
      >
        {isStaking ? 'Staking...' : 'Stake CSPR'}
      </button>
    </div>
  );
}
