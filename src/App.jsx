import { useState, useRef, useCallback } from "react";

// ─── 10 PROMPT STYLES ────────────────────────────────────────────────────────
const PROMPT_STYLES = [
  {
    id: "mirror_selfie",
    label: "Mirror Selfie",
    emoji: "🤳",
    category: "Lifestyle",
    desc: "Instagram Story 9:16, selfie espejo, lujo suave Gen Z",
    basePrompt: `Ultra realistic cinematic fashion photography, vertical 9:16 format, captured like an authentic iPhone mirror selfie Instagram story from a premium streetwear brand campaign.
Mirror selfie composition with iPhone partially covering face. One hand holding phone, other hand softly touching hair near ear. Relaxed effortless posture. Hoodie occupies most of frame. Focus on fit and cozy oversized silhouette.
Warm ambient indoor lighting mixed with soft natural daylight from window. Cinematic soft shadows. Slight glow on skin. Cozy luxury atmosphere.
Minimal modern room with beige walls, wooden textures, soft curtains, luxury hotel aesthetic, slightly blurred background.
iPhone front camera aesthetic, realistic grain, slightly soft focus, natural skin texture, authentic Instagram story feel, not overproduced. Extremely realistic fabric folds.
NO exaggerated AI smoothness. Cozy cinematic atmosphere. Authentic mirror selfie framing. High realism clothing texture and folds. Editorial but natural social media feeling.`
  },
  {
    id: "luxury_editorial",
    label: "Luxury Editorial",
    emoji: "🎩",
    category: "Editorial",
    desc: "Vogue, sastrería de lujo, arquitectura minimalista",
    basePrompt: `Ultra realistic high-fashion editorial photography, vertical format, captured for a luxury tailored clothing campaign in Vogue magazine.
Three-quarter length fashion portrait, standing slightly off-center, one hand casually placed in pocket, strong geometric composition interacting with architecture.
Dramatic studio lighting with strong rim light from upper left, creating deep Rembrandt side shadows. High contrast accentuates crisp fabric texture.
Minimalist architect's studio with exposed raw concrete textures, industrial glass windows, and subtle metallic elements, slightly blurred.
Shot on medium format Hasselblad H6D, 85mm lens, f/5.6 aperture, ISO 100. Pin-sharp details on fabric weave, visible textile fibers, subsurface scattering on skin, zero digital smoothing.
Sleek, sophisticated, avant-garde luxury. Tack-sharp weave texture. No synthetic skin glow. Structured shoulder drape. High-end editorial contrast.`
  },
  {
    id: "streetwear_flash",
    label: "Streetwear Flash",
    emoji: "⚡",
    category: "Street",
    desc: "Flash duro, muro concreto, Supreme/Balenciaga",
    basePrompt: `Ultra realistic streetwear product campaign photography, vertical format, captured like a high-contrast flash photograph for an urban clothing line.
Candid front-facing shot, model standing relaxed, hands loosely at the sides. Frame focuses on the chest graphic, fit, and collar thickness.
Harsh direct flash photography, creating sharp dark shadows behind the model against the wall, overexposed highlights on the texture, high visual impact.
Gritty industrial concrete wall with subtle texture, minor distress, and a raw street vibe, kept simple to emphasize the garment.
Shot on 35mm prime lens, f/4.0 aperture, slight lens compression, realistic analog film grain, authentic street photography feel, organic skin pores and fabric weave visible.
Gritty, rebellious, premium streetwear. Realistic screen-printed plastisol ink height. Direct flash shadow styling. Industrial minimalist background.`
  },
  {
    id: "autumn_cozy",
    label: "Autumn Cozy",
    emoji: "🍂",
    category: "Lifestyle",
    desc: "Catálogo otoño, golden hour, bokeh cremoso",
    basePrompt: `Ultra realistic lifestyle fashion photography, vertical format, capturing a warm cozy autumn lookbook.
Model sitting comfortably on a rustic outdoor bench, wrapped warmly. Medium close-up focusing on the texture of the knitwear and soft autumn vibe.
Soft golden hour backlight filtering through trees, creating dappled natural window light effects, warm highlights, and gentle soft shadows.
Softly blurred autumn park setting with golden leaves, warm earth tones, and a peaceful cozy outdoor atmosphere.
Shot on 135mm telephoto lens, f/4.0 aperture, creating beautiful cream bokeh. Natural slightly warm color grade, organic film grain.
Warm, nostalgic, cozy, high-end comfort and approachable luxury. Chunky texture depth. Creamy outdoor bokeh. Warm golden hour backlighting. Approachable natural expression.`
  },
  {
    id: "techwear_urban",
    label: "Techwear Night",
    emoji: "🌆",
    category: "Editorial",
    desc: "Rooftop urbano, iluminación dual azul/ámbar, cyberpunk",
    basePrompt: `Ultra realistic high-tech outerwear photography, vertical format, designed for a modern technical clothing brand campaign.
Dynamic three-quarter angle shot, model looking directly into camera. Low-angle framing to emphasize volume and structural silhouette.
Dramatic dual lighting: cool blue ambient twilight from one side, mixed with warm amber neon spotlight from the other, casting sharp highlights on the fabric panels.
Urban concrete rooftop at dusk with distant city skyline lights blurred into soft circular bokeh, cyberpunk industrial aesthetic.
Shot on 50mm lens, f/2.8 aperture, high-contrast digital sensor simulation, extremely sharp focus on fabric weave, water-droplet details on the surface, zero noise reduction.
Futuristic, utilitarian, tech-wear aesthetic. Matte waterproof texture. High volume panels. Dual-tone blue and amber lighting. Tech-wear urban atmosphere.`
  },
  {
    id: "resort_coastal",
    label: "Resort Coastal",
    emoji: "🌊",
    category: "Lifestyle",
    desc: "Costero, lino, brisa del mar, luz de mañana",
    basePrompt: `Ultra realistic travel lifestyle photography, vertical format, captured for an ethical resort-wear clothing campaign.
Candid shot of the model walking slowly along the coastline. The fabric is gently caught by sea breeze, showing organic movement and fluid drape.
Bright natural morning sunlight, warm backlight filtering through fabric fibers, soft natural contrast with bright clean whites.
Minimalist sun-bleached coastal environment with dry grass, sand dunes, and a soft desaturated ocean background, slightly out of focus.
Shot on 85mm prime lens, f/4.0 aperture, warm natural pastel color grading, organic grain, soft focus transitions, highly detailed fabric weave imperfections.
Airy, serene, sustainable luxury. Organic linen slub and wrinkle texture. Semi-translucent fabric drape. Wind-blown fabric movement. Desaturated coastal background.`
  },
  {
    id: "activewear_botanical",
    label: "Activewear Botanico",
    emoji: "🌿",
    category: "Sport",
    desc: "Athleisure premium, estudio botánico, luz difusa",
    basePrompt: `Ultra realistic commercial activewear photography, vertical format, designed for a premium sustainable athleisure brand catalog.
Full body composition in a light yoga pose, interacting with a minimal wooden and mossy set. Focus on stretch, supportive fit, and smooth matte fabric texture.
Bright clean diffused overhead studio light, simulating soft natural daylight, with soft green reflections from botanical elements.
Modern botanical studio set featuring organic green moss panels, natural light wood blocks, and delicate wildflowers, creating premium earthy contrast.
Shot on medium format camera, 85mm lens, f/5.6 aperture, sharp focus on ribbed microfiber textile pattern, realistic skin textures with natural sweat glow, no digital airbrushing.
Fresh, organic, premium wellness. Ribbed microfiber matte compression fabric. Clean flatlock seam stitching. Diffused natural daylight. Botanical moss and wood studio set.`
  },
  {
    id: "denim_rustic",
    label: "Denim Rustic",
    emoji: "☕",
    category: "Lifestyle",
    desc: "Documental, denim raw, café rústico, luz ventana",
    basePrompt: `Ultra realistic documentary fashion photography, vertical format, capturing an authentic lived-in workwear style.
Candid medium shot, model leaning casually against a wooden counter. Focus on the stiff structural drape of heavy-duty denim and authentic wear-and-tear details.
Soft directional natural light coming from a side window, highlighting the texture of the twill and casting soft organic shadows across fabric folds.
Sunlit rustic coffee shop or workshop with warm wooden furniture, green plants, and subtle vintage details, softly blurred.
Shot on 35mm lens, f/5.6 aperture, warm color science, high dynamic range, organic film grain, rich indigo color tones, authentic and unretouched.
Honest, rugged, heritage-driven. Heavy denim twill texture with natural fades. Shank metal buttons with patina. Triple-needle gold stitching. Window side-lighting.`
  },
  {
    id: "bohemian_golden",
    label: "Bohemian Golden",
    emoji: "🌅",
    category: "Lifestyle",
    desc: "Maxi dress, campo lavanda, golden hour, romántico",
    basePrompt: `Ultra realistic bohemian fashion photography, vertical format, capturing a dreamy romantic summer campaign.
Full-length shot of the model in motion on an outdoor field. The fabric is caught mid-air, creating a beautiful silhouette of flowing movement and transparency.
Warm low-angle golden hour sunlight, creating a beautiful halo effect on the model's hair and illuminating the translucent qualities of the fabric.
Expansive lavender field or wild meadow at sunset, warm orange and pink sky, creating a soft romantic dreamy background.
Shot on 135mm lens, f/4.0 aperture, slight motion blur in the flowing fabric to convey movement, warm pastel color grade, soft contrast, highly detailed fabric drape.
Dreamy, romantic, free-spirited, elegant bohemian luxury. Flowing chiffon transparency. Wind-blown fabric movement. Golden hour sunset halo. Dreamy outdoor meadow background.`
  },
  {
    id: "tuxedo_formal",
    label: "Black Tie Formal",
    emoji: "🥂",
    category: "Formal",
    desc: "Esmoquin, lounge de hotel, satin lapel, prestige",
    basePrompt: `Ultra realistic formal wear portrait photography, vertical format, capturing high-end bespoke tailoring for a luxury fashion house.
Three-quarter length portrait, model standing with one hand adjusting cufflink, showcasing precise tailoring of the sleeve and jacket shoulders. Elegant balanced composition.
Low warm luxurious ambient lounge lighting, with a single soft spotlight illuminating the model's face and the satin sheen of the lapel, rich bokeh shadows.
Sophisticated dim-lit hotel lounge with dark wood paneling, warm brass fixtures, and soft leather textures, kept out of focus.
Shot on 85mm G-Master lens, f/4.0 aperture, compressed background, rich color saturation, deep blacks, high-fidelity textile weave, subsurface scattering on skin.
Prestige, timeless elegance, cinematic luxury. Barathea wool and satin sheen contrast. Warm low-key ambient lighting. Bespoke tailoring catalog quality.`
  },
];

