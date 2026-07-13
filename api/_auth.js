// Helpers compartidos por las funciones serverless (login + guardias).
// Los archivos que empiezan con "_" NO son rutas en Vercel: solo se importan.
import crypto from 'node:crypto';

// ── Guardia de mismo-origen ──────────────────────────────────────────────────
// Bloquea llamadas desde otros sitios web para que no drenen las keys.
// (No frena curl directo, pero corta el abuso casual desde el navegador.)
export function sameOriginOk(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (!origin) return true; // fetch same-origin puede omitir Origin
  try {
    return new URL(origin).host === req.headers.host;
  } catch {
    return false;
  }
}

// ── Login por usuario/clave guardados en Vercel ──────────────────────────────
//   APP_USER      -> ej. MANDARINA
//   APP_PASSWORD  -> ej. REPUBLIC
// Si APP_PASSWORD NO está configurada, el candado queda ABIERTO (para no
// bloquear la app antes de configurar las env vars). Configúralas en
// Vercel → Settings → Environment Variables y vuelve a desplegar.
export function gateEnabled() {
  return !!process.env.APP_PASSWORD;
}

// Token de sesión derivado de las credenciales. Determinístico: todas las
// funciones calculan el mismo valor a partir de las env vars, sin necesidad
// de un secreto extra. Cambiar la clave invalida sesiones viejas.
export function expectedToken() {
  const secret = `${process.env.APP_USER || ''}:${process.env.APP_PASSWORD || ''}`;
  return crypto.createHash('sha256').update(`mandarina-pro|${secret}`).digest('hex').slice(0, 32);
}

function readCookie(req, name) {
  const raw = req.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

// ¿La petición trae una sesión válida? Si el candado está desactivado, pasa.
export function isAuthed(req) {
  if (!gateEnabled()) return true;
  return readCookie(req, 'mp_auth') === expectedToken();
}

// Cookie de sesión: httpOnly (el JS del navegador no la puede leer/robar),
// Secure, SameSite=Lax, 30 días.
export function sessionCookie() {
  return `mp_auth=${expectedToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;
}
