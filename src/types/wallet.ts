export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  accountHash: string | null;
  balance: string;
}

export interface WalletContextType extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnecting: boolean;
  error: string | null;
}