// Default selection (first 5 for generation)

// ─── APIs ─────────────────────────────────────────────────────────────────────
async function analyzeAndBuildPrompt(frontBase64, backBase64, productInfo, userGuide, scene, modelBase64) {
  const parts = [
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: frontBase64 } },
    { type: "text", text: "FRONT VIEW of the garment ↑" },
  ];
  if (backBase64) {
    parts.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: backBase64 } });
    parts.push({ type: "text", text: "BACK VIEW of the garment ↑" });
  }
  if (modelBase64) {
    parts.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: modelBase64 } });
    parts.push({ type: "text", text: "REFERENCE MODEL PHOTO ↑ — Use this EXACT person (face, body, skin tone, hair) wearing the garment. Do NOT change their appearance." });
  }
  const modelInstruction = modelBase64
    ? "USE THE EXACT PERSON from the reference photo — describe their precise face, skin tone, hair color/texture, and body type so they are recognizable"
    : "age 20-25, latinx features, natural skin tone, NOT AI-perfect, real person energy";

  parts.push({ type: "text", text: `You are an expert fashion photography prompt engineer. You MUST make the output look like a REAL PHOTOGRAPH, not AI-generated.

Analyze both garment views carefully and build an ultra-realistic fashion photography prompt.

PRODUCT: ${productInfo.name || "fashion garment"} | Color: ${productInfo.color || "see images"} | ${productInfo.description || ""}

BASE PHOTOGRAPHY STYLE (adapt this to the garment):
${scene.basePrompt}

STYLE GUIDE: ${userGuide || "young latinx, 20-25yo, authentic, not model-looking"}

${scene.id === "denim_rustic" || scene.label === "Hanging Product" ? `
FOR THIS PRODUCT SHOT STYLE:
- Describe EVERY garment detail from BOTH views: front design, back design, all colors, prints/graphics/text, fabric texture, cut details
- Make the garment the hero of the shot
` : `
Build an ENHANCED version of this prompt that:
1. Camera: use exactly what the base prompt specifies
2. Model: ${modelInstruction}
3. GARMENT DESCRIPTION (CRITICAL): Describe EVERY detail visible in the reference photos — exact colors, all prints/graphics/logos/text, fabric texture, fit/silhouette, any back design details. Make it so specific that the AI can recreate it exactly.
4. Adapt the base prompt's pose, lighting and background to work with THIS specific garment
5. Add: NO exaggerated AI smoothness. Real fabric wrinkles. Natural skin texture.
`}

Output ONLY the prompt text, 500-700 words. No title, no explanation.` });

  const res = await fetch("/api/claude", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1200, messages: [{ role: "user", content: parts }] })
  });
  const data = await res.json();
  return { prompt: data.content?.[0]?.text || "", tokens: (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0) };
}

