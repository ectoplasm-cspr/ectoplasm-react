# Ectoplasm DEX Frontend

A decentralized exchange (DEX) frontend for the Casper Network, built with React, TypeScript, and Vite.

## Features

- **Token Swaps**: Swap tokens using AMM (Automated Market Maker) pools
- **Liquidity Provision**: Add and remove liquidity from trading pairs
- **Liquid Staking (LST)**: Stake CSPR to receive sCSPR tokens that earn staking rewards
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

**Network**: Casper Testnet (`casper-test`)  
**Deployment Date**: January 4, 2026

### DEX Contracts

| Contract | Hash |
|----------|------|
| Factory | `hash-464e54c4e050fb995ac7bb3a9a4eef08f0b9010daf490ceb062ab5f7a8149263` |
| Router | `hash-1e5163f46dbc5aed9abe53bbf346aaa8d7239510dd32e6a06cfc9b16cce1de99` |
| WCSPR (LP Token) | `hash-eec2ae2bf596ae3ab4205669447fbb18adf848e2e5c1dfcefa39169d8399a4e7` |

### Tokens

| Token | Symbol | Decimals | Hash |
|-------|--------|----------|------|
| Ectoplasm Token | ECTO | 18 | `hash-1a4edcb64811ae6ce8468fc23f562aa210e26f2b53f7e2968a3bfdaf0702d5c8` |
| USD Coin | USDC | 6 | `hash-325032bbeb00e82595b009b722c1c0bd471f2827b5404a3f6fbf196d1d77a888` |
| Wrapped Ether | WETH | 18 | `hash-cf0db4233c95cfbd4639810578d450ffec09add32c8995f78515106f6a282120` |
| Wrapped Bitcoin | WBTC | 8 | `hash-2dca075e7804872e367e40a64ff0d7c73bcd0a7ca30a98b9a18cb245911b1a6f` |
| Staked CSPR | sCSPR | 18 | `hash-01bb503f421ba93ad85e1b3f4f2f6218864a7623d4d7004f1fb7a0ca7923787d` |

### LST (Liquid Staking Token) Contracts

| Contract | Hash |
|----------|------|
| sCSPR Token | `hash-01bb503f421ba93ad85e1b3f4f2f6218864a7623d4d7004f1fb7a0ca7923787d` |
| Staking Manager | `hash-626f1cb3e344e7ed53ce7b0f4e4b9c6d30aaff724be88a9380d8e3f73614e3b2` |

### Trading Pairs

Pairs are created dynamically via the Factory contract.

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **casper-js-sdk** - Casper blockchain interaction
- **React Router** - Client-side routing

## License

MIT
