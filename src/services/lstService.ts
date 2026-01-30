// @ts-nocheck
/**
 * LST Service - Liquid Staking Token contract interactions
 *
 * NOTE: This file uses casper-js-sdk v4 APIs. It needs to be migrated to v5.
 * The @ts-nocheck directive is a temporary workaround.
 */

import * as sdk from 'casper-js-sdk';
const CasperSDK = (sdk as any).default ?? sdk;
const { CLPublicKey, CLValueBuilder, RuntimeArgs, DeployUtil } = CasperSDK;
import { EctoplasmConfig } from '../config/ectoplasm';
import { CasperService } from './casper';

export interface StakeParams {
  publicKey: string;
  amount: string; // Amount in CSPR (will be converted to motes)
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
 * Create a deploy to stake CSPR and receive sCSPR
 */
export async function createStakeDeploy(params: StakeParams): Promise<DeployUtil.Deploy> {
  const { publicKey, amount } = params;
  
  // Get staking manager contract hash
  const stakingManagerHash = EctoplasmConfig.contracts.stakingManager;
  if (!stakingManagerHash) {
    throw new Error('Staking Manager contract not configured');
  }

  // Convert CSPR to motes (1 CSPR = 1,000,000,000 motes)
  const amountFloat = parseFloat(amount);
  const amountInMotes = Math.floor(amountFloat * 1_000_000_000);
  
  // Build runtime arguments
  const args = RuntimeArgs.fromMap({
    cspr_amount: CLValueBuilder.u256(amountInMotes.toString()),
  });

  // Create deploy
  const deployParams = new DeployUtil.DeployParams(
    CLPublicKey.fromHex(publicKey),
    'casper-test',
    1, // gas price tolerance
    1800000 // ttl (30 minutes)
  );

  const payment = DeployUtil.standardPayment(5_000_000_000); // 5 CSPR payment

  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
    hexToBytes(stakingManagerHash.replace('hash-', '')),
    'stake',
    args
  );

  return DeployUtil.makeDeploy(deployParams, session, payment);
}

/**
 * Create a deploy to unstake sCSPR and receive CSPR
 */
export async function createUnstakeDeploy(params: UnstakeParams): Promise<DeployUtil.Deploy> {
  const { publicKey, amount } = params;
  
  // Get staking manager contract hash
  const stakingManagerHash = EctoplasmConfig.contracts.stakingManager;
  if (!stakingManagerHash) {
    throw new Error('Staking Manager contract not configured');
  }

  // Convert sCSPR amount (9 decimals)
  const amountFloat = parseFloat(amount);
  const amountInSmallestUnit = Math.floor(amountFloat * 1e9);
  
  // Build runtime arguments
  const args = RuntimeArgs.fromMap({
    scspr_amount: CLValueBuilder.u256(amountInSmallestUnit.toString()),
  });

  // Create deploy
  const deployParams = new DeployUtil.DeployParams(
    CLPublicKey.fromHex(publicKey),
    'casper-test',
    1,
    1800000
  );

  const payment = DeployUtil.standardPayment(3_000_000_000); // 3 CSPR payment

  const session = DeployUtil.ExecutableDeployItem.newStoredContractByHash(
    hexToBytes(stakingManagerHash.replace('hash-', '')),
    'unstake',
    args
  );

  return DeployUtil.makeDeploy(deployParams, session, payment);
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
export async function signAndSendDeploy(deploy: DeployUtil.Deploy, publicKey: string): Promise<string> {
  const w = window as any;
  
  // Try CasperWallet first
  const casperWallet = w.CasperWalletProvider?.();
  if (casperWallet) {
    const deployJSON = DeployUtil.deployToJson(deploy);
    console.log('Requesting signature from wallet...');
    
    try {
      // Get signature from wallet
      const signatureResponse = await casperWallet.sign(JSON.stringify(deployJSON), publicKey);
      console.log('Signature response:', signatureResponse);
      
      // The wallet returns {cancelled, signatureHex, signature}
      if (signatureResponse.cancelled) {
        throw new Error('User cancelled signing');
      }
      
      // Add the signature to the deploy
      const signedDeploy = DeployUtil.setSignature(
        deploy,
        signatureResponse.signature,
        CLPublicKey.fromHex(publicKey)
      );
      
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
    const deployJSON = DeployUtil.deployToJson(deploy);
    const result = await csprClick.send(JSON.stringify(deployJSON));
    return result.deployHash || result.deploy_hash;
  }
  
  throw new Error('No wallet provider found');
}
