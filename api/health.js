// GET /api/health → qué integraciones están configuradas (SOLO booleanos,
// nunca los valores). Alimenta el indicador de estado en la UI para saber
// de un vistazo si falta alguna key en Vercel.
export default function handler(req, res) {
  return res.status(200).json({
    gemini: !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY),
    shopify: !!(process.env.SHOPIFY_STORE && process.env.SHOPIFY_ADMIN_TOKEN),
    authGate: !!process.env.APP_PASSWORD,
  });
}
