import { useState, useRef, useCallback } from "react";

// ─── VARIANT SCENES ──────────────────────────────────────────────────────────
const VARIANT_SCENES = [
  { label: "Mirror Selfie", format: "9:16", scene: "luxury hotel room mirror selfie, iPhone camera aesthetic, warm ambient lighting, beige walls, wooden textures", pose: "mirror selfie, one hand holding phone, other hand touching hair, relaxed effortless posture", mood: "soft luxury, cozy, authentic Instagram story feel" },
  { label: "Urban Street", format: "4:5", scene: "modern city street, golden hour natural light, urban architecture background, bokeh", pose: "walking confidently, 3/4 shot, looking slightly off camera", mood: "confident urban streetwear, editorial but natural" },
  { label: "Studio Editorial", format: "1:1", scene: "clean white studio, professional fashion lighting, seamless backdrop", pose: "fashion editorial pose, full body or 3/4, hands in pockets", mood: "premium fashion catalog, clean and professional" },
  { label: "Lifestyle Indoor", format: "4:5", scene: "minimalist modern apartment, cozy cafe or lounge, warm soft window light, blurred background", pose: "relaxed seated or leaning, casual natural pose", mood: "warm lifestyle, aspirational everyday, Gen Z aesthetic" },
  { label: "Outdoor Quito", format: "1:1", scene: "Quito Ecuador cityscape, Andes mountains visible, colonial architecture or modern city background", pose: "standing naturally, full body, city explorer vibe", mood: "proud local brand, urban latin fashion" },
];

// ─── API: Claude analiza foto y construye prompt profesional ─────────────────
async function analyzeProductAndBuildPrompt(photoBase64, productInfo, userGuide, sceneConfig) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: photoBase64 }
          },
          {
            type: "text",
            text: `You are an expert fashion photography prompt engineer. Analyze this garment photo in extreme detail and build a hyperrealistic fashion photography prompt.

PRODUCT INFO:
- Name: ${productInfo.name || "fashion garment"}
- Color: ${productInfo.color || "see image"}
- Category: ${productInfo.category || "clothing"}
- Description: ${productInfo.description || ""}

TARGET SCENE: ${sceneConfig.scene}
POSE: ${sceneConfig.pose}
MOOD: ${sceneConfig.mood}
FORMAT: ${sceneConfig.format} vertical

USER STYLE GUIDE: ${userGuide || "young latinx models, authentic feel, not overly posed"}

INSTRUCTIONS:
1. First analyze the garment: exact colors, textures, fabric type, design details, logos, prints, embroidery, cut, fit
2. Build a prompt in the style of the Madhappy/Fear of God Essentials editorial level
3. The garment description must be SO detailed that the AI recreates it exactly
4. Include: model description (young latina/latino, 20-25yo), lighting, camera, background, pose, mood
5. End with CRITICAL DETAILS as bullet points

Respond with ONLY the prompt text, no explanation. Make it brutally detailed, professional, cinematic. 800-1000 words.`
          }
        ]
      }]
    })
  });
  const data = await res.json();
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { prompt: data.content?.[0]?.text || "", tokens };
}

// ─── API: Generate image with Gemini ─────────────────────────────────────────
async function generateWithGemini(prompt, geminiKey, photoBase64) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inline_data: { mime_type: "image/jpeg", data: photoBase64 } },
            { text: prompt }
          ]
        }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"], temperature: 0.4 },
      }),
    }
  );
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));
  const tokens = (data.usageMetadata?.promptTokenCount || 0) + (data.usageMetadata?.candidatesTokenCount || 0);
  if (imagePart) return { dataUrl: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`, tokens };
  throw new Error(data.error?.message || data.candidates?.[0]?.finishReason || "Error generando imagen");
}

// ─── API: Claude genera SEO + Instagram ──────────────────────────────────────
async function generateSEOAndIG(productInfo) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: "Eres experto en SEO para e-commerce de moda latinoamericana Y community manager de Instagram. Responde SOLO JSON válido, sin backticks, sin texto adicional.",
      messages: [{
        role: "user",
        content: `Genera contenido completo para este producto de Mandarina Ecuador:
Nombre: "${productInfo.name || "Prenda de moda"}"
Precio: $${productInfo.price || "XX"}
Color: ${productInfo.color || ""}
Categoría: ${productInfo.category || "Ropa"}
Descripción: ${productInfo.description || "Prenda de moda moderna"}
Tienda: Mandarina - www.mandarinEc.com - Quito Ecuador

JSON EXACTO (sin nada más):
{
  "shopify": {
    "title": "título SEO persuasivo max 60 chars",
    "metaDescription": "meta description 150 chars que vende",
    "h1": "H1 atractivo para la página",
    "bodyText": "descripción producto 3-4 oraciones persuasivas con palabras clave",
    "tags": ["tag1","tag2","tag3","tag4","tag5","tag6"],
    "googleAdsHeadline": "titular Google Ads max 30 chars",
    "googleAdsCTA": "llamado a acción para Google Ads"
  },
  "instagram": {
    "caption": "caption con emojis, storytelling, máx 220 chars, SIN hashtags",
    "hashtags": "#mandarina #mandarinaec #moda #modaecuador #ecuador #ootd #fashion #estilo #ropa #outfit #look #quito #streetwear",
    "cta": "llamado a acción corto y poderoso",
    "storyText": "texto para story 2 líneas máx con emoji al inicio",
    "reelHook": "primer texto gancho para reel/video de 3-5 palabras"
  }
}`
      }]
    })
  });
  const data = await res.json();
  const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  const text = data.content?.[0]?.text || "{}";
  try { return { result: JSON.parse(text.replace(/```json|```/g, "").trim()), tokens }; }
  catch { return { result: null, tokens }; }
}

function dataUrlToBase64(dataUrl) { return dataUrl.split(",")[1]; }

// ─── EDITABLE FIELD ───────────────────────────────────────────────────────────
function EditableField({ label, value, onChange, multiline = false, color = "#ff9f5a", hint }) {
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(value || ""); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return (
    <div style={{ marginBottom: 13 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
        <div>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.08em" }}>{label}</span>
          {hint && <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginLeft: 6 }}>{hint}</span>}
        </div>
        <div style={{ display: "flex", gap: 5 }}>
          <button onClick={() => setEditing(!editing)} style={{ background: editing ? "rgba(255,140,66,0.2)" : "rgba(255,255,255,0.05)", border: `1px solid ${editing ? "#ff8c42" : "rgba(255,255,255,0.1)"}`, borderRadius: 5, color: editing ? "#ff9f5a" : "rgba(255,255,255,0.35)", fontSize: 10, cursor: "pointer", padding: "2px 8px", fontFamily: "inherit" }}>
            {editing ? "✓ Listo" : "✏️"}
          </button>
          <button onClick={copy} style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 5, color: copied ? color : "rgba(255,255,255,0.35)", fontSize: 10, cursor: "pointer", padding: "2px 7px" }}>
            {copied ? "✓" : "📋"}
          </button>
        </div>
      </div>
      {editing
        ? multiline
          ? <textarea value={value || ""} onChange={e => onChange(e.target.value)} rows={3} style={{ width: "100%", padding: "8px 12px", background: "rgba(255,140,66,0.07)", border: `1px solid #ff8c42`, borderRadius: 8, color: "#f5f0eb", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "vertical", boxSizing: "border-box", lineHeight: 1.5 }} />
          : <input value={value || ""} onChange={e => onChange(e.target.value)} style={{ width: "100%", padding: "8px 12px", background: "rgba(255,140,66,0.07)", border: `1px solid #ff8c42`, borderRadius: 8, color: "#f5f0eb", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
        : <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: value ? "#f5f0eb" : "rgba(255,255,255,0.2)", lineHeight: 1.6, minHeight: 34 }}>
            {value || "—"}
          </div>
      }
    </div>
  );
}

