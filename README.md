# Ectoplasm DEX Frontend

A decentralized exchange (DEX) frontend for the Casper Network, built with React, TypeScript, and Vite.

## Features

- **Token Swaps**: Swap tokens using AMM (Automated Market Maker) pools
- **Liquidity Provision**: Add and remove liquidity from trading pairs
- **Wallet Integration**: Connect via CasperWallet extension or CSPR.click
- **Multi-Contract Support**: Toggle between Odra and Native contract versions
- **Real-time Balances**: Fetch token balances directly from the blockchain
- **Dark/Light Theme**: User-configurable theme preference

## Prerequisites

- Node.js 18+
- npm or yarn
- A Casper wallet (CasperWallet extension or CSPR.click account)

## Installation

```bash
npm install
```

## Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Optional: CSPR.cloud API key for Odra contract balance queries
VITE_CSPR_CLOUD_API_KEY=your_api_key_here
```

### Contract Versions

The frontend supports two contract implementations:

| Version | Description | Balance Query |
|---------|-------------|---------------|
| **Native** | Casper 2.0 native contracts (recommended) | Direct RPC |
| **Odra** | Odra framework contracts | CSPR.cloud API |

Toggle between versions via the Settings menu in the header dropdown.

### Network Configuration

Configured in `src/config/ectoplasm.ts`:

- **Testnet**: `https://node.testnet.casper.network/rpc`
- **Mainnet**: `https://node.mainnet.casper.network/rpc`

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

The dev server runs at `http://localhost:5173` with HMR (Hot Module Replacement).

### Vite Proxy Configuration

The dev server proxies RPC requests to avoid CORS issues:

| Proxy Path | Target |
|------------|--------|
| `/_casper/testnet` | Casper Testnet RPC |
| `/_casper/mainnet` | Casper Mainnet RPC |
| `/_csprcloud/testnet` | CSPR.cloud Testnet API |
| `/_csprcloud/mainnet` | CSPR.cloud Mainnet API |

## Project Structure

```
src/
├── components/       # Reusable UI components
│   └── common/       # Header, ConnectWallet, etc.
├── config/           # Configuration (contracts, tokens)
│   └── ectoplasm.ts  # Main config with contract addresses
├── contexts/         # React contexts (Wallet, Theme)
├── pages/            # Page components (Swap, Wallet, Liquidity)
├── services/         # Blockchain services
│   └── casper.ts     # CasperService for RPC queries
└── utils/            # Utility functions
```

## Deployed Contracts (Testnet)

### Native Contracts (Casper 2.0)

| Contract | Hash |
|----------|------|
| Factory | `hash-8a4f4ffeab7a7c831359ee593b2edb5ee34333b7223b63f5ec906e42bc325ced` |
| ECTO | `hash-01b5a8092c45fb6276c5c3cf6b4c22730856cf0fc0051b078cf86010147d7a6f` |
| USDC | `hash-da800ac07a00e316bc84e3c1b614cfd9ff2db87b90904e30fa3a1bc5a632c2f0` |
| WETH | `hash-38fa5e20e2f80fb777e6036e2582adb98b387d785828a672ff2cea4aeb9fa990` |
| WBTC | `hash-e7ff916e02b42268d755b8aaffa9e8ae09e00c8d99c0db628d02c925020bd8fb` |

### Trading Pairs (Native)

| Pair | Hash |
|------|------|
| ECTO/USDC | `hash-2c2287ee64b4b372227fcd9b448d664e270d949e9b37830dd28a0b8e8e5401b9` |
| WETH/USDC | `hash-6759b832fe25e36288f9e63591242b54fc3a8b141a09b232a5a48ee2698d0e20` |
| WBTC/USDC | `hash-0fb2b764080ef5d8912c94c7cc305625e83999f77e8f7088741dc62e8b65ecc7` |

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **casper-js-sdk** - Casper blockchain interaction
- **React Router** - Client-side routing

## License

MIT
