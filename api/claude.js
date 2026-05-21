export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-anthropic-key');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Use key from request header (user's key) OR fall back to env var
  const apiKey = req.headers['x-anthropic-key'] 
    || process.env.ANTHROPIC_API_KEY 
    || process.env.VITE_ANTHROPIC_API_KEY;

  if (!apiKey) {
    return res.status(401).json({ 
      error: { type: 'authentication_error', message: 'No Anthropic API key provided. Add your key in the app settings (🔑).' }
    });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(req.body),
    });
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { type: 'server_error', message: err.message } });
  }
}
