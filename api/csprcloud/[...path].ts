import type { VercelRequest, VercelResponse } from '@vercel/node';

const API_ENDPOINTS: Record<string, string> = {
  testnet: 'https://api.testnet.cspr.cloud',
  mainnet: 'https://api.cspr.cloud',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { path } = req.query;
  const pathArray = Array.isArray(path) ? path : [path];

  // First segment is the network
  const network = pathArray[0];
  const restPath = pathArray.slice(1).join('/');

  const baseUrl = API_ENDPOINTS[network as string];

  if (!baseUrl) {
    return res.status(400).json({ error: `Unknown network: ${network}` });
  }

  const apiKey = process.env.CSPR_CLOUD_API_KEY || '';
  const targetUrl = `${baseUrl}/${restPath}`;

  try {
    const response = await fetch(targetUrl, {
      method: req.method || 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...(apiKey ? { 'Authorization': apiKey } : {}),
      },
      ...(req.method === 'POST' ? { body: JSON.stringify(req.body) } : {}),
    });

    const data = await response.json();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('CSPR.cloud proxy error:', error);
    return res.status(500).json({ error: error.message || 'API request failed' });
  }
}