async function generateWithGemini(prompt, geminiKey, frontBase64, backBase64, modelBase64) {
  const parts = [
    { inline_data: { mime_type: "image/jpeg", data: frontBase64 } },
  ];
  if (backBase64) parts.push({ inline_data: { mime_type: "image/jpeg", data: backBase64 } });
  if (modelBase64) {
    parts.push({ inline_data: { mime_type: "image/jpeg", data: modelBase64 } });
    parts.push({ text: "REFERENCE MODEL: dress this EXACT person in the garment shown above. Keep their face, skin tone, hair, and body 100% identical. Only change their clothing to the reference garment." });
  }
  parts.push({ text: prompt });

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE","TEXT"], temperature: 0.35 } })
    }
  );
  const data = await res.json();
  const imgPart = (data.candidates?.[0]?.content?.parts || []).find(p => p.inlineData?.mimeType?.startsWith("image/"));
  const tokens = (data.usageMetadata?.promptTokenCount||0)+(data.usageMetadata?.candidatesTokenCount||0);
  if (imgPart) return { dataUrl: `data:${imgPart.inlineData.mimeType};base64,${imgPart.inlineData.data}`, tokens };
  throw new Error(data.error?.message || data.candidates?.[0]?.finishReason || "Error");
}

async function editImage(currentBase64, frontBase64, instruction, geminiKey, backBase64, modelBase64) {
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${geminiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts }], generationConfig: { responseModalities: ["IMAGE","TEXT"], temperature: 0.3 } })
    }
  );
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
  const tokens = (data.usage?.input_tokens||0)+(data.usage?.output_tokens||0);
  const text = data.content?.[0]?.text || "{}";
  try { return { result: JSON.parse(text.replace(/```json|```/g,"").trim()), tokens }; }
  catch { return { result: null, tokens }; }
}

