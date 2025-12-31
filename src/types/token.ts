export interface Token {
  hash: string | null;
  symbol: string;
  decimals: number;
  name: string;
  icon: string | null;
}

export interface TokenBalance {
  symbol: string;
  balance: string;
  formatted: string;
}

export interface TokenPair {
  tokenA: Token;
  tokenB: Token;
  pairAddress: string;
}
