import { useState, useRef, useCallback } from "react";

const VARIANT_SCENES = [
  { label: "Mirror Selfie", scene: "luxury hotel room mirror selfie, iPhone camera aesthetic, warm ambient lighting, beige walls, wooden textures", pose: "mirror selfie, one hand holding phone, other hand touching hair, relaxed effortless posture", mood: "soft luxury, cozy, authentic Instagram story feel" },
  { label: "Urban Street", scene: "modern city street, golden hour natural light, urban architecture background, bokeh", pose: "walking confidently, 3/4 shot, looking slightly off camera", mood: "confident urban streetwear, editorial but natural" },
  { label: "Studio Editorial", scene: "clean white studio, professional fashion lighting, seamless backdrop", pose: "fashion editorial pose, full body or 3/4, hands in pockets", mood: "premium fashion catalog, clean and professional" },
  { label: "Lifestyle Indoor", scene: "minimalist modern apartment, warm soft window light, blurred background", pose: "relaxed seated or leaning, casual natural pose", mood: "warm lifestyle, aspirational everyday, Gen Z aesthetic" },
  { label: "Outdoor Quito", scene: "Quito Ecuador cityscape, Andes mountains visible, colonial architecture background", pose: "standing naturally, full body, city explorer vibe", mood: "proud local brand, urban latin fashion" },
];

// ─── APIs ─────────────────────────────────────────────────────────────────────
async function analyzeAndBuildPrompt(photoBase64, productInfo, userGuide, scene) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{ role: "user", content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: photoBase64 } },
        { type: "text", text: `You are an expert fashion photography prompt engineer at the level of Madhappy, Fear of God Essentials, and Supreme campaigns.

Analyze this garment photo in extreme detail, then build a hyperrealistic fashion photography prompt.

PRODUCT: ${productInfo.name || "fashion garment"} | Color: ${productInfo.color || "see image"} | ${productInfo.description || ""}
SCENE: ${scene.scene}
POSE: ${scene.pose}  
MOOD: ${scene.mood}
STYLE GUIDE: ${userGuide || "young latinx models, 20-25yo, authentic natural feel"}

Build the prompt following this structure:
1. Photography style & camera (iPhone/DSLR, lens, grain, realism level)
2. Model description (age, ethnicity, hair, skin, expression - hyper specific)
3. GARMENT DESCRIPTION (copy EXACTLY what you see: every color, texture, fabric, logo, print, cut, fit detail - make it so detailed the AI recreates it perfectly)
4. Pose & composition
5. Scene & background
6. Lighting (golden hour, studio, ambient - exact description)
7. Mood & atmosphere
8. Critical details bullet list (what must NOT happen, what IS essential)

Output ONLY the prompt text, 600-900 words, no explanation, no title.` }
      ]}]
    })
  });
  const data = await res.json();
  return { prompt: data.content?.[0]?.text || "", tokens: (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0) };
}

async function generateWithGemini(prompt, geminiKey, photoBase64) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: "image/jpeg", data: photoBase64 } },
          { text: prompt }
        ]}],
        generationConfig: { responseModalities: ["IMAGE","TEXT"], temperature: 0.4 },
      })
    }
  );
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));
  const tokens = (data.usageMetadata?.promptTokenCount||0)+(data.usageMetadata?.candidatesTokenCount||0);
  if (img) return { dataUrl: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`, tokens };
  throw new Error(data.error?.message || data.candidates?.[0]?.finishReason || "Error");
}

async function editImageWithInstruction(imageBase64, instruction, geminiKey, originalPhotoBase64) {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { inline_data: { mime_type: "image/jpeg", data: originalPhotoBase64 } },
          { inline_data: { mime_type: "image/jpeg", data: imageBase64 } },
          { text: `You are editing a fashion photo. The first image is the ORIGINAL product reference. The second image is the generated fashion photo that needs editing.

EDIT INSTRUCTION: "${instruction}"

Apply ONLY this specific change. Keep everything else identical:
- Same model, same pose, same lighting, same background
- Same garment design from the original reference (first image)
- Only apply the requested modification

Return the edited image.` }
        ]}],
        generationConfig: { responseModalities: ["IMAGE","TEXT"], temperature: 0.3 },
      })
    }
  );
  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const img = parts.find(p => p.inlineData?.mimeType?.startsWith("image/"));
  const tokens = (data.usageMetadata?.promptTokenCount||0)+(data.usageMetadata?.candidatesTokenCount||0);
  if (img) return { dataUrl: `data:${img.inlineData.mimeType};base64,${img.inlineData.data}`, tokens };
  throw new Error(data.error?.message || "Error editando imagen");
}

async function generateSEO(productInfo) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      system: "Eres experto en neuromarketing, SEO avanzado para e-commerce de moda y community manager de Instagram. Técnicas: AIDA, PAS, ganchos emocionales, FOMO sutil, storytelling. Responde SOLO JSON válido sin backticks.",
      messages: [{ role: "user", content: `Producto Mandarina Ecuador: nombre="${productInfo.name||"Prenda"}", precio=$${productInfo.price||"XX"}, color="${productInfo.color||""}", categoría="${productInfo.category||"Ropa"}", descripción="${productInfo.description||""}". Tienda: www.mandarinEc.com Quito.
JSON: {"shopify":{"title":"SEO max 60","metaDescription":"150 chars","h1":"H1 atractivo","bodyText":"3-4 oraciones persuasivas","tags":["t1","t2","t3","t4","t5","t6"],"googleAdsHeadline":"max 30","googleAdsCTA":"CTA"},"instagram":{"caption":"caption con emojis max 220 chars SIN hashtags","hashtags":"#mandarina #mandarinaec #moda #modaecuador #ecuador #ootd #fashion #estilo #ropa #outfit #quito #streetwear","cta":"CTA corto","storyText":"story 2 líneas con emoji","reelHook":"gancho 3-5 palabras"}}` }]
    })
  });
  const data = await res.json();
  const tokens = (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0);
  const text = data.content?.[0]?.text || "{}";
  try { return { result: JSON.parse(text.replace(/```json|```/g,"").trim()), tokens }; }
  catch { return { result: null, tokens }; }
}

function dataUrlToBase64(d) { return d.split(",")[1]; }

// ─── EDITABLE FIELD ───────────────────────────────────────────────────────────
function EF({ label, value, onChange, multi=false, color="#7ec97e", hint="" }) {
  const [ed, setEd] = useState(false);
  const [cp, setCp] = useState(false);
  return (
    <div style={{marginBottom:11}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <span style={{fontSize:9,color:"rgba(255,255,255,0.3)",letterSpacing:"0.08em"}}>{label}{hint&&<span style={{color:"rgba(255,255,255,0.18)",marginLeft:5}}>{hint}</span>}</span>
        <div style={{display:"flex",gap:4}}>
          <button onClick={()=>setEd(!ed)} style={{background:ed?"rgba(255,140,66,0.15)":"rgba(255,255,255,0.04)",border:`1px solid ${ed?"#ff8c42":"rgba(255,255,255,0.08)"}`,borderRadius:4,color:ed?"#ff9f5a":"rgba(255,255,255,0.3)",fontSize:9,cursor:"pointer",padding:"2px 7px",fontFamily:"inherit"}}>{ed?"✓":"✏️"}</button>
          <button onClick={()=>{navigator.clipboard.writeText(value||"");setCp(true);setTimeout(()=>setCp(false),1200);}} style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:4,color:cp?color:"rgba(255,255,255,0.3)",fontSize:9,cursor:"pointer",padding:"2px 6px"}}>{cp?"✓":"📋"}</button>
        </div>
      </div>
      {ed
        ? multi ? <textarea value={value||""} onChange={e=>onChange(e.target.value)} rows={3} style={{width:"100%",padding:"7px 10px",background:"rgba(255,140,66,0.06)",border:`1px solid #ff8c42`,borderRadius:7,color:"#f5f0eb",fontSize:11,outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",lineHeight:1.5}}/>
                : <input value={value||""} onChange={e=>onChange(e.target.value)} style={{width:"100%",padding:"7px 10px",background:"rgba(255,140,66,0.06)",border:`1px solid #ff8c42`,borderRadius:7,color:"#f5f0eb",fontSize:11,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
        : <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:7,padding:"7px 10px",fontSize:11,color:value?"#f5f0eb":"rgba(255,255,255,0.18)",lineHeight:1.5,minHeight:30}}>{value||"—"}</div>
      }
    </div>
  );
}

