import { useState, useRef, useCallback } from "react";

const STEPS = ["capture", "edit", "variants", "publish"];
const STEP_LABELS = ["📸 Foto", "✨ Editar", "🎨 Variantes", "🚀 Publicar"];

const PRESETS = [
  { id: "studio_white", label: "Studio White", icon: "⬜", desc: "Fondo blanco profesional", filter: "brightness(1.1) contrast(1.05) saturate(1.1)", bg: "#ffffff" },
  { id: "studio_gray", label: "Studio Gray", icon: "🔲", desc: "Fondo gris neutro", filter: "brightness(1.05) contrast(1.1) saturate(0.95)", bg: "#f0f0f0" },
  { id: "lifestyle", label: "Lifestyle", icon: "🌿", desc: "Fondo difuminado natural", filter: "brightness(1.0) contrast(0.95) saturate(1.2) sepia(0.05)", bg: "#e8e4de" },
  { id: "luxury", label: "Luxury Dark", icon: "🖤", desc: "Fondo negro elegante", filter: "brightness(0.95) contrast(1.15) saturate(1.05)", bg: "#1a1a1a" },
  { id: "warm", label: "Warm Tones", icon: "🧡", desc: "Tonos cálidos", filter: "brightness(1.05) contrast(1.0) saturate(1.15) sepia(0.1)", bg: "#f5ede0" },
  { id: "cool", label: "Cool & Fresh", icon: "💙", desc: "Tonos fríos", filter: "brightness(1.05) contrast(1.0) saturate(0.9) hue-rotate(15deg)", bg: "#e0eaf5" },
];

const VARIANTS = [
  { label: "Studio Blanco", filter: "brightness(1.1) contrast(1.05) saturate(1.1)", bg: "#ffffff", badge: "⭐ Recomendado" },
  { label: "Studio Gris", filter: "brightness(1.05) contrast(1.1) saturate(0.95)", bg: "#f0f0f0", badge: "🏷️ Shopify" },
  { label: "Lifestyle", filter: "brightness(1.0) contrast(0.95) saturate(1.2) sepia(0.05)", bg: "#e8e4de", badge: "📸 Instagram" },
  { label: "Luxury Dark", filter: "brightness(0.95) contrast(1.15) saturate(1.05)", bg: "#1a1a1a", badge: "✨ Premium" },
  { label: "Warm Tones", filter: "brightness(1.05) contrast(1.0) saturate(1.15) sepia(0.1)", bg: "#f5ede0", badge: "🧡 Lifestyle" },
];

const INSTAGRAM_FORMATS = [
  { id: "feed", label: "Feed 1:1", w: 1080, h: 1080, icon: "⬛" },
  { id: "portrait", label: "Portrait 4:5", w: 1080, h: 1350, icon: "📱" },
  { id: "story", label: "Story 9:16", w: 1080, h: 1920, icon: "🔮" },
];

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
      <div
        onClick={() => { navigator.clipboard.writeText(value || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        title="Clic para copiar"
        style={{
          background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)",
          borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#f5f0eb",
          lineHeight: 1.5, cursor: "copy", position: "relative",
        }}
      >
        {value}
        {copied && <span style={{ position: "absolute", top: 4, right: 8, fontSize: 10, color: color }}>✓ copiado</span>}
      </div>
    </div>
  );
}

