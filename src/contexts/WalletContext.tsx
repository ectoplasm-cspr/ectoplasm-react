import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
// import { BalanceResult } from '../services/casper';

export interface BalanceResult {
  raw: bigint;
  formatted: string;
  decimals: number;
}
import { STORAGE_KEYS } from '../utils/constants';
import { useDex } from './DexContext';
import { formatTokenAmount } from '../utils/format';
import * as sdk from 'casper-js-sdk';
const { PublicKey } = (sdk as any).default ?? sdk;

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
  activePublicKey: any | null; // PublicKey object from casper-js-sdk
  accountHash: string | null;
  balances: Record<string, BalanceResult>;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  refreshBalances: () => Promise<void>;
  signDeploy: (deploy: any) => Promise<any>;
}

const WalletContext = createContext<WalletContextType | null>(null);

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [activePublicKey, setActivePublicKey] = useState<any | null>(null); // PublicKey object
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

  /* import { useDex } from './DexContext'; added at top via multi-replace or I'll just rewrite the file imports */

  const { dex, config } = useDex();

  // Helper to fetch balances for any public key using DexClient
  const fetchBalancesForAccount = useCallback(async (pk: string) => {
      try {
          // console.log('[WalletProvider] Fetching balances for', pk);
          const newBalances: Record<string, BalanceResult> = {};

          // 1. CSPR Balance
          const csprRaw = await dex.getCSPRBalance(pk);
          newBalances['CSPR'] = {
              raw: csprRaw,
              formatted: formatTokenAmount(csprRaw, 9),
              decimals: 9
          };

          // 2. sCSPR Balance from account storage
          try {
              const scsprBalance = await dex.getAccountNamedKey(pk, 'user_scspr_balance');
              if (scsprBalance) {
                  newBalances['sCSPR'] = {
                      raw: scsprBalance,
                      formatted: formatTokenAmount(scsprBalance, 9),
                      decimals: 9
                  };
              } else {
                  newBalances['sCSPR'] = {
                      raw: 0n,
                      formatted: '0',
                      decimals: 9
                  };
              }
          } catch (e) {
              console.error('[Wallet] Error fetching sCSPR balance from account storage', e);
              newBalances['sCSPR'] = {
                  raw: 0n,
                  formatted: '0',
                  decimals: 9
              };
          }

          // 3. Other Token Balances
          let accountHashStr = '';
          try {
              if (pk.length === 64 || pk.startsWith('01') || pk.startsWith('02')) {
                  // Basic heuristic if PublicKey class issues prevent import
                   const { PublicKey } = (sdk as any).default ?? sdk;
                   const k = PublicKey.fromHex(pk);
                   accountHashStr = 'account-hash-' + k.accountHash().toHex();
              }
          } catch (e) { console.error('Error deriving account hash', e); }

          if (accountHashStr) {
              for (const [symbol, tokenInfo] of Object.entries(config.tokens)) {
                  if (symbol === 'sCSPR') continue; // Skip sCSPR, we already fetched it
                  try {
                      const raw = await dex.getTokenBalance(tokenInfo.contractHash, accountHashStr);
                      const formatted = formatTokenAmount(raw, tokenInfo.decimals);
                      
                      newBalances[symbol] = {
                          raw: raw,
                          formatted: formatted,
                          decimals: tokenInfo.decimals
                      };
                  } catch (e) {
                      console.error(`[Wallet] Error fetching ${symbol}`, e);
                  }
              }
          }
          return newBalances;
      } catch (err) {
          console.error('Failed to fetch balances:', err);
          return {};
      }
  }, [dex, config]);

  const refreshBalances = useCallback(async () => {
    if (!publicKey) return;
    const bals = await fetchBalancesForAccount(publicKey);
    setBalances(bals);
  }, [publicKey, fetchBalancesForAccount]);

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
            // Create PublicKey object for signing
            try {
              const pkObj = PublicKey.fromHex(pk);
              setActivePublicKey(pkObj);
            } catch (e) {
              console.error('Failed to create PublicKey object:', e);
            }
            setConnected(true);
            localStorage.setItem(STORAGE_KEYS.WALLET_TYPE, 'csprclick');

            // Fetch balances after connection
            const allBalances = await fetchBalancesForAccount(pk);
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
        const walletConnected = await casperWallet.requestConnection();
        if (walletConnected) {
          const activeKey = await casperWallet.getActivePublicKey();
          if (activeKey) {
            const pk = normalizePublicKeyHex(activeKey);
            setPublicKey(pk);
            // Create PublicKey object for signing
            try {
              const pkObj = PublicKey.fromHex(pk);
              setActivePublicKey(pkObj);
            } catch (e) {
              console.error('Failed to create PublicKey object:', e);
            }
            setConnected(true);
            localStorage.setItem(STORAGE_KEYS.WALLET_TYPE, 'casperwallet');

            // Fetch balances after connection
            const allBalances = await fetchBalancesForAccount(pk);
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
  }, [getClickUI, getCasperWallet, fetchBalancesForAccount]);

  const disconnect = useCallback(() => {
    setConnected(false);
    setPublicKey(null);
    setActivePublicKey(null);
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
                try {
                  const pkObj = PublicKey.fromHex(pk);
                  setActivePublicKey(pkObj);
                } catch (e) {
                  console.error('Failed to create PublicKey object:', e);
                }
                setConnected(true);
                const allBalances = await fetchBalancesForAccount(pk);
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
                  try {
                    const pkObj = PublicKey.fromHex(pk);
                    setActivePublicKey(pkObj);
                  } catch (e) {
                    console.error('Failed to create PublicKey object:', e);
                  }
                  setConnected(true);
                  const allBalances = await fetchBalancesForAccount(pk);
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
  }, [getClickUI, getCasperWallet, fetchBalancesForAccount]);

  // Refresh balances periodically when connected
  useEffect(() => {
    if (!connected || !publicKey) return;

    const interval = setInterval(refreshBalances, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [connected, publicKey, refreshBalances]);

  // Sign a deploy using the connected wallet
  const signDeploy = useCallback(async (deploy: any): Promise<any> => {
    if (!connected || !publicKey) {
      throw new Error('Wallet not connected');
    }

    // Import Deploy for proper serialization
    const { Deploy } = (sdk as any).default ?? sdk;

    // Convert deploy to JSON using SDK's toJSON method
    const deployJson = Deploy.toJSON(deploy);
    const deployJsonStr = JSON.stringify(deployJson);

    console.log('[signDeploy] Deploy JSON:', deployJson);

    const savedWalletType = localStorage.getItem(STORAGE_KEYS.WALLET_TYPE);

    // Try CSPR.click
    if (savedWalletType === 'csprclick') {
      const clickUI = getClickUI();
      if (clickUI?.sign) {
        try {
          const result = await clickUI.sign(deployJsonStr, publicKey);
          console.log('[signDeploy] CSPR.click result:', result);
          // CSPR.click may return the full signed deploy or just a signature
          if (result?.deploy) {
            return result.deploy;
          }
          return result;
        } catch (err) {
          console.error('CSPR.click sign failed:', err);
          throw err;
        }
      }
    }

    // Try CasperWallet
    if (savedWalletType === 'casperwallet') {
      const casperWallet = getCasperWallet();
      if (casperWallet?.sign) {
        try {
          const result = await casperWallet.sign(deployJsonStr, publicKey);
          console.log('[signDeploy] CasperWallet result:', result);

          // CasperWallet returns signature info, not the full deploy
          // We need to add the signature to the original deploy JSON
          const signatureResult = typeof result === 'string' ? JSON.parse(result) : result;

          if (signatureResult.cancelled) {
            throw new Error('User cancelled signing');
          }

          // Add the signature to the deploy
          const signatureHex = signatureResult.signatureHex || signatureResult.signature;
          if (!signatureHex) {
            throw new Error('No signature returned from wallet');
          }

          // Add approval (signature) to the deploy JSON
          // Format: "01" prefix for Ed25519 + public key + signature
          const approval = {
            signer: publicKey.startsWith('01') || publicKey.startsWith('02')
              ? publicKey
              : '01' + publicKey,
            signature: '01' + signatureHex // 01 prefix for Ed25519
          };

          // Clone the deploy JSON and add the approval
          const signedDeployJson = {
            ...deployJson,
            approvals: [approval]
          };

          console.log('[signDeploy] Signed deploy JSON:', signedDeployJson);
          return signedDeployJson;
        } catch (err) {
          console.error('CasperWallet sign failed:', err);
          throw err;
        }
      }
    }

    throw new Error('No wallet available to sign');
  }, [connected, publicKey, getClickUI, getCasperWallet]);

  const value: WalletContextType = {
    connected,
    connecting,
    publicKey,
    activePublicKey,
    accountHash,
    balances,
    error,
    connect,
    disconnect,
    refreshBalances,
    signDeploy,
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
