import { useState, useRef, useCallback, useEffect } from "react";

// ─── 10 PROMPT STYLES ────────────────────────────────────────────────────────
const PROMPT_STYLES = [
  {
    id: "mirror_selfie",
    label: "Mirror Selfie",
    emoji: "🤳",
    category: "Social",
    desc: "Selfie espejo, cuarto o baño real",
    basePrompt: `Authentic iPhone mirror selfie, portrait crop (shoulders to mid-torso), like a real person's Instagram story. Shot in a real bedroom or bathroom — slightly messy shelves, everyday objects in background, real indoor lighting from bulb or window. Model holds phone at chest height partially blocking face. One hand in pocket or touching hair. Relaxed, unstaged posture. Slight grain, natural skin, real fabric wrinkles. NOT a studio shot. Feels like a friend took it.`
  },
  {
    id: "friends_photo",
    label: "Con Amigos",
    emoji: "👥",
    category: "Social",
    desc: "Foto casual como con amigos, crop hombros",
    basePrompt: `Candid photo taken by a friend, portrait crop from shoulders up or chest up. Outdoor setting: sidewalk, park bench, outside a cafe or building entrance. Natural daylight, slightly overcast or golden hour. Model laughing or looking slightly off camera with a natural relaxed smile. Background slightly blurred with real urban or park elements. Shot on iPhone, warm tones, authentic. The garment is clearly visible from shoulders to waist.`
  },
  {
    id: "outfit_check",
    label: "Outfit Check",
    emoji: "🪞",
    category: "Social",
    desc: "GRWM, cuarto propio, foto de arriba",
    basePrompt: `Get-ready-with-me style photo, 3/4 crop (head to hips), taken in a real bedroom. Bed, closet, or plain wall in background. Natural window light from the side. Model standing straight looking at camera or slightly down at outfit. Relaxed confident expression. Real room, real lighting — not a studio. iPhone camera, slight soft focus, warm natural tones. Shows the full garment from neck to hip clearly.`
  },
  {
    id: "street_candid",
    label: "Street Candid",
    emoji: "🏙️",
    category: "Street",
    desc: "Calle urbana, foto de pasada, natural",
    basePrompt: `Candid-style street photo, portrait or 3/4 crop. Model walking on a real sidewalk or standing at a street corner. Real city background: buildings, parked cars, people slightly blurred in distance. Overcast natural light or golden hour. Model not posing — mid-walk, looking at phone or glancing sideways. Shot from waist height. iPhone photo feel, real street textures, authentic not staged.`
  },
  {
    id: "coffee_hang",
    label: "Café Casual",
    emoji: "☕",
    category: "Lifestyle",
    desc: "Dentro de café, copa en mano, media foto",
    basePrompt: `Casual cafe photo, portrait crop (head to chest or waist). Model sitting or leaning at a cafe table or counter, holding a coffee cup. Real cafe interior: wooden tables, soft ambient lighting, blurred background with other customers or shelves. Warm indoor light. Natural casual expression, not posing. Shot from across the table like a friend took it. Shows garment clearly from shoulders to mid-torso.`
  },
  {
    id: "rooftop_golden",
    label: "Rooftop Sunset",
    emoji: "🌇",
    category: "Lifestyle",
    desc: "Azotea, luz dorada, foto de amigo",
    basePrompt: `Rooftop photo during golden hour, 3/4 crop (head to hips). Model leaning on a railing or ledge, city skyline softly blurred behind. Warm orange and pink sunset light hitting the face and garment naturally. Relaxed expression, one hand in pocket. Shot by a friend from slightly below eye level. iPhone photo, warm color grade, feels like an evening hangout not a photoshoot.`
  },
  {
    id: "gym_lobby",
    label: "Post Gym",
    emoji: "💪",
    category: "Sport",
    desc: "Salida del gym, foto rápida, crop hombros",
    basePrompt: `Post-workout casual photo, portrait crop (shoulders to waist). Model in a gym lobby, parking lot outside a gym, or on a sidewalk. Real environment: gym bags, cars, or building entrance visible and blurred. Natural daylight or gym fluorescent light. Model looks relaxed, slight smile, confident energy. Not flexing — just wearing the outfit casually. Shot on iPhone by a friend. Garment clearly visible.`
  },
  {
    id: "home_couch",
    label: "En Casa",
    emoji: "🛋️",
    category: "Lifestyle",
    desc: "Foto en casa, sofá o sala, muy real",
    basePrompt: `Cozy home photo, portrait crop (shoulders to waist or 3/4). Model sitting on a couch or standing in a living room or kitchen. Real home setting: cushions, TV, plants, everyday objects softly blurred. Warm ambient indoor lighting. Very relaxed, natural expression — could be watching TV or scrolling phone. Shot casually by hand. Feels completely real and unstaged. Garment visible from neck to hip.`
  },
  {
    id: "night_out",
    label: "Night Out",
    emoji: "🌙",
    category: "Social",
    desc: "Salida nocturna, luz de bar, foto con amigos",
    basePrompt: `Night out photo, portrait crop (shoulders to chest). Inside a bar, restaurant, or club with warm dim ambient lighting. Neon or warm string lights in background, blurred. Model smiling or laughing naturally — mid-conversation energy. Slight motion, real night atmosphere. Shot on iPhone at night with natural grain and warm tones. Feels like a real social outing photo, not a photoshoot.`
  },
  {
    id: "park_sunny",
    label: "Parque Soleado",
    emoji: "🌳",
    category: "Lifestyle",
    desc: "Parque, luz natural, foto relajada",
    basePrompt: `Sunny park photo, portrait or 3/4 crop (head to hips). Model sitting on grass, a bench, or leaning against a tree. Real park: green trees, natural light filtering through leaves, soft dappled shadows. Relaxed natural expression, looking at camera or slightly away. Shot by a friend from eye level. iPhone photo, natural warm daylight, feels like a real weekend afternoon. Garment clearly visible.`
  },
  {
    id: "custom_prompt",
    label: "Prompt Libre",
    emoji: "✍️",
    category: "Custom",
    desc: "Exactamente lo que escribas",
    basePrompt: "__CUSTOM__"
  },
];

// Default selection (first 5 for generation)

// ─── APIs ─────────────────────────────────────────────────────────────────────
async function analyzeAndBuildPrompt(frontBase64, backBase64, productInfo, userGuide, scene, modelBase64) {
  // Step 1: Claude analyzes the garment and extracts key details
  const analysisParts = [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: frontBase64 } },
    { type: "text", text: "GARMENT FRONT ↑" },
  ];
  if (backBase64) {
    analysisParts.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: backBase64 } });
    analysisParts.push({ type: "text", text: "GARMENT BACK ↑" });
  }
  if (modelBase64) {
    analysisParts.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: modelBase64 } });
    analysisParts.push({ type: "text", text: "REFERENCE PERSON ↑" });
  }

  const modelInstruction = modelBase64
    ? "USE THE EXACT PERSON from the reference photo — same face, skin tone, hair, body. They must be recognizable."
    : `young latinx person, 20-25yo, ${userGuide || "authentic real look, not AI-perfect"}`;

  analysisParts.push({ type: "text", text: `You are a professional fashion photographer and prompt engineer.

Analyze the garment photo(s) carefully and complete this fashion photography prompt template by filling in the [BRACKETS] with ultra-specific details from what you actually see.

PRODUCT NAME: ${productInfo.name || "fashion garment"}
PRODUCT COLOR: ${productInfo.color || "see image"}
PRODUCT DESCRIPTION: ${productInfo.description || ""}

BASE PROMPT TEMPLATE (keep ALL the professional language, ONLY fill the brackets):
---
${scene.basePrompt}
---

FILL IN THESE SPECIFICS from the garment photo:
- [GARMENT TYPE]: exact type (hoodie, tee, jacket, etc)
- [EXACT COLORS]: every color you see in the garment
- [DESIGN DETAILS]: all logos, text, prints, graphics, embroidery visible
- [FABRIC]: fabric type and texture you can see
- [CUT/FIT]: oversized, slim, regular, etc
- [BACK DESIGN]: anything visible on the back view

MODEL: ${modelInstruction}

CRITICAL RULES:
1. Keep the FULL base prompt structure and professional language intact
2. Add the garment specifics seamlessly into the prompt
3. The garment description must be PRECISE enough that an AI generates EXACTLY this garment
4. End with: "MANDATORY: The model wears EXACTLY this garment — same [exact colors], same [exact design]. No substitutions."
5. Output ONLY the final completed prompt, no explanation, no brackets remaining.` });

  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      messages: [{ role: "user", content: analysisParts }]
    })
  });
  const data = await res.json();
  const prompt = data.content?.[0]?.text || "";
  const tokens = (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0);
  return { prompt, tokens };
}

// Único modelo de imagen válido hoy en la API. Los antiguos
// (gemini-2.0-flash-exp-image-generation, gemini-2.5-flash-preview-05-20)
// devuelven 404 — se quitaron para no gastar llamadas fallidas.
const GEMINI_MODELS = [
  'gemini-2.5-flash-image',
];