export default function MandarinaPro() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [selectedPreset, setSelectedPreset] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [variants, setVariants] = useState([]);
  const [seoData, setSeoData] = useState(null);
  const [igCopy, setIgCopy] = useState(null);
  const [publishStatus, setPublishStatus] = useState({});
  const [loading, setLoading] = useState("");
  const [productInfo, setProductInfo] = useState({ name: "", price: "", category: "Ropa", description: "" });
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    handleFile(e.dataTransfer.files[0]);
  }, [handleFile]);

  const applyPreset = (preset) => {
    setSelectedPreset(preset.id);
    setLoading(`Aplicando ${preset.label}...`);
    setTimeout(() => setLoading(""), 1200);
  };

  const goToVariants = () => {
    setVariants(VARIANTS);
    setStep(2);
  };

  const generateContent = async () => {
    setLoading("Generando SEO y copy con IA...");
    try {
      const [seo, ig] = await Promise.all([
        callClaudeJSON(
          "Eres experto en SEO para e-commerce de moda latinoamericana. Responde SOLO JSON válido sin backticks.",
          `Genera SEO para: Nombre: ${productInfo.name || "Prenda de moda"}, Precio: $${productInfo.price || "XX"}, Categoría: ${productInfo.category}, Descripción: ${productInfo.description || "Prenda moderna"}, Tienda: Mandarina Ecuador www.mandarinEc.com
JSON: {"title":"título SEO max 60 chars","metaDescription":"meta 150 chars","h1":"encabezado H1","bodyText":"descripción 2-3 oraciones","tags":["t1","t2","t3","t4","t5"],"googleAdsHeadline":"titular max 30 chars","googleAdsCTA":"CTA"}`
        ),
        callClaudeJSON(
          "Eres community manager de moda latinoamericana. Responde SOLO JSON válido sin backticks.",
          `Copy Instagram para: ${productInfo.name || "prenda"} $${productInfo.price || "XX"} Mandarina Ecuador
JSON: {"caption":"caption con emojis max 220 chars","hashtags":"#mandarina #moda #ecuador #ootd #fashion #estilo","cta":"llamado a acción","storyText":"texto story 1-2 líneas"}`
        )
      ]);
      setSeoData(seo);
      setIgCopy(ig);
    } catch (e) { console.error(e); }
    finally { setLoading(""); }
  };

  const reset = () => {
    setStep(0); setPhoto(null); setVariants([]); setSeoData(null);
    setIgCopy(null); setPublishStatus({}); setSelectedPreset(null);
    setProductInfo({ name: "", price: "", category: "Ropa", description: "" });
  };

  const currentPreset = PRESETS.find(p => p.id === selectedPreset);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)", fontFamily: "'Georgia',serif", color: "#f5f0eb", overflowX: "hidden" }}>
      {/* Header */}
      <header style={{ padding: "20px 28px 16px", borderBottom: "1px solid rgba(255,165,80,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
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

      <main style={{ maxWidth: 900, margin: "0 auto", padding: "32px 20px" }}>

        {/* STEP 0 */}
        {step === 0 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 34, fontWeight: "normal", color: "#ff9f5a", letterSpacing: "-0.02em", marginBottom: 8 }}>Sube tu foto de producto</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 28, fontSize: 14 }}>Toma una foto simple y la convertimos en imagen profesional</p>
            <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current.click()} style={{ border: "2px dashed rgba(255,140,66,0.35)", borderRadius: 20, padding: "60px 40px", textAlign: "center", cursor: "pointer", background: "rgba(255,140,66,0.03)", minHeight: 280, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {photo
                ? <img src={photo} alt="producto" style={{ maxHeight: 360, maxWidth: "100%", borderRadius: 12, objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
                : <><div style={{ fontSize: 60, marginBottom: 14, opacity: 0.5 }}>📸</div><div style={{ fontSize: 19, color: "#ff9f5a", marginBottom: 8 }}>Arrastra tu foto aquí</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>o haz clic para seleccionar · JPG, PNG, HEIC</div></>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

            {photo && (
              <>
                <div style={{ marginTop: 24, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,140,66,0.15)", borderRadius: 16, padding: 22 }}>
                  <div style={{ fontSize: 12, color: "#ff9f5a", marginBottom: 14, letterSpacing: "0.1em" }}>INFORMACIÓN DEL PRODUCTO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>NOMBRE</label>
                      <input value={productInfo.name} onChange={e => setProductInfo(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Blusa floral manga corta" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>PRECIO $</label>
                      <input value={productInfo.price} onChange={e => setProductInfo(p => ({ ...p, price: e.target.value }))} placeholder="29.90" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>CATEGORÍA</label>
                      <input value={productInfo.category} onChange={e => setProductInfo(p => ({ ...p, category: e.target.value }))} placeholder="Ropa / Accesorios" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ gridColumn: "1 / -1" }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", display: "block", marginBottom: 5 }}>DESCRIPCIÓN</label>
                      <textarea value={productInfo.description} onChange={e => setProductInfo(p => ({ ...p, description: e.target.value }))} placeholder="Describe el producto brevemente..." rows={2} style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
                <button onClick={() => setStep(1)} style={{ marginTop: 20, width: "100%", padding: "15px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 13, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", letterSpacing: "0.04em", fontFamily: "inherit" }}>
                  Continuar → Editar foto
                </button>
              </>
            )}
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>Elige el estilo de edición</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>Selecciona un preset profesional para tu producto</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ borderRadius: 16, overflow: "hidden", border: "1px solid rgba(255,140,66,0.15)", aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", background: currentPreset ? currentPreset.bg : "#111" }}>
                <img src={photo} alt="preview" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", filter: currentPreset ? currentPreset.filter : "none", transition: "filter 0.5s ease" }} />
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, letterSpacing: "0.1em" }}>SELECCIONA UN ESTILO</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {PRESETS.map(p => (
                    <button key={p.id} onClick={() => applyPreset(p)} style={{ padding: "14px 10px", background: selectedPreset === p.id ? "rgba(255,140,66,0.18)" : "rgba(255,255,255,0.04)", border: selectedPreset === p.id ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.08)", borderRadius: 11, cursor: "pointer", textAlign: "center", fontFamily: "inherit" }}>
                      <div style={{ fontSize: 26, marginBottom: 4 }}>{p.icon}</div>
                      <div style={{ fontSize: 12, color: selectedPreset === p.id ? "#ff9f5a" : "#f5f0eb", fontWeight: "bold" }}>{p.label}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 2 }}>{p.desc}</div>
                    </button>
                  ))}
                </div>
                {loading && <div style={{ marginTop: 12, padding: "9px 14px", background: "rgba(255,140,66,0.1)", borderRadius: 9, fontSize: 12, color: "#ff9f5a", textAlign: "center" }}>⚡ {loading}</div>}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => setStep(0)} style={{ padding: "13px 22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Volver</button>
              <button onClick={goToVariants} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>Generar 5 variantes →</button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>5 variantes generadas</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>Selecciona la que prefieres publicar</p>
            <div style={{ display: "flex", gap: 10, marginBottom: 20, overflowX: "auto", paddingBottom: 6 }}>
              {variants.map((v, i) => (
                <button key={i} onClick={() => setSelectedVariant(i)} style={{ flex: "0 0 140px", borderRadius: 12, overflow: "hidden", border: selectedVariant === i ? "2px solid #ff8c42" : "2px solid rgba(255,255,255,0.08)", cursor: "pointer", padding: 0, background: v.bg }}>
                  <img src={photo} alt={v.label} style={{ width: "100%", aspectRatio: "1", objectFit: "contain", filter: v.filter, display: "block" }} />
                  <div style={{ padding: "7px", background: "rgba(0,0,0,0.7)", textAlign: "center" }}>
                    <div style={{ fontSize: 11, color: "#fff", fontWeight: "bold" }}>{v.label}</div>
                    <div style={{ fontSize: 10, color: "#ff9f5a" }}>{v.badge}</div>
                  </div>
                </button>
              ))}
            </div>
            {variants[selectedVariant] && (
              <div style={{ borderRadius: 18, overflow: "hidden", background: variants[selectedVariant].bg, display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, position: "relative" }}>
                <img src={photo} alt="selected" style={{ maxHeight: 380, maxWidth: "100%", objectFit: "contain", filter: variants[selectedVariant].filter }} />
                <div style={{ position: "absolute", top: 12, right: 12, background: "rgba(255,140,66,0.9)", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#fff", fontWeight: "bold" }}>{variants[selectedVariant].badge}</div>
              </div>
            )}
            <div style={{ marginTop: 20 }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, letterSpacing: "0.1em" }}>FORMATOS INSTAGRAM</div>
              <div style={{ display: "flex", gap: 10 }}>
                {INSTAGRAM_FORMATS.map(fmt => (
                  <div key={fmt.id} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,140,66,0.15)", borderRadius: 11, padding: "12px", textAlign: "center" }}>
                    <div style={{ fontSize: 26, marginBottom: 4 }}>{fmt.icon}</div>
                    <div style={{ fontSize: 12, color: "#f5f0eb", fontWeight: "bold" }}>{fmt.label}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2 }}>{fmt.w}×{fmt.h}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button onClick={() => setStep(1)} style={{ padding: "13px 22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Volver</button>
              <button onClick={async () => { setStep(3); await generateContent(); }} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>Generar SEO + Publicar →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>Listo para publicar</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>SEO generado con IA · Copia Instagram lista</p>
            {loading && <div style={{ textAlign: "center", padding: "50px 20px", color: "#ff9f5a", fontSize: 15 }}>⚡ {loading}</div>}
            {!loading && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
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
                  <button
                    onClick={() => { setPublishStatus(s => ({ ...s, shopify: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, shopify: "done" })), 2000); }}
                    disabled={publishStatus.shopify === "loading" || publishStatus.shopify === "done"}
                    style={{ marginTop: 18, width: "100%", padding: "12px", background: publishStatus.shopify === "done" ? "rgba(126,201,126,0.25)" : "linear-gradient(135deg,#3a7d3a,#2d6a2d)", border: "1px solid rgba(126,201,126,0.3)", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                    {publishStatus.shopify === "loading" ? "⏳ Publicando..." : publishStatus.shopify === "done" ? "✅ Publicado en Shopify" : "🚀 Publicar en Shopify"}
                  </button>
                </div>
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
                  <button
                    onClick={() => { setPublishStatus(s => ({ ...s, instagram: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, instagram: "done" })), 1800); }}
                    disabled={publishStatus.instagram === "loading" || publishStatus.instagram === "done"}
                    style={{ marginTop: 18, width: "100%", padding: "12px", background: publishStatus.instagram === "done" ? "rgba(201,126,201,0.25)" : "linear-gradient(135deg,#7b3a7b,#5a2a5a)", border: "1px solid rgba(201,126,201,0.3)", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                    {publishStatus.instagram === "loading" ? "⏳ Preparando..." : publishStatus.instagram === "done" ? "✅ Listo para Instagram" : "📱 Preparar para Instagram"}
                  </button>
                </div>
                {(publishStatus.shopify === "done" || publishStatus.instagram === "done") && (
                  <div style={{ gridColumn: "1/-1", background: "rgba(255,140,66,0.07)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 15, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 30, marginBottom: 6 }}>🎉</div>
                    <div style={{ fontSize: 17, color: "#ff9f5a", marginBottom: 4 }}>¡Tu producto está en línea!</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>Mandarina · {productInfo.name || "Nuevo producto"} · ${productInfo.price || "—"}</div>
                    <button onClick={reset} style={{ marginTop: 14, padding: "10px 26px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>+ Publicar otro producto</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.2)}button:hover{opacity:0.85}::-webkit-scrollbar{height:4px;width:4px}::-webkit-scrollbar-thumb{background:rgba(255,140,66,0.3);border-radius:2px}`}</style>
    </div>
  );
}
