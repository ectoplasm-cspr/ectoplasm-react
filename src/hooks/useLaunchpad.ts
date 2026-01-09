import { useState, useCallback, useMemo, useEffect } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useDex } from '../contexts/DexContext';
import { EctoplasmConfig } from '../config/ectoplasm';
import type { LaunchParams, LaunchInfo, CurveType } from '../dex-client';

// Token creation form state
export interface TokenFormData {
  projectName: string;
  symbol: string;
  bondingCurve: CurveType;
  promoBudget: number;
  description?: string;
  website?: string;
  twitter?: string;
  // Advanced options (optional overrides)
  graduationThreshold?: number; // In CSPR
  creatorFeeBps?: number;       // Basis points (100 = 1%)
  deadlineDays?: number;
}

// Token for the library (extended LaunchInfo with UI-specific fields)
export interface LaunchpadToken {
  id: string;
  name: string;
  symbol: string;
  change24h: number;
  liquidity: number;
  status: 'live' | 'launching' | 'ended';
  createdAt: Date;
  creator: string;
  bondingCurve: string;
  marketCap?: number;
  // Contract data (when available)
  tokenHash?: string;
  curveHash?: string;
  progress?: number;
}

interface UseLaunchpadResult {
  // Contract status
  isContractsDeployed: boolean;

  // Token creation
  formData: TokenFormData;
  setFormData: (data: Partial<TokenFormData>) => void;
  resetForm: () => void;
  createToken: () => Promise<string | null>;
  isCreating: boolean;
  createError: string | null;

  // Token library
  tokens: LaunchpadToken[];
  filteredTokens: LaunchpadToken[];
  isLoadingTokens: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'growth' | 'liquidity' | 'recent';
  setSortBy: (sort: 'growth' | 'liquidity' | 'recent') => void;
  statusFilter: 'all' | 'live' | 'launching' | 'ended';
  setStatusFilter: (status: 'all' | 'live' | 'launching' | 'ended') => void;

  // Refresh
  refreshTokens: () => Promise<void>;
}

const initialFormData: TokenFormData = {
  projectName: '',
  symbol: '',
  bondingCurve: 'sigmoid',
  promoBudget: 1200,
  description: '',
  website: '',
  twitter: '',
};

