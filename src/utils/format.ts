/**
 * Format a number with commas and decimal places
 */
export function formatNumber(value: number | string, decimals: number = 2): string {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/**
 * Format a large number with K, M, B suffixes
 */
export function formatCompact(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
}

/**
 * Truncate an address for display
 */
export function truncateAddress(address: string, startLen: number = 8, endLen: number = 6): string {
  if (!address || address.length <= startLen + endLen) return address;
  return `${address.slice(0, startLen)}...${address.slice(-endLen)}`;
}

/**
 * Convert motes to CSPR (9 decimals)
 */
export function motesToCspr(motes: string | bigint): string {
  const value = typeof motes === 'string' ? BigInt(motes) : motes;
  const cspr = Number(value) / 1e9;
  return cspr.toFixed(4);
}

/**
 * Convert CSPR to motes
 */
export function csprToMotes(cspr: number | string): string {
  const value = typeof cspr === 'string' ? parseFloat(cspr) : cspr;
  return Math.floor(value * 1e9).toString();
}

/**
 * Convert token amount from raw to formatted based on decimals
 */
export function formatTokenAmount(rawAmount: string | bigint, decimals: number): string {
  const value = typeof rawAmount === 'string' ? BigInt(rawAmount) : rawAmount;

  // Use Number division if safe (mimics frontend-react logic)
  if (value <= BigInt(Number.MAX_SAFE_INTEGER)) {
    return (Number(value) / (10 ** decimals)).toFixed(4);
  }

  // Fallback for huge numbers
  const divisor = BigInt(10 ** decimals);
  const whole = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, 4);
  return `${whole}.${fractionStr}`;
}

/**
 * Parse user input to raw token amount
 */
export function parseTokenAmount(amount: string, decimals: number): string {
  const [whole, fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return `${whole}${paddedFraction}`.replace(/^0+/, '') || '0';
}

/**
 * Convert hex string to Uint8Array
 */
export function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.replace('hash-', '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Convert Uint8Array to hex string
 */
export function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
