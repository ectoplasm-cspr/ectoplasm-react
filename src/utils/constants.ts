// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'ectoplasm-theme',
  WALLET_TYPE: 'ectoplasm-wallet-type',
  SLIPPAGE: 'ectoplasm-slippage',
  DEADLINE: 'ectoplasm-deadline',
  DASHBOARD_STATE: 'ectoplasm-dashboard',
} as const;

// Theme values
export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export type Theme = typeof THEMES[keyof typeof THEMES];

// Wallet types supported
export const WALLET_TYPES = {
  CASPER_WALLET: 'CasperWallet',
  CSPR_CLICK: 'CSPRClick',
  CASPER_SIGNER: 'CasperSigner',
} as const;

export type WalletType = typeof WALLET_TYPES[keyof typeof WALLET_TYPES];
