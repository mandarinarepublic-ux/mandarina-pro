import { useState, useRef, useCallback } from "react";

const STEP_LABELS = ["📸 Foto", "🤖 Generar", "🎨 Variantes", "🚀 Publicar"];

const MODEL_STYLES = [
  { id: "urban_woman", label: "Mujer Urbana", icon: "👩", desc: "Modelo joven, look streetwear" },
  { id: "urban_man", label: "Hombre Urbano", icon: "👨", desc: "Modelo joven, look streetwear" },
  { id: "latina_woman", label: "Latina Chic", icon: "💃", desc: "Mujer latina, estilo moderno" },
  { id: "editorial", label: "Editorial", icon: "✨", desc: "Pose profesional de catálogo" },
];

const SCENE_STYLES = [
  { id: "urban", label: "Calle urbana", icon: "🏙️" },
  { id: "studio", label: "Studio blanco", icon: "⬜" },
  { id: "quito", label: "Quito city", icon: "🏔️" },
  { id: "lifestyle", label: "Lifestyle café", icon: "☕" },
];

const VARIANT_PROMPTS = [
  { label: "Calle Urbana", scene: "modern urban street, city background, natural light", model: "young latina woman", mood: "confident casual" },
  { label: "Studio Blanco", scene: "clean white studio background, professional lighting", model: "young latino man", mood: "fashion editorial" },
  { label: "Lifestyle", scene: "cozy cafe interior, warm bokeh background", model: "young latina woman", mood: "relaxed lifestyle" },
  { label: "Outdoor Quito", scene: "Quito Ecuador cityscape background, mountains visible", model: "young latino person", mood: "urban explorer" },
  { label: "Editorial Dark", scene: "dark moody studio, dramatic lighting, high fashion", model: "young model", mood: "premium editorial" },
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

// Generate image via Gemini Imagen 3
async function generateWithGemini(prompt, geminiKey) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          safetyFilterLevel: "block_few",
          personGeneration: "allow_adult",
        },
      }),
    }
  );
  const data = await res.json();
  if (data.predictions?.[0]?.bytesBase64Encoded) {
    return `data:image/jpeg;base64,${data.predictions[0].bytesBase64Encoded}`;
  }
  throw new Error(data.error?.message || "Gemini error");
}

function buildVariantPrompt(variantDef, productName, productDesc, productColor) {
  return `Hyperrealistic fashion photography. ${variantDef.model} wearing a ${productName || "stylish jacket"} ${productColor ? `in ${productColor}` : ""}. ${productDesc ? productDesc + "." : ""} 
Scene: ${variantDef.scene}. Mood: ${variantDef.mood}. 
Full body or 3/4 shot. The garment is clearly visible and is the main focus. Professional fashion photography, 8K, photorealistic, magazine quality, sharp focus on clothing details.`;
}