async function tryGeminiModel(model, parts) {
  const res = await fetch("/api/gemini", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model, contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE","TEXT"], temperature: 0.35 } })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const imgPart = (data.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.mimeType?.startsWith("image/"));
  const tokens = (data.usageMetadata?.promptTokenCount||0)+(data.usageMetadata?.candidatesTokenCount||0);
  if (imgPart) return { dataUrl: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`, tokens };
  const reason = data.candidates?.[0]?.finishReason;
  throw new Error(reason === 'PROHIBITED_CONTENT' ? 'PROHIBITED_CONTENT' : (reason || 'No image returned'));
}

async function generateWithGemini(prompt, frontBase64, backBase64, modelBase64) {
  // Put garment photo FIRST as reference, then model, then the full professional prompt LAST
  const parts = [];

  // Reference images first
  parts.push({ inline_data: { mime_type: "image/jpeg", data: frontBase64 } });
  parts.push({ text: "↑ REFERENCE GARMENT (front) — recreate this EXACT clothing item" });
  if (backBase64) {
    parts.push({ inline_data: { mime_type: "image/jpeg", data: backBase64 } });
    parts.push({ text: "↑ REFERENCE GARMENT (back)" });
  }
  if (modelBase64) {
    parts.push({ inline_data: { mime_type: "image/jpeg", data: modelBase64 } });
    parts.push({ text: "↑ REFERENCE PERSON — Copy ONLY this person's face, skin tone, hair, and body. IGNORE their background and current clothing entirely." });
  }

  // The professional prompt LAST (models follow last instruction most strongly)
  parts.push({ text: prompt });
  
  // Final mandatory reminder
  parts.push({ text: "MANDATORY: (1) GARMENT must be identical to the product reference photos — same colors, design, logo. (2) If a person reference was provided, use their face/body ONLY — generate a completely new background per the style prompt, do NOT copy their original background. (3) Final result must look like a professional fashion campaign, not a composite of reference photos." });

  let lastError = '';
  for (const model of GEMINI_MODELS) {
    try {
      const result = await tryGeminiModel(model, parts);
      console.log('Success with model:', model);
      return result;
    } catch(e) {
      if (e.message === 'PROHIBITED_CONTENT') throw e; // Don't retry content issues
      lastError = `[${model}] ${e.message}`;
      console.warn('Model failed, trying next:', model, e.message);
    }
  }
  throw new Error(lastError || 'All Gemini models failed');
}

async function editImage(currentBase64, frontBase64, instruction, backBase64, modelBase64) {
  const parts = [
    { inline_data: { mime_type: "image/jpeg", data: frontBase64 } },
    { text: "ORIGINAL GARMENT REFERENCE (front)" },
  ];
  if (backBase64) { parts.push({ inline_data: { mime_type: "image/jpeg", data: backBase64 } }); parts.push({ text: "ORIGINAL GARMENT REFERENCE (back)" }); }
  if (modelBase64) {
    parts.push({ inline_data: { mime_type: "image/jpeg", data: modelBase64 } });
    parts.push({ text: "REFERENCE MODEL ↑ — preserve this person's identity throughout the edit" });
  }
  parts.push({ inline_data: { mime_type: "image/jpeg", data: currentBase64 } });
  parts.push({ text: `GENERATED PHOTO TO EDIT ↑\n\nEdit instruction: "${instruction}"\n\nApply ONLY this change. Keep everything else identical: same model, same pose, same lighting. Keep the garment faithful to the original reference images.` });

  const res = await fetch("/api/gemini", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "gemini-2.5-flash-image", contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE","TEXT"], temperature: 0.3 } })
  });
  const data = await res.json();
  const imgPart = (data.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.mimeType?.startsWith("image/"));
  const tokens = (data.usageMetadata?.promptTokenCount||0)+(data.usageMetadata?.candidatesTokenCount||0);
  if (imgPart) return { dataUrl: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`, tokens };
  throw new Error(data.error?.message || "Error editando");
}

async function generateSEO(productInfo) {
  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: "Eres experto en neuromarketing, SEO avanzado para e-commerce de moda y community manager de Instagram con millones de seguidores. Técnicas: AIDA, PAS, ganchos emocionales, FOMO sutil, storytelling. Responde SOLO JSON válido sin backticks ni texto adicional.",
      messages: [{ role: "user", content: `Crea contenido de ALTO IMPACTO para Mandarina Ecuador:
Producto: ${productInfo.name||"Prenda"} | Precio: $${productInfo.price||"XX"} | Color: ${productInfo.color||""} | Categoría: ${productInfo.category||"Ropa"} | Descripción: ${productInfo.description||""} | www.mandarinEc.com

REGLAS DE NEUROMARKETING:
- Título SEO: palabra clave principal + beneficio emocional, max 60 chars, incluye "Ecuador" o "Mandarina"
- Meta: FOMO sutil ("quedan pocas unidades" o "edición limitada"), 150 chars exactos
- H1: gancho que active deseo inmediato de compra
- bodyText: técnica PAS completa (Problema concreto → Agitación emocional → Solución=producto), menciona calidad premium + envío Ecuador, 3-4 oraciones
- Google Ads: promesa específica + número/beneficio concreto, max 30 chars
- Instagram caption: historia de 2-3 líneas que genere identificación, NO ventas directas, termina con pregunta que invita a comentar, SIN hashtags, max 200 chars, emojis naturales
- Story: golpe visual en 3 segundos, estilo Gen Z auténtico, emoji al inicio
- Reel hook: exactamente 4-5 palabras que hacen parar el scroll (ej: "Esto cambió mi look 🔥")

JSON EXACTO:
{"shopify":{"title":"","metaDescription":"","h1":"","bodyText":"","tags":["","","","","","",""],"googleAdsHeadline":"","googleAdsCTA":""},"instagram":{"caption":"","hashtags":"#mandarina #mandarinaec #modaecuador #ecuador #ootd #fashion #estilo #ropa #outfit #quito #streetwear #lookdeldia","cta":"","storyText":"","reelHook":""}}`
      }]
    })
  });
  const data = await res.json();
  // Show diagnostic if API key missing
  if (data.error && data.hint) {
    throw new Error("❌ " + data.error + " — " + data.hint);
  }
  if (data.error?.type === "authentication_error") {
    throw new Error("❌ API key inválida. Ve a Vercel → Settings → Environment Variables y agrega ANTHROPIC_API_KEY");
  }
  const tokens = (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0);
  const text = data.content?.[0]?.text || "{}";
  try { return { result: JSON.parse(text.replace(/```json|```/g,"").trim()), tokens }; }
  catch { return { result: null, tokens }; }
}

function dataUrlToBase64(d) { return d?.split(",")[1] || null; }

async function publishToShopify(productInfo, seo, imageDataUrl) {
  const res = await fetch("/api/shopify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productInfo,
      seo,
      imageBase64: dataUrlToBase64(imageDataUrl),
      status: "draft",
    })
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    const detail = data.hint || (typeof data.detail === "string" ? data.detail : JSON.stringify(data.detail || ""));
    throw new Error((data.error || "Error publicando") + (detail ? " — " + detail : ""));
  }
  return data;
}

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
function ImageEditorChat({ variant, variantIndex, frontPhoto, backPhoto, modelPhoto, onUpdate, onTokens }) {
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const send = async () => {
    if (!msg.trim() || loading) return;
    const instruction = msg.trim();
    setMsg("");
    setLoading(true);
    setHistory(h => [...h, { role:"user", text:instruction }]);
    try {
      const { dataUrl, tokens } = await editImage(
        dataUrlToBase64(variant.dataUrl),
        dataUrlToBase64(frontPhoto),
        instruction,
        backPhoto ? dataUrlToBase64(backPhoto) : null,
        modelPhoto ? dataUrlToBase64(modelPhoto) : null
      );
      onUpdate(variantIndex, dataUrl);
      onTokens({ type:"image", label:`Edición: ${instruction.substring(0,25)}`, tokens });
      setHistory(h => [...h, { role:"ai", text:"✅ Listo. ¿Algo más?" }]);
    } catch(e) {
      setHistory(h => [...h, { role:"ai", text:`❌ ${e.message}` }]);
    }
    setLoading(false);
  };

  return (
    <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,140,66,0.14)",borderRadius:11,padding:14,marginTop:10}}>
      <div style={{fontSize:10,color:"#ff9f5a",marginBottom:8,letterSpacing:"0.08em"}}>✏️ EDITAR ESTA IMAGEN</div>
      <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginBottom:9,lineHeight:1.6}}>
        "borra el logo" · "hazla más real, menos IA" · "cambia el fondo a parque" · "más arrugas en la tela" · "fondo más natural" · "quita el elemento del fondo"
      </div>
      {history.length > 0 && (
        <div style={{marginBottom:9,maxHeight:100,overflowY:"auto",display:"flex",flexDirection:"column",gap:5}}>
          {history.map((m,i)=>(
            <div key={i} style={{padding:"5px 9px",borderRadius:7,background:m.role==="user"?"rgba(255,140,66,0.1)":"rgba(255,255,255,0.04)",fontSize:10,color:m.role==="user"?"#ff9f5a":"rgba(255,255,255,0.5)",alignSelf:m.role==="user"?"flex-end":"flex-start",maxWidth:"88%"}}>{m.text}</div>
          ))}
          {loading&&<div style={{padding:"5px 9px",borderRadius:7,background:"rgba(255,255,255,0.04)",fontSize:10,color:"rgba(255,255,255,0.4)",alignSelf:"flex-start"}}>⚡ Editando...</div>}
        </div>
      )}
      <div style={{display:"flex",gap:7}}>
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Describe el cambio..." disabled={loading}
          style={{flex:1,padding:"7px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,140,66,0.18)",borderRadius:7,color:"#f5f0eb",fontSize:11,outline:"none",fontFamily:"inherit"}}/>
        <button onClick={send} disabled={loading||!msg.trim()} style={{padding:"7px 13px",background:!loading&&msg.trim()?"linear-gradient(135deg,#ff8c42,#e63946)":"rgba(255,255,255,0.06)",border:"none",borderRadius:7,color:"#fff",fontSize:12,cursor:!loading&&msg.trim()?"pointer":"not-allowed",fontFamily:"inherit",fontWeight:"bold"}}>→</button>
      </div>
    </div>
  );
}

