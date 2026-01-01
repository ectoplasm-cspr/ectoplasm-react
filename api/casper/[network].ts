import type { VercelRequest, VercelResponse } from '@vercel/node';

const RPC_ENDPOINTS: Record<string, string> = {
  testnet: 'https://node.testnet.casper.network/rpc',
  mainnet: 'https://node.mainnet.casper.network/rpc',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests for RPC
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { network } = req.query;
  const rpcUrl = RPC_ENDPOINTS[network as string];

  if (!rpcUrl) {
    return res.status(400).json({ error: `Unknown network: ${network}` });
  }

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

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('RPC proxy error:', error);
    return res.status(500).json({ error: error.message || 'RPC request failed' });
  }
}
