import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { CasperService, BalanceResult } from '../services/casper';
import { STORAGE_KEYS } from '../utils/constants';

const normalizePublicKeyHex = (value: string): string => {
  const hex = value.replace(/^0x/i, '').trim();
  const prefix = hex.slice(0, 2).toLowerCase();
  if (prefix === '00' || prefix === '01' || prefix === '02') return hex;
  // Some providers return the raw 32-byte ED25519 key without the algorithm tag.
  if (hex.length === 64) return `01${hex}`;
  return hex;
};

interface WalletContextType {
  connected: boolean;
  connecting: boolean;
  publicKey: string | null;
  accountHash: string | null;
  balances: Record<string, BalanceResult>;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [accountHash, setAccountHash] = useState<string | null>(null);
  const [balances, setBalances] = useState<Record<string, BalanceResult>>({});
  const [error, setError] = useState<string | null>(null);

  // Check for CSPR.click UI availability
  const getClickUI = useCallback(() => {
    const w = window as any;
    return w.csprclick || w.CsprClickUI;
  }, []);

  // Check for CasperWallet extension
  const getCasperWallet = useCallback(() => {
    const w = window as any;
    return w.CasperWalletProvider?.();
  }, []);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;

    try {
      const allBalances = await CasperService.getAllBalances(publicKey);
      setBalances(allBalances);
    } catch (err: any) {
      console.error('Failed to refresh balances:', err);
    }
  }, [publicKey]);

  const connect = useCallback(async () => {
    setConnecting(true);
    setError(null);

    try {
      // Try CSPR.click first
      const clickUI = getClickUI();
      if (clickUI) {
        try {
          const result = await clickUI.signIn();
          if (result?.activeKey) {
            const pk = normalizePublicKeyHex(result.activeKey);
            setPublicKey(pk);
            setConnected(true);
            localStorage.setItem(STORAGE_KEYS.WALLET_TYPE, 'csprclick');

            // Fetch balances after connection
            const allBalances = await CasperService.getAllBalances(pk);
            setBalances(allBalances);
            return;
          }
        } catch (clickErr) {
          console.log('CSPR.click connection failed, trying CasperWallet...', clickErr);
        }
      }

      // Try CasperWallet extension
      const casperWallet = getCasperWallet();
      if (casperWallet) {
        const connected = await casperWallet.requestConnection();
        if (connected) {
          const activeKey = await casperWallet.getActivePublicKey();
          if (activeKey) {
            const pk = normalizePublicKeyHex(activeKey);
            setPublicKey(pk);
            setConnected(true);
            localStorage.setItem(STORAGE_KEYS.WALLET_TYPE, 'casperwallet');

            // Fetch balances after connection
            const allBalances = await CasperService.getAllBalances(pk);
            setBalances(allBalances);
            return;
          }
        }
      }

      // No wallet available
      setError('No wallet found. Please install CasperWallet or use CSPR.click');
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      console.error('Wallet connection error:', err);
    } finally {
      setConnecting(false);
    }
  }, [getClickUI, getCasperWallet]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setPublicKey(null);
    setAccountHash(null);
    setBalances({});
    localStorage.removeItem(STORAGE_KEYS.WALLET_TYPE);

    // Try to disconnect from wallets
    const clickUI = getClickUI();
    if (clickUI?.signOut) {
      clickUI.signOut();
    }

    const casperWallet = getCasperWallet();
    if (casperWallet?.disconnectFromSite) {
      casperWallet.disconnectFromSite();
    }
  }, [getClickUI, getCasperWallet]);

  // Auto-reconnect on mount if previously connected
  useEffect(() => {
    const savedWalletType = localStorage.getItem(STORAGE_KEYS.WALLET_TYPE);
    if (savedWalletType) {
      // Attempt silent reconnection
      const attemptReconnect = async () => {
        try {
          if (savedWalletType === 'csprclick') {
            const clickUI = getClickUI();
            if (clickUI?.getActiveKey) {
              const activeKey = await clickUI.getActiveKey();
              if (activeKey) {
                const pk = normalizePublicKeyHex(activeKey);
                setPublicKey(pk);
                setConnected(true);
                const allBalances = await CasperService.getAllBalances(pk);
                setBalances(allBalances);
              }
            }
          } else if (savedWalletType === 'casperwallet') {
            const casperWallet = getCasperWallet();
            if (casperWallet) {
              const isConnected = await casperWallet.isConnected();
              if (isConnected) {
                const activeKey = await casperWallet.getActivePublicKey();
                if (activeKey) {
                  const pk = normalizePublicKeyHex(activeKey);
                  setPublicKey(pk);
                  setConnected(true);
                  const allBalances = await CasperService.getAllBalances(pk);
                  setBalances(allBalances);
                }
              }
            }
          }
        } catch (err) {
          console.log('Auto-reconnect failed:', err);
          localStorage.removeItem(STORAGE_KEYS.WALLET_TYPE);
        }
      };

      attemptReconnect();
    }
  }, [getClickUI, getCasperWallet]);

  // Refresh balances periodically when connected
  useEffect(() => {
    if (!connected || !publicKey) return;

    const interval = setInterval(refreshBalances, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [connected, publicKey, refreshBalances]);

  const value: WalletContextType = {
    connected,
    connecting,
    publicKey,
    accountHash,
    balances,
    error,
    connect,
    disconnect,
    refreshBalances,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}

export default WalletContext;
