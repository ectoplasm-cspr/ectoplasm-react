// @ts-nocheck
/**
 * LST Service - Liquid Staking Token contract interactions
 * Migrated to casper-js-sdk v5 (createStakeDeploy and signAndSendDeploy)
 * Other functions still need migration
 */

import {
  Args,
  CLValue,
  Deploy,
  DeployHeader,
  ExecutableDeployItem,
  Key,
  PublicKey,
  StoredContractByHash,
  ContractHash,
  AccountHash,
} from 'casper-js-sdk';
import { EctoplasmConfig } from '../config/ectoplasm';
import { CasperService } from './casper';

export interface StakeParams {
  publicKey: string;
  amount: string; // Amount in CSPR (will be converted to motes)
  validatorAddress: string;
}

export interface UnstakeParams {
  publicKey: string;
  amount: string; // Amount in sCSPR
}

export interface WithdrawParams {
  publicKey: string;
  requestId: number;
}

/**
 * Create a deploy to stake CSPR using session code
 */
export async function createStakeDeploy(params: StakeParams): Promise<Deploy> {
  const { publicKey, amount } = params;
  
  // Convert CSPR to motes (1 CSPR = 1,000,000,000 motes)
  const amountFloat = parseFloat(amount);
  const amountInMotes = BigInt(Math.floor(amountFloat * 1_000_000_000));
  
  // Parse public key
  const pk = PublicKey.fromHex(publicKey);
  
  // Build runtime arguments - action and amount
  const args = Args.fromMap({
    action: CLValue.newCLString('stake'),
    amount: CLValue.newCLUInt512(amountInMotes.toString()),
  });

  // Load the staking session WASM
  const wasmUrl = '/staking-session.wasm';
  const wasmResponse = await fetch(wasmUrl);
  if (!wasmResponse.ok) {
    throw new Error('Failed to load staking WASM. Make sure staking-session.wasm is in your public folder.');
  }
  const wasmBytes = new Uint8Array(await wasmResponse.arrayBuffer());
  
  // Create session from WASM using the correct SDK method
  const session = ExecutableDeployItem.newModuleBytes(wasmBytes, args);
  
  // Standard gas payment
  const payment = ExecutableDeployItem.standardPayment('3000000000'); // 3 CSPR
  
  const header = DeployHeader.default();
  header.account = pk;
  header.chainName = 'casper-test';
  header.gasPrice = 1;
  
  return Deploy.makeDeploy(header, payment, session);
}

/**
 * Create a deploy to unstake sCSPR and burn tokens
 */
export async function createUnstakeDeploy(params: UnstakeParams): Promise<Deploy> {
  const { publicKey, amount } = params;
  
  // Convert sCSPR to motes (1 sCSPR = 1,000,000,000 motes)
  const amountFloat = parseFloat(amount);
  const amountInMotes = BigInt(Math.floor(amountFloat * 1_000_000_000));
  
  // Parse public key
  const pk = PublicKey.fromHex(publicKey);
  
  // Build runtime arguments - action and amount
  const args = Args.fromMap({
    action: CLValue.newCLString('unstake'),
    amount: CLValue.newCLUInt512(amountInMotes.toString()),
  });

  // Load the staking session WASM (same WASM handles both stake and unstake)
  const wasmUrl = '/staking-session.wasm';
  const wasmResponse = await fetch(wasmUrl);
  if (!wasmResponse.ok) {
    throw new Error('Failed to load staking WASM. Make sure staking-session.wasm is in your public folder.');
  }
  const wasmBytes = new Uint8Array(await wasmResponse.arrayBuffer());
  
  // Create session from WASM using the correct SDK method
  const session = ExecutableDeployItem.newModuleBytes(wasmBytes, args);
  
  // Standard gas payment
  const payment = ExecutableDeployItem.standardPayment('3000000000'); // 3 CSPR
  
  const header = DeployHeader.default();
  header.account = pk;
  header.chainName = 'casper-test';
  header.gasPrice = 1;
  
  return Deploy.makeDeploy(header, payment, session);
}

/**
 * Create a deploy to withdraw unstaked CSPR
 */
export async function createWithdrawDeploy(params: WithdrawParams): Promise<DeployUtil.Deploy> {
  const { publicKey, requestId } = params;
  
  // Get staking manager contract hash
  const stakingManagerHash = EctoplasmConfig.contracts.stakingManager;
  if (!stakingManagerHash) {
    throw new Error('Staking Manager contract not configured');
  }

  // Build runtime arguments
  const args = RuntimeArgs.fromMap({
    request_id: CLValueBuilder.u64(requestId),
  });

  // Create deploy
  const deployParams = new DeployUtil.DeployParams(
    CLPublicKey.fromHex(publicKey),
    'casper-test',
    1,
    1800000
  );

  const payment = DeployUtil.standardPayment(2_000_000_000); // 2 CSPR payment

  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
    hexToBytes(stakingManagerHash.replace('hash-', '')),
    'withdraw_unstaked',
    args
  );

  return DeployUtil.makeDeploy(deployParams, session, payment);
}

/**
 * Helper function to convert hex string to Uint8Array
 */
function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

/**
 * Sign and send a deploy using the connected wallet
 */
export async function signAndSendDeploy(deploy: Deploy, publicKey: string): Promise<string> {
  const w = window as any;
  
  // Try CasperWallet first
  const casperWallet = w.CasperWalletProvider?.();
  if (casperWallet) {
    const deployJSON = Deploy.toJSON(deploy);
    console.log('Requesting signature from wallet...');
    
    try {
      // Get signature from wallet
      const signatureResponse = await casperWallet.sign(JSON.stringify(deployJSON), publicKey);
      console.log('Signature response:', signatureResponse);
      
      // The wallet returns {cancelled, signatureHex, signature}
      if (signatureResponse.cancelled) {
        throw new Error('User cancelled signing');
      }
      
      // Add the signature to the deploy using CasperService helper
      const signedDeploy = CasperService.deployFromWalletResponse(deploy, signatureResponse, publicKey);
      
      console.log('Deploy signed, submitting to network...');
      
      // Submit the signed deploy
      const deployHash = await CasperService.submitDeploy(signedDeploy);
      return deployHash;
    } catch (error: any) {
      console.error('Signing/sending failed:', error);
      throw error;
    }
  }
  
  // Try CSPR.click
  const csprClick = w.csprclick || w.CsprClickUI;
  if (csprClick) {
    const deployJSON = Deploy.toJSON(deploy);
    const result = await csprClick.send(JSON.stringify(deployJSON));
    return result.deployHash || result.deploy_hash;
  }
  
  throw new Error('No wallet provider found');
}
