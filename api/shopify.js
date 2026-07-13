// Serverless proxy que crea un producto real en Shopify con imagen + SEO.
// Las credenciales viven SOLO en variables de entorno de Vercel, nunca en el
// cliente:
//   SHOPIFY_STORE        -> ej. mandarinaec.myshopify.com
//   SHOPIFY_ADMIN_TOKEN  -> Admin API access token (shpat_...)
//
// El producto se crea como BORRADOR (draft) por defecto: aparece en Shopify
// Admin listo para revisar y publicar con un click. Así una acción externa
// nunca deja algo en vivo sin que el usuario lo confirme.

import { sameOriginOk, isAuthed } from './_auth.js';

const API_VERSION = '2024-10';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!sameOriginOk(req)) return res.status(403).json({ error: 'Origen no permitido' });
  if (!isAuthed(req)) return res.status(401).json({ error: 'Sesión no autorizada. Inicia sesión.' });

  const store = process.env.SHOPIFY_STORE;
  const token = process.env.SHOPIFY_ADMIN_TOKEN;

  if (!store || !token) {
    return res.status(500).json({
      error: 'Shopify no configurado.',
      hint: 'Agrega SHOPIFY_STORE (ej. mandarinaec.myshopify.com) y SHOPIFY_ADMIN_TOKEN en Vercel → Settings → Environment Variables, y vuelve a desplegar.'
    });
  }

  const { productInfo = {}, seo = {}, imageBase64, status = 'draft' } = req.body || {};

  if (!productInfo.name) {
    return res.status(400).json({ error: 'Falta el nombre del producto.' });
  }

  // body_html: usamos el texto PAS del SEO si existe; si no, la descripción.
  const bodyHtml = seo.bodyText
    ? `<p>${seo.bodyText}</p>`
    : (productInfo.description ? `<p>${productInfo.description}</p>` : '');

  // Tags: combinamos los del SEO con color/categoría.
  const tags = [
    ...(Array.isArray(seo.tags) ? seo.tags : []),
    productInfo.color,
    productInfo.category,
  ].filter(Boolean).join(', ');

  const product = {
    title: seo.h1 || productInfo.name,
    body_html: bodyHtml,
    vendor: 'Mandarina',
    product_type: productInfo.category || 'Ropa',
    tags,
    status: status === 'active' ? 'active' : 'draft',
    variants: [{
      price: (productInfo.price || '0').toString().replace(/[^0-9.]/g, '') || '0',
    }],
    // Meta title / meta description para Google (metafields globales de Shopify)
    metafields: [
      seo.title && { namespace: 'global', key: 'title_tag', value: seo.title, type: 'single_line_text_field' },
      seo.metaDescription && { namespace: 'global', key: 'description_tag', value: seo.metaDescription, type: 'single_line_text_field' },
    ].filter(Boolean),
  };

  // La imagen generada llega como base64 puro (sin el prefijo data:).
  if (imageBase64) {
    product.images = [{ attachment: imageBase64 }];
  }

  try {
    const resp = await fetch(`https://${store}/admin/api/${API_VERSION}/products.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': token,
      },
      body: JSON.stringify({ product }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({
        error: 'Shopify rechazó el producto.',
        detail: data.errors || data,
      });
    }

    const created = data.product;
    const adminBase = store.replace('.myshopify.com', '');
    return res.status(200).json({
      ok: true,
      id: created.id,
      handle: created.handle,
      status: created.status,
      adminUrl: `https://admin.shopify.com/store/${adminBase}/products/${created.id}`,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Error de red con Shopify', detail: err.message });
  }
}
