#!/usr/bin/env node

/**
 * Resolve latest contract hashes from contract package hashes (hash-...)
 * and write `*_CONTRACT_HASH=hash-...` lines.
 *
 * Why: `ectoplasm-react` currently uses casper-js-sdk v2 (`DeployUtil.newStoredContractByHash`)
 * which needs a *contract hash*, while your deploy output is mostly *package hashes*.
 *
 * Usage:
 *   node scripts/resolve-contract-hashes.mjs --in .env --out .env.resolved
 *
 * Then either:
 *   - append `.env.resolved` into `.env`, or
 *   - copy the `*_CONTRACT_HASH` lines into `.env`.
 */

import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const inIdx = args.indexOf('--in');
const outIdx = args.indexOf('--out');

const inPath = inIdx >= 0 ? args[inIdx + 1] : '.env';
const outPath = outIdx >= 0 ? args[outIdx + 1] : '.env.resolved';

function parseEnvFile(p) {
  const content = fs.readFileSync(p, 'utf8');
  const env = {};
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const k = line.slice(0, eq).trim();
    const v = line.slice(eq + 1).trim();
    if (k) env[k] = v;
  }
  return env;
}

function normalizeNodeRpc(nodeAddress) {
  if (!nodeAddress) return null;
  const base = nodeAddress.replace(/\/+$/, '');
  return base.endsWith('/rpc') ? base : `${base}/rpc`;
}

function normalizeHashPrefix(s) {
  if (!s) return null;
  if (s.startsWith('hash-')) return s;
  return `hash-${s}`;
}

function normalizeContractHash(contractHash) {
  if (!contractHash) return null;
  if (contractHash.startsWith('hash-')) return contractHash;
  if (contractHash.startsWith('contract-')) return `hash-${contractHash.slice('contract-'.length)}`;
  return contractHash;
}

async function rpc(rpcUrl, method, params) {
  const res = await fetch(rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: Date.now(), method, params }),
  });
  const json = await res.json();
  if (json.error) {
    throw new Error(`${method} failed: ${json.error.message || JSON.stringify(json.error)}`);
  }
  return json.result;
}

async function resolveContractHashFromPackage(rpcUrl, packageHash) {
  const stateRoot = await rpc(rpcUrl, 'chain_get_state_root_hash', undefined);
  const stateRootHash = stateRoot?.state_root_hash;
  if (!stateRootHash) throw new Error('chain_get_state_root_hash: missing state_root_hash');

  const item = await rpc(rpcUrl, 'state_get_item', {
    state_root_hash: stateRootHash,
    key: packageHash,
    path: [],
  });

  const versions = item?.stored_value?.ContractPackage?.versions;
  if (!Array.isArray(versions) || versions.length === 0) {
    throw new Error(`state_get_item: no ContractPackage.versions for ${packageHash}`);
  }

  const latest = versions.reduce((a, b) => (a.contract_version > b.contract_version ? a : b));
  return normalizeContractHash(latest.contract_hash);
}

(async () => {
  const cwd = process.cwd();
  const absIn = path.isAbsolute(inPath) ? inPath : path.join(cwd, inPath);
  const absOut = path.isAbsolute(outPath) ? outPath : path.join(cwd, outPath);

  if (!fs.existsSync(absIn)) {
    console.error(`Input env file not found: ${absIn}`);
    process.exit(2);
  }

  const env = parseEnvFile(absIn);
  const nodeRpc = normalizeNodeRpc(env.NODE_ADDRESS || env.VITE_NODE_ADDRESS || '');
  if (!nodeRpc) {
    console.error('Missing NODE_ADDRESS in env (expected something like http://<host>:7777)');
    process.exit(2);
  }

  const candidates = [
    'PAIR_FACTORY_PACKAGE_HASH',
    'FACTORY_PACKAGE_HASH',
    'ROUTER_PACKAGE_HASH',
    'WCSPR_PACKAGE_HASH',
    'ECTO_PACKAGE_HASH',
    'USDC_PACKAGE_HASH',
    'WETH_PACKAGE_HASH',
    'WBTC_PACKAGE_HASH',
  ];

  const lines = [];
  lines.push(`# resolved from ${path.basename(absIn)} using ${nodeRpc}`);

  for (const k of candidates) {
    const pkg = normalizeHashPrefix(env[k]);
    if (!pkg) continue;

    const outKey = k.replace('_PACKAGE_HASH', '_CONTRACT_HASH');
    try {
      const contractHash = await resolveContractHashFromPackage(nodeRpc, pkg);
      if (contractHash) {
        lines.push(`${outKey}=${contractHash}`);
        console.log(`${k} -> ${outKey}=${contractHash}`);
      }
    } catch (e) {
      console.warn(`WARN: ${k} (${pkg}): ${e?.message || e}`);
    }
  }

  fs.writeFileSync(absOut, lines.join('\n') + '\n', 'utf8');
  console.log(`\nWrote: ${absOut}`);
})();
