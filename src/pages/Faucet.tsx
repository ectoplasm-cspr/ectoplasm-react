import { useState, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { EctoplasmConfig } from '../config/ectoplasm';

export function Faucet() {
  const { connected, connect, publicKey, balances, refreshBalances } = useWallet();
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

    try {
      // For testnet, we'll try to call the mint function on the ECTO token
      // This requires the token contract to have a public mint function
      const ectoConfig = EctoplasmConfig.tokens.ECTO;

      if (!ectoConfig.hash) {
        throw new Error('ECTO token contract not configured');
      }

      // Get CasperWallet to sign the deploy
      const casperWallet = (window as any).CasperWalletProvider?.();
      if (!casperWallet) {
        throw new Error('CasperWallet not found. Please install the Casper Wallet extension.');
      }

      // Build mint deploy
      const w = window as any;
      const sdk = w.Casper || w.CasperSDK || w.casper_js_sdk || w;
      const CLPublicKey = sdk.CLPublicKey || w.CLPublicKey;
      const CLValueBuilder = sdk.CLValueBuilder || w.CLValueBuilder;
      const RuntimeArgs = sdk.RuntimeArgs || w.RuntimeArgs;
      const DeployUtil = sdk.DeployUtil || w.DeployUtil;

      if (!CLPublicKey || !DeployUtil) {
        throw new Error('Casper SDK not loaded. Please refresh the page.');
      }

      const senderKey = CLPublicKey.fromHex(publicKey);
      const network = EctoplasmConfig.getNetwork();

      // Mint 100 ECTO tokens (with 18 decimals)
      const mintAmount = '100000000000000000000'; // 100 * 10^18

      const args = RuntimeArgs.fromMap({
        owner: CLValueBuilder.key(CLValueBuilder.byteArray(senderKey.toAccountHash())),
        amount: CLValueBuilder.u256(mintAmount)
      });

      const contractHashBytes = Uint8Array.from(
        ectoConfig.hash.replace('hash-', '').match(/.{2}/g)!.map(byte => parseInt(byte, 16))
      );

      const deploy = DeployUtil.makeDeploy(
        new DeployUtil.DeployParams(
          senderKey,
          network.chainName,
          1,
          3600000
        ),
        DeployUtil.ExecutableDeployItem.newStoredContractByHash(
          contractHashBytes,
          'mint',
          args
        ),
        DeployUtil.standardPayment('3000000000') // 3 CSPR gas
      );

      // Sign with wallet
      const deployJson = DeployUtil.deployToJson(deploy);
      const signedDeployJson = await casperWallet.sign(
        JSON.stringify(deployJson),
        publicKey
      );

      if (signedDeployJson.cancelled) {
        throw new Error('Transaction cancelled by user');
      }

      const signedDeploy = DeployUtil.deployFromJson(JSON.parse(signedDeployJson.signature)).val;

      // Submit deploy
      const rpcUrl = network.rpcUrl;
      const response = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'account_put_deploy',
          params: {
            deploy: DeployUtil.deployToJson(signedDeploy).deploy
          }
        })
      });

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message || 'Failed to submit transaction');
      }

      const deployHash = result.result?.deploy_hash;

      // Update cooldown
      const now = Date.now();
      setLastRequest(now);
      localStorage.setItem('faucet_last_request', now.toString());

      setMessage({
        type: 'success',
        text: `Requested 100 ECTO tokens! Deploy hash: ${deployHash?.slice(0, 16)}...`
      });

      // Refresh balances after a delay
      setTimeout(() => {
        refreshBalances();
      }, 10000);

    } catch (error: any) {
      console.error('Faucet error:', error);

      // Check if it's a contract error (mint function might not be public)
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
