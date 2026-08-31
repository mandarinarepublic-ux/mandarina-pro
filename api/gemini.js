// Proxy a la API de Gemini. La key vive SOLO en el servidor
// (GEMINI_API_KEY en Vercel) — el usuario nunca la ingresa ni la ve.
// Sirve para las 3 cosas: analizar la prenda, escribir el copy y generar fotos.
import { sameOriginOk, isAuthed } from './_auth.js';

const BASE = 'https://generativelanguage.googleapis.com/v1beta';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!sameOriginOk(req)) return res.status(403).json({ error: { message: 'Origen no permitido' } });
  if (!isAuthed(req)) return res.status(401).json({ error: { message: 'Sesión no autorizada. Inicia sesión.' } });

  const key = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  if (!key) {
    return res.status(500).json({
      error: { message: 'GEMINI_API_KEY no configurada en Vercel. Agrégala en Settings → Environment Variables.' }
    });
  }

  // GET → diagnóstico: qué modelos ve REALMENTE esta key. Sin adivinar nombres:
  // los IDs de modelo cambian y los viejos devuelven 404 en silencio.
  if (req.method === 'GET') {
    try {
      const r = await fetch(`${BASE}/models?key=${key}&pageSize=200`);
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      const modelos = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => ({
          id: (m.name || '').replace(/^models\//, ''),
          nombre: m.displayName,
          entrada: m.inputTokenLimit,
          salida: m.outputTokenLimit,
        }));
      return res.status(200).json({ total: modelos.length, modelos });
    } catch (err) {
      return res.status(500).json({ error: { message: err.message } });
    }
  }

  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { model, contents, generationConfig, systemInstruction } = req.body || {};
  if (!model || !contents) {
    return res.status(400).json({ error: { message: 'Faltan model o contents en la petición.' } });
  }

  try {
    const cuerpo = { contents, generationConfig };
    if (systemInstruction) cuerpo.systemInstruction = systemInstruction;
    const r = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
    });
    const data = await r.json();
    return res.status(r.status).json(data);
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
}
