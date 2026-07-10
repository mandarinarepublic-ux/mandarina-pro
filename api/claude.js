export default async function handler(req, res) {
  // Same-origin app only. No wildcard CORS: sin el header Access-Control-Allow-Origin
  // el navegador bloquea llamadas desde otros sitios, evitando que terceros abusen
  // de este proxy. Las llamadas de la propia app son same-origin y no necesitan CORS.
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Siempre usamos la key que envía el usuario desde la app. Sin fallback a env var,
  // así este proxy no guarda ningún secreto que un atacante pudiera drenar.
  const apiKey = req.headers['x-anthropic-key'];

  if (!apiKey) {
    return res.status(401).json({
      error: { type: 'authentication_error', message: 'Falta la Anthropic API key.' },
      hint: 'Haz click en 🔑 en el header de la app y pega tu key sk-ant-...'
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
