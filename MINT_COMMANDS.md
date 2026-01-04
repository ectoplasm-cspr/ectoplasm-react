# Mint tokens (testnet)

Your UI shows `0` because you haven't minted tokens yet. These Odra tokens expose `mint(to, amount)` publicly, so any account can mint.

## Prereqs

- `casper-client` installed
- `.env` contains `NODE_ADDRESS`, `CHAIN_NAME`, and `*_CONTRACT_HASH` for tokens

## One-shot mint script

From `ectoplasm-react/`:

```bash
chmod +x ./scripts/mint_tokens.sh

# Mint to your wallet account-hash using *your* secret key file
./scripts/mint_tokens.sh \
  account-hash-dc1773eb343b498f2e102871de9935f3ee0b2abd78088c42548fcd13b9910bd8 \
  /path/to/secret_key.pem
```

Optional: override amounts (raw units):

```bash
./scripts/mint_tokens.sh \
  account-hash-dc1773eb343b498f2e102871de9935f3ee0b2abd78088c42548fcd13b9910bd8 \
  /path/to/secret_key.pem \
  1000000000000000000000 \
  1000000000 \
  1000000000000000000 \
  100000000
```

## Manual (single token)

Example: mint `1000 ECTO` (18 decimals) to your account:

```bash
source .env

casper-client put-deploy \
  --node-address "${NODE_ADDRESS%/}/rpc" \
  --chain-name "$CHAIN_NAME" \
  --secret-key /path/to/secret_key.pem \
  --payment-amount 5000000000 \
  --session-hash "$ECTO_CONTRACT_HASH" \
  --session-entry-point mint \
  --session-arg "to:key='account-hash-dc1773eb343b498f2e102871de9935f3ee0b2abd78088c42548fcd13b9910bd8'" \
  --session-arg "amount:u256='1000000000000000000000'"
```
