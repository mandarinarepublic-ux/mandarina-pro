// Proxy a la API de Gemini (generación de imágenes). La key vive SOLO en el
// servidor (GEMINI_API_KEY en Vercel) — el usuario nunca la ingresa ni la ve.

function sameOriginOk(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return true;
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sameOriginOk(req)) return res.status(403).json({ error: { message: 'Origen no permitido' } });

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: { message: 'GEMINI_API_KEY no configurada en Vercel. Agrégala en Settings → Environment Variables.' }
    });
  }

  const { model, contents, generationConfig } = req.body || {};
  if (!model || !contents) {
    return res.status(400).json({ error: { message: 'Faltan model o contents en la petición.' } });
  }

  try {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents, generationConfig }),
      }
    );
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
