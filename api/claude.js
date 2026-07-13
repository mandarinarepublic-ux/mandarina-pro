// Proxy a la API de Anthropic. La key vive SOLO en el servidor
// (ANTHROPIC_API_KEY en Vercel) — el usuario nunca la ingresa ni la ve.
// Guardia de mismo-origen + sesión para que nadie externo drene la key.
import { sameOriginOk, isAuthed } from './_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sameOriginOk(req)) return res.status(403).json({ error: { message: 'Origen no permitido' } });
  if (!isAuthed(req)) return res.status(401).json({ error: { message: 'Sesión no autorizada. Inicia sesión.' } });

  const apiKey = process.env.ANTHROPIC_API_KEY || process.env.VITE_ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: { type: 'authentication_error', message: 'ANTHROPIC_API_KEY no configurada en Vercel.' },
      hint: 'Agrega ANTHROPIC_API_KEY en Vercel → Settings → Environment Variables y vuelve a desplegar.'
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
