import { useState, useRef, useCallback } from "react";

// ─── VARIANT DEFINITIONS ────────────────────────────────────────────────────
const VARIANT_PROMPTS = [
  { label: "Calle Urbana", scene: "modern urban street, city background, natural light", model: "young latina woman, 25yo", mood: "confident casual" },
  { label: "Studio Blanco", scene: "clean white studio, professional fashion lighting", model: "young latino man, 25yo", mood: "fashion editorial" },
  { label: "Lifestyle Café", scene: "cozy cafe interior, warm bokeh background", model: "young latina woman, 25yo", mood: "relaxed lifestyle" },
  { label: "Outdoor Quito", scene: "Quito Ecuador cityscape, Andes mountains background", model: "young latino man, 25yo", mood: "urban explorer" },
  { label: "Editorial Dark", scene: "dark moody studio, dramatic high-contrast lighting", model: "young model", mood: "premium editorial" },
];

// ─── API HELPERS ─────────────────────────────────────────────────────────────
async function callClaudeJSON(systemPrompt, userPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });
  const data = await res.json();
  const text = data.content?.[0]?.text || "{}";
  const tokens = data.usage ? (data.usage.input_tokens + data.usage.output_tokens) : 0;
  try { return { result: JSON.parse(text.replace(/```json|```/g, "").trim()), tokens }; }
  catch { return { result: null, tokens }; }
}

function dataUrlToBase64(dataUrl) { return dataUrl.split(",")[1]; }

async function generateWithGemini(prompt, geminiKey, productPhotoBase64) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: productPhotoBase64 } },
            { text: `You are a professional fashion photographer. Using EXACTLY this garment from the reference photo (same colors, same design, same patterns, same details), create a hyperrealistic fashion photo where: ${prompt}. 
CRITICAL RULES:
- The garment must be IDENTICAL to the reference photo - same colors, same prints, same design
- Do NOT change or invent the clothing design
- Only change the model person and background scene
- Full body or 3/4 shot, garment clearly visible
- Photorealistic, 8K quality, magazine standard` }
          ]
        }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 0.4 },
      }),
    }
  );
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));
  const tokens = data.usageMetadata ? (data.usageMetadata.promptTokenCount + (data.usageMetadata.candidatesTokenCount || 0)) : 0;
  if (imagePart) return { dataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`, tokens };
  throw new Error(data.error?.message || data.candidates?.[0]?.finishReason || "Error generando imagen");
}

// ─── EDITABLE FIELD ──────────────────────────────────────────────────────────
function EditableField({ label, value, onChange, multiline = false, color = "#ff9f5a" }) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em" }}>{label}</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => setEditing(!editing)} style={{ background: editing ? "rgba(255,140,66,0.2)" : "rgba(255,255,255,0.06)", border: `1px solid ${editing ? "#ff8c42" : "rgba(255,255,255,0.1)"}`, borderRadius: 5, color: editing ? "#ff9f5a" : "rgba(255,255,255,0.4)", fontSize: 10, cursor: "pointer", padding: "2px 7px", fontFamily: "inherit" }}>
            {editing ? "✓ Listo" : "✏️ Editar"}
          </button>
          <button onClick={copy} style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, color: copied ? color : "rgba(255,255,255,0.4)", fontSize: 10, cursor: "pointer", padding: "2px 7px", fontFamily: "inherit" }}>
            {copied ? "✓" : "📋"}
          </button>
        </div>
      </div>
      {editing ? (
        multiline
          ? <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px", background: "rgba(255,140,66,0.08)", border: `1px solid #ff8c42`, borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box" }} />
          : <input value={value || ""} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "rgba(255,140,66,0.08)", border: `1px solid #ff8c42`, borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
      ) : (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: "8px 12px", fontSize: 13, color: "#f5f0eb", lineHeight: 1.6, minHeight: 36 }}>
          {value || <span style={{ color: "rgba(255,255,255,0.2)" }}>—</span>}
        </div>
      )}
    </div>
  );
}

