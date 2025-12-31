import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel Serverless Function to proxy Casper RPC calls
// This bypasses CORS restrictions in production

const MAINNET_RPC = 'https://node.mainnet.casper.network/rpc';
const TESTNET_RPC = 'https://node.testnet.casper.network/rpc';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Determine which network to use based on query param or default to mainnet
  const network = req.query.network === 'testnet' ? 'testnet' : 'mainnet';
  const rpcUrl = network === 'testnet' ? TESTNET_RPC : MAINNET_RPC;

  try {
    const response = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    return res.status(200).json(data);
  } catch (error: any) {
    console.error('RPC proxy error:', error);
    return res.status(500).json({
      error: 'Failed to proxy RPC request',
      message: error.message
    });
  }
}
