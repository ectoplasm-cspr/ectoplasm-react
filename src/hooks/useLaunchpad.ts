import { useState, useCallback, useMemo } from 'react';
import { useWallet } from '../contexts/WalletContext';

// Token creation form state
export interface TokenFormData {
  projectName: string;
  symbol: string;
  bondingCurve: 'linear' | 'sigmoid' | 'steep';
  promoBudget: number;
  description?: string;
  website?: string;
  twitter?: string;
}

// Mock token for the library
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
}

// Generate mock tokens for demo
function generateMockTokens(count: number): LaunchpadToken[] {
  const names = [
    'Ghost Cats', 'Moon Pepe', 'Casper Doge', 'Spectral Inu', 'Phantom Shiba',
    'Ecto Frog', 'Spirit Bear', 'Vapor Wave', 'Mist Token', 'Shadow Punk',
    'Cyber Ghost', 'Neon Spectre', 'Plasma Coin', 'Astral Meme', 'Cosmic Ape',
    'Stellar Doge', 'Nebula Cat', 'Galaxy Pepe', 'Quantum Shib', 'Atomic Frog',
    'Solar Flare', 'Luna Ghost', 'Mars Meme', 'Venus Inu', 'Jupiter Punk',
    'Saturn Ring', 'Neptune Wave', 'Pluto Doge', 'Comet Coin', 'Meteor Meme',
    'Aurora Ape', 'Borealis Bear', 'Frost Token', 'Ice Shiba', 'Snow Pepe',
    'Crystal Cat', 'Diamond Doge', 'Ruby Frog', 'Emerald Inu', 'Sapphire Punk',
    'Golden Ghost', 'Silver Spectre', 'Bronze Bear', 'Platinum Pepe', 'Titanium Token',
    'Carbon Coin', 'Neon Ninja', 'Cyber Samurai', 'Digital Dragon', 'Virtual Viking'
  ];

  const statuses: Array<'live' | 'launching' | 'ended'> = ['live', 'launching', 'ended'];
  const curves = ['Linear', 'Sigmoid', 'Steep'];

  return Array.from({ length: count }, (_, i) => {
    const name = names[i % names.length];
    const words = name.split(' ');
    const symbol = words.length > 1
      ? words.map(w => w[0]).join('').toUpperCase()
      : name.slice(0, 4).toUpperCase();

    return {
      id: `token-${i + 1}`,
      name,
      symbol: symbol + (i >= names.length ? Math.floor(i / names.length) : ''),
      change24h: (Math.random() - 0.3) * 100, // -30% to +70%
      liquidity: Math.floor(Math.random() * 500000) + 10000,
      status: statuses[Math.floor(Math.random() * 3)],
      createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      creator: `0x${Math.random().toString(16).slice(2, 10)}...`,
      bondingCurve: curves[Math.floor(Math.random() * 3)],
      marketCap: Math.floor(Math.random() * 1000000) + 50000,
    };
  });
}

// Pre-generate mock tokens
const MOCK_TOKENS = generateMockTokens(50);

interface UseLaunchpadResult {
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
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  sortBy: 'growth' | 'liquidity' | 'recent';
  setSortBy: (sort: 'growth' | 'liquidity' | 'recent') => void;
  statusFilter: 'all' | 'live' | 'launching' | 'ended';
  setStatusFilter: (status: 'all' | 'live' | 'launching' | 'ended') => void;
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
  const { connected, publicKey } = useWallet();

  // Token creation state
  const [formData, setFormDataState] = useState<TokenFormData>(initialFormData);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Token library state
  const [tokens] = useState<LaunchpadToken[]>(MOCK_TOKENS);
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
      // Simulate token creation delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // In a real implementation, this would:
      // 1. Deploy a new CEP-18 token contract
      // 2. Set up bonding curve parameters
      // 3. Initialize liquidity pool
      // 4. Register with launchpad contract

      console.log('Token creation (demo):', {
        ...formData,
        creator: publicKey,
      });

      // Return demo deploy hash
      const demoHash = `demo-${Date.now().toString(16)}`;

      // Reset form on success
      resetForm();

      return demoHash;
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create token');
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [connected, publicKey, formData, resetForm]);

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
    formData,
    setFormData,
    resetForm,
    createToken,
    isCreating,
    createError,
    tokens,
    filteredTokens,
    searchQuery,
    setSearchQuery,
    sortBy,
    setSortBy,
    statusFilter,
    setStatusFilter,
  };
}

export default useLaunchpad;
