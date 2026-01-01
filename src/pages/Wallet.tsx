import React, { useEffect, useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { EctoplasmConfig } from '../config/ectoplasm';

export function Wallet() {
  const { connected, connect, publicKey, balances, refreshBalances } = useWallet();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBalances();
    setRefreshing(false);
  };

  // Get all token symbols
  const tokenSymbols = EctoplasmConfig.getTokenSymbols();

  // Calculate total value (mock - would need price feeds for real values)
  const getTotalValue = () => {
    // For now just return a placeholder
    return 'N/A';
  };

  if (!connected) {
    return (
      <main>
        <section className="hero">
          <div className="container">
            <div className="hero-copy" style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto' }}>
              <p className="eyebrow">Wallet</p>
              <h1>Connect your wallet</h1>
              <p className="lead">
                Connect your Casper wallet to view your token balances and manage your assets.
              </p>
              <button className="btn primary" onClick={connect}>
                Connect Wallet
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="hero">
        <div className="container">
          <div className="wallet-header">
            <div>
              <p className="eyebrow">Wallet</p>
              <h1>Your Assets</h1>
              <p className="muted">
                Connected: {publicKey?.slice(0, 8)}...{publicKey?.slice(-6)}
              </p>
            </div>
            <button
              className="btn ghost"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              {refreshing ? 'Refreshing...' : 'Refresh Balances'}
            </button>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          {/* Token List */}
          <div className="wallet-tokens">
            <div className="wallet-tokens-header">
              <h2>Token Balances</h2>
            </div>

            <div className="token-list">
              {tokenSymbols.map((symbol) => {
                const token = EctoplasmConfig.getToken(symbol);
                const balance = balances[symbol];

                return (
                  <div key={symbol} className="token-list-item">
                    <div className="token-info">
                      <div className="token-icon">
                        {symbol.charAt(0)}
                      </div>
                      <div className="token-details">
                        <strong>{symbol}</strong>
                        <span className="muted tiny">{token?.name}</span>
                      </div>
                    </div>
                    <div className="token-balance">
                      <span className="balance-amount">
                        {balance?.formatted || '0'}
                      </span>
                      <span className="muted tiny">{symbol}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Note about token balances */}
          <div className="wallet-note" style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-highlight)', borderRadius: '8px' }}>
            <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
              Token balances are fetched via CSPR.cloud API.
              If balances show 0, your account may not have received tokens yet.
              Check{' '}
              <a href="https://testnet.cspr.live" target="_blank" rel="noopener noreferrer">cspr.live</a>
              {' '}to verify your token holdings.
            </p>
          </div>

          {/* Token Contract Info */}
          <div className="wallet-info" style={{ marginTop: '24px' }}>
            <h3>Token Contracts (Testnet)</h3>
            <div className="contract-list">
              {tokenSymbols.filter(s => s !== 'CSPR').map((symbol) => {
                const token = EctoplasmConfig.getToken(symbol);
                return (
                  <div key={symbol} className="contract-item">
                    <span className="contract-symbol">{symbol}</span>
                    <code className="contract-hash">
                      {token?.hash || 'Native'}
                    </code>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Wallet;