// ─── TOKEN COUNTER ────────────────────────────────────────────────────────────
function TokenBadge({ tokens }) {
  if (!tokens) return null;
  const cost = (tokens * 0.000003).toFixed(4);
  return (
    <span style={{ background: "rgba(255,200,50,0.12)", border: "1px solid rgba(255,200,50,0.25)", borderRadius: 20, padding: "2px 10px", fontSize: 10, color: "#ffd060", marginLeft: 8 }}>
      ⚡ {tokens.toLocaleString()} tokens · ~${cost}
    </span>
  );
}

// ─── INSTAGRAM PREVIEW ───────────────────────────────────────────────────────
function InstagramPreview({ image, caption, hashtags, productName, price }) {
  return (
    <div style={{ background: "#000", borderRadius: 16, overflow: "hidden", maxWidth: 380, margin: "0 auto", border: "1px solid rgba(255,255,255,0.1)" }}>
      {/* Header */}
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#ff8c42,#e63946)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold" }}>M</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: "bold", color: "#fff" }}>mandarina.ec</div>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Quito, Ecuador</div>
        </div>
        <div style={{ marginLeft: "auto", fontSize: 18, color: "rgba(255,255,255,0.6)" }}>···</div>
      </div>
      {/* Image */}
      {image && <img src={image} alt="post" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />}
      {/* Actions */}
      <div style={{ padding: "10px 14px 4px", display: "flex", gap: 16 }}>
        <span style={{ fontSize: 22 }}>🤍</span>
        <span style={{ fontSize: 22 }}>💬</span>
        <span style={{ fontSize: 22 }}>📤</span>
        <span style={{ fontSize: 22, marginLeft: "auto" }}>🔖</span>
      </div>
      {/* Caption */}
      <div style={{ padding: "4px 14px 14px" }}>
        <div style={{ fontSize: 12, color: "#fff", lineHeight: 1.5, marginBottom: 4 }}>
          <strong>mandarina.ec</strong> {caption}
        </div>
        <div style={{ fontSize: 11, color: "#4a9eff", lineHeight: 1.6 }}>{hashtags}</div>
        {price && <div style={{ marginTop: 8, display: "inline-block", background: "rgba(255,140,66,0.2)", border: "1px solid rgba(255,140,66,0.4)", borderRadius: 6, padding: "2px 10px", fontSize: 11, color: "#ff9f5a" }}>💰 ${price}</div>}
      </div>
    </div>
  );
}