export function useLaunchpad(): UseLaunchpadResult {
  const { connected, publicKey, signDeploy } = useWallet();
  const { dex: dexClient } = useDex();

  // Check if contracts are deployed
  const isContractsDeployed = EctoplasmConfig.launchpad.isDeployed;

  // Debug logging
  console.log('[useLaunchpad] Config:', {
    isContractsDeployed,
    controller: EctoplasmConfig.launchpad.controller,
    tokenFactory: EctoplasmConfig.launchpad.tokenFactory,
  });

  // Token creation state
  const [formData, setFormDataState] = useState<TokenFormData>(initialFormData);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Token library state
  const [tokens, setTokens] = useState<LaunchpadToken[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'growth' | 'liquidity' | 'recent'>('recent');
  const [statusFilter, setStatusFilter] = useState<'all' | 'live' | 'launching' | 'ended'>('all');

  const setFormData = useCallback((data: Partial<TokenFormData>) => {
    setFormDataState(prev => ({ ...prev, ...data }));
  }, []);

  const resetForm = useCallback(() => {
    setFormDataState(initialFormData);
    setCreateError(null);
  }, []);

  // Fetch real tokens from contracts
  const refreshTokens = useCallback(async () => {
    if (!isContractsDeployed || !dexClient) {
      // Contracts not deployed - show empty state
      setTokens([]);
      setIsLoadingTokens(false);
      return;
    }

    setIsLoadingTokens(true);
    try {
      const launches = await dexClient.getLaunches(0, 100);

      // Convert LaunchInfo to LaunchpadToken
      const launchpadTokens: LaunchpadToken[] = launches.map((launch) => ({
        id: launch.id.toString(),
        name: launch.name,
        symbol: launch.symbol,
        change24h: 0, // Would need price history
        liquidity: 0, // Would need to fetch from curve
        status: launch.status === 'active' ? 'live'
              : launch.status === 'graduated' ? 'ended'
              : 'launching',
        createdAt: new Date(launch.createdAt),
        creator: launch.creator,
        bondingCurve: launch.curveType.charAt(0).toUpperCase() + launch.curveType.slice(1),
        tokenHash: launch.tokenHash,
        curveHash: launch.curveHash,
        progress: 0, // Would need to calculate from curve state
        marketCap: 0, // Would need price data
      }));

      console.log('[refreshTokens] Fetched launches:', launchpadTokens.length);
      setTokens(launchpadTokens);
    } catch (err) {
      console.error('Failed to fetch launches:', err);
      setTokens([]);
    } finally {
      setIsLoadingTokens(false);
    }
  }, [isContractsDeployed, dexClient]);

  // Load tokens on mount
  useEffect(() => {
    refreshTokens();
  }, [refreshTokens]);

  const createToken = useCallback(async (): Promise<string | null> => {
    if (!connected || !publicKey) {
      setCreateError('Please connect your wallet');
      return null;
    }

    if (!formData.projectName.trim()) {
      setCreateError('Project name is required');
      return null;
    }

    if (!formData.symbol.trim() || formData.symbol.length > 6) {
      setCreateError('Symbol must be 1-6 characters');
      return null;
    }

    setIsCreating(true);
    setCreateError(null);

    try {
      // Check if contracts are deployed
      if (!isContractsDeployed || !dexClient) {
        // Demo mode - simulate token creation
        console.log('Demo mode: Token creation (contracts not deployed):', {
          ...formData,
          creator: publicKey,
        });

        await new Promise(resolve => setTimeout(resolve, 2000));
        const demoHash = `demo-${Date.now().toString(16)}`;
        resetForm();
        return demoHash;
      }

      // Real contract call
      const params: LaunchParams = {
        name: formData.projectName,
        symbol: formData.symbol.toUpperCase(),
        curveType: formData.bondingCurve,
        promoBudget: BigInt(formData.promoBudget) * BigInt(1_000_000_000), // Convert CSPR to motes
        description: formData.description,
        website: formData.website,
        twitter: formData.twitter,
      };

      // Add optional overrides if provided
      if (formData.graduationThreshold !== undefined) {
        params.graduationThreshold = BigInt(formData.graduationThreshold) * BigInt(1_000_000_000);
      }
      if (formData.creatorFeeBps !== undefined) {
        params.creatorFeeBps = formData.creatorFeeBps;
      }
      if (formData.deadlineDays !== undefined) {
        params.deadlineDays = formData.deadlineDays;
      }

      // Build and sign the deploy
      const deploy = dexClient.makeCreateLaunchDeploy(params, publicKey);
      const signedDeploy = await signDeploy(deploy);

      if (!signedDeploy) {
        throw new Error('Failed to sign deploy');
      }

      // Send the deploy
      const deployHash = await dexClient.sendDeploy(signedDeploy);
      console.log('Launch creation deploy sent:', deployHash);

      // Wait for deployment (optional - could also return immediately)
      await dexClient.waitForDeploy(deployHash);

      resetForm();

      // Wait a moment for blockchain state to propagate
      // This ensures the new token appears when parent refreshes the list
      await new Promise(resolve => setTimeout(resolve, 3000));

      return deployHash;
    } catch (err: any) {
      console.error('Token creation failed:', err);
      setCreateError(err.message || 'Failed to create token');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [connected, publicKey, formData, resetForm, isContractsDeployed, dexClient, signDeploy]);

  // Filter and sort tokens
  const filteredTokens = useMemo(() => {
    let result = [...tokens];

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        token =>
          token.name.toLowerCase().includes(query) ||
          token.symbol.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter(token => token.status === statusFilter);
    }

    // Apply sorting
    switch (sortBy) {
      case 'growth':
        result.sort((a, b) => b.change24h - a.change24h);
        break;
      case 'liquidity':
        result.sort((a, b) => b.liquidity - a.liquidity);
        break;
      case 'recent':
        result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
        break;
    }

    return result;
  }, [tokens, searchQuery, sortBy, statusFilter]);

  return {
    isContractsDeployed,
    formData,
    setFormData,
    resetForm,
    createToken,
    isCreating,
    createError,
    tokens,
    filteredTokens,
    isLoadingTokens,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
    refreshTokens,
  };
}

export default useLaunchpad;