function dataUrlToBase64(d) { return d?.split(",")[1] || null; }

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
function ImageEditorChat({ variant, variantIndex, frontPhoto, backPhoto, modelPhoto, geminiKey, onUpdate, onTokens }) {
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
        geminiKey,
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

// ═══════════════════════════════════════════════════════════════════════════════
export default function MandarinaPro() {
  const [step, setStep] = useState(0);
  const [selectedPrompts, setSelectedPrompts] = useState(PROMPT_STYLES.slice(0,5).map(p=>p.id));
  const [photoFront, setPhotoFront] = useState(null);
  const [photoBack, setPhotoBack] = useState(null);
  const [photoModel, setPhotoModel] = useState(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [promptGuide, setPromptGuide] = useState("");
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
  const [activePreview, setActivePreview] = useState("instagram");
  const frontRef = useRef();
  const backRef = useRef();
  const modelRef = useRef();

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
        const r = await analyzeAndBuildPrompt(frontB64, backB64, productInfo, promptGuide, scene, modelB64);
        prompt = r.prompt;
        addToken({type:"text", label:`Análisis ${scene.label}`, tokens:r.tokens});
      } catch(e) {
        console.error('Prompt analysis error:', e.message);
        prompt = `Ultra realistic fashion photo. ${scene.basePrompt?.substring(0,200) || scene.label}. The person is wearing the exact garment from the reference photo. MUST look like a real photograph, not AI generated.`;
      }
      setGenIdx(i); setPromptIdx(-1);
      try {
        const r = await generateWithGemini(prompt, geminiKey, frontB64, backB64, photoModel ? dataUrlToBase64(photoModel) : null);
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

  const dl = (v, i) => {
    if (!v?.dataUrl) return;
    const a = document.createElement("a");
    a.href = v.dataUrl;
    a.download = `mandarina-${(productInfo.name||"producto").replace(/\s+/g,"-")}-v${i+1}.jpg`;
    a.click();
  };

  const reset = () => { setStep(0); setPhotoFront(null); setPhotoBack(null); setPhotoModel(null); setVariants([]); setSeo(null); setIg(null); setTokens([]); setError(""); setPubStatus({shopify:"",instagram:""}); setProductInfo({name:"",price:"",category:"Ropa",description:"",color:""}); setPromptGuide(""); setExpandedEditor(null); };

  const selImg = variants[selectedV];
  const canStart = photoFront && geminiKey;

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0c0c 0%,#1a1014 50%,#0c0f1a 100%)",fontFamily:"'Georgia',serif",color:"#f5f0eb"}}>
      <header style={{padding:"13px 22px",borderBottom:"1px solid rgba(255,165,80,0.1)",display:"flex",alignItems:"center",justifyContent:"space-between",background:"rgba(0,0,0,0.4)",backdropFilter:"blur(20px)",position:"sticky",top:0,zIndex:100}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:30,height:30,borderRadius:"50%",background:"linear-gradient(135deg,#ff8c42,#e63946)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:"bold"}}>M</div>
          <div><div style={{fontSize:14,fontWeight:"bold",letterSpacing:"0.05em",color:"#ff9f5a"}}>MANDARINA PRO</div><div style={{fontSize:8,color:"rgba(255,255,255,0.25)",letterSpacing:"0.12em"}}>AI FASHION STUDIO</div></div>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
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

                {/* API Key */}
                <div style={{background:"rgba(66,133,244,0.06)",border:"1px solid rgba(66,133,244,0.16)",borderRadius:10,padding:12}}>
                  <div style={{fontSize:10,color:"#7ab3ff",marginBottom:6}}>🔑 Gemini API Key</div>
                  <input value={geminiKey} onChange={e=>setGeminiKey(e.target.value)} placeholder="AIzaSy..." type="password" style={{width:"100%",padding:"7px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid rgba(66,133,244,0.18)",borderRadius:7,color:"#f5f0eb",fontSize:12,outline:"none",fontFamily:"inherit",boxSizing:"border-box"}}/>
                  <div style={{fontSize:9,color:"rgba(255,255,255,0.18)",marginTop:4}}>aistudio.google.com/apikey</div>
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
                      <label style={{fontSize:9,color:"rgba(255,255,255,0.28)",display:"block",marginBottom:3}}>NOMBRE DEL PRODUCTO</label>
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
            </div>

            <button onClick={()=>{setStep(1);runAll();}} disabled={!canStart||selectedPrompts.length===0}
              style={{marginTop:16,width:"100%",padding:"14px",background:canStart?"linear-gradient(135deg,#ff8c42,#e63946)":"rgba(255,255,255,0.06)",border:"none",borderRadius:11,color:canStart?"#fff":"rgba(255,255,255,0.22)",fontSize:13,fontWeight:"bold",cursor:canStart?"pointer":"not-allowed",fontFamily:"inherit",letterSpacing:"0.04em"}}>
              {!photoFront?"📸 Sube la foto delantera":!geminiKey?"🔑 Ingresa tu Gemini API Key":"🚀 Generar campaña → 5 variantes ultra-realistas"}
            </button>
          </div>
        )}

        {/* ══ STEP 1 ══ */}
        {step === 1 && (
          <div style={{animation:"fadeIn 0.4s ease",textAlign:"center",paddingTop:20}}>
            <div style={{fontSize:10,color:"rgba(255,255,255,0.3)",letterSpacing:"0.1em",marginBottom:12}}>GENERANDO TU CAMPAÑA</div>
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

                {selImg?.dataUrl&&(
                  <div style={{borderRadius:11,overflow:"hidden",marginBottom:9,position:"relative"}}>
                    <img src={selImg.dataUrl} style={{width:"100%",maxHeight:260,objectFit:"cover",display:"block"}}/>
                    <div style={{position:"absolute",bottom:8,right:8,display:"flex",gap:5}}>
                      <button onClick={()=>dl(selImg,selectedV)} style={{background:"rgba(0,0,0,0.7)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:7,color:"#fff",fontSize:9,cursor:"pointer",padding:"5px 9px",fontFamily:"inherit"}}>⬇ Descargar</button>
                      <button onClick={()=>setExpandedEditor(expandedEditor===selectedV?null:selectedV)} style={{background:expandedEditor===selectedV?"rgba(255,140,66,0.25)":"rgba(0,0,0,0.7)",border:"1px solid rgba(255,140,66,0.35)",borderRadius:7,color:"#ff9f5a",fontSize:9,cursor:"pointer",padding:"5px 9px",fontFamily:"inherit"}}>✏️ Editar foto</button>
                    </div>
                  </div>
                )}

                {expandedEditor===selectedV&&selImg?.dataUrl&&(
                  <ImageEditorChat variant={selImg} variantIndex={selectedV} frontPhoto={photoFront} backPhoto={photoBack} modelPhoto={photoModel} geminiKey={geminiKey} onUpdate={updateVariant} onTokens={addToken}/>
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
                {!loadingSEO&&(<>
                  <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(100,200,100,0.14)",borderRadius:12,padding:14,marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}><span style={{fontSize:16}}>🛍️</span><span style={{fontSize:12,fontWeight:"bold",color:"#7ec97e"}}>Shopify SEO</span></div>
                    <EF label="TÍTULO SEO" hint="max 60" value={seo?.title} onChange={v=>setSeo(s=>({...s,title:v}))} color="#7ec97e"/>
                    <EF label="META DESCRIPCIÓN" hint="150 chars" value={seo?.metaDescription} onChange={v=>setSeo(s=>({...s,metaDescription:v}))} multi color="#7ec97e"/>
                    <EF label="H1" value={seo?.h1} onChange={v=>setSeo(s=>({...s,h1:v}))} color="#7ec97e"/>
                    <EF label="DESCRIPCIÓN (PAS)" value={seo?.bodyText} onChange={v=>setSeo(s=>({...s,bodyText:v}))} multi color="#7ec97e"/>
                    <EF label="GOOGLE ADS" hint="max 30" value={seo?.googleAdsHeadline} onChange={v=>setSeo(s=>({...s,googleAdsHeadline:v}))} color="#7ec97e"/>
                    <EF label="GOOGLE ADS CTA" value={seo?.googleAdsCTA} onChange={v=>setSeo(s=>({...s,googleAdsCTA:v}))} color="#7ec97e"/>
                    <div><div style={{fontSize:9,color:"rgba(255,255,255,0.28)",marginBottom:4}}>TAGS</div><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{(seo?.tags||[]).map((t,i)=><span key={i} style={{background:"rgba(126,201,126,0.08)",border:"1px solid rgba(126,201,126,0.18)",borderRadius:20,padding:"2px 7px",fontSize:9,color:"#7ec97e"}}>{t}</span>)}</div></div>
                  </div>
                  <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(200,100,200,0.14)",borderRadius:12,padding:14}}>
                    <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}><span style={{fontSize:16}}>📸</span><span style={{fontSize:12,fontWeight:"bold",color:"#c97ec9"}}>Instagram</span></div>
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
                <button onClick={()=>{setPubStatus(s=>({...s,shopify:"loading"}));setTimeout(()=>setPubStatus(s=>({...s,shopify:"done"})),2200);}} disabled={pubStatus.shopify==="done"}
                  style={{width:"100%",padding:"12px",background:pubStatus.shopify==="done"?"rgba(126,201,126,0.18)":"linear-gradient(135deg,#2d7d2d,#1a5c1a)",border:"1px solid rgba(126,201,126,0.28)",borderRadius:9,color:"#fff",fontSize:12,fontWeight:"bold",cursor:pubStatus.shopify==="done"?"default":"pointer",fontFamily:"inherit"}}>
                  {pubStatus.shopify==="loading"?"⏳ Publicando...":pubStatus.shopify==="done"?"✅ Publicado en Shopify":"🚀 Publicar en Shopify"}
                </button>
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
