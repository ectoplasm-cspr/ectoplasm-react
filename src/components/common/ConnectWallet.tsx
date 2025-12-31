import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { truncateAddress } from '../../utils/format';

interface ConnectWalletProps {
  className?: string;
}

export function ConnectWallet({ className = '' }: ConnectWalletProps) {
  const { connected, connecting, publicKey, connect, disconnect, balances } = useWallet();

  if (connected && publicKey) {
    const csprBalance = balances.CSPR?.formatted || '0';

    return (
      <div className={`wallet-connected ${className}`}>
        <span className="wallet-balance">{csprBalance} CSPR</span>
        <button
          className="btn primary"
          onClick={disconnect}
          title={publicKey}
        >
          {truncateAddress(publicKey)}
        </button>
      </div>
    );
  }

  return (
    <button
      className={`btn primary ${className}`}
      onClick={connect}
      disabled={connecting}
    >
      {connecting ? 'Connecting...' : 'Connect Wallet'}
    </button>
  );
}

export default ConnectWallet;
