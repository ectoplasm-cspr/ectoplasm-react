import { useState, useEffect } from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { createUnstakeDeploy, createWithdrawDeploy, signAndSendDeploy } from '../../services/lstService';
import { Toast } from './Toast';

export function UnstakeTab() {
  const { publicKey, balances, refreshBalances } = useWallet();
  const [scsprAmount, setScsprAmount] = useState('');
  const [scsprBalance, setScsprBalance] = useState('0');
  const [csprAmount, setCsprAmount] = useState('0');
  const [exchangeRate, setExchangeRate] = useState('1.0');
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [pendingUnstakes, setPendingUnstakes] = useState<any[]>([]);
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'; deployHash?: string} | null>(null);

  // Fetch sCSPR balance from wallet context
  useEffect(() => {
    if (publicKey && balances.sCSPR) {
      // Use the formatted balance directly (already converted from motes)
      setScsprBalance(balances.sCSPR.formatted);
    } else {
      setScsprBalance('0');
    }
  }, [publicKey, balances]);

  // Fetch exchange rate
  useEffect(() => {
    // TODO: Fetch actual exchange rate from staking manager
    setExchangeRate('1.0');
  }, []);

  // Fetch pending unstake requests
  useEffect(() => {
    if (publicKey) {
      // TODO: Fetch actual pending unstakes
      setPendingUnstakes([]);
    }
  }, [publicKey]);

  // Calculate CSPR amount based on sCSPR input
  useEffect(() => {
    if (scsprAmount && !isNaN(parseFloat(scsprAmount))) {
      const scspr = parseFloat(scsprAmount);
      const rate = parseFloat(exchangeRate);
      const cspr = scspr * rate;
      setCsprAmount(cspr.toFixed(6));
    } else {
      setCsprAmount('0');
    }
  }, [scsprAmount, exchangeRate]);

  const handleUnstake = async () => {
    if (!scsprAmount || parseFloat(scsprAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    setIsUnstaking(true);
    try {
      // Get wallet provider
      const w = window as any;
      const casperWallet = w.CasperWalletProvider?.();
      const csprClick = w.csprclick || w.CsprClickUI;

      if (!casperWallet && !csprClick) {
        throw new Error('No wallet found');
      }

      console.log('Creating unstake deploy...');
      
      // Create the unstake deploy
      const deploy = await createUnstakeDeploy({
        publicKey,
        amount: scsprAmount,
      });

      console.log('Signing and sending deploy...');
      
      // Sign and send the deploy
      const deployHash = await signAndSendDeploy(deploy, publicKey);

      console.log('Deploy sent:', deployHash);
      
      setToast({
        message: `Unstaking ${scsprAmount} sCSPR → ${csprAmount} CSPR\n\nAfter 7 eras (~16 hours), you can withdraw your CSPR.`,
        type: 'success',
        deployHash
      });

      // Clear the input
      setScsprAmount('');
      
      // Refresh balances
      setTimeout(() => refreshBalances(), 3000);
      setTimeout(() => refreshBalances(), 30000);
    } catch (error: any) {
      console.error('Unstaking failed:', error);
      setToast({
        message: `Unstaking failed: ${error.message || 'Unknown error'}`,
        type: 'error'
      });
    } finally {
      setIsUnstaking(false);
    }
  };

  const handleWithdraw = async (requestId: number) => {
    if (!publicKey) {
      alert('Please connect your wallet first');
      return;
    }

    try {
      // Get wallet provider
      const w = window as any;
      const casperWallet = w.CasperWalletProvider?.();
      const csprClick = w.csprclick || w.CsprClickUI;

      if (!casperWallet && !csprClick) {
        throw new Error('No wallet found');
      }

      console.log('Creating withdraw deploy...');
      
      // Create the withdraw deploy
      const deploy = await createWithdrawDeploy({
        publicKey,
        requestId,
      });

      console.log('Signing and sending deploy...');
      
      // Sign and send the deploy
      const deployHash = await signAndSendDeploy(deploy, publicKey);

      console.log('Deploy sent:', deployHash);
      
      alert(
        `Withdrawal Transaction Submitted!\n\n` +
        `Deploy Hash: ${deployHash}\n\n` +
        `Withdrawing CSPR from unstake request #${requestId}.\n\n` +
        `The transaction is being processed.`
      );
    } catch (error: any) {
      console.error('Withdrawal failed:', error);
      alert(`Withdrawal failed: ${error.message || 'Unknown error'}`);
    }
  };

  const handleMaxClick = () => {
    setScsprAmount(scsprBalance);
  };

  return (
    <div className="unstake-tab">
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
          <label>Unstake sCSPR</label>
          <div className="balance-row">
            <span className="balance">Balance: {parseFloat(scsprBalance).toFixed(6)} sCSPR</span>
            <button className="refresh-button" onClick={() => refreshBalances()} title="Refresh balance">
              🔄
            </button>
          </div>
        </div>
        <div className="input-wrapper">
          <input
            type="number"
            value={scsprAmount}
            onChange={(e) => setScsprAmount(e.target.value)}
            placeholder="0.0"
            min="0"
            step="any"
          />
          <div className="input-actions">
            <button className="max-button" onClick={handleMaxClick}>
              MAX
            </button>
            <span className="token-symbol">sCSPR</span>
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
          <label>Receive CSPR (after unstaking period)</label>
        </div>
        <div className="output-wrapper">
          <div className="output-value">{csprAmount}</div>
          <span className="token-symbol">CSPR</span>
        </div>
      </div>

      <div className="info-section">
        <div className="info-row">
          <span>Unstaking Period:</span>
          <span>7 eras (~16 hours)</span>
        </div>
        <div className="info-row">
          <span>Exchange Rate:</span>
          <span>1 sCSPR = {exchangeRate} CSPR</span>
        </div>
        <div className="info-row">
          <span>You will receive:</span>
          <span>{csprAmount} CSPR</span>
        </div>
      </div>

      <button
        className="unstake-button primary-button"
        onClick={handleUnstake}
        disabled={isUnstaking || !scsprAmount || parseFloat(scsprAmount) <= 0}
      >
        {isUnstaking ? 'Unstaking...' : 'Unstake sCSPR'}
      </button>

      {pendingUnstakes.length > 0 && (
        <div className="pending-unstakes">
          <h3>Pending Unstakes</h3>
          <div className="unstakes-list">
            {pendingUnstakes.map((unstake, index) => (
              <div key={index} className="unstake-item">
                <div className="unstake-info">
                  <span>{unstake.amount} CSPR</span>
                  <span className="unstake-status">
                    {unstake.ready ? 'Ready to withdraw' : `Unlocks in ${unstake.timeRemaining}`}
                  </span>
                </div>
                {unstake.ready && (
                  <button
                    className="withdraw-button"
                    onClick={() => handleWithdraw(unstake.id)}
                  >
                    Withdraw
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