// ─── INSTAGRAM PREVIEW ────────────────────────────────────────────────────────
function IGPreview({ image, ig, price }) {
  return (
    <div style={{background:"#0a0a0a",borderRadius:16,overflow:"hidden",border:"1px solid rgba(255,255,255,0.08)",fontFamily:"-apple-system,sans-serif"}}>
      <div style={{padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
        <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366)",padding:2}}>
          <div style={{width:"100%",height:"100%",borderRadius:"50%",background:"linear-gradient(135deg,#ff8c42,#e63946)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:"bold",color:"#fff"}}>M</div>
        </div>
        <div><div style={{fontSize:12,fontWeight:"600",color:"#fff"}}>mandarina.ec</div><div style={{fontSize:9,color:"rgba(255,255,255,0.4)"}}>Quito, Ecuador</div></div>
        <div style={{marginLeft:"auto",fontSize:17,color:"rgba(255,255,255,0.4)",letterSpacing:2}}>···</div>
      </div>
      {image?<img src={image} style={{width:"100%",aspectRatio:"1",objectFit:"cover",display:"block"}}/>:<div style={{width:"100%",aspectRatio:"1",background:"rgba(255,255,255,0.03)",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:32,opacity:0.1}}>📸</span></div>}
      <div style={{padding:"9px 14px 3px",display:"flex",gap:13}}><span style={{fontSize:19}}>🤍</span><span style={{fontSize:19}}>💬</span><span style={{fontSize:19}}>📤</span><span style={{fontSize:19,marginLeft:"auto"}}>🔖</span></div>
      <div style={{padding:"3px 14px 13px"}}>
        {price&&<div style={{marginBottom:5,display:"inline-block",background:"rgba(255,140,66,0.18)",border:"1px solid rgba(255,140,66,0.3)",borderRadius:5,padding:"2px 9px",fontSize:10,color:"#ff9f5a",fontWeight:"bold"}}>💰 ${price} USD</div>}
        <div style={{fontSize:11,color:"#fff",lineHeight:1.5,marginBottom:4}}><strong>mandarina.ec</strong> {ig?.caption||<span style={{color:"rgba(255,255,255,0.2)"}}>caption...</span>}</div>
        {ig?.cta&&<div style={{fontSize:10,color:"#ff9f5a",marginBottom:4,fontWeight:"600"}}>→ {ig.cta}</div>}
        <div style={{fontSize:10,color:"#4a9eff",lineHeight:1.5}}>{ig?.hashtags||""}</div>
        {ig?.reelHook&&<div style={{marginTop:6,background:"rgba(255,255,255,0.03)",borderRadius:6,padding:"4px 8px",fontSize:9,color:"rgba(255,255,255,0.4)"}}>🎬 <span style={{color:"#ff9f5a"}}>"{ig.reelHook}"</span></div>}
      </div>
    </div>
  );
}

// ─── SHOPIFY PREVIEW ──────────────────────────────────────────────────────────
function ShopPreview({ image, seo, price }) {
  if (!seo?.title) return <div style={{padding:40,textAlign:"center",color:"rgba(255,255,255,0.18)",fontSize:12}}>Cargando SEO...</div>;
  return (
    <div style={{background:"#fff",borderRadius:12,overflow:"hidden",color:"#333",fontFamily:"Arial,sans-serif"}}>
      <div style={{background:"#f0f0f0",padding:"7px 12px",display:"flex",alignItems:"center",gap:7}}>
        <div style={{display:"flex",gap:4}}>{["#ff5f57","#febc2e","#28c840"].map((c,i)=><div key={i} style={{width:8,height:8,borderRadius:"50%",background:c}}/>)}</div>
        <div style={{background:"#fff",border:"1px solid #ddd",borderRadius:4,padding:"2px 10px",fontSize:9,color:"#666",flex:1,overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>mandarinec.com › {(seo.title||"").toLowerCase().replace(/\s+/g,"-").substring(0,30)}</div>
      </div>
      <div style={{padding:"10px 14px",background:"#f8f9fa",borderBottom:"1px solid #eee"}}>
        <div style={{fontSize:9,color:"#777",marginBottom:2}}>Así aparece en Google</div>
        <div style={{fontSize:14,color:"#1a0dab",fontWeight:"600"}}>{seo.title}</div>
        <div style={{fontSize:10,color:"#006621"}}>mandarinec.com › productos</div>
        <div style={{fontSize:11,color:"#4d5156",lineHeight:1.4,marginTop:2}}>{seo.metaDescription}</div>
      </div>
      {seo.googleAdsHeadline&&<div style={{padding:"7px 14px",background:"#fffde7",borderBottom:"1px solid #eee",display:"flex",gap:7,alignItems:"center"}}>
        <span style={{background:"#e8f0fe",color:"#1967d2",fontSize:8,padding:"1px 4px",borderRadius:3,fontWeight:"bold",whiteSpace:"nowrap"}}>Anuncio</span>
        <div><div style={{fontSize:12,color:"#1a0dab",fontWeight:"600"}}>{seo.googleAdsHeadline}</div><div style={{fontSize:10,color:"#545454"}}>{seo.googleAdsCTA}</div></div>
      </div>}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr"}}>
        {image?<img src={image} style={{width:"100%",aspectRatio:"1",objectFit:"cover"}}/>:<div style={{aspectRatio:"1",background:"#f5f5f5",display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:24,opacity:0.1}}>👕</span></div>}
        <div style={{padding:"12px"}}>
          <div style={{fontSize:9,color:"#999",marginBottom:2,letterSpacing:"0.1em"}}>MANDARINA</div>
          <div style={{fontSize:13,fontWeight:"700",color:"#111",lineHeight:1.3,marginBottom:5}}>{seo.h1||seo.title}</div>
          {price&&<div style={{fontSize:15,fontWeight:"bold",color:"#e63946",marginBottom:7}}>${price} USD</div>}
          <div style={{fontSize:10,color:"#666",lineHeight:1.5,marginBottom:7}}>{seo.bodyText}</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:7}}>{(seo.tags||[]).map((t,i)=><span key={i} style={{background:"#f0f0f0",borderRadius:4,padding:"1px 5px",fontSize:8,color:"#777"}}>{t}</span>)}</div>
          <button style={{width:"100%",padding:"7px",background:"#111",color:"#fff",border:"none",borderRadius:5,fontSize:11,fontWeight:"bold",cursor:"pointer"}}>Añadir al carrito</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN GATE ─────────────────────────────────────────────────────────────
function LoginScreen({ onOk }) {
  const [user, setUser] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const submit = async () => {
    if (loading || !user.trim() || !pass) return;
    setErr(""); setLoading(true);
    try {
      const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user: user.trim(), password: pass }) });
      const d = await r.json();
      if (r.ok && d.ok) onOk();
      else setErr(d.error || "No autorizado");
    } catch { setErr("Error de red. Intenta de nuevo."); }
    setLoading(false);
  };
  const inputStyle = { width: "100%", padding: "11px 13px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,140,66,0.2)", borderRadius: 9, color: "#f5f0eb", fontSize: 14, outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 10 };
  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)", fontFamily: "'Georgia',serif", color: "#f5f0eb", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 340, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,140,66,0.15)", borderRadius: 18, padding: 28, textAlign: "center" }}>
        <div style={{ width: 46, height: 46, borderRadius: "50%", background: "linear-gradient(135deg,#ff8c42,#e63946)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: "bold", margin: "0 auto 14px" }}>M</div>
        <div style={{ fontSize: 18, fontWeight: "bold", color: "#ff9f5a", letterSpacing: "0.05em" }}>MANDARINA PRO</div>
        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", letterSpacing: "0.14em", marginBottom: 22 }}>AI FASHION STUDIO</div>
        <input value={user} onChange={e => setUser(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Usuario" autoFocus style={inputStyle} />
        <input value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === "Enter" && submit()} placeholder="Clave" type="password" style={inputStyle} />
        {err && <div style={{ fontSize: 11, color: "#ff8888", marginBottom: 10 }}>⚠️ {err}</div>}
        <button onClick={submit} disabled={loading || !user.trim() || !pass} style={{ width: "100%", padding: "12px", background: (!loading && user.trim() && pass) ? "linear-gradient(135deg,#ff8c42,#e63946)" : "rgba(255,255,255,0.06)", border: "none", borderRadius: 10, color: (!loading && user.trim() && pass) ? "#fff" : "rgba(255,255,255,0.25)", fontSize: 14, fontWeight: "bold", cursor: (!loading && user.trim() && pass) ? "pointer" : "not-allowed", fontFamily: "inherit", letterSpacing: "0.04em" }}>{loading ? "⏳ Entrando..." : "Entrar"}</button>
      </div>
    </div>
  );
}

// ─── INDICADOR DE ESTADO DE CONFIGURACIÓN ─────────────────────────────────────
function HealthBadge({ health }) {
  if (!health) return null;
  const items = [
    { k: "anthropic", l: "Claude" },
    { k: "gemini", l: "Gemini" },
    { k: "shopify", l: "Shopify" },
  ];
  const allOk = items.every(it => health[it.k]);
  return (
    <div title={allOk ? "Todas las integraciones configuradas en Vercel" : "Falta configurar alguna key en Vercel → Settings → Environment Variables"}
      style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.03)", border: `1px solid ${allOk ? "rgba(126,201,126,0.25)" : "rgba(255,200,80,0.3)"}`, borderRadius: 20, padding: "4px 11px", fontSize: 9 }}>
      {items.map(it => (
        <span key={it.k} style={{ display: "flex", alignItems: "center", gap: 4, color: health[it.k] ? "rgba(255,255,255,0.5)" : "rgba(255,150,80,0.9)" }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: health[it.k] ? "#7ec97e" : "#ffae42", display: "inline-block" }} />
          {it.l}
        </span>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function MandarinaPro() {
  const [step, setStep] = useState(0);
  const [selectedPrompts, setSelectedPrompts] = useState(PROMPT_STYLES.slice(0,5).map(p=>p.id));
  const [photoFront, setPhotoFront] = useState(null);
  const [photoBack, setPhotoBack] = useState(null);
  const [photoModel, setPhotoModel] = useState(null);
  const [promptGuide, setPromptGuide] = useState("");
  const [customPromptText, setCustomPromptText] = useState("");
  const [productInfo, setProductInfo] = useState({ name:"", price:"", category:"Ropa", description:"", color:"" });
  const [variants, setVariants] = useState([]);
  const [genIdx, setGenIdx] = useState(-1);
  const [promptIdx, setPromptIdx] = useState(-1);
  const [selectedV, setSelectedV] = useState(0);
  const [expandedEditor, setExpandedEditor] = useState(null);
  const [seo, setSeo] = useState(null);
  const [ig, setIg] = useState(null);
  const [loadingSEO, setLoadingSEO] = useState(false);
  const [tokens, setTokens] = useState([]);
  const [error, setError] = useState("");
  const [pubStatus, setPubStatus] = useState({ shopify:"", instagram:"" });
  const [shopifyResult, setShopifyResult] = useState(null);
  const [shopifyError, setShopifyError] = useState("");
  const [activePreview, setActivePreview] = useState("instagram");
  const [authed, setAuthed] = useState(null); // null=verificando, false=login, true=ok
  const [health, setHealth] = useState(null);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const frontRef = useRef();
  const backRef = useRef();
  const modelRef = useRef();

  // Sesión + estado de configuración al cargar.
  useEffect(() => {
    fetch("/api/session").then(r => setAuthed(r.ok)).catch(() => setAuthed(true));
    fetch("/api/health").then(r => r.json()).then(setHealth).catch(() => {});
  }, []);

  // Cargar borrador guardado (solo texto; las fotos no se persisten).
  useEffect(() => {
    try {
      const raw = localStorage.getItem("mp_draft");
      if (raw) {
        const d = JSON.parse(raw);
        if (d.productInfo) setProductInfo(p => ({ ...p, ...d.productInfo }));
        if (typeof d.promptGuide === "string") setPromptGuide(d.promptGuide);
        if (typeof d.customPromptText === "string") setCustomPromptText(d.customPromptText);
        if (Array.isArray(d.selectedPrompts) && d.selectedPrompts.length) setSelectedPrompts(d.selectedPrompts);
      }
    } catch { /* ignora borrador corrupto */ }
    setDraftLoaded(true);
  }, []);

  // Guardar borrador cuando cambian los campos (tras la carga inicial).
  useEffect(() => {
    if (!draftLoaded) return;
    try {
      localStorage.setItem("mp_draft", JSON.stringify({ productInfo, promptGuide, customPromptText, selectedPrompts }));
    } catch { /* cuota llena: no bloquea */ }
  }, [draftLoaded, productInfo, promptGuide, customPromptText, selectedPrompts]);

  const totalTokens = tokens.reduce((a,b)=>a+b.tokens,0);
  const totalCost = tokens.reduce((a,b)=>a+b.tokens*(b.type==="image"?0.00003:0.000003),0).toFixed(4);

  const readFile = useCallback((file, setter) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = e => setter(e.target.result);
    r.readAsDataURL(file);
  }, []);

  const addToken = t => setTokens(prev => [...prev, t]);
  const updateVariant = (idx, url) => setVariants(prev => prev.map((v,i) => i===idx ? {...v, dataUrl:url} : v));

  const runAll = async () => {
    setError(""); setVariants([]); setTokens([]); setSeo(null); setIg(null);
    const frontB64 = dataUrlToBase64(photoFront);
    const backB64 = photoBack ? dataUrlToBase64(photoBack) : null;

    // SEO en paralelo
    setLoadingSEO(true);
    const seoPromise = generateSEO(productInfo)
      .then(r => {
        if(r.result){
          setSeo(r.result.shopify);
          setIg(r.result.instagram);
          setTokens(prev => [...prev, {type:"text",label:"SEO + Instagram",tokens:r.tokens}]);
        } else {
          console.error("SEO result was null — retrying...");
          return generateSEO(productInfo).then(r2 => {
            if(r2.result){ setSeo(r2.result.shopify); setIg(r2.result.instagram); setTokens(prev => [...prev, {type:"text",label:"SEO retry",tokens:r2.tokens}]); }
          });
        }
      })
      .catch(e => { console.error("SEO error:",e); setError("SEO: "+(e.message||String(e))); })
      .finally(() => setLoadingSEO(false));

    const results = [];
    const activeScenes = PROMPT_STYLES.filter(p => selectedPrompts.includes(p.id));
    for (let i = 0; i < activeScenes.length; i++) {
      const scene = activeScenes[i];
      setPromptIdx(i);
      let prompt = "";
      try {
        const modelB64 = photoModel ? dataUrlToBase64(photoModel) : null;
        if (scene.id === "custom_prompt") {
          // Prompt libre: usar exactamente lo que escribió el usuario
          prompt = customPromptText.trim() || "Ultra realistic fashion photo showing the garment from the reference photo.";
        } else {
          const r = await analyzeAndBuildPrompt(frontB64, backB64, productInfo, promptGuide, scene, modelB64);
          prompt = r.prompt;
          addToken({type:"text", label:`Análisis ${scene.label}`, tokens:r.tokens});
        }
      } catch(e) {
        console.error('Prompt analysis error:', e.message);
        prompt = `Ultra realistic fashion photo. ${scene.basePrompt?.substring(0,200) || scene.label}. The person is wearing the exact garment from the reference photo. MUST look like a real photograph, not AI generated.`;
      }
      setGenIdx(i); setPromptIdx(-1);
      try {
        const r = await generateWithGemini(prompt, frontB64, backB64, photoModel ? dataUrlToBase64(photoModel) : null);
        results.push({...scene, dataUrl:r.dataUrl, prompt});
        addToken({type:"image", label:scene.label, tokens:r.tokens});
      } catch(e) {
        const errMsg = e.message || String(e);
        setError(scene.label + ': ' + errMsg);
        results.push({...scene, dataUrl:null, error:errMsg, prompt});
        console.error('Image gen error:', scene.label, errMsg);
      }
      setVariants([...results]);
    }
    setGenIdx(-1);
    setStep(2);
    await seoPromise;
  };

  const regenerateSEO = async () => {
    if (!productInfo.name.trim()) { alert('Primero llena el nombre del producto'); return; }
    setLoadingSEO(true);
    setSeo(null); setIg(null);
    try {
      const r = await generateSEO(productInfo);
      if (r.result) {
        setSeo(r.result.shopify);
        setIg(r.result.instagram);
        setTokens(prev => [...prev, { type:"text", label:"SEO regenerado", tokens:r.tokens }]);
      } else {
        alert('Error generando copy. Intenta de nuevo.');
      }
    } catch(e) {
      console.error('SEO regen:', e);
      alert('Error: ' + e.message);
    }
    finally { setLoadingSEO(false); }
  };

  // Regenera UNA sola variante (re-analiza + genera), sin rehacer las otras.
  const regenerateVariant = async (i) => {
    const activeScenes = PROMPT_STYLES.filter(p => selectedPrompts.includes(p.id));
    const scene = activeScenes[i];
    if (!scene || !photoFront) return;
    const frontB64 = dataUrlToBase64(photoFront);
    const backB64 = photoBack ? dataUrlToBase64(photoBack) : null;
    const modelB64 = photoModel ? dataUrlToBase64(photoModel) : null;
    setError("");
    setVariants(prev => prev.map((v, idx) => idx === i ? { ...(v || scene), dataUrl: null, error: null, regenerating: true } : v));
    try {
      let prompt;
      if (scene.id === "custom_prompt") {
        prompt = customPromptText.trim() || "Ultra realistic fashion photo showing the garment from the reference photo.";
      } else {
        const r = await analyzeAndBuildPrompt(frontB64, backB64, productInfo, promptGuide, scene, modelB64);
        prompt = r.prompt;
        addToken({ type: "text", label: `Re-análisis ${scene.label}`, tokens: r.tokens });
      }
      const g = await generateWithGemini(prompt, frontB64, backB64, modelB64);
      setVariants(prev => prev.map((v, idx) => idx === i ? { ...scene, dataUrl: g.dataUrl, prompt, regenerating: false } : v));
      addToken({ type: "image", label: `Regen ${scene.label}`, tokens: g.tokens });
    } catch (e) {
      const msg = e.message || String(e);
      setError(scene.label + ': ' + msg);
      setVariants(prev => prev.map((v, idx) => idx === i ? { ...(v || scene), dataUrl: null, error: msg, regenerating: false } : v));
    }
  };

  const dl = (v, i) => {
    if (!v?.dataUrl) return;
    const a = document.createElement("a");
    a.href = v.dataUrl;
    a.download = `mandarina-${(productInfo.name||"producto").replace(/\s+/g,"-")}-v${i+1}.jpg`;
    a.click();
  };

  const reset = () => { setStep(0); setPhotoFront(null); setPhotoBack(null); setPhotoModel(null); setVariants([]); setSeo(null); setIg(null); setTokens([]); setError(""); setPubStatus({shopify:"",instagram:""}); setShopifyResult(null); setShopifyError(""); setProductInfo({name:"",price:"",category:"Ropa",description:"",color:""}); setPromptGuide(""); setExpandedEditor(null); };

  const selImg = variants[selectedV];
  const canStart = photoFront && productInfo.name.trim();

  // ── Candado de acceso ──
  if (authed === null) {
    return <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "#ff9f5a", fontFamily: "'Georgia',serif", fontSize: 22 }}><span style={{ animation: "spin 1s linear infinite" }}>⚡</span></div>;
  }
  if (authed === false) {
    return <LoginScreen onOk={() => setAuthed(true)} />;
  }

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)",fontFamily:"'Georgia',serif",color:"#f5f0eb"}}>
      <header style={{padding:"13px 22px",borderBottom:"1px solid rgba(255,165,80,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#ff8c42,#e63946)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:"bold"}}>M</div>
          <div><div style={{fontSize:14,fontWeight:"bold",letterSpacing:"0.05em",color:"#ff9f5a"}}>MANDARINA PRO</div><div style={{fontSize:8,color:"rgba(255,255,255,0.25)",letterSpacing:"0.12em"}}>AI FASHION STUDIO</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <HealthBadge health={health} />
          {totalTokens>0&&<div style={{background:"rgba(255,200,50,0.07)",border:"1px solid rgba(255,200,50,0.18)",borderRadius:20,padding:"3px 11px",fontSize:10,color:"#ffd060"}}>⚡ {totalTokens.toLocaleString()} · ~${totalCost}</div>}
          {["📸 Foto","🤖 Generando","👁️ Revisar","✅ Publicar"].map((l,i)=>(
            <button key={i} onClick={()=>i<=step&&setStep(i)} style={{padding:"4px 9px",borderRadius:20,border:i===step?"1px solid #ff8c42":"1px solid rgba(255,255,255,0.08)",background:i===step?"rgba(255,140,66,0.14)":"transparent",color:i===step?"#ff8c42":i<step?"rgba(255,255,255,0.45)":"rgba(255,255,255,0.18)",fontSize:10,cursor:i<=step?"pointer":"default",fontFamily:"inherit"}}>{l}</button>
          ))}
        </div>
      </header>

      <main style={{maxWidth:1020,margin:"0 auto",padding:"22px 18px"}}>
        {/* ══ STEP 0 ══ */}
        {step === 0 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h1 style={{fontSize:26,fontWeight:"normal",color:"#ff9f5a",marginBottom:4}}>Sube tu producto</h1>
            <p style={{color:"rgba(255,255,255,0.35)",marginBottom:20,fontSize:12}}>Claude analiza frente y espalda → construye prompts ultra-realistas → Gemini genera modelos reales</p>

            <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:18}}>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>

                {/* FRONT PHOTO */}
                <div>
                  <div style={{fontSize:10,color:"#ff9f5a",marginBottom:6,letterSpacing:"0.08em"}}>FOTO DELANTERA <span style={{color:"rgba(255,140,66,0.6)"}}>*obligatoria</span></div>
                  <div onClick={()=>frontRef.current.click()} onDrop={e=>{e.preventDefault();readFile(e.dataTransfer.files[0],setPhotoFront);}} onDragOver={e=>e.preventDefault()}
                    style={{border:`2px dashed ${photoFront?"rgba(255,140,66,0.5)":"rgba(255,140,66,0.25)"}`,borderRadius:12,cursor:"pointer",minHeight:180,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"rgba(255,140,66,0.02)",transition:"border 0.2s"}}>
                    {photoFront?<img src={photoFront} style={{width:"100%",objectFit:"contain",maxHeight:200}}/>:<div style={{textAlign:"center",padding:20}}><div style={{fontSize:36,opacity:0.3,marginBottom:8}}>👕</div><div style={{fontSize:13,color:"#ff9f5a",marginBottom:3}}>Frente de la prenda</div><div style={{fontSize:10,color:"rgba(255,255,255,0.22)"}}>JPG · PNG</div></div>}
                  </div>
                  <input ref={frontRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>readFile(e.target.files[0],setPhotoFront)}/>
                </div>

                {/* BACK PHOTO */}
                <div>
                  <div style={{fontSize:10,color:"rgba(255,200,100,0.8)",marginBottom:6,letterSpacing:"0.08em"}}>FOTO TRASERA <span style={{color:"rgba(255,255,255,0.3)"}}>opcional pero recomendada</span></div>
                  <div onClick={()=>backRef.current.click()} onDrop={e=>{e.preventDefault();readFile(e.dataTransfer.files[0],setPhotoBack);}} onDragOver={e=>e.preventDefault()}
                    style={{border:`2px dashed ${photoBack?"rgba(255,200,100,0.4)":"rgba(255,255,255,0.12)"}`,borderRadius:12,cursor:"pointer",minHeight:140,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"rgba(255,255,255,0.01)"}}>
                    {photoBack?<img src={photoBack} style={{width:"100%",objectFit:"contain",maxHeight:160}}/>:<div style={{textAlign:"center",padding:18}}><div style={{fontSize:28,opacity:0.2,marginBottom:6}}>🔄</div><div style={{fontSize:12,color:"rgba(255,255,255,0.35)",marginBottom:2}}>Espalda de la prenda</div><div style={{fontSize:9,color:"rgba(255,255,255,0.18)"}}>Mejora la calidad del prompt</div></div>}
                  </div>
                  <input ref={backRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>readFile(e.target.files[0],setPhotoBack)}/>
                </div>

                {/* MODEL REFERENCE PHOTO */}
                <div>
                  <div style={{fontSize:10,color:"rgba(150,200,255,0.8)",marginBottom:6,letterSpacing:"0.08em"}}>📸 FOTO DE MODELO REFERENCIA <span style={{color:"rgba(255,255,255,0.25)"}}>opcional — virtual try-on</span></div>
                  <div onClick={()=>modelRef.current.click()} onDrop={e=>{e.preventDefault();readFile(e.dataTransfer.files[0],setPhotoModel);}} onDragOver={e=>e.preventDefault()}
                    style={{border:`2px dashed ${photoModel?"rgba(150,200,255,0.4)":"rgba(255,255,255,0.1)"}`,borderRadius:12,cursor:"pointer",minHeight:100,display:"flex",alignItems:"center",justifyContent:"center",overflow:"hidden",background:"rgba(150,200,255,0.02)",position:"relative"}}>
                    {photoModel
                      ? <><img src={photoModel} style={{width:"100%",objectFit:"cover",maxHeight:120}}/><div style={{position:"absolute",bottom:4,left:0,right:0,textAlign:"center",fontSize:9,color:"rgba(255,255,255,0.5)",background:"rgba(0,0,0,0.5)",padding:"3px 0"}}>✓ Modelo de referencia cargado</div></>
                      : <div style={{textAlign:"center",padding:14}}>
                          <div style={{fontSize:24,opacity:0.2,marginBottom:5}}>🧍</div>
                          <div style={{fontSize:11,color:"rgba(150,200,255,0.6)",marginBottom:2}}>Sube una persona real</div>
                          <div style={{fontSize:9,color:"rgba(255,255,255,0.2)",lineHeight:1.5}}>La IA viste a esta persona exacta<br/>con tu prenda en cada escenario</div>
                        </div>
                    }
                  </div>
                  <input ref={modelRef} type="file" accept="image/*" style={{display:"none"}} onChange={e=>readFile(e.target.files[0],setPhotoModel)}/>
                  {photoModel && <button onClick={()=>setPhotoModel(null)} style={{marginTop:4,width:"100%",padding:"4px",background:"rgba(255,80,80,0.08)",border:"1px solid rgba(255,80,80,0.2)",borderRadius:6,color:"rgba(255,100,100,0.7)",fontSize:9,cursor:"pointer",fontFamily:"inherit"}}>✕ Quitar modelo de referencia</button>}
                </div>

                {/* Pipeline */}
                <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",borderRadius:10,padding:12}}>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.3)",marginBottom:8}}>5 VARIANTES QUE SE GENERARÁN</div>
                  {PROMPT_STYLES.filter(p=>selectedPrompts.includes(p.id)).map((s,i)=><div key={i} style={{fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:4,display:"flex",gap:6}}><span style={{color:"#ff9f5a"}}>V{i+1}</span>{s.label} — <span style={{color:"rgba(255,255,255,0.25)"}}>{(s.desc||"").substring(0,35)}...</span></div>)}
                </div>
              </div>

              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,140,66,0.13)",borderRadius:12,padding:16}}>
                  <div style={{fontSize:10,color:"#ff9f5a",marginBottom:12,letterSpacing:"0.08em"}}>PRODUCTO</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{fontSize:9,color:"rgba(255,255,255,0.28)",display:"block",marginBottom:3}}>NOMBRE DEL PRODUCTO <span style={{color:"#e63946"}}>*</span> <span style={{fontSize:8,color:"rgba(255,80,80,0.5)"}}>(requerido)</span></label>
                      <input value={productInfo.name} onChange={e=>setProductInfo(p=>({...p,name:e.target.value}))} placeholder="Sudadera Stitch Just Chill azul marino" style={{width:"100%",padding:"7px 10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,140,66,0.16)",borderRadius:7,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                    </div>
                    {[{k:"price",l:"PRECIO $",p:"30.00"},{k:"color",l:"COLOR",p:"azul marino"},{k:"category",l:"CATEGORÍA",p:"Sudaderas"}].map(f=>(
                      <div key={f.k}>
                        <label style={{fontSize:9,color:"rgba(255,255,255,0.28)",display:"block",marginBottom:3}}>{f.l}</label>
                        <input value={productInfo[f.k]} onChange={e=>setProductInfo(p=>({...p,[f.k]:e.target.value}))} placeholder={f.p} style={{width:"100%",padding:"7px 10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,140,66,0.16)",borderRadius:7,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                      </div>
                    ))}
                    <div style={{gridColumn:"1/-1"}}>
                      <label style={{fontSize:9,color:"rgba(255,255,255,0.28)",display:"block",marginBottom:3}}>DESCRIPCIÓN</label>
                      <textarea value={productInfo.description} onChange={e=>setProductInfo(p=>({...p,description:e.target.value}))} placeholder="Sudadera cuello redondo, estampado Stitch Just Chill en frente, fleece suave, fit regular..." rows={2} style={{width:"100%",padding:"7px 10px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,140,66,0.16)",borderRadius:7,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box"}}/>
                    </div>
                  </div>
                </div>

                <div style={{background:"rgba(255,220,80,0.04)",border:"1px solid rgba(255,220,80,0.15)",borderRadius:12,padding:16,flex:1}}>
                  <div style={{fontSize:10,color:"#ffd060",marginBottom:5,letterSpacing:"0.08em"}}>✨ GUÍA DE ESTILO</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginBottom:8}}>Describe cómo quieres los modelos y el ambiente. Cuanto más específico, más realista el resultado.</div>
                  <textarea value={promptGuide} onChange={e=>setPromptGuide(e.target.value)}
                    placeholder={"• modelos latina/o 20-25 años, piel oliva media, cabello oscuro natural\n• actitud relajada, no posado, como foto de amigo\n• ropa con arrugas naturales, no perfecta\n• NO cara perfecta IA, SÍ poros, imperfecciones reales\n• fondo cotidiano real, no artificial"}
                    rows={6} style={{width:"100%",padding:"9px 11px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,220,80,0.13)",borderRadius:8,color:"#f5f0eb",fontSize:11,outline:"none",fontFamily:"inherit",resize:"none",boxSizing:"border-box",lineHeight:1.6}}/>
                </div>
              </div>
            </div>

            {/* PROMPT STYLE SELECTOR */}
            <div style={{marginBottom:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,140,66,0.13)",borderRadius:13,padding:16}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                <div>
                  <div style={{fontSize:11,color:"#ff9f5a",letterSpacing:"0.08em"}}>🎨 ESTILOS DE FOTOGRAFÍA</div>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.25)",marginTop:2}}>Selecciona los estilos a generar (máx 5 recomendado)</div>
                </div>
                <div style={{fontSize:10,color:"rgba(255,140,66,0.7)"}}>
                  {selectedPrompts.length} seleccionados
                </div>
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:7}}>
                {PROMPT_STYLES.map(p => {
                  const selected = selectedPrompts.includes(p.id);
                  return (
                    <button key={p.id} onClick={()=>setSelectedPrompts(prev=>selected?prev.filter(x=>x!==p.id):[...prev,p.id])}
                      style={{padding:"10px 6px",background:selected?"rgba(255,140,66,0.15)":"rgba(255,255,255,0.03)",border:selected?"1px solid #ff8c42":"1px solid rgba(255,255,255,0.08)",borderRadius:10,cursor:"pointer",textAlign:"center",fontFamily:"inherit",transition:"all 0.15s",position:"relative"}}>
                      {selected && <div style={{position:"absolute",top:4,right:4,width:6,height:6,borderRadius:"50%",background:"#ff8c42"}}/>}
                      <div style={{fontSize:18,marginBottom:4}}>{p.emoji}</div>
                      <div style={{fontSize:9,color:selected?"#ff9f5a":"#f5f0eb",fontWeight:selected?"bold":"normal",lineHeight:1.3}}>{p.label}</div>
                      <div style={{fontSize:8,color:"rgba(255,255,255,0.25)",marginTop:2,lineHeight:1.3}}>{p.category}</div>
                    </button>
                  );
                })}
              </div>
              <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
                {PROMPT_STYLES.filter(p=>selectedPrompts.includes(p.id)).map(p=>(
                  <div key={p.id} style={{background:"rgba(255,140,66,0.08)",border:"1px solid rgba(255,140,66,0.2)",borderRadius:20,padding:"3px 10px",fontSize:9,color:"rgba(255,255,255,0.5)"}}>{p.emoji} {p.desc}</div>
                ))}
              </div>

              {/* PROMPT LIBRE — aparece solo cuando está seleccionado */}
              {selectedPrompts.includes("custom_prompt") && (
                <div style={{marginTop:12,padding:12,background:"rgba(255,215,0,0.04)",border:"1px solid rgba(255,215,0,0.2)",borderRadius:10}}>
                  <div style={{fontSize:10,color:"#ffd700",marginBottom:6,fontWeight:"bold"}}>✍️ Tu prompt exacto — Gemini lo ejecutará tal cual</div>
                  <textarea
                    value={customPromptText}
                    onChange={e=>setCustomPromptText(e.target.value)}
                    placeholder={"Ejemplo: reemplaza a la persona por una fruta que esté en la playa, con gafas de sol y la prenda puesta, estilo hiperrealista, luz de atardecer..."}
                    rows={4}
                    style={{width:"100%",padding:"9px 11px",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,215,0,0.15)",borderRadius:8,color:"#f5f0eb",fontSize:11,outline:"none",fontFamily:"inherit",resize:"vertical",boxSizing:"border-box",lineHeight:1.6}}
                  />
                  <div style={{fontSize:9,color:"rgba(255,215,0,0.4)",marginTop:4}}>⚡ Claude no modifica este prompt — se envía directo a Gemini sin cambios</div>
                </div>
              )}
            </div>

            <button onClick={()=>{setStep(1);runAll();}} disabled={!canStart||selectedPrompts.length===0}
              style={{marginTop:16,width:"100%",padding:"14px",background:canStart?"linear-gradient(135deg,#ff8c42,#e63946)":"rgba(255,255,255,0.06)",border:"none",borderRadius:11,color:canStart?"#fff":"rgba(255,255,255,0.22)",fontSize:13,fontWeight:"bold",cursor:canStart?"pointer":"not-allowed",fontFamily:"inherit",letterSpacing:"0.04em"}}>
              {!photoFront?"📸 Sube la foto delantera":!productInfo.name.trim()?"✏️ Ingresa el nombre del producto":"🚀 Generar campaña → variantes ultra-realistas"}
            </button>
          </div>
        )}

        {/* ══ STEP 1 ══ */}
        {step === 1 && (
          <div style={{animation:"fadeIn 0.4s ease",textAlign:"center",paddingTop:20}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",marginBottom:12}}>GENERANDO TU CAMPAÑA</div>
            {(() => {
              const total = selectedPrompts.length;
              const done = variants.filter(v => v?.dataUrl || v?.error).length;
              const pct = total ? Math.round((done / total) * 100) : 0;
              return (
                <div style={{maxWidth:520,margin:"0 auto 18px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:9,color:"rgba(255,255,255,0.4)",marginBottom:5}}>
                    <span>{done} de {total} imágenes</span><span>{pct}%</span>
                  </div>
                  <div style={{height:6,borderRadius:4,background:"rgba(255,255,255,0.06)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#ff8c42,#e63946)",borderRadius:4,transition:"width 0.4s ease"}}/>
                  </div>
                </div>
              );
            })()}
            <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:10,marginBottom:16}}>
              {PROMPT_STYLES.filter(p=>selectedPrompts.includes(p.id)).map((s,i)=>{
                const v=variants[i]; const isP=i===promptIdx; const isG=i===genIdx; const done=!!v?.dataUrl;
                return (
                  <div key={i} style={{borderRadius:11,overflow:"hidden",border:done?"1px solid rgba(255,140,66,0.35)":"1px solid rgba(255,255,255,0.06)",background:"#0d0d0d"}}>
                    <div style={{aspectRatio:"1",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",overflow:"hidden",position:"relative"}}>
                      {done&&<img src={v.dataUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/>}
                      {isP&&<><div style={{fontSize:20,animation:"spin 1.5s linear infinite"}}>✍️</div><div style={{fontSize:8,color:"#ffd060",marginTop:3}}>Analizando...</div></>}
                      {isG&&<><div style={{fontSize:20,animation:"spin 1s linear infinite"}}>⚡</div><div style={{fontSize:8,color:"#ff9f5a",marginTop:3}}>Generando...</div></>}
                      {v?.error&&<div style={{fontSize:16}}>❌</div>}
                      {!done&&!isP&&!isG&&!v?.error&&<div style={{fontSize:16,opacity:0.2}}>⏳</div>}
                    </div>
                    <div style={{padding:"5px 7px",borderTop:"1px solid rgba(255,255,255,0.04)"}}>
                      <div style={{fontSize:9,color:done?"#ff9f5a":"rgba(255,255,255,0.3)",fontWeight:done?"bold":"normal"}}>{s.label}</div>
                      <div style={{fontSize:7,color:"rgba(255,255,255,0.18)"}}>{done?"✓":isP?"Analizando...":isG?"Generando...":v?.error?"Error":"—"}</div>
                    </div>
                  </div>
                );
              })}
            </div>
            {error&&<div style={{padding:"8px 14px",background:"rgba(255,80,80,0.07)",border:"1px solid rgba(255,80,80,0.18)",borderRadius:9,fontSize:11,color:"#ff8888",marginBottom:12}}>⚠️ {error}</div>}
            {variants.some(v=>v.dataUrl) && genIdx===-1 && (
              <div style={{marginTop:16,textAlign:"center"}}>
                <button onClick={()=>setStep(2)} style={{padding:"13px 40px",background:"linear-gradient(135deg,#ff8c42,#e63946)",border:"none",borderRadius:11,color:"#fff",fontSize:14,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"}}>
                  Ver resultados → {variants.filter(v=>v.dataUrl).length}/5 imágenes listas
                </button>
              </div>
            )}
          </div>
        )}

        {/* ══ STEP 2 ══ */}
        {step === 2 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            {error && <div style={{marginBottom:12,padding:"10px 14px",background:"rgba(255,80,80,0.1)",border:"1px solid rgba(255,80,80,0.3)",borderRadius:9,fontSize:11,color:"#ff9999",lineHeight:1.5}}>⚠️ Errores: {error}</div>}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
              <div><h1 style={{fontSize:24,fontWeight:"normal",color:"#ff9f5a",marginBottom:3}}>Revisa, edita y aprueba</h1><p style={{color:"rgba(255,255,255,0.35)",fontSize:11}}>Edita textos · Ajusta imágenes por chat · Preview real · Tú decides qué se publica</p></div>
              {totalTokens>0&&<div style={{textAlign:"right",fontSize:10,color:"#ffd060"}}>⚡ {totalTokens.toLocaleString()}<br/><span style={{color:"rgba(255,255,255,0.25)"}}>~${totalCost}</span></div>}
            </div>

            <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr",gap:16}}>
              <div>
                <div style={{fontSize:9,color:"rgba(255,255,255,0.28)",marginBottom:7,letterSpacing:"0.08em"}}>SELECCIONA LA MEJOR FOTO</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:5,marginBottom:9}}>
                  {PROMPT_STYLES.filter(p=>selectedPrompts.includes(p.id)).map((s,i)=>{
                    const v=variants[i];
                    return (
                      <div key={i} onClick={()=>v?.dataUrl&&setSelectedV(i)} style={{borderRadius:7,overflow:"hidden",border:selectedV===i?"2px solid #ff8c42":"2px solid rgba(255,255,255,0.06)",cursor:v?.dataUrl?"pointer":"default",aspectRatio:"1",background:"#111",position:"relative"}}>
                        {v?.dataUrl?<img src={v.dataUrl} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12}}>{v?.error?"❌":"—"}</div>}
                        <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent,rgba(0,0,0,0.85))",padding:"2px 2px",textAlign:"center"}}><div style={{fontSize:7,color:"#fff"}}>{s.label}</div></div>
                        {v?.dataUrl&&<button onClick={e=>{e.stopPropagation();dl(v,i);}} style={{position:"absolute",top:2,right:2,background:"rgba(0,0,0,0.6)",border:"none",borderRadius:3,color:"#fff",fontSize:9,cursor:"pointer",padding:"1px 4px"}}>⬇</button>}
                      </div>
                    );
                  })}
                </div>

                {selImg?.regenerating&&(
                  <div style={{borderRadius:11,marginBottom:9,minHeight:200,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"#0d0d0d",border:"1px solid rgba(255,140,66,0.2)"}}>
                    <div style={{fontSize:24,animation:"spin 1s linear infinite"}}>⚡</div>
                    <div style={{fontSize:10,color:"#ff9f5a",marginTop:6}}>Regenerando {selImg.label}...</div>
                  </div>
                )}
                {selImg?.dataUrl&&!selImg?.regenerating&&(
                  <div style={{borderRadius:11,overflow:"hidden",marginBottom:9,position:"relative"}}>
                    <img src={selImg.dataUrl} style={{width:"100%",maxHeight:260,objectFit:"cover",display:"block"}}/>
                    <div style={{position:"absolute",bottom:8,right:8,display:"flex",gap:5}}>
                      <button onClick={()=>dl(selImg,selectedV)} style={{background:"rgba(0,0,0,0.7)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,color:"#fff",fontSize:9,cursor:"pointer",padding:"5px 9px",fontFamily:"inherit"}}>⬇ Descargar</button>
                      <button onClick={()=>regenerateVariant(selectedV)} style={{background:"rgba(0,0,0,0.7)",border:"1px solid rgba(150,200,255,0.35)",borderRadius:7,color:"#9cc8ff",fontSize:9,cursor:"pointer",padding:"5px 9px",fontFamily:"inherit"}}>🔄 Regenerar</button>
                      <button onClick={()=>setExpandedEditor(expandedEditor===selectedV?null:selectedV)} style={{background:expandedEditor===selectedV?"rgba(255,140,66,0.25)":"rgba(0,0,0,0.7)",border:"1px solid rgba(255,140,66,0.35)",borderRadius:7,color:"#ff9f5a",fontSize:9,cursor:"pointer",padding:"5px 9px",fontFamily:"inherit"}}>✏️ Editar foto</button>
                    </div>
                  </div>
                )}
                {!selImg?.dataUrl&&!selImg?.regenerating&&selImg?.error&&(
                  <div style={{borderRadius:11,marginBottom:9,padding:16,background:"rgba(255,80,80,0.06)",border:"1px solid rgba(255,80,80,0.2)",textAlign:"center"}}>
                    <div style={{fontSize:11,color:"#ff9999",marginBottom:9,lineHeight:1.5}}>❌ {selImg.error}</div>
                    <button onClick={()=>regenerateVariant(selectedV)} style={{padding:"7px 16px",background:"linear-gradient(135deg,#ff8c42,#e63946)",border:"none",borderRadius:8,color:"#fff",fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"}}>🔄 Reintentar esta variante</button>
                  </div>
                )}

                {expandedEditor===selectedV&&selImg?.dataUrl&&(
                  <ImageEditorChat variant={selImg} variantIndex={selectedV} frontPhoto={photoFront} backPhoto={photoBack} modelPhoto={photoModel} onUpdate={updateVariant} onTokens={addToken}/>
                )}

                <div style={{display:"flex",gap:6,marginTop:9,marginBottom:9}}>
                  {[{id:"instagram",l:"📱 Instagram"},{id:"shopify",l:"🛍️ Shopify"}].map(p=>(
                    <button key={p.id} onClick={()=>setActivePreview(p.id)} style={{flex:1,padding:"7px",background:activePreview===p.id?"rgba(255,140,66,0.14)":"rgba(255,255,255,0.03)",border:activePreview===p.id?"1px solid #ff8c42":"1px solid rgba(255,255,255,0.06)",borderRadius:8,color:activePreview===p.id?"#ff9f5a":"rgba(255,255,255,0.38)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>{p.l}</button>
                  ))}
                </div>
                <div style={{maxHeight:400,overflowY:"auto"}}>
                  {activePreview==="instagram"?<IGPreview image={selImg?.dataUrl} ig={ig} price={productInfo.price}/>:<ShopPreview image={selImg?.dataUrl} seo={seo} price={productInfo.price}/>}
                </div>
              </div>

              <div style={{maxHeight:"82vh",overflowY:"auto",paddingRight:2}}>
                {loadingSEO&&<div style={{textAlign:"center",padding:"35px",color:"#ff9f5a"}}><div style={{fontSize:26,animation:"spin 1s linear infinite",marginBottom:7}}>⚡</div><div style={{fontSize:11}}>Generando SEO con neuromarketing...</div></div>}
                {!loadingSEO&&!seo?.title&&<div style={{textAlign:"center",padding:"20px",background:"rgba(255,140,66,0.06)",borderRadius:12,marginBottom:12}}>
                  <div style={{fontSize:13,color:"rgba(255,255,255,0.4)",marginBottom:8}}>Sin contenido generado aún</div>
                  <div style={{fontSize:11,color:"rgba(255,255,255,0.25)",marginBottom:12}}>Asegúrate de haber llenado nombre, precio y descripción del producto</div>
                  <button onClick={()=>regenerateSEO()} style={{padding:"9px 20px",background:"linear-gradient(135deg,#ff8c42,#e63946)",border:"none",borderRadius:9,color:"#fff",fontSize:12,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"}}>⚡ Generar copy ahora</button>
                </div>}
                {!loadingSEO&&(<>
                  <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(100,200,100,0.14)",borderRadius:12,padding:14,marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>🛍️</span><span style={{fontSize:12,fontWeight:"bold",color:"#7ec97e"}}>Shopify SEO</span></div>
                      <button onClick={()=>regenerateSEO()} disabled={loadingSEO} style={{padding:"5px 12px",background:"rgba(126,201,126,0.15)",border:"1px solid rgba(126,201,126,0.3)",borderRadius:8,color:"#7ec97e",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>{loadingSEO?"⏳ Generando...":"⚡ Generar copy"}</button>
                    </div>
                    <EF label="TÍTULO SEO" hint="max 60" value={seo?.title} onChange={v=>setSeo(s=>({...s,title:v}))} color="#7ec97e"/>
                    <EF label="META DESCRIPCIÓN" hint="150 chars" value={seo?.metaDescription} onChange={v=>setSeo(s=>({...s,metaDescription:v}))} multi color="#7ec97e"/>
                    <EF label="H1" value={seo?.h1} onChange={v=>setSeo(s=>({...s,h1:v}))} color="#7ec97e"/>
                    <EF label="DESCRIPCIÓN (PAS)" value={seo?.bodyText} onChange={v=>setSeo(s=>({...s,bodyText:v}))} multi color="#7ec97e"/>
                    <EF label="GOOGLE ADS" hint="max 30" value={seo?.googleAdsHeadline} onChange={v=>setSeo(s=>({...s,googleAdsHeadline:v}))} color="#7ec97e"/>
                    <EF label="GOOGLE ADS CTA" value={seo?.googleAdsCTA} onChange={v=>setSeo(s=>({...s,googleAdsCTA:v}))} color="#7ec97e"/>
                    <div><div style={{fontSize:9,color:"rgba(255,255,255,0.28)",marginBottom:4}}>TAGS</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(seo?.tags||[]).map((t,i)=><span key={i} style={{background:"rgba(126,201,126,0.08)",border:"1px solid rgba(126,201,126,0.18)",borderRadius:20,padding:"2px 7px",fontSize:9,color:"#7ec97e"}}>{t}</span>)}</div></div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(200,100,200,0.14)",borderRadius:12,padding:14}}>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
                      <div style={{display:"flex",alignItems:"center",gap:7}}><span style={{fontSize:16}}>📸</span><span style={{fontSize:12,fontWeight:"bold",color:"#c97ec9"}}>Instagram</span></div>
                      <button onClick={()=>regenerateSEO()} disabled={loadingSEO} style={{padding:"5px 12px",background:"rgba(201,126,201,0.15)",border:"1px solid rgba(201,126,201,0.3)",borderRadius:8,color:"#c97ec9",fontSize:10,cursor:"pointer",fontFamily:"inherit"}}>{loadingSEO?"⏳":"⚡ Generar copy"}</button>
                    </div>
                    <EF label="CAPTION" value={ig?.caption} onChange={v=>setIg(s=>({...s,caption:v}))} multi color="#c97ec9"/>
                    <EF label="HASHTAGS" value={ig?.hashtags} onChange={v=>setIg(s=>({...s,hashtags:v}))} multi color="#c97ec9"/>
                    <EF label="CTA" value={ig?.cta} onChange={v=>setIg(s=>({...s,cta:v}))} color="#c97ec9"/>
                    <EF label="STORY TEXT" value={ig?.storyText} onChange={v=>setIg(s=>({...s,storyText:v}))} color="#c97ec9"/>
                    <EF label="REEL HOOK" hint="para parar el scroll" value={ig?.reelHook} onChange={v=>setIg(s=>({...s,reelHook:v}))} color="#c97ec9"/>
                  </div>
                </>)}
              </div>
            </div>

            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>setStep(0)} style={{padding:"12px 18px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,color:"rgba(255,255,255,0.45)",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>← Volver</button>
              <button onClick={()=>variants.forEach((v,i)=>{if(v?.dataUrl)dl(v,i);})} style={{padding:"12px 18px",background:"rgba(255,140,66,0.09)",border:"1px solid rgba(255,140,66,0.25)",borderRadius:10,color:"#ff9f5a",fontSize:12,cursor:"pointer",fontFamily:"inherit"}}>⬇️ Descargar todo</button>
              <button onClick={()=>setStep(3)} style={{flex:1,padding:"12px",background:"linear-gradient(135deg,#ff8c42,#e63946)",border:"none",borderRadius:10,color:"#fff",fontSize:13,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"}}>✅ Todo aprobado — publicar →</button>
            </div>
          </div>
        )}

        {/* ══ STEP 3 ══ */}
        {step === 3 && (
          <div style={{animation:"fadeIn 0.4s ease"}}>
            <h1 style={{fontSize:24,fontWeight:"normal",color:"#ff9f5a",marginBottom:4}}>Publicar</h1>
            <p style={{color:"rgba(255,255,255,0.35)",fontSize:11,marginBottom:16}}>Un click por canal.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:12}}>
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(100,200,100,0.2)",borderRadius:14,padding:18}}>
                <div style={{display:"flex",gap:9,marginBottom:12}}><span style={{fontSize:22}}>🛍️</span><div><div style={{fontSize:13,fontWeight:"bold",color:"#7ec97e"}}>Shopify</div><div style={{fontSize:9,color:"rgba(255,255,255,0.28)"}}>Producto + SEO completo</div></div></div>
                {selImg?.dataUrl&&<img src={selImg.dataUrl} style={{width:"100%",aspectRatio:"1",objectFit:"cover",borderRadius:9,marginBottom:12}}/>}
                <div style={{background:"rgba(0,0,0,0.25)",borderRadius:8,padding:10,marginBottom:12,fontSize:10,lineHeight:1.7}}>
                  <div style={{color:"#7ec97e"}}>✓ {seo?.title||"Sin título"}</div>
                  <div style={{color:"rgba(255,255,255,0.35)"}}>✓ Meta + H1 + tags + Google Ads</div>
                  <div style={{color:"rgba(255,255,255,0.35)"}}>✓ Descripción con neuromarketing</div>
                  <div style={{color:"rgba(255,255,255,0.35)"}}>✓ Precio: ${productInfo.price||"—"}</div>
                </div>
                <button
                  onClick={async ()=>{
                    if(pubStatus.shopify==="done") return;
                    if(!selImg?.dataUrl){ setShopifyError("Primero selecciona una imagen generada."); return; }
                    setShopifyError(""); setShopifyResult(null);
                    setPubStatus(s=>({...s,shopify:"loading"}));
                    try {
                      const r = await publishToShopify(productInfo, seo, selImg.dataUrl);
                      setShopifyResult(r);
                      setPubStatus(s=>({...s,shopify:"done"}));
                    } catch(e) {
                      setShopifyError(e.message);
                      setPubStatus(s=>({...s,shopify:""}));
                    }
                  }}
                  disabled={pubStatus.shopify==="loading"||pubStatus.shopify==="done"}
                  style={{width:"100%",padding:"12px",background:pubStatus.shopify==="done"?"rgba(126,201,126,0.18)":"linear-gradient(135deg,#2d7d2d,#1a5c1a)",border:"1px solid rgba(126,201,126,0.28)",borderRadius:9,color:"#fff",fontSize:12,fontWeight:"bold",cursor:pubStatus.shopify==="done"||pubStatus.shopify==="loading"?"default":"pointer",fontFamily:"inherit"}}>
                  {pubStatus.shopify==="loading"?"⏳ Creando producto...":pubStatus.shopify==="done"?"✅ Borrador creado en Shopify":"🚀 Crear producto en Shopify"}
                </button>
                {shopifyError&&<div style={{marginTop:8,padding:"8px 10px",background:"rgba(255,80,80,0.08)",border:"1px solid rgba(255,80,80,0.2)",borderRadius:8,fontSize:9,color:"#ff9999",lineHeight:1.5}}>⚠️ {shopifyError}</div>}
                {shopifyResult&&<div style={{marginTop:8,padding:"9px 11px",background:"rgba(126,201,126,0.08)",border:"1px solid rgba(126,201,126,0.25)",borderRadius:8,fontSize:10,color:"rgba(255,255,255,0.6)",lineHeight:1.6}}>
                  ✅ Producto creado como <strong style={{color:"#7ec97e"}}>borrador</strong>. <a href={shopifyResult.adminUrl} target="_blank" rel="noreferrer" style={{color:"#7ec97e",textDecoration:"underline"}}>Revísalo y publícalo en Shopify Admin →</a>
                </div>}
              </div>
              <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(200,100,200,0.2)",borderRadius:14,padding:18}}>
                <div style={{display:"flex",gap:9,marginBottom:12}}><span style={{fontSize:22}}>📸</span><div><div style={{fontSize:13,fontWeight:"bold",color:"#c97ec9"}}>Instagram</div><div style={{fontSize:9,color:"rgba(255,255,255,0.28)"}}>Feed + Stories + Reels</div></div></div>
                <div style={{marginBottom:12,maxHeight:280,overflowY:"auto"}}><IGPreview image={selImg?.dataUrl} ig={ig} price={productInfo.price}/></div>
                <button onClick={()=>{setPubStatus(s=>({...s,instagram:"loading"}));setTimeout(()=>setPubStatus(s=>({...s,instagram:"done"})),1800);}} disabled={pubStatus.instagram==="done"}
                  style={{width:"100%",padding:"12px",background:pubStatus.instagram==="done"?"rgba(201,126,201,0.18)":"linear-gradient(135deg,#7b2d7b,#521a52)",border:"1px solid rgba(201,126,201,0.28)",borderRadius:9,color:"#fff",fontSize:12,fontWeight:"bold",cursor:pubStatus.instagram==="done"?"default":"pointer",fontFamily:"inherit"}}>
                  {pubStatus.instagram==="loading"?"⏳ Preparando...":pubStatus.instagram==="done"?"✅ Listo para Instagram":"📱 Publicar en Instagram"}
                </button>
              </div>
            </div>
            {tokens.length>0&&(
              <div style={{background:"rgba(255,200,50,0.04)",border:"1px solid rgba(255,200,50,0.1)",borderRadius:11,padding:13,marginBottom:12}}>
                <div style={{fontSize:9,color:"#ffd060",marginBottom:8}}>⚡ RESUMEN</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:3}}>
                  {tokens.map((t,i)=><div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:9,padding:"2px 0"}}><span style={{color:"rgba(255,255,255,0.35)"}}>{t.type==="image"?"🖼️":"📝"} {t.label}</span><span style={{color:"#ffd060"}}>{t.tokens.toLocaleString()} · ${(t.tokens*(t.type==="image"?0.00003:0.000003)).toFixed(4)}</span></div>)}
                </div>
                <div style={{display:"flex",justifyContent:"space-between",marginTop:7,fontSize:11,fontWeight:"bold",color:"#ffd060",borderTop:"1px solid rgba(255,200,50,0.1)",paddingTop:6}}>
                  <span>TOTAL</span><span>{totalTokens.toLocaleString()} · ~${totalCost} USD</span>
                </div>
              </div>
            )}
            {(pubStatus.shopify==="done"||pubStatus.instagram==="done")&&(
              <div style={{background:"rgba(255,140,66,0.05)",border:"1px solid rgba(255,140,66,0.15)",borderRadius:11,padding:16,textAlign:"center"}}>
                <div style={{fontSize:22,marginBottom:5}}>🎉</div>
                <div style={{fontSize:14,color:"#ff9f5a",marginBottom:12}}>¡{productInfo.name||"Producto"} publicado!</div>
                <div style={{display:"flex",gap:9,justifyContent:"center"}}>
                  <button onClick={()=>setStep(2)} style={{padding:"8px 18px",background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.1)",borderRadius:9,color:"rgba(255,255,255,0.45)",fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>← Revisar</button>
                  <button onClick={reset} style={{padding:"8px 22px",background:"linear-gradient(135deg,#ff8c42,#e63946)",border:"none",borderRadius:9,color:"#fff",fontSize:11,fontWeight:"bold",cursor:"pointer",fontFamily:"inherit"}}>+ Publicar otro producto</button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}input::placeholder,textarea::placeholder{color:rgba(255,255,255,0.16)}button:hover:not(:disabled){opacity:0.84}::-webkit-scrollbar{height:3px;width:3px}::-webkit-scrollbar-thumb{background:rgba(255,140,66,0.22);border-radius:2px}`}</style>
    </div>
  );
}
