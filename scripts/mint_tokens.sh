#!/usr/bin/env bash
set -euo pipefail

# Mints ECTO/USDC/WETH/WBTC to a recipient account-hash on Casper testnet.
#
# Requirements:
# - `casper-client` installed and on PATH
# - `.env` in project root with NODE_ADDRESS, CHAIN_NAME, and *_CONTRACT_HASH values
#
# Usage:
#   ./scripts/mint_tokens.sh account-hash-... /path/to/secret_key.pem \
#     1000000000000000000000 \
#     1000000000 \
#     1000000000000000000 \
#     100000000
#
# Amount units:
# - ECTO (18 decimals): 1 ECTO = 1_000_000_000_000_000_000
# - USDC (6 decimals):  1 USDC = 1_000_000
# - WETH (18 decimals): 1 WETH = 1_000_000_000_000_000_000
# - WBTC (8 decimals):  1 WBTC = 100_000_000

cd "$(dirname "$0")/.."

if [[ -f .env ]]; then
  # shellcheck disable=SC1091
  source .env
fi

RECIPIENT_ACCOUNT_HASH="${1:-}"
SECRET_KEY_PATH="${2:-}"
AMOUNT_ECTO="${3:-1000000000000000000000}"  # 1000 ECTO
AMOUNT_USDC="${4:-1000000000}"              # 1000 USDC (6dp)
AMOUNT_WETH="${5:-1000000000000000000}"    # 1 WETH
AMOUNT_WBTC="${6:-100000000}"               # 1 WBTC (8dp)

: "${NODE_ADDRESS:?NODE_ADDRESS missing (set in .env)}"
: "${CHAIN_NAME:?CHAIN_NAME missing (set in .env)}"
: "${ECTO_CONTRACT_HASH:?ECTO_CONTRACT_HASH missing (set in .env)}"
: "${USDC_CONTRACT_HASH:?USDC_CONTRACT_HASH missing (set in .env)}"
: "${WETH_CONTRACT_HASH:?WETH_CONTRACT_HASH missing (set in .env)}"
: "${WBTC_CONTRACT_HASH:?WBTC_CONTRACT_HASH missing (set in .env)}"

if [[ -z "$RECIPIENT_ACCOUNT_HASH" || -z "$SECRET_KEY_PATH" ]]; then
  echo "Usage: $0 account-hash-... /path/to/secret_key.pem [amountECTO] [amountUSDC] [amountWETH] [amountWBTC]" >&2
  exit 2
fi

if [[ ! -f "$SECRET_KEY_PATH" ]]; then
  echo "Secret key not found: $SECRET_KEY_PATH" >&2
  exit 2
fi

mint_one() {
  local token_hash="$1"
  local amount="$2"
  local symbol="$3"

  echo "\nMinting $symbol: amount=$amount to=$RECIPIENT_ACCOUNT_HASH"
  casper-client put-deploy \
    --node-address "${NODE_ADDRESS%/}/rpc" \
    --chain-name "$CHAIN_NAME" \
    --secret-key "$SECRET_KEY_PATH" \
    --payment-amount 5000000000 \
    --session-hash "$token_hash" \
    --session-entry-point "mint" \
    --session-arg "to:key='$RECIPIENT_ACCOUNT_HASH'" \
    --session-arg "amount:u256='$amount'"
}

mint_one "$ECTO_CONTRACT_HASH" "$AMOUNT_ECTO" "ECTO"
mint_one "$USDC_CONTRACT_HASH" "$AMOUNT_USDC" "USDC"
mint_one "$WETH_CONTRACT_HASH" "$AMOUNT_WETH" "WETH"
mint_one "$WBTC_CONTRACT_HASH" "$AMOUNT_WBTC" "WBTC"

echo "\nDone. Wait for deploys to finalize, then refresh the UI balances."