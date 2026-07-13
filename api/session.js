// GET /api/session  → ¿la sesión actual está autorizada?
// El frontend la llama al cargar para decidir si muestra el login.
import { isAuthed, gateEnabled } from './_auth.js';

export default function handler(req, res) {
  return res.status(isAuthed(req) ? 200 : 401).json({
    authed: isAuthed(req),
    gate: gateEnabled(), // false = no hay candado configurado todavía
  });
}
