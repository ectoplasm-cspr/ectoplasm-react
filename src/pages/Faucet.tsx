import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useDex } from '../contexts/DexContext';
import { EctoplasmConfig } from '../config/ectoplasm';
import { useToast } from '../contexts/ToastContext';
import * as sdk from 'casper-js-sdk';

const { Deploy, PublicKey } = (sdk as any).default ?? sdk;

export function Faucet() {
  const { connected, connect, publicKey, balances, refreshBalances } = useWallet();
  const { dex, config } = useDex();
  const { showToast, removeToast } = useToast();
  
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [lastRequest, setLastRequest] = useState<number | null>(null);

  // Add faucet-page class to body
  useEffect(() => {
    document.body.classList.add('faucet-page');
    return () => {
      document.body.classList.remove('faucet-page');
    };
  }, []);

  // Check cooldown from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('faucet_last_request');
    if (stored) {
      setLastRequest(parseInt(stored, 10));
    }
  }, []);

  const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour cooldown
  const canRequest = !lastRequest || (Date.now() - lastRequest) > COOLDOWN_MS;
  const cooldownRemaining = lastRequest ? Math.max(0, COOLDOWN_MS - (Date.now() - lastRequest)) : 0;

  const formatCooldown = (ms: number) => {
    const minutes = Math.ceil(ms / 60000);
    return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  const requestTokens = async () => {
    if (!connected || !publicKey) {
      await connect();
      return;
    }

    if (!canRequest) {
      setMessage({ type: 'info', text: `Please wait ${formatCooldown(cooldownRemaining)} before requesting again.` });
      return;
    }

    setRequesting(true);
    setMessage(null);
    let pendingId: string | null = null;

    try {
      const ectoConfig = config.tokens.ECTO;

      if (!ectoConfig.packageHash) {
        throw new Error('ECTO token contract not configured');
      }

      // Get CasperWallet to sign the deploy
      const casperWallet = (window as any).CasperWalletProvider?.();
      if (!casperWallet) {
        throw new Error('CasperWallet not found. Please install the Casper Wallet extension.');
      }

      const senderKey = PublicKey.fromHex(publicKey);

      // Mint 100 ECTO tokens (with 9 decimals actually? No, ECTO is 9 in config usually, let's check config)
      // EctoplasmConfig usually sets defaults, but we should rely on config.decimals
      const amountRaw = BigInt(100) * BigInt(10 ** ectoConfig.decimals);

      const mintDeploy = dex.makeMintTokenDeploy(
          ectoConfig.packageHash,
          senderKey.accountHash().toPrefixedString(), // to
          amountRaw,
          publicKey // Pass hex string, not PublicKey object
      );

      const deployJson = Deploy.toJSON(mintDeploy);

      pendingId = Date.now().toString();
      showToast('pending', 'Sign Mint Request...');
      
      const signedResult = await casperWallet.sign(JSON.stringify(deployJson), publicKey);

      if (signedResult.cancelled) {
        throw new Error('Transaction cancelled by user');
      }

      // Helper to extract signature as hex (borrowed from useSwap)
      const getSignatureHex = (providerRes: any) => {
        if (typeof providerRes === 'string') return providerRes;
        if (providerRes.signature) {
          const sig = providerRes.signature;
          if (typeof sig === 'string') return sig;
          if (typeof sig === 'object') {
            return Object.values(sig).map((b: any) => Number(b).toString(16).padStart(2, '0')).join('');
          }
        }
        return '';
      };

      let signature = getSignatureHex(signedResult);

      // Prepend algorithm tag if missing (Ed25519='01', Secp256k1='02')
      if (signature.length === 128 && publicKey) {
        const algoTag = publicKey.substring(0, 2);
        signature = algoTag + signature;
      }

      // Attach signature
      if (deployJson.approvals) {
           deployJson.approvals.push({ signer: publicKey, signature: signature });
      } else {
           deployJson.approvals = [{ signer: publicKey, signature: signature }];
      }

      if (pendingId) removeToast(pendingId);
      
      showToast('pending', 'Broadcasting Mint...');
      const deployHash = await dex.sendDeployRaw(deployJson);

      // Update cooldown
      const now = Date.now();
      setLastRequest(now);
      localStorage.setItem('faucet_last_request', now.toString());

      setMessage({
        type: 'success',
        text: `Requested 100 ECTO tokens! Deploy hash: ${deployHash?.slice(0, 16)}...`
      });
      showToast('success', 'Mint Submitted!', deployHash);

      // Refresh balances after a delay
      setTimeout(() => {
        refreshBalances();
      }, 10000);

    } catch (error: any) {
      console.error('Faucet error:', error);
      if (pendingId) removeToast(pendingId);
      showToast('error', error.message);

      if (error.message?.includes('mint') || error.message?.includes('entry point')) {
        setMessage({
          type: 'error',
          text: 'The ECTO token contract does not have a public mint function. Contact the team for testnet tokens.'
        });
      } else {
        setMessage({
          type: 'error',
          text: error.message || 'Failed to request tokens'
        });
      }
    } finally {
      setRequesting(false);
    }
  };

  return (
    <main>
      <section className="hero faucet-hero">
        <div className="container">
          <div className="faucet-card hero-card">
            <h1>Testnet Faucet</h1>
            <p className="muted">Get free ECTO tokens for testing on {EctoplasmConfig.getNetwork().name}</p>

            <div className="faucet-balances">
              <div className="balance-item">
                <span className="token-name">CSPR</span>
                <span className="token-balance">{balances.CSPR?.formatted || '0'}</span>
              </div>
              <div className="balance-item">
                <span className="token-name">ECTO</span>
                <span className="token-balance">{balances.ECTO?.formatted || '0'}</span>
              </div>
            </div>

            {message && (
              <div className={`faucet-message ${message.type}`}>
                {message.text}
              </div>
            )}

            <div className="faucet-actions">
              {!connected ? (
                <button className="btn primary" onClick={() => connect()}>
                  Connect Wallet
                </button>
              ) : (
                <button
                  className="btn primary"
                  onClick={requestTokens}
                  disabled={requesting || !canRequest}
                >
                  {requesting ? 'Requesting...' : canRequest ? 'Request 100 ECTO' : `Wait ${formatCooldown(cooldownRemaining)}`}
                </button>
              )}
            </div>

            <div className="faucet-info">
              <h3>How it works</h3>
              <ul>
                <li>Connect your Casper Wallet</li>
                <li>Click "Request 100 ECTO" to receive testnet tokens</li>
                <li>Wait for the transaction to confirm (~1-2 minutes)</li>
                <li>You can request tokens once per hour</li>
              </ul>

              <h3>Need CSPR?</h3>
              <p>
                Get testnet CSPR from the official{' '}
                <a href="https://testnet.cspr.live/tools/faucet" target="_blank" rel="noopener noreferrer">
                  Casper Testnet Faucet
                </a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default Faucet;