// ─── IMAGE EDITOR CHAT ────────────────────────────────────────────────────────
function ImageEditorChat({ variant, variantIndex, originalPhoto, geminiKey, onUpdate, onTokens }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const inputRef = useRef();

  const send = async () => {
    if (!msg.trim() || loading) return;
    const instruction = msg.trim();
    setMsg("");
    setLoading(true);
    setHistory(h => [...h, { role: "user", text: instruction }]);
    try {
      const currentBase64 = dataUrlToBase64(variant.dataUrl);
      const origBase64 = dataUrlToBase64(originalPhoto);
      const { dataUrl, tokens } = await editImageWithInstruction(currentBase64, instruction, geminiKey, origBase64);
      onUpdate(variantIndex, dataUrl);
      onTokens({ type: "image", label: `Edit: ${instruction.substring(0,30)}`, tokens });
      setHistory(h => [...h, { role: "ai", text: "✅ Listo. ¿Algo más que ajustar?" }]);
    } catch (e) {
      setHistory(h => [...h, { role: "ai", text: `❌ ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,140,66,0.15)",borderRadius:12,padding:14,marginTop:12}}>
      <div style={{fontSize:10,color:"#ff9f5a",marginBottom:10,letterSpacing:"0.08em"}}>✏️ EDITAR ESTA IMAGEN CON IA</div>
      <div style={{fontSize:10,color:"rgba(255,255,255,0.25)",marginBottom:10,lineHeight:1.6}}>
        Ejemplos: "borra el logo del pecho" · "más realismo en la cara" · "cambia el fondo a Quito" · "la persona parece muy IA, hazla más real" · "mueve la persona a la derecha"
      </div>
      {history.length > 0 && (
        <div style={{marginBottom:10,maxHeight:120,overflowY:"auto",display:"flex",flexDirection:"column",gap:6}}>
          {history.map((m,i) => (
            <div key={i} style={{padding:"6px 10px",borderRadius:8,background:m.role==="user"?"rgba(255,140,66,0.12)":"rgba(255,255,255,0.04)",fontSize:11,color:m.role==="user"?"#ff9f5a":"rgba(255,255,255,0.6)",alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"90%"}}>
              {m.text}
            </div>
          ))}
          {loading && <div style={{padding:"6px 10px",borderRadius:8,background:"rgba(255,255,255,0.04)",fontSize:11,color:"rgba(255,255,255,0.4)",alignSelf:"flex-start"}}>⚡ Editando con Gemini...</div>}
        </div>
      )}
      <div style={{display:"flex",gap:8}}>
        <input ref={inputRef} value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()}
          placeholder="Describe el cambio que quieres..." disabled={loading}
          style={{flex:1,padding:"8px 11px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,140,66,0.2)",borderRadius:8,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit"}}/>
        <button onClick={send} disabled={loading||!msg.trim()}
          style={{padding:"8px 14px",background:loading||!msg.trim()?"rgba(255,255,255,0.06)":"linear-gradient(135deg,#ff8c42,#e63946)",border:"none",borderRadius:8,color:"#fff",fontSize:12,cursor:loading||!msg.trim()?"not-allowed":"pointer",fontFamily:"inherit",fontWeight:"bold"}}>
          {loading?"⏳":"→"}
        </button>
      </div>
    </div>
  );
}

// ─── INSTAGRAM PREVIEW ────────────────────────────────────────────────────────
function IGPreview({ image, ig, price }) {
  return (
    <div style={{background:"#0a0a0a",borderRadius:16,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)",fontFamily:"-apple-system,sans-serif"}}>
      <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:32,height:32,borderRadius:"50%",background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366)",padding:2}}>
          <div style={{width:"100%",height:"100%",borderRadius:"50%",background:"linear-gradient(135deg,#ff8c42,#e63946)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:"bold",color:"#fff"}}>M</div>
        </div>
        <div><div style={{fontSize:13,fontWeight:"600",color:"#fff"}}>mandarina.ec</div><div style={{fontSize:10,color:"rgba(255,255,255,0.4)"}}>Quito, Ecuador</div></div>
        <div style={{marginLeft:"auto",fontSize:18,color:"rgba(255,255,255,0.4)",letterSpacing:2}}>···</div>
      </div>
      {image ? <img src={image} style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/> : <div style={{width:"100%",aspectRatio:"1",background:"rgba(255,255,255,0.03)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:36,opacity:0.15}}>📸</span></div>}
      <div style={{padding:"10px 14px 4px",display:"flex",gap:14}}>
        <span style={{fontSize:20}}>🤍</span><span style={{fontSize:20}}>💬</span><span style={{fontSize:20}}>📤</span>
        <span style={{fontSize:20,marginLeft:"auto"}}>🔖</span>
      </div>
      <div style={{padding:"3px 14px 14px"}}>
        {price && <div style={{marginBottom:6,display:"inline-block",background:"rgba(255,140,66,0.2)",border:"1px solid rgba(255,140,66,0.3)",borderRadius:6,padding:"2px 10px",fontSize:11,color:"#ff9f5a",fontWeight:"bold"}}>💰 ${price} USD</div>}
        <div style={{fontSize:12,color:"#fff",lineHeight:1.5,marginBottom:4}}><strong>mandarina.ec</strong> {ig?.caption||<span style={{color:"rgba(255,255,255,0.25)"}}>caption...</span>}</div>
        {ig?.cta && <div style={{fontSize:11,color:"#ff9f5a",marginBottom:4,fontWeight:"600"}}>→ {ig.cta}</div>}
        <div style={{fontSize:11,color:"#4a9eff",lineHeight:1.5}}>{ig?.hashtags||""}</div>
        {ig?.reelHook && <div style={{marginTop:7,background:"rgba(255,255,255,0.03)",borderRadius:7,padding:"5px 9px",fontSize:10,color:"rgba(255,255,255,0.4)"}}>🎬 <span style={{color:"#ff9f5a"}}>"{ig.reelHook}"</span></div>}
      </div>
    </div>
  );
}

// ─── SHOPIFY PREVIEW ──────────────────────────────────────────────────────────
function ShopPreview({ image, seo, price }) {
  if (!seo?.title) return <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.2)",fontSize:13}}>Generando SEO...</div>;
  return (
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",color:"#333",fontFamily:"Arial,sans-serif"}}>
      <div style={{background:"#f0f0f0",padding:"7px 12px",display:"flex",alignItems:"center",gap:8}}>
        <div style={{display:"flex",gap:4}}>{["#ff5f57","#febc2e","#28c840"].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c}}/>)}</div>
        <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:4,padding:"2px 10px",fontSize:9,color:"#666",flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>mandarinec.com › {(seo.title||"").toLowerCase().replace(/\s+/g,"-").substring(0,30)}</div>
      </div>
      <div style={{padding:"10px 14px",background:"#f8f9fa",borderBottom:"1px solid #eee"}}>
        <div style={{fontSize:9,color:"#777",marginBottom:2}}>Vista en Google</div>
        <div style={{fontSize:14,color:"#1a0dab",fontWeight:"600"}}>{seo.title}</div>
        <div style={{fontSize:10,color:"#006621"}}>mandarinec.com › productos</div>
        <div style={{fontSize:11,color:"#4d5156",lineHeight:1.4,marginTop:2}}>{seo.metaDescription}</div>
      </div>
      {seo.googleAdsHeadline && <div style={{padding:"7px 14px",background:"#fffde7",borderBottom:"1px solid #eee",display:"flex",gap:8,alignItems:"center"}}>
        <span style={{background:"#e8f0fe",color:"#1967d2",fontSize:8,padding:"1px 4px",borderRadius:3,fontWeight:"bold",whiteSpace:"nowrap"}}>Anuncio</span>
        <div><div style={{fontSize:12,color:"#1a0dab",fontWeight:"600"}}>{seo.googleAdsHeadline}</div><div style={{fontSize:10,color:"#545454"}}>{seo.googleAdsCTA}</div></div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
        {image ? <img src={image} style={{width:"100%",aspectRatio:"1",objectFit:"cover"}}/> : <div style={{aspectRatio:"1",background:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:28,opacity:0.15}}>👕</span></div>}
        <div style={{padding:"12px"}}>
          <div style={{fontSize:9,color:"#999",marginBottom:2,letterSpacing:"0.1em"}}>MANDARINA</div>
          <div style={{fontSize:13,fontWeight:"700",color:"#111",lineHeight:1.3,marginBottom:5}}>{seo.h1||seo.title}</div>
          {price && <div style={{fontSize:15,fontWeight:"bold",color:"#e63946",marginBottom:7}}>${price} USD</div>}
          <div style={{fontSize:10,color:"#666",lineHeight:1.5,marginBottom:8}}>{seo.bodyText}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:8}}>{(seo.tags||[]).map((t,i)=><span key={i} style={{background:"#f0f0f0",borderRadius:4,padding:"1px 5px",fontSize:8,color:"#777"}}>{t}</span>)}</div>
          <button style={{width:"100%",padding:"7px",background:"#111",color:"#fff",border:"none",borderRadius:5,fontSize:11,fontWeight:"bold",cursor:"pointer"}}>Añadir al carrito</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function MandarinaPro() {
  const [step, setStep] = useState(0);
  const [photo, setPhoto] = useState(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [promptGuide, setPromptGuide] = useState("");
  const [productInfo, setProductInfo] = useState({ name:"", price:"", category:"Ropa", description:"", color:"" });
  const [variants, setVariants] = useState([]); // {label, dataUrl, error, prompt}
  const [genIdx, setGenIdx] = useState(-1);
  const [promptIdx, setPromptIdx] = useState(-1);
  const [selectedV, setSelectedV] = useState(0);
  const [expandedEditor, setExpandedEditor] = useState(null); // index of variant showing editor
  const [seo, setSeo] = useState(null);
  const [ig, setIg] = useState(null);
  const [loadingSEO, setLoadingSEO] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState("");
  const [pubStatus, setPubStatus] = useState({ shopify:"", instagram:"" });
  const [activePreview, setActivePreview] = useState("instagram");
  const fileRef = useRef();

  const totalTokens = tokens.reduce((a,b)=>a+b.tokens,0);
  const totalCost = tokens.reduce((a,b)=>a+b.tokens*(b.type==="image"?0.00003:0.000003),0).toFixed(4);

  const handleFile = useCallback(file => {
    if (!file) return;
    const r = new FileReader();
    r.onload = e => setPhoto(e.target.result);
    r.readAsDataURL(file);
  }, []);

  const addToken = t => setTokens(prev => [...prev, t]);

  const updateVariant = (index, newDataUrl) => {
    setVariants(prev => prev.map((v,i) => i === index ? { ...v, dataUrl: newDataUrl } : v));
  };

  const runAll = async () => {
    setError(""); setVariants([]); setTokens([]); setSeo(null); setIg(null);
    const base64 = dataUrlToBase64(photo);
    const results = [];

    // Kick off SEO in parallel immediately so it runs while images generate
    setLoadingSEO(true);
    const seoPromise = generateSEO(productInfo)
      .then(r => {
        if (r.result) {
          setSeo(r.result.shopify);
          setIg(r.result.instagram);
          setTokens(prev => [...prev, { type:"text", label:"SEO + Instagram", tokens:r.tokens }]);
        }
      })
      .catch(e => console.error("SEO error:", e))
      .finally(() => setLoadingSEO(false));

    for (let i = 0; i < VARIANT_SCENES.length; i++) {
      const scene = VARIANT_SCENES[i];
      setPromptIdx(i);
      let prompt = "";
      try {
        const r = await analyzeAndBuildPrompt(base64, productInfo, promptGuide, scene);
        prompt = r.prompt;
        setTokens(prev => [...prev, { type:"text", label:`Análisis ${scene.label}`, tokens:r.tokens }]);
      } catch(e) {
        prompt = `Hyperrealistic fashion photo of model wearing this exact garment. ${scene.scene}. ${scene.pose}. ${scene.mood}.`;
      }

      setGenIdx(i); setPromptIdx(-1);
      try {
        const r = await generateWithGemini(prompt, geminiKey, base64);
        results.push({ ...scene, dataUrl:r.dataUrl, prompt });
        setTokens(prev => [...prev, { type:"image", label:scene.label, tokens:r.tokens }]);
      } catch(e) {
        setError(`${scene.label}: ${e.message}`);
        results.push({ ...scene, dataUrl:null, error:e.message, prompt });
      }
      setVariants([...results]);
    }
    setGenIdx(-1);
    setStep(2);
    await seoPromise;
  };

  const dl = (v, i) => {
    if (!v?.dataUrl) return;
    const a = document.createElement("a");
    a.href = v.dataUrl;
    a.download = `mandarina-${(productInfo.name||"producto").replace(/\s+/g,"-")}-v${i+1}.jpg`;
    a.click();
  };

  const reset = () => {
    setStep(0); setPhoto(null); setVariants([]); setSeo(null); setIg(null);
    setTokens([]); setError(""); setPubStatus({shopify:"",instagram:""});
    setProductInfo({name:"",price:"",category:"Ropa",description:"",color:""});
    setPromptGuide(""); setExpandedEditor(null);
  };

  const selImg = variants[selectedV];

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)",fontFamily:"'Georgia',serif",color:"#f5f0eb"}}>

      {/* HEADER */}
      <header style={{padding:"13px 22px",borderBottom:"1px solid rgba(255,165,80,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#ff8c42,#e63946)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:"bold"}}>M</div>
          <div>
            <div style={{fontSize:14,fontWeight:"bold",letterSpacing:"0.05em",color:"#ff9f5a"}}>MANDARINA PRO</div>
            <div style={{fontSize:8,color:"rgba(255,255,255,0.25)",letterSpacing:"0.12em"}}>AI FASHION STUDIO</div>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          {totalTokens > 0 && <div style={{background:"rgba(255,200,50,0.08)",border:"1px solid rgba(255,200,50,0.18)",borderRadius:20,padding:"3px 11px",fontSize:10,color:"#ffd060"}}>⚡ {totalTokens.toLocaleString()} · ~${totalCost}</div>}
          {["📸 Foto","🤖 Generando","👁️ Revisar","✅ Publicar"].map((l,i)=>(
            <button key={i} onClick={()=>i<step&&setStep(i)} style={{padding:"4px 9px",borderRadius:20,border:i===step?"1px solid #ff8c42":"1px solid rgba(255,255,255,0.08)",background:i===step?"rgba(255,140,66,0.14)":"transparent",color:i===step?"#ff8c42":i<step?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.18)",fontSize:10,cursor:i<step?"pointer":"default",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>
      </header>

      <main style={{maxWidth:1020,margin:"0 auto",padding:"22px 18px"}}>

        {/* ══ STEP 0 ══ */}
        {step === 0 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h1 style={{fontSize:26,fontWeight:"normal",color:"#ff9f5a",marginBottom:4}}>Sube tu producto</h1>
            <p style={{color:"rgba(255,255,255,0.35)",marginBottom:20,fontSize:12}}>Claude analiza tu prenda · construye prompts editoriales · Gemini genera modelos hiperrealistas</p>

            <div style={{display:"grid",gridTemplateColumns:"290px 1fr",gap:18}}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div onDrop={e=>{e.preventDefault();handleFile(e.dataTransfer.files[0]);}} onDragOver={e=>e.preventDefault()} onClick={()=>fileRef.current.click()}
                  style={{border:"2px dashed rgba(255,140,66,0.28)",borderRadius:13,cursor:"pointer",minHeight:210,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"rgba(255,140,66,0.02)"}}>
                  {photo ? <img src={photo} style={{width:"100%",objectFit:"contain",maxHeight:260}}/> : <div style={{textAlign:"center",padding:22}}><div style={{fontSize:42,marginBottom:8,opacity:0.3}}>👕</div><div style={{fontSize:14,color:"#ff9f5a",marginBottom:3}}>Arrastra tu foto</div><div style={{fontSize:10,color:"rgba(255,255,255,0.22)"}}>JPG · PNG · HEIC</div></div>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>

                <div style={{background:"rgba(66,133,244,0.06)",border:"1px solid rgba(66,133,244,0.16)",borderRadius:10,padding:12}}>
                  <div style={{fontSize:10,color:"#7ab3ff",marginBottom:6}}>🔑 Gemini API Key</div>
                  <input value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIzaSy..." type="password" style={{width:"100%",padding:"7px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(66,133,244,0.18)",borderRadius:7,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.18)",marginTop:4}}>aistudio.google.com/apikey · ~$0.20 por 5 imágenes</div>
                </div>

                <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:10,padding:12}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.35)",marginBottom:8}}>PIPELINE DE IA</div>
                  {[["👁️","Claude analiza tu prenda","colores, texturas, corte, detalles"],["✍️","Construye prompt editorial","nivel Madhappy / Fear of God"],["🖼️","Gemini genera la foto","modelo hiperrealista con tu ropa"],["✏️","Edita por chat","\"borra el logo\" · \"más realismo\""],["📝","SEO + Instagram copy","listo para publicar"]].map(([ic,t,d],i)=>(
                    <div key={i} style={{display:"flex",gap:8,marginBottom:i<4?7:0,alignItems:"flex-start"}}>
                      <span style={{fontSize:13}}>{ic}</span>
                      <div><div style={{fontSize:10,color:"#f5f0eb"}}>{t}</div><div style={{fontSize:9,color:"rgba(255,255,255,0.25)"}}>{d}</div></div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,140,66,0.13)",borderRadius:12,padding:16}}>
                  <div style={{fontSize:10,color:"#ff9f5a",marginBottom:12,letterSpacing:"0.08em"}}>PRODUCTO</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{fontSize:9,color:"rgba(255,255,255,0.28)",display:"block",marginBottom:3}}>NOMBRE</label>
                      <input value={productInfo.name} onChange={e=>setProductInfo(p=>({...p,name:e.target.value}))} placeholder="Hoodie Zip-Up Vintage Rose" style={{width:"100%",padding:"7px 10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,140,66,0.16)",borderRadius:7,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>
                    {[{k:"price",l:"PRECIO $",p:"35.00"},{k:"color",l:"COLOR",p:"vintage rose pink"},{k:"category",l:"CATEGORÍA",p:"Hoodies"}].map(f=>(
                      <div key={f.k}>
                        <label style={{fontSize:9,color:"rgba(255,255,255,0.28)",display:"block",marginBottom:3}}>{f.l}</label>
                        <input value={productInfo[f.k]} onChange={e=>setProductInfo(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={{width:"100%",padding:"7px 10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,140,66,0.16)",borderRadius:7,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </div>
                    ))}
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{fontSize:9,color:"rgba(255,255,255,0.28)",display:"block",marginBottom:3}}>DESCRIPCIÓN</label>
                      <textarea value={productInfo.description} onChange={e=>setProductInfo(p=>({...p,description:e.target.value}))} placeholder="Hoodie oversized heavyweight, zipper metálico, bordado chenille..." rows={2} style={{width:"100%",padding:"7px 10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,140,66,0.16)",borderRadius:7,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                </div>

                <div style={{background:"rgba(255,220,80,0.04)",border:"1px solid rgba(255,220,80,0.15)",borderRadius:12,padding:16,flex:1}}>
                  <div style={{fontSize:10,color:"#ffd060",marginBottom:5,letterSpacing:"0.08em"}}>✨ GUÍA DE ESTILO</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginBottom:8}}>Claude usa esto para construir prompts al nivel editorial. Cuanto más detallado, mejor el resultado.</div>
                  <textarea value={promptGuide} onChange={e=>setPromptGuide(e.target.value)}
                    placeholder={"• modelos latina/o 20-25 años, piel oliva, cabello oscuro\n• actitud relajada y confiada, no demasiado posado\n• estética Gen Z, inspiración Madhappy / streetwear premium\n• texturas de tela visibles, realismo fotográfico\n• NO lentes de sol, NO accesorios exagerados"}
                    rows={6} style={{width:"100%",padding:"9px 11px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,220,80,0.13)",borderRadius:8,color:"#f5f0eb",fontSize:11,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box",lineHeight:1.6}}/>
                </div>

                <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:10,padding:11}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.28)",marginBottom:7}}>5 VARIANTES A GENERAR</div>
                  <div style={{display:"flex",gap:6}}>
                    {VARIANT_SCENES.map((s,i)=><div key={i} style={{flex:1,background:"rgba(255,255,255,0.03)",borderRadius:7,padding:"7px 5px",textAlign:"center"}}><div style={{fontSize:9,color:"#f5f0eb",fontWeight:"bold"}}>{s.label}</div></div>)}
                  </div>
                </div>
              </div>
            </div>

            <button onClick={()=>{setStep(1);runAll();}} disabled={!photo||!geminiKey}
              style={{marginTop:16,width:"100%",padding:"14px",background:photo&&geminiKey?"linear-gradient(135deg,#ff8c42,#e63946)":"rgba(255,255,255,0.06)",border:"none",borderRadius:11,color:photo&&geminiKey?"#fff":"rgba(255,255,255,0.22)",fontSize:13,fontWeight:"bold",cursor:photo&&geminiKey?"pointer":"not-allowed",fontFamily:"inherit",letterSpacing:"0.04em"}}>
              {!photo?"📸 Primero sube una foto":!geminiKey?"🔑 Ingresa tu Gemini API Key":"🚀 Generar campaña con IA →"}
            </button>
          </div>
        )}

        {/* ══ STEP 1: GENERATING ══ */}
        {step === 1 && (
          <div style={{animation:"fadeIn 0.4s ease",textAlign:"center",paddingTop:20}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",marginBottom:12}}>GENERANDO TU CAMPAÑA</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:20}}>
              {VARIANT_SCENES.map((s,i)=>{
                const v=variants[i]; const isP=i===promptIdx; const isG=i===genIdx; const done=!!v?.dataUrl;
                return (
                  <div key={i} style={{borderRadius:11,overflow:"hidden",border:done?"1px solid rgba(255,140,66,0.35)":"1px solid rgba(255,255,255,0.06)",background:"#0d0d0d"}}>
                    <div style={{aspectRatio:"1",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden"}}>
                      {done&&<img src={v.dataUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
                      {isP&&<div style={{textAlign:"center"}}><div style={{fontSize:22,animation:"spin 1.5s linear infinite"}}>✍️</div><div style={{fontSize:8,color:"#ffd060",marginTop:3}}>Analizando...</div></div>}
                      {isG&&<div style={{textAlign:"center"}}><div style={{fontSize:22,animation:"spin 1s linear infinite"}}>⚡</div><div style={{fontSize:8,color:"#ff9f5a",marginTop:3}}>Generando...</div></div>}
                      {v?.error&&<div style={{fontSize:18}}>❌</div>}
                      {!done&&!isP&&!isG&&!v?.error&&<div style={{fontSize:18,opacity:0.2}}>⏳</div>}
                    </div>
                    <div style={{padding:"6px 8px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{fontSize:9,color:done?"#ff9f5a":"rgba(255,255,255,0.35)",fontWeight:done?"bold":"normal"}}>{s.label}</div>
                      <div style={{fontSize:8,color:"rgba(255,255,255,0.2)"}}>{done?"✓ Listo":isP?"Analizando...":isG?"Generando...":v?.error?"Error":"Esperando..."}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {error&&<div style={{padding:"9px 14px",background:"rgba(255,80,80,0.07)",border:"1px solid rgba(255,80,80,0.18)",borderRadius:9,fontSize:11,color:"#ff8888",marginTop:10}}>⚠️ {error}</div>}
          </div>
        )}

        {/* ══ STEP 2: REVIEW ══ */}
        {step === 2 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:16}}>
              <div>
                <h1 style={{fontSize:24,fontWeight:"normal",color:"#ff9f5a",marginBottom:3}}>Revisa, edita y aprueba</h1>
                <p style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>Edita textos · Ajusta imágenes por chat · Preview real · Tú decides qué se publica</p>
              </div>
              {totalTokens>0&&<div style={{textAlign:"right",fontSize:10,color:"#ffd060"}}>⚡ {totalTokens.toLocaleString()} tokens<br/><span style={{color:"rgba(255,255,255,0.25)"}}>~${totalCost} USD</span></div>}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:16}}>
              {/* LEFT: images + editor */}
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.28)",marginBottom:8,letterSpacing:"0.08em"}}>SELECCIONA LA MEJOR FOTO</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:10}}>
                  {VARIANT_SCENES.map((s,i)=>{
                    const v=variants[i];
                    return (
                      <div key={i} onClick={()=>v?.dataUrl&&setSelectedV(i)}
                        style={{borderRadius:7,overflow:"hidden",border:selectedV===i?"2px solid #ff8c42":"2px solid rgba(255,255,255,0.06)",cursor:v?.dataUrl?"pointer":"default",aspectRatio:"1",background:"#111",position:"relative"}}>
                        {v?.dataUrl?<img src={v.dataUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13}}>{v?.error?"❌":"—"}</div>}
                        <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.85))",padding:"3px 2px 2px",textAlign:"center"}}>
                          <div style={{fontSize:7,color:"#fff"}}>{s.label}</div>
                        </div>
                        {v?.dataUrl&&<button onClick={e=>{e.stopPropagation();dl(v,i);}} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:3,color:"#fff",fontSize:9,cursor:"pointer",padding:"1px 4px"}}>⬇</button>}
                      </div>
                    );
                  })}
                </div>

                {selImg?.dataUrl&&(
                  <div style={{borderRadius:11,overflow:"hidden",marginBottom:10,position:"relative"}}>
                    <img src={selImg.dataUrl} style={{width:"100%",maxHeight:280,objectFit:"cover",display:"block"}}/>
                    <div style={{position:"absolute",bottom:8,right:8,display:"flex",gap:6}}>
                      <button onClick={()=>dl(selImg,selectedV)} style={{background:"rgba(0,0,0,0.7)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,color:"#fff",fontSize:10,cursor:"pointer",padding:"5px 10px",fontFamily:"inherit"}}>⬇ Descargar</button>
                      <button onClick={()=>setExpandedEditor(expandedEditor===selectedV?null:selectedV)} style={{background:expandedEditor===selectedV?"rgba(255,140,66,0.3)":"rgba(0,0,0,0.7)",border:"1px solid rgba(255,140,66,0.4)",borderRadius:7,color:"#ff9f5a",fontSize:10,cursor:"pointer",padding:"5px 10px",fontFamily:"inherit"}}>✏️ Editar esta foto</button>
                    </div>
                  </div>
                )}

                {/* Image editor chat */}
                {expandedEditor === selectedV && selImg?.dataUrl && (
                  <ImageEditorChat
                    variant={selImg}
                    variantIndex={selectedV}
                    originalPhoto={photo}
                    geminiKey={geminiKey}
                    onUpdate={updateVariant}
                    onTokens={addToken}
                  />
                )}

                {/* Preview toggle */}
                <div style={{display:"flex",gap:6,marginTop:10,marginBottom:10}}>
                  {[{id:"instagram",l:"📱 Instagram"},{id:"shopify",l:"🛍️ Shopify"}].map(p=>(
                    <button key={p.id} onClick={()=>setActivePreview(p.id)} style={{flex:1,padding:"7px",background:activePreview===p.id?"rgba(255,140,66,0.14)":"rgba(255,255,255,0.03)",border:activePreview===p.id?"1px solid #ff8c42":"1px solid rgba(255,255,255,0.06)",borderRadius:8,color:activePreview===p.id?"#ff9f5a":"rgba(255,255,255,0.38)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{p.l}</button>
                  ))}
                </div>
                <div style={{maxHeight:440,overflowY:"auto"}}>
                  {activePreview==="instagram"
                    ? <IGPreview image={selImg?.dataUrl} ig={ig} price={productInfo.price}/>
                    : <ShopPreview image={selImg?.dataUrl} seo={seo} price={productInfo.price}/>
                  }
                </div>
              </div>

              {/* RIGHT: editable content */}
              <div style={{maxHeight:"85vh",overflowY:"auto",paddingRight:2}}>
                {loadingSEO&&<div style={{textAlign:"center",padding:"40px 20px",color:"#ff9f5a"}}><div style={{fontSize:28,animation:"spin 1s linear infinite",marginBottom:8}}>⚡</div><div style={{fontSize:12}}>Generando SEO e Instagram copy...</div></div>}
                {!loadingSEO&&(
                  <>
                    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(100,200,100,0.15)",borderRadius:12,padding:15,marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
                        <span style={{fontSize:16}}>🛍️</span>
                        <span style={{fontSize:12,fontWeight:"bold",color:"#7ec97e"}}>Shopify SEO</span>
                        {!seo&&<span style={{fontSize:9,color:"rgba(255,200,50,0.6)"}}>generando...</span>}
                      </div>
                      <EF label="TÍTULO SEO" hint="max 60" value={seo?.title} onChange={v=>setSeo(s=>({...s,title:v}))} color="#7ec97e"/>
                      <EF label="META DESCRIPCIÓN" hint="150 chars" value={seo?.metaDescription} onChange={v=>setSeo(s=>({...s,metaDescription:v}))} multi color="#7ec97e"/>
                      <EF label="H1" value={seo?.h1} onChange={v=>setSeo(s=>({...s,h1:v}))} color="#7ec97e"/>
                      <EF label="DESCRIPCIÓN PRODUCTO" value={seo?.bodyText} onChange={v=>setSeo(s=>({...s,bodyText:v}))} multi color="#7ec97e"/>
                      <EF label="GOOGLE ADS" hint="max 30" value={seo?.googleAdsHeadline} onChange={v=>setSeo(s=>({...s,googleAdsHeadline:v}))} color="#7ec97e"/>
                      <EF label="GOOGLE ADS CTA" value={seo?.googleAdsCTA} onChange={v=>setSeo(s=>({...s,googleAdsCTA:v}))} color="#7ec97e"/>
                      <div>
                        <div style={{fontSize:9,color:"rgba(255,255,255,0.28)",marginBottom:5}}>TAGS</div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(seo?.tags||[]).map((t,i)=><span key={i} style={{background:"rgba(126,201,126,0.1)",border:"1px solid rgba(126,201,126,0.18)",borderRadius:20,padding:"2px 7px",fontSize:9,color:"#7ec97e"}}>{t}</span>)}</div>
                      </div>
                    </div>

                    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(200,100,200,0.15)",borderRadius:12,padding:15}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
                        <span style={{fontSize:16}}>📸</span>
                        <span style={{fontSize:12,fontWeight:"bold",color:"#c97ec9"}}>Instagram</span>
                        {!ig&&<span style={{fontSize:9,color:"rgba(255,200,50,0.6)"}}>generando...</span>}
                      </div>
                      <EF label="CAPTION" value={ig?.caption} onChange={v=>setIg(s=>({...s,caption:v}))} multi color="#c97ec9"/>
                      <EF label="HASHTAGS" value={ig?.hashtags} onChange={v=>setIg(s=>({...s,hashtags:v}))} multi color="#c97ec9"/>
                      <EF label="CTA" value={ig?.cta} onChange={v=>setIg(s=>({...s,cta:v}))} color="#c97ec9"/>
                      <EF label="STORY TEXT" value={ig?.storyText} onChange={v=>setIg(s=>({...s,storyText:v}))} color="#c97ec9"/>
                      <EF label="REEL HOOK" hint="gancho para video" value={ig?.reelHook} onChange={v=>setIg(s=>({...s,reelHook:v}))} color="#c97ec9"/>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={()=>setStep(0)} style={{padding:"13px 20px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:11,color:"rgba(255,255,255,0.5)",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Volver</button>
              <button onClick={()=>variants.forEach((v,i)=>{if(v?.dataUrl)dl(v,i);})} style={{padding:"13px 20px",background:"rgba(255,140,66,0.1)",border:"1px solid rgba(255,140,66,0.3)",borderRadius:11,color:"#ff9f5a",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>⬇️ Descargar todo</button>
              <button onClick={()=>setStep(3)} style={{flex:1,padding:"13px",background:"linear-gradient(135deg,#ff8c42,#e63946)",border:"none",borderRadius:11,color:"#fff",fontSize:13,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"}}>✅ Todo aprobado — publicar →</button>
            </div>
          </div>
        )}

        {/* ══ STEP 3: PUBLISH ══ */}
        {step === 3 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h1 style={{fontSize:24,fontWeight:"normal",color:"#ff9f5a",marginBottom:4}}>Publicar</h1>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:11,marginBottom:18}}>Revisaste y aprobaste todo. Un click por canal.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
              {/* Shopify */}
              <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(100,200,100,0.2)",borderRadius:14,padding:18}}>
                <div style={{display:"flex",gap:9,marginBottom:12}}><span style={{fontSize:22}}>🛍️</span><div><div style={{fontSize:13,fontWeight:"bold",color:"#7ec97e"}}>Shopify</div><div style={{fontSize:9,color:"rgba(255,255,255,0.28)"}}>Producto + SEO completo</div></div></div>
                {selImg?.dataUrl&&<img src={selImg.dataUrl} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:9,marginBottom:12}}/>}
                <div style={{background:"rgba(0,0,0,0.25)",borderRadius:8,padding:10,marginBottom:12,fontSize:10,lineHeight:1.7}}>
                  <div style={{color:"#7ec97e"}}>✓ {seo?.title||"Sin título"}</div>
                  <div style={{color:"rgba(255,255,255,0.35)"}}>✓ Meta + H1 + {seo?.tags?.length||0} tags</div>
                  <div style={{color:"rgba(255,255,255,0.35)"}}>✓ Google Ads copy</div>
                  <div style={{color:"rgba(255,255,255,0.35)"}}>✓ Precio: ${productInfo.price||"—"}</div>
                </div>
                <button onClick={()=>{setPubStatus(s=>({...s,shopify:"loading"}));setTimeout(()=>setPubStatus(s=>({...s,shopify:"done"})),2200);}} disabled={pubStatus.shopify==="done"}
                  style={{width:"100%",padding:"12px",background:pubStatus.shopify==="done"?"rgba(126,201,126,0.2)":"linear-gradient(135deg,#2d7d2d,#1a5c1a)",border:"1px solid rgba(126,201,126,0.28)",borderRadius:9,color:"#fff",fontSize:12,fontWeight:"bold",cursor:pubStatus.shopify==="done"?"default":"pointer",fontFamily:"inherit"}}>
                  {pubStatus.shopify==="loading"?"⏳ Publicando...":pubStatus.shopify==="done"?"✅ Publicado en Shopify":"🚀 Publicar en Shopify"}
                </button>
              </div>
              {/* Instagram */}
              <div style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(200,100,200,0.2)",borderRadius:14,padding:18}}>
                <div style={{display:"flex",gap:9,marginBottom:12}}><span style={{fontSize:22}}>📸</span><div><div style={{fontSize:13,fontWeight:"bold",color:"#c97ec9"}}>Instagram</div><div style={{fontSize:9,color:"rgba(255,255,255,0.28)"}}>Feed + Stories + Reels</div></div></div>
                <div style={{marginBottom:12,maxHeight:300,overflowY:"auto"}}>
                  <IGPreview image={selImg?.dataUrl} ig={ig} price={productInfo.price}/>
                </div>
                <button onClick={()=>{setPubStatus(s=>({...s,instagram:"loading"}));setTimeout(()=>setPubStatus(s=>({...s,instagram:"done"})),1800);}} disabled={pubStatus.instagram==="done"}
                  style={{width:"100%",padding:"12px",background:pubStatus.instagram==="done"?"rgba(201,126,201,0.2)":"linear-gradient(135deg,#7b2d7b,#521a52)",border:"1px solid rgba(201,126,201,0.28)",borderRadius:9,color:"#fff",fontSize:12,fontWeight:"bold",cursor:pubStatus.instagram==="done"?"default":"pointer",fontFamily:"inherit"}}>
                  {pubStatus.instagram==="loading"?"⏳ Preparando...":pubStatus.instagram==="done"?"✅ Listo para Instagram":"📱 Publicar en Instagram"}
                </button>
              </div>
            </div>

            {/* Token summary */}
            {tokens.length>0&&(
              <div style={{background:"rgba(255,200,50,0.04)",border:"1px solid rgba(255,200,50,0.1)",borderRadius:11,padding:13,marginBottom:12}}>
                <div style={{fontSize:9,color:"#ffd060",marginBottom:8,letterSpacing:"0.08em"}}>⚡ RESUMEN DE CONSUMO</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
                  {tokens.map((t,i)=>(
                    <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:10,padding:"2px 0",borderBottom:"1px solid rgba(255,255,255,0.03)"}}>
                      <span style={{color:"rgba(255,255,255,0.38)"}}>{t.type==="image"?"🖼️":"📝"} {t.label}</span>
                      <span style={{color:"#ffd060"}}>{t.tokens.toLocaleString()} · ${(t.tokens*(t.type==="image"?0.00003:0.000003)).toFixed(4)}</span>
                    </div>
                  ))}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:7,fontSize:12,fontWeight:"bold",color:"#ffd060"}}>
                  <span>TOTAL</span><span>{totalTokens.toLocaleString()} · ~${totalCost} USD</span>
                </div>
              </div>
            )}

            {(pubStatus.shopify==="done"||pubStatus.instagram==="done")&&(
              <div style={{background:"rgba(255,140,66,0.05)",border:"1px solid rgba(255,140,66,0.16)",borderRadius:11,padding:18,textAlign:"center"}}>
                <div style={{fontSize:24,marginBottom:5}}>🎉</div>
                <div style={{fontSize:14,color:"#ff9f5a",marginBottom:12}}>¡{productInfo.name||"Producto"} publicado en Mandarina!</div>
                <div style={{display:"flex",gap:10,justifyContent:"center"}}><button onClick={()=>setStep(2)} style={{padding:"9px 18px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,color:"rgba(255,255,255,0.5)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← Revisar</button><button onClick={reset} style={{padding:"9px 22px",background:"linear-gradient(135deg,#ff8c42,#e63946)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"}}>+ Publicar otro producto</button></div>
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.16)}button:hover:not(:disabled){opacity:0.84}::-webkit-scrollbar{height:3px;width:3px}::-webkit-scrollbar-thumb{background:rgba(255,140,66,0.22);border-radius:2px}`}</style>
    </div>
  );
}
