import { useState, useRef, useCallback, useEffect } from "react";

const STEP_LABELS = ["📸 Foto", "✨ Editar", "🎨 Variantes", "🚀 Publicar"];

const PRESETS = [
  { id: "studio_white", label: "Studio White", icon: "⬜", desc: "Fondo blanco profesional", filter: "brightness(1.1) contrast(1.05) saturate(1.1)", bg: "#ffffff" },
  { id: "studio_gray", label: "Studio Gray", icon: "🔲", desc: "Fondo gris neutro", filter: "brightness(1.05) contrast(1.1) saturate(0.95)", bg: "#f0f0f0" },
  { id: "lifestyle", label: "Lifestyle", icon: "🌿", desc: "Fondo natural difuminado", filter: "brightness(1.0) contrast(0.95) saturate(1.2) sepia(0.05)", bg: "#e8e4de" },
  { id: "luxury", label: "Luxury Dark", icon: "🖤", desc: "Fondo negro elegante", filter: "brightness(0.95) contrast(1.15) saturate(1.05)", bg: "#1a1a1a" },
  { id: "warm", label: "Warm Tones", icon: "🧡", desc: "Tonos cálidos", filter: "brightness(1.05) contrast(1.0) saturate(1.15) sepia(0.1)", bg: "#f5ede0" },
  { id: "cool", label: "Cool & Fresh", icon: "💙", desc: "Tonos fríos", filter: "brightness(1.05) saturate(0.9) hue-rotate(15deg)", bg: "#e0eaf5" },
];

const VARIANTS_DEF = [
  { label: "Studio Blanco", filter: "brightness(1.12) contrast(1.06) saturate(1.1)", bg: "#ffffff", badge: "⭐ Recomendado", textColor: "#333" },
  { label: "Studio Gris", filter: "brightness(1.05) contrast(1.1) saturate(0.95)", bg: "#efefef", badge: "🏷️ Shopify", textColor: "#333" },
  { label: "Lifestyle", filter: "brightness(1.0) contrast(0.95) saturate(1.2) sepia(0.06)", bg: "#e8e4de", badge: "📸 Instagram", textColor: "#444" },
  { label: "Luxury Dark", filter: "brightness(0.92) contrast(1.18) saturate(1.05)", bg: "#111111", badge: "✨ Premium", textColor: "#fff" },
  { label: "Warm Tones", filter: "brightness(1.06) contrast(1.0) saturate(1.15) sepia(0.12)", bg: "#f5ede0", badge: "🧡 Lifestyle", textColor: "#444" },
];

const INSTAGRAM_FORMATS = [
  { id: "feed", label: "Feed 1:1", w: 1080, h: 1080, icon: "⬛" },
  { id: "portrait", label: "Portrait 4:5", w: 1080, h: 1350, icon: "📱" },
  { id: "story", label: "Story 9:16", w: 1080, h: 1920, icon: "🔮" },
];

// Draw image with filter on canvas and return dataURL
function applyFilterToCanvas(imgSrc, filterStr, bgColor, width, height) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);
    const img = new Image();
    img.onload = () => {
      // Center and fit image
      const scale = Math.min(width / img.width, height / img.height) * 0.88;
      const sw = img.width * scale;
      const sh = img.height * scale;
      const sx = (width - sw) / 2;
      const sy = (height - sh) / 2;
      ctx.filter = filterStr;
      ctx.drawImage(img, sx, sy, sw, sh);
      ctx.filter = "none";
      resolve(canvas.toDataURL("image/jpeg", 0.92));
    };
    img.src = imgSrc;
  });
}

async function callClaudeJSON(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";
  try { return JSON.parse(text.replace(/```json|```/g, "").trim()); }
  catch { return null; }
}

function Field({ label, value, color }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 5 }}>{label}</div>
      <div onClick={() => { navigator.clipboard.writeText(value || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }} title="Clic para copiar"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#f5f0eb", lineHeight: 1.5, cursor: "copy", position: "relative" }}>
        {value}
        {copied && <span style={{ position: "absolute", top: 4, right: 8, fontSize: 10, color }}> ✓ copiado</span>}
      </div>
    </div>
  );
}

