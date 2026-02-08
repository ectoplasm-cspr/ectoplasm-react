/**
 * LST Stats Service - Fetches liquid staking statistics from the deployed contract
 */

import React from 'react';
import { EctoplasmConfig } from '../config/ectoplasm';

export interface LSTStats {
  tvl: string; // Total Value Locked in CSPR
  apy: string; // Annual Percentage Yield
  exchangeRate: string; // sCSPR to CSPR exchange rate
  totalStaked: string; // Total CSPR staked
  totalSupply: string; // Total sCSPR supply
  validators: string; // Number of validators (hardcoded for now)
}

// Contract URefs from deployment (v3 - deployed 2026-02-08)
const UREFS = {
  totalStaked: 'uref-e21cad624117612071ab5a054ef6b69af42851dcecacfafa0854323f096493b7-007',
  totalSupply: 'uref-4f2c654fffee442aafd048540b7e9927980fba5886544f1288032abfb093c84a-007',
  exchangeRate: 'uref-3e7c40dfca278981291cd7d38b21cd4c90ea9a81dfcede005ad642023d184a8c-007',
  apy: 'uref-cbafaa497fc909cd8aef7022c2fc1d7a17e287d012cc4d5f2ddbb12030062a44-007',
};

/**
 * Fetch a URef value from the blockchain
 */
async function fetchURefValue(uref: string): Promise<string> {
  const network = EctoplasmConfig.getNetwork();
  
  try {
    // Get state root hash
    const stateRootResponse = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'chain_get_state_root_hash',
        params: {}
      })
    });
    
    const stateRootData = await stateRootResponse.json();
    const stateRootHash = stateRootData.result?.state_root_hash;

    if (!stateRootHash) {
      throw new Error('Could not get state root hash');
    }

    // Query the URef
    const queryResponse = await fetch(network.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'state_get_item',
        params: {
          state_root_hash: stateRootHash,
          key: uref,
          path: []
        }
      })
    });

    const queryData = await queryResponse.json();
    const clValue = queryData.result?.stored_value?.CLValue;

    if (!clValue) {
      throw new Error(`Could not read URef ${uref}`);
    }

    return clValue.parsed;
  } catch (error) {
    console.error(`Error fetching URef ${uref}:`, error);
    return '0';
  }
}

/**
 * Convert motes to CSPR
 */
function motesToCSPR(motes: string): string {
  try {
    const motesNum = BigInt(motes);
    const cspr = Number(motesNum) / 1_000_000_000;
    return cspr.toLocaleString('en-US', { maximumFractionDigits: 0 });
  } catch {
    return '0';
  }
}

/**
 * Format exchange rate (scaled by 1000)
 */
function formatExchangeRate(scaled: string): string {
  try {
    const rate = Number(scaled) / 1000;
    return rate.toFixed(3);
  } catch {
    return '1.000';
  }
}

/**
 * Format APY (scaled by 100)
 */
function formatAPY(scaled: string): string {
  try {
    const apy = Number(scaled) / 100;
    return apy.toFixed(2);
  } catch {
    return '0.00';
  }
}

/**
 * Fetch LST statistics from the blockchain
 */
export async function fetchLSTStats(): Promise<LSTStats> {
  try {
    // Fetch all values in parallel
    const [totalStakedRaw, totalSupplyRaw, exchangeRateRaw, apyRaw] = await Promise.all([
      fetchURefValue(UREFS.totalStaked),
      fetchURefValue(UREFS.totalSupply),
      fetchURefValue(UREFS.exchangeRate),
      fetchURefValue(UREFS.apy),
    ]);

    // Convert and format values
    const totalStaked = motesToCSPR(totalStakedRaw);
    const totalSupply = motesToCSPR(totalSupplyRaw);
    const exchangeRate = formatExchangeRate(exchangeRateRaw);
    const apy = formatAPY(apyRaw);

    return {
      tvl: totalStaked,
      apy,
      exchangeRate,
      totalStaked,
      totalSupply,
      validators: '12', // Hardcoded for now
    };
  } catch (error) {
    console.error('Error fetching LST stats:', error);
    
    // Return fallback values
    return {
      tvl: '2,450,000',
      apy: '8.50',
      exchangeRate: '1.042',
      totalStaked: '2,450,000',
      totalSupply: '2,350,000',
      validators: '12',
    };
  }
}

/**
 * Hook to use LST stats with auto-refresh
 */
export function useLSTStats(refreshInterval = 30000) {
  const [stats, setStats] = React.useState<LSTStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<Error | null>(null);

  React.useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout;

    const loadStats = async () => {
      try {
        setLoading(true);
        const data = await fetchLSTStats();
        if (mounted) {
          setStats(data);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadStats();
    
    if (refreshInterval > 0) {
      intervalId = setInterval(loadStats, refreshInterval);
    }

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [refreshInterval]);

  return { stats, loading, error };
}
