// POST /api/login  { user, password }
// Valida contra APP_USER / APP_PASSWORD (env vars de Vercel) y, si coinciden,
// setea la cookie de sesión httpOnly. Las credenciales nunca viven en el
// cliente ni se exponen en el bundle.
import { gateEnabled, sessionCookie } from './_auth.js';

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, error: 'Method not allowed' });

  // Sin candado configurado: acceso libre (aún no hay env vars).
  if (!gateEnabled()) return res.status(200).json({ ok: true, disabled: true });

  const { user, password } = req.body || {};
  const U = process.env.APP_USER || '';
  const P = process.env.APP_PASSWORD || '';

  if (String(user) === U && String(password) === P) {
    res.setHeader('Set-Cookie', sessionCookie());
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ ok: false, error: 'Usuario o clave incorrectos.' });
}
