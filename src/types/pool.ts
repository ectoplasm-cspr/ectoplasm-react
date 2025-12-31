export interface Pool {
  pairAddress: string;
  tokenA: string;
  tokenB: string;
  reserveA: string;
  reserveB: string;
  totalSupply: string;
  tvl: number;
  apr: number;
}

export interface LiquidityPosition {
  pairAddress: string;
  lpBalance: string;
  sharePercent: number;
  tokenAAmount: string;
  tokenBAmount: string;
}