function Field({ label, value, color }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 5 }}>{label}</div>
      <div onClick={() => { navigator.clipboard.writeText(value || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        title="Clic para copiar"
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
  const [geminiKey, setGeminiKey] = useState("");
  const [productInfo, setProductInfo] = useState({ name: "", price: "", category: "Ropa", description: "", color: "" });
  const [selectedModel, setSelectedModel] = useState("urban_woman");
  const [selectedScene, setSelectedScene] = useState("urban");
  const [variantImages, setVariantImages] = useState([]);
  const [generatingIdx, setGeneratingIdx] = useState(-1);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [seoData, setSeoData] = useState(null);
  const [igCopy, setIgCopy] = useState(null);
  const [publishStatus, setPublishStatus] = useState({});
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  const generateAllVariants = async () => {
    setError("");
    setVariantImages([]);
    const results = [];
    for (let i = 0; i < VARIANT_PROMPTS.length; i++) {
      setGeneratingIdx(i);
      const v = VARIANT_PROMPTS[i];
      const prompt = buildVariantPrompt(v, productInfo.name, productInfo.description, productInfo.color);
      try {
        const dataUrl = await generateWithGemini(prompt, geminiKey);
        results.push({ ...v, dataUrl, prompt });
        setVariantImages([...results]);
      } catch (err) {
        setError(`Error en variante ${i + 1}: ${err.message}`);
        // Continue with others
        results.push({ ...v, dataUrl: null, error: err.message });
        setVariantImages([...results]);
      }
    }
    setGeneratingIdx(-1);
  };

  const downloadVariant = (variant, index) => {
    if (!variant.dataUrl) return;
    const a = document.createElement("a");
    a.href = variant.dataUrl;
    a.download = `mandarina-${productInfo.name || "producto"}-v${index + 1}-${variant.label.replace(/\s/g, "-").toLowerCase()}.jpg`;
    a.click();
  };

  const downloadAll = () => variantImages.forEach((v, i) => { if (v.dataUrl) downloadVariant(v, i); });

  const generateContent = async () => {
    setLoadingContent(true);
    try {
      const [seo, ig] = await Promise.all([
        callClaudeJSON(
          "Eres experto en SEO para e-commerce de moda latinoamericana. Responde SOLO JSON válido sin backticks.",
          `SEO para: Nombre: ${productInfo.name || "Prenda"}, Precio: $${productInfo.price}, Categoría: ${productInfo.category}, Descripción: ${productInfo.description}, Tienda: Mandarina Ecuador www.mandarinEc.com
JSON: {"title":"título SEO max 60 chars","metaDescription":"meta 150 chars","h1":"H1","bodyText":"descripción 2-3 oraciones persuasivas","tags":["t1","t2","t3","t4","t5"],"googleAdsHeadline":"max 30 chars","googleAdsCTA":"CTA"}`
        ),
        callClaudeJSON(
          "Eres community manager experto en moda latinoamericana. Responde SOLO JSON válido sin backticks.",
          `Instagram para: ${productInfo.name} $${productInfo.price} Mandarina Ecuador
JSON: {"caption":"caption con emojis max 220 chars","hashtags":"#mandarina #moda #ecuador #ootd #fashion #estilo","cta":"llamado a acción","storyText":"story 1-2 líneas"}`
        )
      ]);
      setSeoData(seo);
      setIgCopy(ig);
    } catch (e) { console.error(e); }
    finally { setLoadingContent(false); }
  };

  const reset = () => {
    setStep(0); setPhoto(null); setVariantImages([]); setSeoData(null);
    setIgCopy(null); setPublishStatus({}); setSelectedVariant(0); setError("");
    setProductInfo({ name: "", price: "", category: "Ropa", description: "", color: "" });
  };

  const isGenerating = generatingIdx >= 0;

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)", fontFamily: "'Georgia',serif", color: "#f5f0eb", overflowX: "hidden" }}>
      {/* Header */}
      <header style={{ padding: "18px 28px", borderBottom: "1px solid rgba(255,165,80,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,#ff8c42,#e63946)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: "bold" }}>M</div>
          <div>
            <div style={{ fontSize: 17, fontWeight: "bold", letterSpacing: "0.05em", color: "#ff9f5a" }}>MANDARINA PRO</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", letterSpacing: "0.15em" }}>AI FASHION · SHOPIFY · INSTAGRAM</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {STEP_LABELS.map((label, i) => (
            <button key={i} onClick={() => i <= step && setStep(i)} style={{ padding: "5px 12px", borderRadius: 20, border: i === step ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.1)", background: i === step ? "rgba(255,140,66,0.15)" : "transparent", color: i === step ? "#ff8c42" : i < step ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", fontSize: 11, cursor: i <= step ? "pointer" : "default", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: "0 auto", padding: "32px 20px" }}>

        {/* ── STEP 0: SETUP ── */}
        {step === 0 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 34, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>Foto del producto</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 28, fontSize: 14 }}>
              Sube la prenda → Gemini Imagen 3 genera modelos hiperrealistas usándola
            </p>

            {/* Gemini Key */}
            <div style={{ marginBottom: 24, background: "rgba(66,133,244,0.08)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span style={{ fontSize: 20 }}>🔑</span>
                <div style={{ fontSize: 13, color: "#7ab3ff", fontWeight: "bold" }}>Google Gemini API Key</div>
              </div>
              <input
                value={geminiKey}
                onChange={e => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                type="password"
                style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(66,133,244,0.3)", borderRadius: 10, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }}
              />
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginTop: 6 }}>
                Obtén tu key en → aistudio.google.com/apikey · Usará Imagen 3 para generar modelos con tu ropa
              </div>
            </div>

            {/* Drop zone */}
            <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current.click()} style={{ border: "2px dashed rgba(255,140,66,0.35)", borderRadius: 20, padding: photo ? "20px" : "60px 40px", textAlign: "center", cursor: "pointer", background: "rgba(255,140,66,0.03)", minHeight: 220, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              {photo
                ? <img src={photo} alt="producto" style={{ maxHeight: 300, maxWidth: "100%", borderRadius: 12, objectFit: "contain", boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }} />
                : <><div style={{ fontSize: 56, marginBottom: 12, opacity: 0.5 }}>👕</div><div style={{ fontSize: 18, color: "#ff9f5a", marginBottom: 8 }}>Sube la foto de la prenda</div><div style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>JPG, PNG, HEIC · La IA la pondrá en modelos reales</div></>
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

            {photo && (
              <>
                <div style={{ marginTop: 22, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,140,66,0.15)", borderRadius: 16, padding: 20 }}>
                  <div style={{ fontSize: 12, color: "#ff9f5a", marginBottom: 14, letterSpacing: "0.1em" }}>INFORMACIÓN DEL PRODUCTO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 5 }}>NOMBRE DEL PRODUCTO</label>
                      <input value={productInfo.name} onChange={e => setProductInfo(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Chaqueta Dragon Ball Z azul" style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 9, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 5 }}>PRECIO $</label>
                      <input value={productInfo.price} onChange={e => setProductInfo(p => ({ ...p, price: e.target.value }))} placeholder="35.00" style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 9, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 5 }}>COLOR</label>
                      <input value={productInfo.color} onChange={e => setProductInfo(p => ({ ...p, color: e.target.value }))} placeholder="azul, negro, beige..." style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 9, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 5 }}>CATEGORÍA</label>
                      <input value={productInfo.category} onChange={e => setProductInfo(p => ({ ...p, category: e.target.value }))} placeholder="Ropa" style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 9, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", display: "block", marginBottom: 5 }}>DESCRIPCIÓN (mejora la calidad de las imágenes generadas)</label>
                      <textarea value={productInfo.description} onChange={e => setProductInfo(p => ({ ...p, description: e.target.value }))} placeholder="Ej: bomber jacket estilo anime, parches bordados, tela premium..." rows={2} style={{ width: "100%", padding: "9px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 9, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setStep(1)}
                  disabled={!geminiKey}
                  style={{ marginTop: 18, width: "100%", padding: "15px", background: geminiKey ? "linear-gradient(135deg,#ff8c42,#e63946)" : "rgba(255,255,255,0.1)", border: "none", borderRadius: 13, color: geminiKey ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: "bold", cursor: geminiKey ? "pointer" : "not-allowed", fontFamily: "inherit" }}>
                  {geminiKey ? "Configurar modelos →" : "Ingresa tu Gemini API Key para continuar"}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── STEP 1: GENERATE ── */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>Configura los modelos</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>Gemini generará 5 variantes hiperrealistas de tu prenda en personas reales</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, letterSpacing: "0.1em" }}>TIPO DE MODELO</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {MODEL_STYLES.map(m => (
                    <button key={m.id} onClick={() => setSelectedModel(m.id)} style={{ padding: "12px 16px", background: selectedModel === m.id ? "rgba(255,140,66,0.18)" : "rgba(255,255,255,0.04)", border: selectedModel === m.id ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.08)", borderRadius: 11, cursor: "pointer", textAlign: "left", fontFamily: "inherit", display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ fontSize: 24 }}>{m.icon}</span>
                      <div>
                        <div style={{ fontSize: 13, color: selectedModel === m.id ? "#ff9f5a" : "#f5f0eb", fontWeight: "bold" }}>{m.label}</div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>{m.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 12, letterSpacing: "0.1em" }}>ESCENARIO / FONDO</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  {SCENE_STYLES.map(s => (
                    <button key={s.id} onClick={() => setSelectedScene(s.id)} style={{ padding: "16px 12px", background: selectedScene === s.id ? "rgba(255,140,66,0.18)" : "rgba(255,255,255,0.04)", border: selectedScene === s.id ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.08)", borderRadius: 11, cursor: "pointer", textAlign: "center", fontFamily: "inherit" }}>
                      <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
                      <div style={{ fontSize: 12, color: selectedScene === s.id ? "#ff9f5a" : "#f5f0eb" }}>{s.label}</div>
                    </button>
                  ))}
                </div>

                {/* Preview of what will be generated */}
                <div style={{ marginTop: 16, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,140,66,0.15)", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 8, letterSpacing: "0.1em" }}>SE GENERARÁN 5 VARIANTES</div>
                  {VARIANT_PROMPTS.map((v, i) => (
                    <div key={i} style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4, display: "flex", gap: 8 }}>
                      <span style={{ color: "#ff9f5a" }}>V{i+1}</span> {v.label} — {v.scene.substring(0, 40)}...
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(0)} style={{ padding: "13px 22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Volver</button>
              <button onClick={async () => { setStep(2); await generateAllVariants(); }} style={{ flex: 1, padding: "13px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                🤖 Generar con Gemini Imagen 3 →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: VARIANTS ── */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>
              {isGenerating ? `Generando variante ${generatingIdx + 1} de 5...` : `${variantImages.filter(v => v.dataUrl).length} variantes generadas`}
            </h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>
              {isGenerating ? "Gemini Imagen 3 está creando modelos hiperrealistas con tu prenda" : "Imágenes hiperrealistas listas para descargar y publicar"}
            </p>

            {error && (
              <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.3)", borderRadius: 10, fontSize: 12, color: "#ff8888" }}>
                ⚠️ {error}
              </div>
            )}

            {/* Progress */}
            {isGenerating && (
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {VARIANT_PROMPTS.map((v, i) => (
                    <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < generatingIdx ? "#ff8c42" : i === generatingIdx ? "rgba(255,140,66,0.5)" : "rgba(255,255,255,0.1)", transition: "background 0.5s" }} />
                  ))}
                </div>
                <div style={{ textAlign: "center", color: "#ff9f5a", fontSize: 14 }}>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block", marginRight: 8 }}>⚡</span>
                  {VARIANT_PROMPTS[generatingIdx]?.label} — Gemini Imagen 3 generando...
                </div>
              </div>
            )}

            {/* Grid of generated images */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, marginBottom: 20 }}>
              {VARIANT_PROMPTS.map((v, i) => {
                const img = variantImages[i];
                const isDone = img?.dataUrl;
                const isLoading = i === generatingIdx;
                const isPending = i > generatingIdx && isGenerating;
                return (
                  <div key={i} onClick={() => isDone && setSelectedVariant(i)} style={{ cursor: isDone ? "pointer" : "default", borderRadius: 12, overflow: "hidden", border: selectedVariant === i && isDone ? "2px solid #ff8c42" : "2px solid rgba(255,255,255,0.08)", position: "relative", aspectRatio: "1", background: "#111" }}>
                    {isDone && <img src={img.dataUrl} alt={v.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    {isLoading && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.8)" }}>
                        <div style={{ fontSize: 24, animation: "spin 1s linear infinite" }}>⚡</div>
                        <div style={{ fontSize: 9, color: "#ff9f5a", marginTop: 6, textAlign: "center", padding: "0 4px" }}>Generando...</div>
                      </div>
                    )}
                    {isPending && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <div style={{ fontSize: 20, opacity: 0.3 }}>⏳</div>
                      </div>
                    )}
                    {img?.error && (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,0,0,0.1)" }}>
                        <div style={{ fontSize: 20 }}>❌</div>
                      </div>
                    )}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "5px", background: "linear-gradient(transparent, rgba(0,0,0,0.85))", textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "#fff", fontWeight: "bold" }}>{v.label}</div>
                    </div>
                    {isDone && (
                      <button onClick={(e) => { e.stopPropagation(); downloadVariant(img, i); }} style={{ position: "absolute", top: 5, right: 5, background: "rgba(0,0,0,0.7)", border: "none", borderRadius: 5, color: "#fff", fontSize: 12, cursor: "pointer", padding: "3px 5px" }} title="Descargar">⬇</button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Large preview */}
            {variantImages[selectedVariant]?.dataUrl && (
              <div style={{ borderRadius: 18, overflow: "hidden", position: "relative", marginBottom: 18 }}>
                <img src={variantImages[selectedVariant].dataUrl} alt="selected" style={{ width: "100%", maxHeight: 520, objectFit: "cover", display: "block" }} />
                <div style={{ position: "absolute", top: 12, left: 12, background: "rgba(0,0,0,0.7)", borderRadius: 20, padding: "5px 14px", fontSize: 12, color: "#fff" }}>
                  {variantImages[selectedVariant].label} · Gemini Imagen 3
                </div>
                <button onClick={() => downloadVariant(variantImages[selectedVariant], selectedVariant)} style={{ position: "absolute", bottom: 12, right: 12, background: "rgba(0,0,0,0.8)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 10, color: "#fff", fontSize: 13, cursor: "pointer", padding: "8px 16px", fontFamily: "inherit" }}>
                  ⬇️ Descargar
                </button>
              </div>
            )}

            {!isGenerating && variantImages.some(v => v.dataUrl) && (
              <button onClick={downloadAll} style={{ width: "100%", padding: "12px", background: "rgba(255,140,66,0.15)", border: "1px solid rgba(255,140,66,0.4)", borderRadius: 12, color: "#ff9f5a", fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit", marginBottom: 12 }}>
                ⬇️ Descargar todas ({variantImages.filter(v => v.dataUrl).length} imágenes)
              </button>
            )}

            <div style={{ display: "flex", gap: 12 }}>
              <button onClick={() => setStep(1)} style={{ padding: "13px 22px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 12, color: "rgba(255,255,255,0.6)", fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>← Volver</button>
              <button onClick={async () => { setStep(3); await generateContent(); }} disabled={isGenerating} style={{ flex: 1, padding: "13px", background: isGenerating ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: isGenerating ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                Generar SEO + Publicar →
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: PUBLISH ── */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>Listo para publicar</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>SEO generado · Copy Instagram · {variantImages.filter(v=>v.dataUrl).length} imágenes AI listas</p>
            {loadingContent && <div style={{ textAlign: "center", padding: "50px 20px", color: "#ff9f5a" }}><div style={{ fontSize: 36, marginBottom: 10, animation: "spin 1s linear infinite" }}>⚡</div>Generando SEO y copy con IA...</div>}
            {!loadingContent && (
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
                    <Field label="DESCRIPCIÓN" value={seoData.bodyText} color="#7ec97e" />
                    <Field label="GOOGLE ADS" value={seoData.googleAdsHeadline} color="#7ec97e" />
                    <div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 6 }}>TAGS</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                        {(seoData.tags || []).map((t, i) => <span key={i} style={{ background: "rgba(126,201,126,0.12)", border: "1px solid rgba(126,201,126,0.25)", borderRadius: 20, padding: "3px 9px", fontSize: 11, color: "#7ec97e" }}>{t}</span>)}
                      </div>
                    </div>
                  </div>}
                  <button onClick={() => { setPublishStatus(s => ({ ...s, shopify: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, shopify: "done" })), 2000); }} disabled={publishStatus.shopify === "done"}
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
                  {variantImages.some(v => v.dataUrl) && (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 8 }}>IMÁGENES AI GENERADAS</div>
                      <div style={{ display: "flex", gap: 6 }}>
                        {variantImages.filter(v => v.dataUrl).map((v, i) => (
                          <img key={i} src={v.dataUrl} alt={v.label} onClick={() => downloadVariant(v, i)} title={`Descargar: ${v.label}`} style={{ width: "18%", aspectRatio: "1", objectFit: "cover", borderRadius: 8, cursor: "pointer", border: "1px solid rgba(255,255,255,0.1)" }} />
                        ))}
                      </div>
                    </div>
                  )}
                  <button onClick={() => { setPublishStatus(s => ({ ...s, instagram: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, instagram: "done" })), 1800); }} disabled={publishStatus.instagram === "done"}
                    style={{ marginTop: 14, width: "100%", padding: "12px", background: publishStatus.instagram === "done" ? "rgba(201,126,201,0.25)" : "linear-gradient(135deg,#7b3a7b,#5a2a5a)", border: "1px solid rgba(201,126,201,0.3)", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                    {publishStatus.instagram === "loading" ? "⏳ Preparando..." : publishStatus.instagram === "done" ? "✅ Listo para Instagram" : "📱 Preparar para Instagram"}
                  </button>
                </div>
                {(publishStatus.shopify === "done" || publishStatus.instagram === "done") && (
                  <div style={{ gridColumn: "1/-1", background: "rgba(255,140,66,0.07)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 15, padding: 20, textAlign: "center" }}>
                    <div style={{ fontSize: 30, marginBottom: 6 }}>🎉</div>
                    <div style={{ fontSize: 17, color: "#ff9f5a", marginBottom: 4 }}>¡Producto procesado con IA!</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>Mandarina · {productInfo.name} · ${productInfo.price}</div>
                    <button onClick={downloadAll} style={{ padding: "10px 24px", background: "rgba(255,140,66,0.15)", border: "1px solid rgba(255,140,66,0.4)", borderRadius: 10, color: "#ff9f5a", fontSize: 13, cursor: "pointer", fontFamily: "inherit", marginRight: 10 }}>⬇️ Descargar imágenes</button>
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