// ─── SHOPIFY PREVIEW ──────────────────────────────────────────────────────────
function ShopifyPreview({ image, title, metaDesc, bodyText, tags, h1, googleAds }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", color: "#333", fontFamily: "Arial, sans-serif" }}>
      {/* Browser bar */}
      <div style={{ background: "#f5f5f5", padding: "8px 14px", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 5 }}><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#ff5f57" }} /><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#febc2e" }} /><div style={{ width: 10, height: 10, borderRadius: "50%", background: "#28c840" }} /></div>
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 6, padding: "3px 12px", fontSize: 11, color: "#666", flex: 1 }}>mandarinec.myshopify.com/products/{title?.toLowerCase().replace(/\s+/g, "-").substring(0, 30)}</div>
      </div>
      {/* Google snippet */}
      <div style={{ padding: "12px 16px", background: "#f8f9fa", borderBottom: "1px solid #eee" }}>
        <div style={{ fontSize: 10, color: "#666", marginBottom: 3 }}>📊 Vista previa en Google</div>
        <div style={{ fontSize: 14, color: "#1a0dab", fontWeight: "bold" }}>{title || "Título SEO"}</div>
        <div style={{ fontSize: 11, color: "#006621" }}>mandarinec.com › productos</div>
        <div style={{ fontSize: 12, color: "#545454", lineHeight: 1.4 }}>{metaDesc || "Meta descripción..."}</div>
      </div>
      {/* Product */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
        {image && <img src={image} alt="product" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />}
        <div style={{ padding: "16px" }}>
          <div style={{ fontSize: 10, color: "#999", marginBottom: 4 }}>MANDARINA</div>
          <div style={{ fontSize: 15, fontWeight: "bold", color: "#111", marginBottom: 6, lineHeight: 1.3 }}>{h1 || title}</div>
          <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5, marginBottom: 10 }}>{bodyText}</div>
          {tags && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {(Array.isArray(tags) ? tags : []).map((t, i) => <span key={i} style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 6px", fontSize: 10, color: "#666" }}>{t}</span>)}
          </div>}
          {googleAds && <div style={{ background: "#fef9e7", border: "1px solid #f9ca24", borderRadius: 6, padding: "6px 10px", fontSize: 10 }}>
            <div style={{ color: "#666", marginBottom: 2 }}>📢 Google Ads</div>
            <div style={{ color: "#333", fontWeight: "bold" }}>{googleAds}</div>
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function MandarinaPro() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [promptGuide, setPromptGuide] = useState("");
  const [productInfo, setProductInfo] = useState({ name: "", price: "", category: "Ropa", description: "", color: "" });

  // Generated content
  const [variantImages, setVariantImages] = useState([]);
  const [generatingIdx, setGeneratingIdx] = useState(-1);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [seoData, setSeoData] = useState({ title: "", metaDescription: "", h1: "", bodyText: "", tags: [], googleAdsHeadline: "", googleAdsCTA: "" });
  const [igData, setIgData] = useState({ caption: "", hashtags: "", cta: "", storyText: "" });

  // Tokens
  const [tokenLog, setTokenLog] = useState([]);
  const totalTokens = tokenLog.reduce((a, b) => a + b.tokens, 0);
  const totalCost = (totalTokens * 0.000003 + tokenLog.filter(t => t.type === "image").reduce((a, b) => a + b.tokens * 0.00003, 0)).toFixed(4);

  const [error, setError] = useState("");
  const [loadingContent, setLoadingContent] = useState(false);
  const [publishStatus, setPublishStatus] = useState({ shopify: "", instagram: "" });
  const [activePreview, setActivePreview] = useState("instagram"); // "instagram" | "shopify"
  const fileRef = useRef();

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  // ── GENERATE IMAGES ──
  const generateVariants = async () => {
    setError(""); setVariantImages([]);
    const results = [];
    for (let i = 0; i < VARIANT_PROMPTS.length; i++) {
      setGeneratingIdx(i);
      const v = VARIANT_PROMPTS[i];
      const guide = promptGuide ? `Additional style guidance: ${promptGuide}.` : "";
      const prompt = `A ${v.model} wearing this exact garment. Scene: ${v.scene}. Mood: ${v.mood}. ${guide} Hyperrealistic fashion photography, full body shot, magazine quality.`;
      try {
        const { dataUrl, tokens } = await generateWithGemini(prompt, geminiKey, dataUrlToBase64(photo));
        results.push({ ...v, dataUrl });
        setVariantImages([...results]);
        setTokenLog(prev => [...prev, { type: "image", label: v.label, tokens }]);
      } catch (err) {
        setError(`${v.label}: ${err.message}`);
        results.push({ ...v, dataUrl: null, error: err.message });
        setVariantImages([...results]);
      }
    }
    setGeneratingIdx(-1);
  };

  // ── GENERATE SEO + IG ──
  const generateContent = async () => {
    setLoadingContent(true);
    try {
      const [seoRes, igRes] = await Promise.all([
        callClaudeJSON(
          "Eres experto en SEO para e-commerce de moda latinoamericana. Responde SOLO JSON válido sin backticks ni preamble.",
          `SEO para: Nombre: "${productInfo.name || "Prenda"}", Precio: $${productInfo.price}, Categoría: ${productInfo.category}, Descripción: ${productInfo.description}, Tienda: Mandarina Ecuador www.mandarinEc.com
JSON exacto (sin nada más): {"title":"título SEO max 60 chars","metaDescription":"meta 150 chars","h1":"H1 atractivo","bodyText":"descripción producto 2-3 oraciones persuasivas","tags":["tag1","tag2","tag3","tag4","tag5"],"googleAdsHeadline":"titular Google Ads max 30 chars","googleAdsCTA":"llamado a acción"}`
        ),
        callClaudeJSON(
          "Eres community manager experto en moda latinoamericana e Instagram. Responde SOLO JSON válido sin backticks.",
          `Copy Instagram para: "${productInfo.name || "prenda"}" $${productInfo.price} Mandarina Ecuador
JSON exacto: {"caption":"caption con emojis, máx 200 chars, sin hashtags","hashtags":"#mandarina #moda #ecuador #ootd #fashion #estilo #ropa #outfit","cta":"llamado a acción corto","storyText":"texto story 1-2 líneas con emoji"}`
        )
      ]);
      if (seoRes.result) { setSeoData(seoRes.result); setTokenLog(prev => [...prev, { type: "text", label: "SEO", tokens: seoRes.tokens }]); }
      if (igRes.result) { setIgData(igRes.result); setTokenLog(prev => [...prev, { type: "text", label: "Instagram copy", tokens: igRes.tokens }]); }
    } catch (e) { console.error(e); }
    finally { setLoadingContent(false); }
  };

  const downloadVariant = (v, i) => {
    if (!v?.dataUrl) return;
    const a = document.createElement("a");
    a.href = v.dataUrl;
    a.download = `mandarina-${productInfo.name || "producto"}-v${i + 1}.jpg`;
    a.click();
  };

  const reset = () => {
    setStep(0); setPhoto(null); setVariantImages([]); setTokenLog([]);
    setSeoData({ title: "", metaDescription: "", h1: "", bodyText: "", tags: [], googleAdsHeadline: "", googleAdsCTA: "" });
    setIgData({ caption: "", hashtags: "", cta: "", storyText: "" });
    setPublishStatus({ shopify: "", instagram: "" }); setError(""); setPromptGuide("");
    setProductInfo({ name: "", price: "", category: "Ropa", description: "", color: "" });
  };

  const isGenerating = generatingIdx >= 0;
  const selectedImg = variantImages[selectedVariant];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)", fontFamily: "'Georgia',serif", color: "#f5f0eb" }}>

      {/* ── HEADER ── */}
      <header style={{ padding: "16px 28px", borderBottom: "1px solid rgba(255,165,80,0.15)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.35)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,#ff8c42,#e63946)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: "bold" }}>M</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: "bold", letterSpacing: "0.05em", color: "#ff9f5a" }}>MANDARINA PRO</div>
            <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.12em" }}>AI FASHION · SHOPIFY · INSTAGRAM</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Token counter */}
          {totalTokens > 0 && (
            <div style={{ background: "rgba(255,200,50,0.08)", border: "1px solid rgba(255,200,50,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#ffd060" }}>
              ⚡ {totalTokens.toLocaleString()} tokens · ~${totalCost}
            </div>
          )}
          {["📸 Foto", "🤖 Generar", "👁️ Revisar", "✅ Publicar"].map((label, i) => (
            <button key={i} onClick={() => i <= step && setStep(i)} style={{ padding: "5px 11px", borderRadius: 20, border: i === step ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.1)", background: i === step ? "rgba(255,140,66,0.15)" : "transparent", color: i === step ? "#ff8c42" : i < step ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", fontSize: 11, cursor: i <= step ? "pointer" : "default", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px" }}>

        {/* ══ STEP 0: FOTO + CONFIGURACIÓN ══ */}
        {step === 0 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 30, fontWeight: "normal", color: "#ff9f5a", marginBottom: 6 }}>Sube tu producto</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 14 }}>Foto de la prenda → IA genera modelos reales usándola</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              {/* Left: Upload */}
              <div>
                <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current.click()}
                  style={{ border: "2px dashed rgba(255,140,66,0.35)", borderRadius: 16, cursor: "pointer", background: "rgba(255,140,66,0.03)", minHeight: 240, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {photo
                    ? <img src={photo} alt="producto" style={{ width: "100%", height: "100%", objectFit: "contain", maxHeight: 280 }} />
                    : <div style={{ textAlign: "center", padding: 30 }}><div style={{ fontSize: 50, marginBottom: 12, opacity: 0.4 }}>👕</div><div style={{ fontSize: 16, color: "#ff9f5a", marginBottom: 6 }}>Arrastra tu foto aquí</div><div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>JPG, PNG, HEIC</div></div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

                {/* Gemini Key */}
                <div style={{ marginTop: 14, background: "rgba(66,133,244,0.07)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 12, padding: 14 }}>
                  <div style={{ fontSize: 11, color: "#7ab3ff", marginBottom: 8 }}>🔑 Google Gemini API Key</div>
                  <input value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." type="password"
                    style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(66,133,244,0.25)", borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5 }}>aistudio.google.com/apikey · ~$0.04 por imagen generada</div>
                </div>
              </div>

              {/* Right: Product info */}
              <div>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,140,66,0.15)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, color: "#ff9f5a", marginBottom: 14, letterSpacing: "0.1em" }}>PRODUCTO</div>
                  {[
                    { key: "name", label: "NOMBRE", placeholder: "Chaqueta Dragon Ball Z azul" },
                    { key: "price", label: "PRECIO $", placeholder: "35.00" },
                    { key: "color", label: "COLOR PRINCIPAL", placeholder: "azul y negro" },
                    { key: "category", label: "CATEGORÍA", placeholder: "Ropa" },
                  ].map(f => (
                    <div key={f.key} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 4 }}>{f.label}</label>
                      <input value={productInfo[f.key]} onChange={e => setProductInfo(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                        style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                  ))}
                  <div>
                    <label style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 4 }}>DESCRIPCIÓN</label>
                    <textarea value={productInfo.description} onChange={e => setProductInfo(p => ({ ...p, description: e.target.value }))} placeholder="Bomber jacket anime, parches bordados, tela premium..." rows={2}
                      style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
                  </div>
                </div>

                {/* Prompt guide */}
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,200,100,0.15)", borderRadius: 14, padding: 16 }}>
                  <div style={{ fontSize: 11, color: "#ffd060", marginBottom: 8, letterSpacing: "0.08em" }}>✨ GUÍA DE ESTILO PARA LAS FOTOS</div>
                  <textarea value={promptGuide} onChange={e => setPromptGuide(e.target.value)} placeholder="Ej: modelos de 20-25 años, estilo urbano latinoamericano, actitud relajada, colores vibrantes, no lentes de sol..."
                    rows={3} style={{ width: "100%", padding: "8px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,200,100,0.2)", borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginTop: 5 }}>Esto se agrega al prompt de cada variante generada</div>
                </div>
              </div>
            </div>

            <button onClick={async () => { setStep(1); await generateVariants(); await generateContent(); setStep(2); }}
              disabled={!photo || !geminiKey}
              style={{ marginTop: 20, width: "100%", padding: "15px", background: photo && geminiKey ? "linear-gradient(135deg,#ff8c42,#e63946)" : "rgba(255,255,255,0.08)", border: "none", borderRadius: 13, color: photo && geminiKey ? "#fff" : "rgba(255,255,255,0.3)", fontSize: 15, fontWeight: "bold", cursor: photo && geminiKey ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: "0.03em" }}>
              {!photo ? "Sube una foto para continuar" : !geminiKey ? "Ingresa tu Gemini API Key" : "🚀 Generar fotos + SEO automáticamente →"}
            </button>
          </div>
        )}

        {/* ══ STEP 1: GENERATING ══ */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease", textAlign: "center", padding: "40px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 2s linear infinite" }}>⚡</div>
            <h1 style={{ fontSize: 26, fontWeight: "normal", color: "#ff9f5a", marginBottom: 8 }}>
              {isGenerating ? `Generando variante ${generatingIdx + 1} de 5...` : "Generando contenido SEO..."}
            </h1>
            <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 24 }}>
              {VARIANT_PROMPTS.map((v, i) => (
                <div key={i} style={{ textAlign: "center" }}>
                  <div style={{ width: 80, height: 80, borderRadius: 10, background: i < variantImages.filter(x => x.dataUrl).length ? "rgba(255,140,66,0.3)" : i === generatingIdx ? "rgba(255,140,66,0.15)" : "rgba(255,255,255,0.05)", border: i === generatingIdx ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {variantImages[i]?.dataUrl
                      ? <img src={variantImages[i].dataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : i === generatingIdx ? <div style={{ fontSize: 24, animation: "spin 1s linear infinite" }}>⚡</div>
                      : <div style={{ fontSize: 20, opacity: 0.3 }}>⏳</div>}
                  </div>
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>{v.label}</div>
                </div>
              ))}
            </div>
            {error && <div style={{ marginTop: 20, padding: "10px 16px", background: "rgba(255,80,80,0.1)", border: "1px solid rgba(255,80,80,0.25)", borderRadius: 10, fontSize: 12, color: "#ff8888", maxWidth: 500, margin: "20px auto 0" }}>⚠️ {error}</div>}
          </div>
        )}

        {/* ══ STEP 2: REVIEW ══ */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: "normal", color: "#ff9f5a", marginBottom: 4 }}>Revisa y edita antes de publicar</h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13 }}>Edita cualquier texto · Elige tu foto favorita · Preview real</p>
              </div>
              {totalTokens > 0 && <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "#ffd060" }}>⚡ {totalTokens.toLocaleString()} tokens usados</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>~${totalCost} USD esta sesión</div>
              </div>}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 20 }}>

              {/* LEFT: Variant selector + content editing */}
              <div>
                {/* Variant thumbnails */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", marginBottom: 10 }}>FOTO GENERADA — SELECCIONA LA MEJOR</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
                    {VARIANT_PROMPTS.map((v, i) => {
                      const img = variantImages[i];
                      return (
                        <div key={i} onClick={() => img?.dataUrl && setSelectedVariant(i)}
                          style={{ borderRadius: 8, overflow: "hidden", border: selectedVariant === i ? "2px solid #ff8c42" : "2px solid rgba(255,255,255,0.08)", cursor: img?.dataUrl ? "pointer" : "default", position: "relative", aspectRatio: "1", background: "#111" }}>
                          {img?.dataUrl && <img src={img.dataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                          {!img?.dataUrl && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{img?.error ? "❌" : "⏳"}</div>}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.8))", padding: "4px 3px 3px", textAlign: "center" }}>
                            <div style={{ fontSize: 8, color: "#fff" }}>{v.label}</div>
                          </div>
                          {img?.dataUrl && <button onClick={(e) => { e.stopPropagation(); downloadVariant(img, i); }}
                            style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 4, color: "#fff", fontSize: 10, cursor: "pointer", padding: "2px 4px" }}>⬇</button>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Preview toggle */}
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {["instagram", "shopify"].map(p => (
                    <button key={p} onClick={() => setActivePreview(p)}
                      style={{ flex: 1, padding: "8px", background: activePreview === p ? "rgba(255,140,66,0.15)" : "rgba(255,255,255,0.04)", border: activePreview === p ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.08)", borderRadius: 10, color: activePreview === p ? "#ff9f5a" : "rgba(255,255,255,0.5)", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>
                      {p === "instagram" ? "📱 Preview Instagram" : "🛍️ Preview Shopify"}
                    </button>
                  ))}
                </div>

                {/* Live preview */}
                <div style={{ maxHeight: 460, overflowY: "auto" }}>
                  {activePreview === "instagram"
                    ? <InstagramPreview image={selectedImg?.dataUrl} caption={igData.caption} hashtags={igData.hashtags} productName={productInfo.name} price={productInfo.price} />
                    : <ShopifyPreview image={selectedImg?.dataUrl} title={seoData.title} metaDesc={seoData.metaDescription} bodyText={seoData.bodyText} tags={seoData.tags} h1={seoData.h1} googleAds={seoData.googleAdsHeadline} />
                  }
                </div>
              </div>

              {/* RIGHT: Editable fields */}
              <div>
                {loadingContent && <div style={{ textAlign: "center", padding: "30px", color: "#ff9f5a", fontSize: 14 }}><div style={{ fontSize: 28, marginBottom: 8, animation: "spin 1s linear infinite" }}>⚡</div>Generando SEO y copy...</div>}

                {!loadingContent && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
                    {/* Shopify fields */}
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(100,200,100,0.18)", borderRadius: 14, padding: 18, marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 18 }}>🛍️</span>
                        <div style={{ fontSize: 13, fontWeight: "bold", color: "#7ec97e" }}>Shopify SEO</div>
                        <TokenBadge tokens={tokenLog.find(t => t.label === "SEO")?.tokens} />
                      </div>
                      <EditableField label="TÍTULO SEO (60 chars)" value={seoData.title} onChange={v => setSeoData(s => ({ ...s, title: v }))} color="#7ec97e" />
                      <EditableField label="META DESCRIPCIÓN (150 chars)" value={seoData.metaDescription} onChange={v => setSeoData(s => ({ ...s, metaDescription: v }))} multiline color="#7ec97e" />
                      <EditableField label="H1" value={seoData.h1} onChange={v => setSeoData(s => ({ ...s, h1: v }))} color="#7ec97e" />
                      <EditableField label="DESCRIPCIÓN PRODUCTO" value={seoData.bodyText} onChange={v => setSeoData(s => ({ ...s, bodyText: v }))} multiline color="#7ec97e" />
                      <EditableField label="GOOGLE ADS HEADLINE" value={seoData.googleAdsHeadline} onChange={v => setSeoData(s => ({ ...s, googleAdsHeadline: v }))} color="#7ec97e" />
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginBottom: 5 }}>TAGS</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                          {(seoData.tags || []).map((t, i) => (
                            <span key={i} style={{ background: "rgba(126,201,126,0.12)", border: "1px solid rgba(126,201,126,0.25)", borderRadius: 20, padding: "3px 9px", fontSize: 11, color: "#7ec97e" }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Instagram fields */}
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,100,200,0.18)", borderRadius: 14, padding: 18 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 18 }}>📸</span>
                        <div style={{ fontSize: 13, fontWeight: "bold", color: "#c97ec9" }}>Instagram</div>
                        <TokenBadge tokens={tokenLog.find(t => t.label === "Instagram copy")?.tokens} />
                      </div>
                      <EditableField label="CAPTION" value={igData.caption} onChange={v => setIgData(s => ({ ...s, caption: v }))} multiline color="#c97ec9" />
                      <EditableField label="HASHTAGS" value={igData.hashtags} onChange={v => setIgData(s => ({ ...s, hashtags: v }))} color="#c97ec9" />
                      <EditableField label="CTA" value={igData.cta} onChange={v => setIgData(s => ({ ...s, cta: v }))} color="#c97ec9" />
                      <EditableField label="STORY TEXT" value={igData.storyText} onChange={v => setIgData(s => ({ ...s, storyText: v }))} color="#c97ec9" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => setStep(3)}
              style={{ marginTop: 20, width: "100%", padding: "15px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 13, color: "#fff", fontSize: 15, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
              ✅ Todo se ve bien — ir a publicar →
            </button>
          </div>
        )}

        {/* ══ STEP 3: PUBLISH ══ */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 28, fontWeight: "normal", color: "#ff9f5a", marginBottom: 6 }}>Confirma y publica</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 24, fontSize: 13 }}>Revisaste todo — ahora con un click publica en cada canal</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>

              {/* Shopify publish card */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(100,200,100,0.25)", borderRadius: 18, padding: 24 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 28 }}>🛍️</span>
                  <div><div style={{ fontSize: 15, fontWeight: "bold", color: "#7ec97e" }}>Shopify</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Producto + SEO + imagen AI</div></div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: 12, marginBottom: 16, fontSize: 12 }}>
                  <div style={{ color: "rgba(255,255,255,0.5)", marginBottom: 4 }}>Se publicará con:</div>
                  <div style={{ color: "#7ec97e" }}>✓ {seoData.title || "Sin título"}</div>
                  <div style={{ color: "#7ec97e" }}>✓ Meta description + H1 + Tags</div>
                  <div style={{ color: "#7ec97e" }}>✓ Imagen AI seleccionada</div>
                  <div style={{ color: "#7ec97e" }}>✓ Precio: ${productInfo.price || "—"}</div>
                </div>
                {selectedImg?.dataUrl && <img src={selectedImg.dataUrl} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, marginBottom: 16 }} />}
                <button onClick={() => { setPublishStatus(s => ({ ...s, shopify: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, shopify: "done" })), 2200); }}
                  disabled={publishStatus.shopify === "loading" || publishStatus.shopify === "done"}
                  style={{ width: "100%", padding: "13px", background: publishStatus.shopify === "done" ? "rgba(126,201,126,0.25)" : "linear-gradient(135deg,#2d7d2d,#1f5c1f)", border: "1px solid rgba(126,201,126,0.3)", borderRadius: 11, color: "#fff", fontSize: 14, fontWeight: "bold", cursor: publishStatus.shopify === "done" ? "default" : "pointer", fontFamily: "inherit" }}>
                  {publishStatus.shopify === "loading" ? "⏳ Publicando en Shopify..." : publishStatus.shopify === "done" ? "✅ Publicado en Shopify" : "🚀 Publicar en Shopify ahora"}
                </button>
              </div>

              {/* Instagram publish card */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,100,200,0.25)", borderRadius: 18, padding: 24 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                  <span style={{ fontSize: 28 }}>📸</span>
                  <div><div style={{ fontSize: 15, fontWeight: "bold", color: "#c97ec9" }}>Instagram</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Feed + Stories</div></div>
                </div>
                <div style={{ marginBottom: 16, maxHeight: 300, overflowY: "auto" }}>
                  <InstagramPreview image={selectedImg?.dataUrl} caption={igData.caption} hashtags={igData.hashtags} productName={productInfo.name} price={productInfo.price} />
                </div>
                <button onClick={() => { setPublishStatus(s => ({ ...s, instagram: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, instagram: "done" })), 1800); }}
                  disabled={publishStatus.instagram === "loading" || publishStatus.instagram === "done"}
                  style={{ width: "100%", padding: "13px", background: publishStatus.instagram === "done" ? "rgba(201,126,201,0.25)" : "linear-gradient(135deg,#7b2d7b,#581f58)", border: "1px solid rgba(201,126,201,0.3)", borderRadius: 11, color: "#fff", fontSize: 14, fontWeight: "bold", cursor: publishStatus.instagram === "done" ? "default" : "pointer", fontFamily: "inherit" }}>
                  {publishStatus.instagram === "loading" ? "⏳ Preparando..." : publishStatus.instagram === "done" ? "✅ Listo para Instagram" : "📱 Publicar en Instagram ahora"}
                </button>
              </div>
            </div>

            {/* Token summary */}
            {tokenLog.length > 0 && (
              <div style={{ background: "rgba(255,200,50,0.06)", border: "1px solid rgba(255,200,50,0.15)", borderRadius: 14, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: "#ffd060", marginBottom: 10, letterSpacing: "0.08em" }}>⚡ RESUMEN DE TOKENS</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {tokenLog.map((t, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "rgba(255,255,255,0.5)" }}>{t.type === "image" ? "🖼️" : "📝"} {t.label}</span>
                      <span style={{ color: "#ffd060" }}>{t.tokens.toLocaleString()} tokens · ~${(t.tokens * (t.type === "image" ? 0.00003 : 0.000003)).toFixed(4)}</span>
                    </div>
                  ))}
                  <div style={{ borderTop: "1px solid rgba(255,200,50,0.15)", paddingTop: 6, marginTop: 4, display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: "bold" }}>
                    <span style={{ color: "#ffd060" }}>TOTAL</span>
                    <span style={{ color: "#ffd060" }}>{totalTokens.toLocaleString()} tokens · ~${totalCost} USD</span>
                  </div>
                </div>
              </div>
            )}

            {(publishStatus.shopify === "done" || publishStatus.instagram === "done") && (
              <div style={{ background: "rgba(255,140,66,0.07)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 14, padding: 20, textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
                <div style={{ fontSize: 16, color: "#ff9f5a", marginBottom: 12 }}>¡{productInfo.name || "Producto"} publicado en Mandarina!</div>
                <button onClick={reset} style={{ padding: "10px 26px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
                  + Publicar otro producto
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(10px) } to { opacity:1; transform:none } }
        @keyframes spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.2) }
        button:hover:not(:disabled) { opacity: 0.85 }
        ::-webkit-scrollbar { height:4px; width:4px }
        ::-webkit-scrollbar-thumb { background:rgba(255,140,66,0.3); border-radius:2px }
      `}</style>
    </div>
  );
}