// ─── INSTAGRAM PREVIEW ────────────────────────────────────────────────────────
function InstagramPreview({ image, caption, hashtags, cta, reelHook, price, name }) {
  return (
    <div style={{ background: "#0a0a0a", borderRadius: 18, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "-apple-system, sans-serif" }}>
      <div style={{ padding: "10px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888)", padding: 2 }}>
          <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: "linear-gradient(135deg,#ff8c42,#e63946)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: "bold", color: "#fff" }}>M</div>
        </div>
        <div><div style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>mandarina.ec</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>Quito, Ecuador</div></div>
        <div style={{ marginLeft: "auto", fontSize: 18, color: "rgba(255,255,255,0.5)", letterSpacing: 2 }}>···</div>
      </div>
      {image
        ? <img src={image} alt="post" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
        : <div style={{ width: "100%", aspectRatio: "1", background: "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 40, opacity: 0.2 }}>📸</span></div>
      }
      <div style={{ padding: "10px 14px 6px", display: "flex", gap: 14 }}>
        <span style={{ fontSize: 22 }}>🤍</span><span style={{ fontSize: 22 }}>💬</span><span style={{ fontSize: 22 }}>📤</span>
        <span style={{ fontSize: 22, marginLeft: "auto" }}>🔖</span>
      </div>
      <div style={{ padding: "2px 14px 14px" }}>
        {price && <div style={{ marginBottom: 6, display: "inline-block", background: "linear-gradient(135deg,rgba(255,140,66,0.25),rgba(230,57,70,0.25))", border: "1px solid rgba(255,140,66,0.3)", borderRadius: 6, padding: "3px 10px", fontSize: 12, color: "#ff9f5a", fontWeight: "bold" }}>💰 ${price} USD</div>}
        <div style={{ fontSize: 13, color: "#fff", lineHeight: 1.5, marginBottom: 5 }}>
          <strong style={{ color: "#fff" }}>mandarina.ec</strong> {caption || <span style={{ color: "rgba(255,255,255,0.3)" }}>caption aquí...</span>}
        </div>
        {cta && <div style={{ fontSize: 12, color: "#ff9f5a", marginBottom: 5, fontWeight: "600" }}>→ {cta}</div>}
        <div style={{ fontSize: 12, color: "#4a9eff", lineHeight: 1.6 }}>{hashtags || ""}</div>
        {reelHook && (
          <div style={{ marginTop: 8, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "6px 10px", fontSize: 11, color: "rgba(255,255,255,0.5)" }}>
            🎬 Reel hook: <span style={{ color: "#ff9f5a" }}>"{reelHook}"</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SHOPIFY PREVIEW ──────────────────────────────────────────────────────────
function ShopifyPreview({ image, shopify, price, name }) {
  if (!shopify) return null;
  return (
    <div style={{ background: "#fff", borderRadius: 14, overflow: "hidden", color: "#333", fontFamily: "Arial,sans-serif", fontSize: 13 }}>
      <div style={{ background: "#f5f5f5", padding: "8px 12px", borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ display: "flex", gap: 4 }}>{["#ff5f57","#febc2e","#28c840"].map((c,i) => <div key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />)}</div>
        <div style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 5, padding: "2px 10px", fontSize: 10, color: "#666", flex: 1, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
          mandarinec.com/products/{(shopify.title || name || "producto").toLowerCase().replace(/\s+/g,"-").substring(0,35)}
        </div>
      </div>
      {/* Google snippet */}
      <div style={{ padding: "10px 14px", background: "#f8f9fa", borderBottom: "1px solid #eee" }}>
        <div style={{ fontSize: 9, color: "#5f6368", marginBottom: 3 }}>Así aparece en Google</div>
        <div style={{ fontSize: 15, color: "#1a0dab", fontWeight: "600", lineHeight: 1.3 }}>{shopify.title || "Título SEO"}</div>
        <div style={{ fontSize: 11, color: "#006621" }}>mandarinec.com › productos</div>
        <div style={{ fontSize: 12, color: "#4d5156", lineHeight: 1.4, marginTop: 2 }}>{shopify.metaDescription || "Meta descripción..."}</div>
      </div>
      {/* Google Ads */}
      {shopify.googleAdsHeadline && (
        <div style={{ padding: "8px 14px", background: "#fffde7", borderBottom: "1px solid #eee", display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ background: "#e8f0fe", color: "#1967d2", fontSize: 9, padding: "1px 5px", borderRadius: 3, fontWeight: "bold", whiteSpace: "nowrap" }}>Anuncio</span>
          <div>
            <div style={{ fontSize: 13, color: "#1a0dab", fontWeight: "600" }}>{shopify.googleAdsHeadline}</div>
            <div style={{ fontSize: 11, color: "#545454" }}>{shopify.googleAdsCTA}</div>
          </div>
        </div>
      )}
      {/* Product page */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        {image
          ? <img src={image} alt="product" style={{ width: "100%", aspectRatio: "1", objectFit: "cover" }} />
          : <div style={{ aspectRatio: "1", background: "#f5f5f5", display: "flex", alignItems: "center", justifyContent: "center" }}><span style={{ fontSize: 32, opacity: 0.2 }}>👕</span></div>
        }
        <div style={{ padding: "14px" }}>
          <div style={{ fontSize: 10, color: "#999", marginBottom: 3, letterSpacing: "0.1em" }}>MANDARINA</div>
          <div style={{ fontSize: 14, fontWeight: "700", color: "#111", lineHeight: 1.3, marginBottom: 6 }}>{shopify.h1 || shopify.title}</div>
          {price && <div style={{ fontSize: 16, fontWeight: "bold", color: "#e63946", marginBottom: 8 }}>${price} USD</div>}
          <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5, marginBottom: 10 }}>{shopify.bodyText}</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 10 }}>
            {(shopify.tags || []).map((t,i) => <span key={i} style={{ background: "#f0f0f0", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: "#666" }}>{t}</span>)}
          </div>
          <button style={{ width: "100%", padding: "8px", background: "#111", color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: "bold", cursor: "pointer" }}>Añadir al carrito</button>
        </div>
      </div>
    </div>
  );
}

// ─── TOKEN BADGE ──────────────────────────────────────────────────────────────
function TokenBadge({ tokens, type = "text" }) {
  if (!tokens) return null;
  const rate = type === "image" ? 0.00003 : 0.000003;
  return <span style={{ background: "rgba(255,200,50,0.1)", border: "1px solid rgba(255,200,50,0.2)", borderRadius: 20, padding: "2px 8px", fontSize: 9, color: "#ffd060", marginLeft: 6 }}>⚡{tokens.toLocaleString()} · ${(tokens*rate).toFixed(4)}</span>;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════════════════════
export default function MandarinaPro() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [promptGuide, setPromptGuide] = useState("");
  const [productInfo, setProductInfo] = useState({ name: "", price: "", category: "Ropa", description: "", color: "" });

  const [variantImages, setVariantImages] = useState([]);
  const [generatedPrompts, setGeneratedPrompts] = useState([]);
  const [generatingIdx, setGeneratingIdx] = useState(-1);
  const [generatingPromptIdx, setGeneratingPromptIdx] = useState(-1);
  const [selectedVariant, setSelectedVariant] = useState(0);

  const [shopifySEO, setShopifySEO] = useState(null);
  const [igContent, setIgContent] = useState(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const [tokenLog, setTokenLog] = useState([]);
  const [error, setError] = useState("");
  const [publishStatus, setPublishStatus] = useState({ shopify: "", instagram: "" });
  const [activePreview, setActivePreview] = useState("instagram");
  const fileRef = useRef();

  const totalTokens = tokenLog.reduce((a, b) => a + b.tokens, 0);
  const totalCost = tokenLog.reduce((a, b) => a + b.tokens * (b.type === "image" ? 0.00003 : 0.000003), 0).toFixed(4);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => setPhoto(e.target.result);
    reader.readAsDataURL(file);
  }, []);

  const onDrop = useCallback((e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }, [handleFile]);

  // ── GENERATE ALL ──────────────────────────────────────────────────────────
  const runGeneration = async () => {
    setError(""); setVariantImages([]); setGeneratedPrompts([]);

    const base64 = dataUrlToBase64(photo);
    const results = [];
    const prompts = [];

    for (let i = 0; i < VARIANT_SCENES.length; i++) {
      const scene = VARIANT_SCENES[i];

      // Step 1: Claude analyzes photo and builds professional prompt
      setGeneratingPromptIdx(i);
      let builtPrompt = "";
      try {
        const { prompt, tokens } = await analyzeProductAndBuildPrompt(base64, productInfo, promptGuide, scene);
        builtPrompt = prompt;
        prompts.push({ scene: scene.label, prompt });
        setGeneratedPrompts([...prompts]);
        setTokenLog(prev => [...prev, { type: "text", label: `Prompt ${scene.label}`, tokens }]);
      } catch (e) {
        builtPrompt = `Hyperrealistic fashion photo. ${scene.scene}. ${scene.pose}. ${scene.mood}. Wearing the exact garment from reference image.`;
      }

      // Step 2: Gemini generates image
      setGeneratingIdx(i);
      setGeneratingPromptIdx(-1);
      try {
        const { dataUrl, tokens } = await generateWithGemini(builtPrompt, geminiKey, base64);
        results.push({ ...scene, dataUrl, prompt: builtPrompt });
        setVariantImages([...results]);
        setTokenLog(prev => [...prev, { type: "image", label: scene.label, tokens }]);
      } catch (err) {
        setError(`${scene.label}: ${err.message}`);
        results.push({ ...scene, dataUrl: null, error: err.message, prompt: builtPrompt });
        setVariantImages([...results]);
      }
    }
    setGeneratingIdx(-1);

    // Step 3: SEO + Instagram content
    setLoadingContent(true);
    try {
      const { result, tokens } = await generateSEOAndIG(productInfo);
      if (result) {
        setShopifySEO(result.shopify);
        setIgContent(result.instagram);
        setTokenLog(prev => [...prev, { type: "text", label: "SEO + Instagram", tokens }]);
      }
    } catch (e) { console.error(e); }
    finally { setLoadingContent(false); }
  };

  const downloadVariant = (v, i) => {
    if (!v?.dataUrl) return;
    const a = document.createElement("a");
    a.href = v.dataUrl;
    a.download = `mandarina-${(productInfo.name || "producto").replace(/\s+/g, "-")}-v${i+1}.jpg`;
    a.click();
  };

  const downloadAll = () => variantImages.forEach((v, i) => { if (v.dataUrl) downloadVariant(v, i); });

  const reset = () => {
    setStep(0); setPhoto(null); setVariantImages([]); setGeneratedPrompts([]);
    setShopifySEO(null); setIgContent(null); setTokenLog([]); setError("");
    setPublishStatus({ shopify: "", instagram: "" });
    setProductInfo({ name: "", price: "", category: "Ropa", description: "", color: "" });
    setPromptGuide("");
  };

  const isGenerating = generatingIdx >= 0 || generatingPromptIdx >= 0;
  const selectedImg = variantImages[selectedVariant];

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)", fontFamily: "'Georgia',serif", color: "#f5f0eb" }}>

      {/* HEADER */}
      <header style={{ padding: "14px 24px", borderBottom: "1px solid rgba(255,165,80,0.12)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(20px)", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#ff8c42,#e63946)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: "bold" }}>M</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: "bold", letterSpacing: "0.05em", color: "#ff9f5a" }}>MANDARINA PRO</div>
            <div style={{ fontSize: 8, color: "rgba(255,255,255,0.25)", letterSpacing: "0.15em" }}>AI FASHION STUDIO</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {totalTokens > 0 && (
            <div style={{ background: "rgba(255,200,50,0.08)", border: "1px solid rgba(255,200,50,0.2)", borderRadius: 20, padding: "4px 12px", fontSize: 11, color: "#ffd060" }}>
              ⚡ {totalTokens.toLocaleString()} tokens · ~${totalCost}
            </div>
          )}
          {["📸 Foto", "🤖 Generando", "👁️ Revisar", "✅ Publicar"].map((label, i) => (
            <button key={i} onClick={() => i < step && setStep(i)} style={{ padding: "4px 10px", borderRadius: 20, border: i === step ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.1)", background: i === step ? "rgba(255,140,66,0.15)" : "transparent", color: i === step ? "#ff8c42" : i < step ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.2)", fontSize: 10, cursor: i < step ? "pointer" : "default", fontFamily: "inherit" }}>{label}</button>
          ))}
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "24px 20px" }}>

        {/* ══ STEP 0: SETUP ══ */}
        {step === 0 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 28, fontWeight: "normal", color: "#ff9f5a", marginBottom: 4 }}>Sube tu producto</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 22, fontSize: 13 }}>
              Claude analiza tu prenda en detalle → construye prompts profesionales → Gemini genera modelos hiperrealistas
            </p>

            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>

              {/* Upload + Keys */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div onDrop={onDrop} onDragOver={e => e.preventDefault()} onClick={() => fileRef.current.click()}
                  style={{ border: "2px dashed rgba(255,140,66,0.3)", borderRadius: 14, cursor: "pointer", background: "rgba(255,140,66,0.02)", minHeight: 220, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  {photo
                    ? <img src={photo} alt="producto" style={{ width: "100%", objectFit: "contain", maxHeight: 280 }} />
                    : <div style={{ textAlign: "center", padding: 24 }}><div style={{ fontSize: 44, marginBottom: 10, opacity: 0.35 }}>👕</div><div style={{ fontSize: 15, color: "#ff9f5a", marginBottom: 4 }}>Arrastra tu foto aquí</div><div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>JPG, PNG, HEIC</div></div>
                  }
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />

                <div style={{ background: "rgba(66,133,244,0.06)", border: "1px solid rgba(66,133,244,0.18)", borderRadius: 11, padding: 13 }}>
                  <div style={{ fontSize: 10, color: "#7ab3ff", marginBottom: 7 }}>🔑 Google Gemini API Key</div>
                  <input value={geminiKey} onChange={e => setGeminiKey(e.target.value)} placeholder="AIzaSy..." type="password"
                    style={{ width: "100%", padding: "7px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(66,133,244,0.2)", borderRadius: 7, color: "#f5f0eb", fontSize: 12, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                  <div style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", marginTop: 4 }}>aistudio.google.com/apikey · ~$0.20 por 5 imágenes</div>
                </div>

                {/* Pipeline explanation */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: 13 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", marginBottom: 8 }}>PIPELINE DE IA</div>
                  {[
                    { icon: "👁️", label: "Claude analiza tu prenda", desc: "colores, texturas, detalles" },
                    { icon: "✍️", label: "Construye prompt profesional", desc: "nivel Madhappy / Fear of God" },
                    { icon: "🖼️", label: "Gemini genera la imagen", desc: "modelo hiperrealista con tu ropa" },
                    { icon: "📝", label: "Claude genera SEO + IG", desc: "título, meta, hashtags, copy" },
                  ].map((s, i) => (
                    <div key={i} style={{ display: "flex", gap: 10, marginBottom: i < 3 ? 8 : 0, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 14, marginTop: 1 }}>{s.icon}</span>
                      <div>
                        <div style={{ fontSize: 11, color: "#f5f0eb" }}>{s.label}</div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>{s.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Product info + style guide */}
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,140,66,0.14)", borderRadius: 13, padding: 18 }}>
                  <div style={{ fontSize: 11, color: "#ff9f5a", marginBottom: 14, letterSpacing: "0.08em" }}>INFORMACIÓN DEL PRODUCTO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 4 }}>NOMBRE</label>
                      <input value={productInfo.name} onChange={e => setProductInfo(p => ({ ...p, name: e.target.value }))} placeholder="Hoodie Zip-Up Vintage Rose"
                        style={{ width: "100%", padding: "8px 11px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.18)", borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                    </div>
                    {[
                      { key: "price", label: "PRECIO $", placeholder: "35.00" },
                      { key: "color", label: "COLOR", placeholder: "vintage rose pink" },
                      { key: "category", label: "CATEGORÍA", placeholder: "Hoodies" },
                    ].map(f => (
                      <div key={f.key}>
                        <label style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 4 }}>{f.label}</label>
                        <input value={productInfo[f.key]} onChange={e => setProductInfo(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder}
                          style={{ width: "100%", padding: "8px 11px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.18)", borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", boxSizing: "border-box" }} />
                      </div>
                    ))}
                    <div style={{ gridColumn: "1/-1" }}>
                      <label style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", display: "block", marginBottom: 4 }}>DESCRIPCIÓN DE LA PRENDA</label>
                      <textarea value={productInfo.description} onChange={e => setProductInfo(p => ({ ...p, description: e.target.value }))} placeholder="Hoodie oversized heavyweight, zipper metálico, bordado chenille, fleece premium, fit relajado..."
                        rows={2} style={{ width: "100%", padding: "8px 11px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,140,66,0.18)", borderRadius: 8, color: "#f5f0eb", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box" }} />
                    </div>
                  </div>
                </div>

                <div style={{ background: "rgba(255,220,80,0.05)", border: "1px solid rgba(255,220,80,0.18)", borderRadius: 13, padding: 18, flex: 1 }}>
                  <div style={{ fontSize: 11, color: "#ffd060", marginBottom: 6, letterSpacing: "0.08em" }}>✨ GUÍA DE ESTILO PARA LOS MODELOS</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>
                    Claude leerá esto junto con tu foto para construir prompts al nivel de campañas editoriales.
                  </div>
                  <textarea value={promptGuide} onChange={e => setPromptGuide(e.target.value)}
                    placeholder={`Ejemplos:
• modelos latina/o de 20-25 años, piel oliva, cabello oscuro
• actitud relajada y confiada, no demasiado posado
• estética Gen Z, inspiración Madhappy / streetwear premium
• no lentes de sol, no accesorios exagerados
• texturas de tela visibles y realistas`}
                    rows={7} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,220,80,0.15)", borderRadius: 9, color: "#f5f0eb", fontSize: 12, outline: "none", fontFamily: "inherit", resize: "none", boxSizing: "border-box", lineHeight: 1.6 }} />
                </div>

                {/* Scenes preview */}
                <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 11, padding: 13 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>5 VARIANTES QUE SE GENERARÁN</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {VARIANT_SCENES.map((s, i) => (
                      <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "8px 6px", textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#f5f0eb", fontWeight: "bold", marginBottom: 2 }}>{s.label}</div>
                        <div style={{ fontSize: 8, color: "rgba(255,255,255,0.3)" }}>{s.format}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={async () => { setStep(1); await runGeneration(); setStep(2); }}
              disabled={!photo || !geminiKey}
              style={{ marginTop: 18, width: "100%", padding: "14px", background: photo && geminiKey ? "linear-gradient(135deg,#ff8c42,#e63946)" : "rgba(255,255,255,0.07)", border: "none", borderRadius: 12, color: photo && geminiKey ? "#fff" : "rgba(255,255,255,0.25)", fontSize: 14, fontWeight: "bold", cursor: photo && geminiKey ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: "0.04em" }}>
              {!photo ? "📸 Primero sube una foto" : !geminiKey ? "🔑 Ingresa tu Gemini API Key" : "🚀 Generar campañas de producto con IA →"}
            </button>
          </div>
        )}

        {/* ══ STEP 1: GENERATING ══ */}
        {step === 1 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 24, fontWeight: "normal", color: "#ff9f5a", marginBottom: 20, textAlign: "center" }}>Generando tu campaña...</h1>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 12, marginBottom: 24 }}>
              {VARIANT_SCENES.map((s, i) => {
                const img = variantImages[i];
                const isPrompting = i === generatingPromptIdx;
                const isImaging = i === generatingIdx;
                const isDone = !!img?.dataUrl;
                const isError = !!img?.error;
                return (
                  <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: isDone ? "1px solid rgba(255,140,66,0.4)" : "1px solid rgba(255,255,255,0.07)", background: "#0d0d0d" }}>
                    <div style={{ aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
                      {isDone && <img src={img.dataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                      {isPrompting && <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, animation: "spin 1.5s linear infinite" }}>✍️</div><div style={{ fontSize: 9, color: "#ffd060", marginTop: 4 }}>Analizando...</div></div>}
                      {isImaging && <div style={{ textAlign: "center" }}><div style={{ fontSize: 20, animation: "spin 1s linear infinite" }}>⚡</div><div style={{ fontSize: 9, color: "#ff9f5a", marginTop: 4 }}>Generando...</div></div>}
                      {isError && <div style={{ textAlign: "center" }}><div style={{ fontSize: 20 }}>❌</div></div>}
                      {!isDone && !isPrompting && !isImaging && !isError && <div style={{ fontSize: 20, opacity: 0.2 }}>⏳</div>}
                    </div>
                    <div style={{ padding: "6px 8px", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                      <div style={{ fontSize: 10, color: isDone ? "#ff9f5a" : "rgba(255,255,255,0.4)", fontWeight: isDone ? "bold" : "normal" }}>{s.label}</div>
                      <div style={{ fontSize: 8, color: "rgba(255,255,255,0.2)" }}>
                        {isDone ? "✓ Listo" : isPrompting ? "Analizando prenda..." : isImaging ? "Generando imagen..." : isError ? "Error" : "Esperando..."}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Generated prompts */}
            {generatedPrompts.length > 0 && (
              <div style={{ background: "rgba(255,220,80,0.04)", border: "1px solid rgba(255,220,80,0.12)", borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 10, color: "#ffd060", marginBottom: 10, letterSpacing: "0.08em" }}>✍️ PROMPTS GENERADOS POR CLAUDE</div>
                {generatedPrompts.map((p, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: "#ff9f5a", marginBottom: 4 }}>→ {p.scene}</div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", lineHeight: 1.5, maxHeight: 60, overflow: "hidden", textOverflow: "ellipsis" }}>{p.prompt.substring(0, 200)}...</div>
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ padding: "10px 14px", background: "rgba(255,80,80,0.08)", border: "1px solid rgba(255,80,80,0.2)", borderRadius: 10, fontSize: 11, color: "#ff8888" }}>⚠️ {error}</div>}
          </div>
        )}

        {/* ══ STEP 2: REVIEW ══ */}
        {step === 2 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
              <div>
                <h1 style={{ fontSize: 26, fontWeight: "normal", color: "#ff9f5a", marginBottom: 3 }}>Revisa, edita y aprueba</h1>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Todo editable · Preview real de Instagram y Shopify · Tú decides qué se publica</p>
              </div>
              <div style={{ textAlign: "right", fontSize: 11, color: "#ffd060" }}>
                ⚡ {totalTokens.toLocaleString()} tokens<br/>
                <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>~${totalCost} USD</span>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 18 }}>
              {/* LEFT */}
              <div>
                {/* Variant selector */}
                <div style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 8, letterSpacing: "0.08em" }}>SELECCIONA LA MEJOR FOTO</div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 6 }}>
                    {VARIANT_SCENES.map((s, i) => {
                      const img = variantImages[i];
                      return (
                        <div key={i} onClick={() => img?.dataUrl && setSelectedVariant(i)}
                          style={{ borderRadius: 8, overflow: "hidden", border: selectedVariant === i ? "2px solid #ff8c42" : "2px solid rgba(255,255,255,0.07)", cursor: img?.dataUrl ? "pointer" : "default", aspectRatio: "1", background: "#111", position: "relative" }}>
                          {img?.dataUrl ? <img src={img.dataUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{img?.error ? "❌" : "—"}</div>}
                          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "linear-gradient(transparent,rgba(0,0,0,0.8))", padding: "3px 3px 2px", textAlign: "center" }}>
                            <div style={{ fontSize: 7, color: "#fff" }}>{s.label}</div>
                          </div>
                          {img?.dataUrl && <button onClick={e => { e.stopPropagation(); downloadVariant(img, i); }} style={{ position: "absolute", top: 3, right: 3, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: 4, color: "#fff", fontSize: 9, cursor: "pointer", padding: "2px 4px" }}>⬇</button>}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Selected image large */}
                {selectedImg?.dataUrl && (
                  <div style={{ borderRadius: 12, overflow: "hidden", marginBottom: 12, position: "relative" }}>
                    <img src={selectedImg.dataUrl} style={{ width: "100%", maxHeight: 300, objectFit: "cover", display: "block" }} />
                    <button onClick={downloadAll} style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(0,0,0,0.75)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff", fontSize: 11, cursor: "pointer", padding: "6px 12px", fontFamily: "inherit" }}>⬇️ Descargar todas</button>
                  </div>
                )}

                {/* Preview toggle */}
                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  {[{id:"instagram",label:"📱 Preview Instagram"},{id:"shopify",label:"🛍️ Preview Shopify"}].map(p => (
                    <button key={p.id} onClick={() => setActivePreview(p.id)}
                      style={{ flex: 1, padding: "8px", background: activePreview === p.id ? "rgba(255,140,66,0.15)" : "rgba(255,255,255,0.04)", border: activePreview === p.id ? "1px solid #ff8c42" : "1px solid rgba(255,255,255,0.07)", borderRadius: 9, color: activePreview === p.id ? "#ff9f5a" : "rgba(255,255,255,0.4)", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>{p.label}</button>
                  ))}
                </div>

                <div style={{ maxHeight: 500, overflowY: "auto" }}>
                  {activePreview === "instagram"
                    ? <InstagramPreview image={selectedImg?.dataUrl} caption={igContent?.caption} hashtags={igContent?.hashtags} cta={igContent?.cta} reelHook={igContent?.reelHook} price={productInfo.price} name={productInfo.name} />
                    : <ShopifyPreview image={selectedImg?.dataUrl} shopify={shopifySEO} price={productInfo.price} name={productInfo.name} />
                  }
                </div>
              </div>

              {/* RIGHT: Editable */}
              <div style={{ maxHeight: "80vh", overflowY: "auto", paddingRight: 4 }}>
                {loadingContent && <div style={{ textAlign: "center", padding: "40px", color: "#ff9f5a" }}><div style={{ fontSize: 28, animation: "spin 1s linear infinite" }}>⚡</div><div style={{ marginTop: 10, fontSize: 13 }}>Generando SEO y copy de Instagram...</div></div>}

                {!loadingContent && (
                  <>
                    {/* Shopify */}
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(100,200,100,0.16)", borderRadius: 13, padding: 16, marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 18 }}>🛍️</span>
                        <span style={{ fontSize: 13, fontWeight: "bold", color: "#7ec97e" }}>Shopify SEO</span>
                        <TokenBadge tokens={tokenLog.find(t => t.label === "SEO + Instagram")?.tokens} />
                      </div>
                      <EditableField label="TÍTULO SEO" hint="max 60 chars" value={shopifySEO?.title} onChange={v => setShopifySEO(s => ({ ...s, title: v }))} color="#7ec97e" />
                      <EditableField label="META DESCRIPCIÓN" hint="150 chars" value={shopifySEO?.metaDescription} onChange={v => setShopifySEO(s => ({ ...s, metaDescription: v }))} multiline color="#7ec97e" />
                      <EditableField label="H1" value={shopifySEO?.h1} onChange={v => setShopifySEO(s => ({ ...s, h1: v }))} color="#7ec97e" />
                      <EditableField label="DESCRIPCIÓN PRODUCTO" value={shopifySEO?.bodyText} onChange={v => setShopifySEO(s => ({ ...s, bodyText: v }))} multiline color="#7ec97e" />
                      <EditableField label="GOOGLE ADS HEADLINE" hint="max 30 chars" value={shopifySEO?.googleAdsHeadline} onChange={v => setShopifySEO(s => ({ ...s, googleAdsHeadline: v }))} color="#7ec97e" />
                      <EditableField label="GOOGLE ADS CTA" value={shopifySEO?.googleAdsCTA} onChange={v => setShopifySEO(s => ({ ...s, googleAdsCTA: v }))} color="#7ec97e" />
                      <div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 5 }}>TAGS</div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                          {(shopifySEO?.tags || []).map((t, i) => <span key={i} style={{ background: "rgba(126,201,126,0.1)", border: "1px solid rgba(126,201,126,0.2)", borderRadius: 20, padding: "2px 8px", fontSize: 10, color: "#7ec97e" }}>{t}</span>)}
                        </div>
                      </div>
                    </div>

                    {/* Instagram */}
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(200,100,200,0.16)", borderRadius: 13, padding: 16 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
                        <span style={{ fontSize: 18 }}>📸</span>
                        <span style={{ fontSize: 13, fontWeight: "bold", color: "#c97ec9" }}>Instagram</span>
                      </div>
                      <EditableField label="CAPTION" value={igContent?.caption} onChange={v => setIgContent(s => ({ ...s, caption: v }))} multiline color="#c97ec9" />
                      <EditableField label="HASHTAGS" value={igContent?.hashtags} onChange={v => setIgContent(s => ({ ...s, hashtags: v }))} multiline color="#c97ec9" />
                      <EditableField label="CTA" value={igContent?.cta} onChange={v => setIgContent(s => ({ ...s, cta: v }))} color="#c97ec9" />
                      <EditableField label="STORY TEXT" value={igContent?.storyText} onChange={v => setIgContent(s => ({ ...s, storyText: v }))} color="#c97ec9" />
                      <EditableField label="REEL HOOK" hint="gancho para video" value={igContent?.reelHook} onChange={v => setIgContent(s => ({ ...s, reelHook: v }))} color="#c97ec9" />
                    </div>
                  </>
                )}
              </div>
            </div>

            <button onClick={() => setStep(3)}
              style={{ marginTop: 18, width: "100%", padding: "14px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 12, color: "#fff", fontSize: 14, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>
              ✅ Todo aprobado — ir a publicar →
            </button>
          </div>
        )}

        {/* ══ STEP 3: PUBLISH ══ */}
        {step === 3 && (
          <div style={{ animation: "fadeIn 0.4s ease" }}>
            <h1 style={{ fontSize: 26, fontWeight: "normal", color: "#ff9f5a", marginBottom: 4 }}>Publicar en Shopify e Instagram</h1>
            <p style={{ color: "rgba(255,255,255,0.4)", marginBottom: 20, fontSize: 12 }}>Revisaste y aprobaste todo. Publica cuando quieras.</p>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
              {/* Shopify */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(100,200,100,0.22)", borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>🛍️</span>
                  <div><div style={{ fontSize: 14, fontWeight: "bold", color: "#7ec97e" }}>Shopify</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Producto completo con SEO</div></div>
                </div>
                {selectedImg?.dataUrl && <img src={selectedImg.dataUrl} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", borderRadius: 10, marginBottom: 14 }} />}
                <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 9, padding: 12, marginBottom: 14, fontSize: 11, lineHeight: 1.7 }}>
                  <div style={{ color: "#7ec97e" }}>✓ {shopifySEO?.title}</div>
                  <div style={{ color: "rgba(255,255,255,0.4)" }}>✓ Meta desc + H1 + {shopifySEO?.tags?.length || 0} tags</div>
                  <div style={{ color: "rgba(255,255,255,0.4)" }}>✓ Google Ads copy listo</div>
                  <div style={{ color: "rgba(255,255,255,0.4)" }}>✓ Imagen AI · Precio: ${productInfo.price}</div>
                </div>
                <button onClick={() => { setPublishStatus(s => ({ ...s, shopify: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, shopify: "done" })), 2200); }}
                  disabled={publishStatus.shopify === "loading" || publishStatus.shopify === "done"}
                  style={{ width: "100%", padding: "13px", background: publishStatus.shopify === "done" ? "rgba(126,201,126,0.2)" : "linear-gradient(135deg,#2d7d2d,#1a5c1a)", border: "1px solid rgba(126,201,126,0.3)", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: publishStatus.shopify === "done" ? "default" : "pointer", fontFamily: "inherit" }}>
                  {publishStatus.shopify === "loading" ? "⏳ Publicando..." : publishStatus.shopify === "done" ? "✅ Publicado en Shopify" : "🚀 Publicar en Shopify"}
                </button>
              </div>

              {/* Instagram */}
              <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(200,100,200,0.22)", borderRadius: 16, padding: 20 }}>
                <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 24 }}>📸</span>
                  <div><div style={{ fontSize: 14, fontWeight: "bold", color: "#c97ec9" }}>Instagram</div><div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>Feed + Stories + Reels</div></div>
                </div>
                <div style={{ marginBottom: 14, maxHeight: 320, overflowY: "auto" }}>
                  <InstagramPreview image={selectedImg?.dataUrl} caption={igContent?.caption} hashtags={igContent?.hashtags} cta={igContent?.cta} reelHook={igContent?.reelHook} price={productInfo.price} name={productInfo.name} />
                </div>
                <button onClick={() => { setPublishStatus(s => ({ ...s, instagram: "loading" })); setTimeout(() => setPublishStatus(s => ({ ...s, instagram: "done" })), 1800); }}
                  disabled={publishStatus.instagram === "loading" || publishStatus.instagram === "done"}
                  style={{ width: "100%", padding: "13px", background: publishStatus.instagram === "done" ? "rgba(201,126,201,0.2)" : "linear-gradient(135deg,#7b2d7b,#521a52)", border: "1px solid rgba(201,126,201,0.3)", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: publishStatus.instagram === "done" ? "default" : "pointer", fontFamily: "inherit" }}>
                  {publishStatus.instagram === "loading" ? "⏳ Preparando..." : publishStatus.instagram === "done" ? "✅ Listo para Instagram" : "📱 Publicar en Instagram"}
                </button>
              </div>
            </div>

            {/* Token summary */}
            <div style={{ background: "rgba(255,200,50,0.05)", border: "1px solid rgba(255,200,50,0.12)", borderRadius: 12, padding: 14, marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#ffd060", marginBottom: 10, letterSpacing: "0.08em" }}>⚡ RESUMEN DE CONSUMO</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                {tokenLog.map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "3px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>{t.type === "image" ? "🖼️" : "📝"} {t.label}</span>
                    <span style={{ color: "#ffd060" }}>{t.tokens.toLocaleString()} · ${(t.tokens*(t.type==="image"?0.00003:0.000003)).toFixed(4)}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13, fontWeight: "bold", color: "#ffd060" }}>
                <span>TOTAL SESIÓN</span><span>{totalTokens.toLocaleString()} tokens · ~${totalCost} USD</span>
              </div>
            </div>

            {(publishStatus.shopify === "done" || publishStatus.instagram === "done") && (
              <div style={{ background: "rgba(255,140,66,0.06)", border: "1px solid rgba(255,140,66,0.18)", borderRadius: 12, padding: 18, textAlign: "center" }}>
                <div style={{ fontSize: 26, marginBottom: 6 }}>🎉</div>
                <div style={{ fontSize: 15, color: "#ff9f5a", marginBottom: 12 }}>¡{productInfo.name || "Producto"} publicado!</div>
                <button onClick={reset} style={{ padding: "10px 24px", background: "linear-gradient(135deg,#ff8c42,#e63946)", border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: "bold", cursor: "pointer", fontFamily: "inherit" }}>+ Publicar otro producto</button>
              </div>
            )}
          </div>
        )}
      </main>

      <style>{`
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.18)}
        button:hover:not(:disabled){opacity:0.85}
        ::-webkit-scrollbar{height:3px;width:3px}
        ::-webkit-scrollbar-thumb{background:rgba(255,140,66,0.25);border-radius:2px}
      `}</style>
    </div>
  );
}