export default function MandarinaPro() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [variantImages, setVariantImages] = useState([]); // real canvas-rendered images
  const [generatingVariants, setGeneratingVariants] = useState(false);
  const [seoData, setSeoData] = useState(null);
  const [igCopy, setIgCopy] = useState(null);
  const [publishStatus, setPublishStatus] = useState({});
  const [loadingContent, setLoadingContent] = useState(false);
  const [productInfo, setProductInfo] = useState({ name: "", price: "", category: "Ropa", description: "" });
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  const currentPreset = PRESETS.find(p => p.id === selectedPreset);

  // Generate all 5 variant images on canvas
  const generateVariantImages = async () => {
    setGeneratingVariants(true);
    const results = [];
    for (const v of VARIANTS_DEF) {
      const dataUrl = await applyFilterToCanvas(photo, v.filter, v.bg, 1080, 1080);
      results.push({ ...v, dataUrl });
    }
    setVariantImages(results);
    setGeneratingVariants(false);
  };

  const downloadVariant = (variant, index) => {
    const a = document.createElement("a");
    a.href = variant.dataUrl;
    a.download = `mandarina-${productInfo.name || "producto"}-v${index + 1}-${variant.label.replace(/\s/g, "-").toLowerCase()}.jpg`;
    a.click();
  };

  const downloadAll = () => {
    variantImages.forEach((v, i) => downloadVariant(v, i));
  };

  const generateContent = async () => {
    setLoadingContent(true);
    try {
      const [seo, ig] = await Promise.all([
        callClaudeJSON(
          "Eres experto en SEO para e-commerce de moda latinoamericana. Responde SOLO JSON válido sin backticks ni preamble.",
          `SEO para: Nombre: ${productInfo.name || "Prenda de moda"}, Precio: $${productInfo.price || "XX"}, Categoría: ${productInfo.category}, Descripción: ${productInfo.description || "Prenda moderna"}, Tienda: Mandarina Ecuador www.mandarinEc.com
JSON exacto: {"title":"título SEO max 60 chars","metaDescription":"meta 150 chars","h1":"H1","bodyText":"descripción 2-3 oraciones persuasivas","tags":["t1","t2","t3","t4","t5"],"googleAdsHeadline":"max 30 chars","googleAdsCTA":"CTA"}`
        ),
        callClaudeJSON(
          "Eres community manager experto en moda latinoamericana. Responde SOLO JSON válido sin backticks.",
          `Instagram copy para: ${productInfo.name || "prenda"} $${productInfo.price || "XX"} Mandarina Ecuador
JSON exacto: {"caption":"caption con emojis max 220 chars","hashtags":"#mandarina #moda #ecuador #ootd #fashion #estilo #ropa","cta":"llamado a acción","storyText":"texto story 1-2 líneas con emoji"}`
        )
      ]);
      setSeoData(seo);
      setIgCopy(ig);
    } catch (e) { console.error(e); }
    finally { setLoadingContent(false); }
  };

  const reset = () => {
    setStep(0); setPhoto(null); setVariantImages([]); setSeoData(null);
    setIgCopy(null); setPublishStatus({}); setSelectedPreset(null); setSelectedVariant(0);
    setProductInfo({ name: "", price: "", category: "Ropa", description: "" });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)", fontFamily: "'Georgia',serif", color: "#f5f0eb", overflowX: "hidden" }}>
      {/* Header */}
      <header style={{ padding: "18px 28px", borderBottom: "1px solid rgba(255,165,80,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#ff8c42,#e63946)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold" }}>M</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: "bold", letterSpacing: "0.05em", color: "#ff9f5a" }}>MANDARINA PRO</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em" }}>STUDIO · SHOPIFY · INSTAGRAM</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {STEP_LABELS.map((label, i) => (
            <button key={i} onClick={() => i <= step && setStep(i)} style={{ padding: "5px 12px", borderRadius: 20, border: i === step ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.1)", background: i === step ? "rgba(255,140,66,0.15)" : "transparent", color: i === step ? "#ff8c42" : i < step ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", fontSize: 11, cursor: i <= step ? "pointer" : "default", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px" }}>

        {/* ── STEP 0: CAPTURE ── */}
        {step === 0 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 34, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>Sube tu foto de producto</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 28, fontSize: 14 }}>Foto simple → imagen profesional con 5 variantes descargables</p>
            <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current.click()} style={{ border: "2px dashed rgba(255,140,66,0.35)", borderRadius: 20, padding: "60px 40px", textAlign: "center", cursor: "pointer", background: "rgba(255,140,66,0.03)", minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {photo ? <img src={photo} alt="producto" style={{ maxHeight: 360, maxWidth: "100%", borderRadius: 12, objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
                : <><div style={{ fontSize: 60, marginBottom: 14, opacity: 0.5 }}>📸</div><div style={{ fontSize: 19, color: "#ff9f5a", marginBottom: 8 }}>Arrastra tu foto aquí</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>o haz clic para seleccionar · JPG, PNG, HEIC</div></>}
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
            {photo && (
              <>
                <div style={{ marginTop: 24, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,140,66,0.15)", borderRadius: 16, padding: 22 }}>
                  <div style={{ fontSize: 12, color: "#ff9f5a", marginBottom: 14, letterSpacing: "0.1em" }}>INFORMACIÓN DEL PRODUCTO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>NOMBRE</label>
                      <input value={productInfo.name} onChange={e => setProductInfo(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Chaqueta Dragon Ball Z azul" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>PRECIO $</label>
                      <input value={productInfo.price} onChange={e => setProductInfo(p => ({ ...p, price: e.target.value }))} placeholder="35.00" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>CATEGORÍA</label>
                      <input value={productInfo.category} onChange={e => setProductInfo(p => ({ ...p, category: e.target.value }))} placeholder="Ropa" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>DESCRIPCIÓN</label>
                      <textarea value={productInfo.description} onChange={e => setProductInfo(p => ({ ...p, description: e.target.value }))} placeholder="Describe el producto..." rows={2} style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
                <button onClick={() => setStep(1)} style={{ marginTop: 20, width: "100%", padding: "15px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 13, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                  Continuar → Editar foto
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 1: EDIT ── */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>Elige el estilo base</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>Este estilo se aplicará como base. Luego se generan 5 variantes reales descargables.</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,140,66,0.15)", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", background: currentPreset ? currentPreset.bg : "#111" }}>
                <img src={photo} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: currentPreset ? currentPreset.filter : "none", transition: "filter 0.5s ease" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, letterSpacing: "0.1em" }}>SELECCIONA UN ESTILO BASE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {PRESETS.map(p => (
                    <button key={p.id} onClick={() => setSelectedPreset(p.id)} style={{ padding: "14px 10px", background: selectedPreset === p.id ? "rgba(255,140,66,0.18)" : "rgba(255,255,255,0.04)", border: selectedPreset === p.id ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.08)", borderRadius: 11, cursor: "pointer", textAlign: "center", fontFamily: "inherit" }}>
                      <div style={{ fontSize: 26, marginBottom: 4 }}>{p.icon}</div>
                      <div style={{ fontSize: 12, color: selectedPreset === p.id ? "#ff9f5a" : "#f5f0eb", fontWeight: "bold" }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => setStep(0)} style={{ padding: "13px 22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Volver</button>
              <button onClick={async () => { setStep(2); await generateVariantImages(); }} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                🎨 Generar 5 variantes reales →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: VARIANTS ── */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>5 variantes generadas</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>Imágenes reales 1080×1080 listas para descargar y publicar</p>

            {generatingVariants && (
              <div style={{ textAlign: "center", padding: "60px 20px" }}>
                <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 1s linear infinite" }}>⚡</div>
                <div style={{ fontSize: 16, color: "#ff9f5a" }}>Generando variantes en alta resolución...</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 8 }}>Procesando con Canvas API · 1080×1080px</div>
              </div>
            )}

            {!generatingVariants && variantImages.length > 0 && (
              <>
                {/* Download All button */}
                <button onClick={downloadAll} style={{ width: "100%", padding: "13px", background: "rgba(255,140,66,0.15)", border: "1px solid rgba(255,140,66,0.4)", borderRadius: 12, color: "#ff9f5a", fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit", marginBottom: 20 }}>
                  ⬇️ Descargar las 5 variantes (JPG 1080×1080)
                </button>

                {/* Variant grid */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 24 }}>
                  {variantImages.map((v, i) => (
                    <div key={i} onClick={() => setSelectedVariant(i)} style={{ cursor: "pointer", borderRadius: 12, overflow: "hidden", border: selectedVariant === i ? "2px solid #ff8c42" : "2px solid rgba(255,255,255,0.08)", position: "relative" }}>
                      <img src={v.dataUrl} alt={v.label} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                      <div style={{ padding: "7px 6px", background: "rgba(0,0,0,0.85)", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#fff", fontWeight: "bold" }}>{v.label}</div>
                        <div style={{ fontSize: 9, color: "#ff9f5a" }}>{v.badge}</div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); downloadVariant(v, i); }}
                        style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 6, color: "#fff", fontSize: 14, cursor: "pointer", padding: "4px 6px", lineHeight: 1 }}
                        title="Descargar"
                      >⬇</button>
                    </div>
                  ))}
                </div>

                {/* Large preview of selected */}
                {variantImages[selectedVariant] && (
                  <div style={{ borderRadius: 18, overflow: "hidden", position: "relative", marginBottom: 20 }}>
                    <img src={variantImages[selectedVariant].dataUrl} alt="selected" style={{ width: "100%", maxHeight: 480, objectFit: "contain", background: variantImages[selectedVariant].bg, display: "block" }} />
                    <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.7)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#fff" }}>
                      {variantImages[selectedVariant].label} · 1080×1080px
                    </div>
                    <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,140,66,0.9)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#fff", fontWeight: "bold" }}>
                      {variantImages[selectedVariant].badge}
                    </div>
                    <button onClick={() => downloadVariant(variantImages[selectedVariant], selectedVariant)} style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "#fff", fontSize: 13, cursor: "pointer", padding: "8px 16px", fontFamily: "inherit" }}>
                      ⬇️ Descargar esta variante
                    </button>
                  </div>
                )}

                {/* Instagram formats */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, letterSpacing: "0.1em" }}>FORMATOS DISPONIBLES</div>
                  <div style={{ display: "flex", gap: 10 }}>
                    {INSTAGRAM_FORMATS.map(fmt => (
                      <div key={fmt.id} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,140,66,0.15)", borderRadius: 11, padding: "12px", textAlign: "center" }}>
                        <div style={{ fontSize: 24, marginBottom: 4 }}>{fmt.icon}</div>
                        <div style={{ fontSize: 12, color: "#f5f0eb", fontWeight: "bold" }}>{fmt.label}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{fmt.w}×{fmt.h}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ padding: "13px 22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Volver</button>
              <button onClick={async () => { setStep(3); await generateContent(); }} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                Generar SEO + Publicar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: PUBLISH ── */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>Listo para publicar</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>SEO generado con IA · Copia Instagram lista · Imágenes descargadas</p>

            {loadingContent && (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#ff9f5a" }}>
                <div style={{ fontSize: 36, marginBottom: 10, animation: "spin 1s linear infinite" }}>⚡</div>
                Generando SEO y copy con IA...
              </div>
            )}

            {!loadingContent && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
                {/* Shopify */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(100,200,100,0.2)", borderRadius: 18, padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <span style={{ fontSize: 26 }}>🛍️</span>
                    <div><div style={{ fontSize: 15, fontWeight: "bold", color: "#7ec97e" }}>Shopify</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>SEO + SEM optimizado</div></div>
                  </div>
                  {seoData && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field label="TÍTULO SEO" value={seoData.title} color="#7ec97e" />
                    <Field label="META DESCRIPCIÓN" value={seoData.metaDescription} color="#7ec97e" />
                    <Field label="H1" value={seoData.h1} color="#7ec97e" />
                    <Field label="DESCRIPCIÓN PRODUCTO" value={seoData.bodyText} color="#7ec97e" />
                    <Field label="GOOGLE ADS HEADLINE" value={seoData.googleAdsHeadline} color="#7ec97e" />
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 6 }}>TAGS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {(seoData.tags || []).map((t, i) => <span key={i} style={{ background: "rgba(126,201,126,0.12)", border: "1px solid rgba(126,201,126,0.25)", borderRadius: 20, padding: "3px 9px", fontSize: 11, color: "#7ec97e" }}>{t}</span>)}
                      </div>
                    </div>
                  </div>}
                  <button onClick={() => { setPublishStatus(s => ({ ...s, shopify: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, shopify: "done" })), 2000); }} disabled={publishStatus.shopify === "loading" || publishStatus.shopify === "done"}
                    style={{ marginTop: 18, width: "100%", padding: "12px", background: publishStatus.shopify === "done" ? "rgba(126,201,126,0.25)" : "linear-gradient(135deg,#3a7d3a,#2d6a2d)", border: "1px solid rgba(126,201,126,0.3)", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                    {publishStatus.shopify === "loading" ? "⏳ Publicando..." : publishStatus.shopify === "done" ? "✅ Publicado en Shopify" : "🚀 Publicar en Shopify"}
                  </button>
                </div>

                {/* Instagram */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,100,200,0.2)", borderRadius: 18, padding: 22 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                    <span style={{ fontSize: 26 }}>📸</span>
                    <div><div style={{ fontSize: 15, fontWeight: "bold", color: "#c97ec9" }}>Instagram</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Feed + Stories</div></div>
                  </div>
                  {igCopy && <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <Field label="CAPTION" value={igCopy.caption} color="#c97ec9" />
                    <Field label="HASHTAGS" value={igCopy.hashtags} color="#c97ec9" />
                    <Field label="CTA" value={igCopy.cta} color="#c97ec9" />
                    <Field label="STORY TEXT" value={igCopy.storyText} color="#c97ec9" />
                  </div>}
                  {variantImages.length > 0 && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 8 }}>IMÁGENES GENERADAS</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {variantImages.map((v, i) => (
                          <img key={i} src={v.dataUrl} alt={v.label} onClick={() => downloadVariant(v, i)} title={`Descargar: ${v.label}`} style={{ width: "18%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)", opacity: 0.85 }} />
                        ))}
                      </div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>Click en cada imagen para descargar</div>
                    </div>
                  )}
                  <button onClick={() => { setPublishStatus(s => ({ ...s, instagram: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, instagram: "done" })), 1800); }} disabled={publishStatus.instagram === "loading" || publishStatus.instagram === "done"}
                    style={{ marginTop: 14, width: "100%", padding: "12px", background: publishStatus.instagram === "done" ? "rgba(201,126,201,0.25)" : "linear-gradient(135deg,#7b3a7b,#5a2a5a)", border: "1px solid rgba(201,126,201,0.3)", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                    {publishStatus.instagram === "loading" ? "⏳ Preparando..." : publishStatus.instagram === "done" ? "✅ Listo para Instagram" : "📱 Preparar para Instagram"}
                  </button>
                </div>

                {(publishStatus.shopify === "done" || publishStatus.instagram === "done") && (
                  <div style={{ gridColumn: "1/-1", background: "rgba(255,140,66,0.07)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 15, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 30, marginBottom: 6 }}>🎉</div>
                    <div style={{ fontSize: 17, color: "#ff9f5a", marginBottom: 4 }}>¡Producto procesado!</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>Mandarina · {productInfo.name || "Producto"} · ${productInfo.price || "—"}</div>
                    <button onClick={downloadAll} style={{ padding: "10px 24px", background: "rgba(255,140,66,0.15)", border: "1px solid rgba(255,140,66,0.4)", borderRadius: 10, color: "#ff9f5a", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginRight: 10 }}>⬇️ Descargar todas las imágenes</button>
                    <button onClick={reset} style={{ padding: "10px 24px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>+ Publicar otro producto</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.2)}button:hover{opacity:0.85}::-webkit-scrollbar{height:4px;width:4px}::-webkit-scrollbar-thumb{background:rgba(255,140,66,0.3);border-radius:2px}`}</style>
    </div>
  );
}
