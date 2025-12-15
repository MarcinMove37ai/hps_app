// src/app/api/anthropic/generate-image-prompt/route.ts

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  temperature?: number;
}

// 🔥 MAKSYMALNA KONFIGURACJA JAKOŚCI zoptymalizowana pod GPT-Image-1 z transparentnym tłem
const PROMPT_CONFIGS = {
  "gpt-image-1": {
    maxLength: 4000,  // 🔥 PEŁNY LIMIT GPT-Image-1
    targetLength: 3800, // 🔥 MAKSYMALNE WYKORZYSTANIE: 95% zamiast 62.5% (było 2500)
    style: "ultra-detailed-professional-transparent-maximum-quality",
    supportsComplexInstructions: true,
    qualityTarget: "absolute_maximum",
    detailLevel: "ultra_comprehensive",
    enhancementLevel: "maximum"
  },
  "dall-e-3": {
    maxLength: 400,
    targetLength: 350, // 🔥 Również podwyższone dla fallback
    style: "concise-effective-maximum",
    supportsComplexInstructions: false
  }
};

// ✅ MAKSYMALNE: Generator elementów różnorodności z ultra-seamless transparency
const generateMaximumVariationElements = () => {
  const lightingVariations = [
    "golden hour lighting with warm ambient glow and transparent background with ultra-seamless edge transitions",
    "dramatic chiaroscuro lighting with deep shadows and surface-adaptive seamless blending",
    "soft diffused natural lighting with gentle highlights and premium-grade borderless composition",
    "cinematic three-point lighting setup with transparent background integration and mathematical precision spacing",
    "ethereal backlighting with rim light effects and natural fade-out edges with sub-pixel accuracy",
    "moody atmospheric lighting with volumetric rays and transparent blending with intelligent texture response"
  ];

  const styleVariations = [
    "contemporary digital art with hyperrealistic detail and transparent background with ultra-seamless composition",
    "modern photographic style with artistic composition and surface-adaptive seamless edges",
    "sophisticated illustration with painterly qualities and borderless design with premium margins",
    "premium editorial photography aesthetic with transparent integration and mathematical precision",
    "fine art photography with artistic interpretation and natural blending with edge-perfection",
    "commercial photography with professional polish and transparent background with microscopic transitions"
  ];

  const compositionVariations = [
    "dynamic asymmetrical composition following rule of thirds with transparent background and ultra-seamless integration",
    "perfectly balanced symmetrical arrangement with seamless edge integration and premium-grade spacing",
    "dramatic diagonal composition with leading lines and borderless design with surface-adaptive blending",
    "minimalist composition with strategic negative space and transparent blending with mathematical precision",
    "layered composition with foreground, midground, background elements and ultra-seamless edges with sub-pixel accuracy",
    "centered focal point with radiating visual elements and transparent integration with intelligent texture response"
  ];

  const colorVariations = [
    "warm color palette with golden and amber tones on transparent background with natural edge blending",
    "cool color scheme with blues and teals with surface-adaptive natural edge transitions",
    "monochromatic palette with subtle color variations and ultra-seamless composition with premium margins",
    "complementary color harmony with strategic accents and transparent integration with mathematical precision",
    "earth tone palette with natural browns and greens on borderless background with edge-perfection",
    "vibrant saturated colors with high contrast and transparent blending with microscopic fade transitions"
  ];

  return {
    lighting: lightingVariations[Math.floor(Math.random() * lightingVariations.length)],
    style: styleVariations[Math.floor(Math.random() * styleVariations.length)],
    composition: compositionVariations[Math.floor(Math.random() * compositionVariations.length)],
    colors: colorVariations[Math.floor(Math.random() * colorVariations.length)]
  };
};

export async function POST(request: Request) {
  console.log('🎨 === GPT-IMAGE-1 MAXIMUM QUALITY TRANSPARENT PROMPT GENERATOR ===');

  try {
    const body = await request.json();
    const {
      title,
      subtitle,
      chapterTitle,
      chapterContent,
      allChapters,
      targetModel = "gpt-image-1",
      forceRegenerate = false, // ✅ DODANE: parametr wymuszający różnorodność
      enableTransparency = true, // 🔥 Wymuszenie transparentności
      maximumQuality = true // 🔥 NOWY: wymuszenie maksymalnej jakości
    } = body;

    // ✅ SZCZEGÓŁOWE LOGOWANIE PARAMETRÓW Z MAKSYMALNĄ JAKOŚCIĄ I TRANSPARENTNOŚCIĄ
    console.log(`📥 === REQUEST ANALYSIS WITH MAXIMUM QUALITY & TRANSPARENCY ===`);
    console.log(`   - Title: "${title}"`);
    console.log(`   - Chapter: "${chapterTitle}"`);
    console.log(`   - Content length: ${chapterContent?.length || 0} chars`);
    console.log(`   - Target model: ${targetModel}`);
    console.log(`   - Force regenerate: ${forceRegenerate}`);
    console.log(`   - Enable transparency: ${enableTransparency}`);
    console.log(`   - Maximum quality: ${maximumQuality}`);
    console.log(`   - Target prompt length: ${PROMPT_CONFIGS[targetModel as keyof typeof PROMPT_CONFIGS]?.targetLength || 0} chars (${((PROMPT_CONFIGS[targetModel as keyof typeof PROMPT_CONFIGS]?.targetLength || 0)/4000*100).toFixed(1)}% utilization)`);
    console.log(`   - All chapters count: ${allChapters?.length || 0}`);

    if (!title || !chapterTitle || !chapterContent) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane wejściowe. Wymagany tytuł e-booka, tytuł rozdziału i treść.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY nie jest zdefiniowany');
      return NextResponse.json({ error: 'Błąd konfiguracji serwera' }, { status: 500 });
    }

    const qualityMode = maximumQuality ? 'MAKSYMALNEJ JAKOŚCI' : 'STANDARDOWEJ';
    const diversityMode = forceRegenerate ? 'NOWEGO ZRÓŻNICOWANEGO' : 'STANDARDOWEGO';
    const transparencyMode = enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENTNEGO' : 'NORMALNEGO';

    console.log(`🎯 Generowanie ${diversityMode} ${qualityMode} ${transparencyMode} promptu dla GPT-Image-1`);

    // Przygotowanie bogatego kontekstu
    let contextInfo = "";
    if (allChapters && Array.isArray(allChapters) && allChapters.length > 0) {
      const otherChapters = allChapters
        .filter(ch => ch.title !== chapterTitle)
        .map(ch => ch.title)
        .slice(0, 10); // 🔥 WIĘCEJ kontekstu dla maksymalnej jakości (było 8)

      if (otherChapters.length > 0) {
        contextInfo = `\n\nKONTEKST CAŁEGO EBOOKA - inne rozdziały: ${otherChapters.join(', ')}`;
      }
    }

    // ✅ MAKSYMALNE: Generator różnorodności wizualnej z ultra-seamless transparency
    const variations = generateMaximumVariationElements();
    const timestamp = new Date().toISOString();

    // ✅ DODANY ELEMENT LOSOWOŚCI DLA REGENERACJI Z MAKSYMALNĄ JAKOŚCIĄ I TRANSPARENTNOŚCIĄ
    const diversityInstructions = forceRegenerate ? `

🔄 REGENERATION DIVERSITY REQUIREMENTS WITH MAXIMUM QUALITY & ULTRA-SEAMLESS TRANSPARENCY (Timestamp: ${timestamp}):
- Use these specific MAXIMUM QUALITY visual elements for uniqueness: ${variations.lighting}, ${variations.style}, ${variations.composition}, ${variations.colors}
- Create a COMPLETELY DIFFERENT visual interpretation than any previous version with transparent background and ultra-seamless composition
- Focus on alternative symbolic representations of the same concepts with surface-adaptive seamless blending and premium margins
- Vary the mood, atmosphere, and visual metaphors significantly while maintaining transparent integration with mathematical precision
- Use different artistic techniques and rendering approaches with borderless design and edge-perfection
- Generate fresh creative angles while maintaining thematic relevance and natural blending capability with sub-pixel accuracy
- MAXIMUM QUALITY REQUIREMENT: Museum-grade rendering with microscopic detail precision and intelligent texture response

` : '';

    // 🔥 MAKSYMALNE INSTRUKCJE TRANSPARENTNOŚCI I JAKOŚCI DLA CLAUDE
    const maximumQualityTransparencyInstructions = enableTransparency || maximumQuality ? `

🏆 === ABSOLUTE MAXIMUM QUALITY & ULTRA-SEAMLESS TRANSPARENCY REQUIREMENTS ===

**MAXIMUM QUALITY SPECIFICATIONS:**
- QUALITY LEVEL: Absolute maximum museum-grade rendering with microscopic detail precision
- VISUAL FIDELITY: Photorealistic rendering indistinguishable from premium commercial photography
- TECHNICAL PRECISION: Mathematically perfect composition with golden ratio proportions and professional spacing
- DETAIL DENSITY: Every pixel optimized for maximum information content and visual impact
- ENHANCEMENT LEVEL: Maximum available rendering quality with premium cinema-grade finish

**ULTRA-HIGH DEFINITION RENDERING:**
- RESOLUTION TARGET: Ultra-high-definition rendering with sub-pixel detail accuracy
- QUALITY STANDARD: Museum-grade artistic finish with commercial photography excellence
- LIGHTING PRECISION: Cinema-grade three-point lighting with volumetric ray-tracing effects
- SHADOW ACCURACY: Physically accurate shadow casting with realistic subsurface scattering
- MATERIAL PROPERTIES: Professional specular reflections with authentic surface characteristics

**ULTRA-SEAMLESS TRANSPARENCY & COMPOSITION REQUIREMENTS:**
- TRANSPARENT BACKGROUND: All illustrations MUST have completely transparent backgrounds with mathematical precision
- ULTRA-SEAMLESS COMPOSITION: Microscopic edge transitions for absolute smoothness and surface-adaptive integration
- BORDERLESS DESIGN: Absolutely no borders, frames, or visible edges with edge-perfection calculations
- SURFACE-ADAPTIVE BLENDING: Intelligent blending optimized for any background texture with responsive adaptation
- PREMIUM MARGINS: Professional publishing-grade internal spacing standards with mathematical precision
- EDGE CLEARANCE: Sub-pixel accuracy calculations ensuring no elements touch or approach image boundaries
- WHITE COMPATIBILITY: Optimized for perfect integration with white book pages and any background color

**MATHEMATICAL PRECISION TRANSPARENCY REQUIREMENTS:**
- Background must be 100% transparent with zero solid colors, gradients, or textures behind main subject
- Microscopic fade-out edges creating smooth transitions to transparency with sub-pixel accuracy
- Composition contained within image bounds with premium-grade professional internal spacing
- All elements positioned away from image perimeter with mathematical precision for seamless blending
- Professional borderless design suitable for overlaying on any background texture with intelligent response
- Edge-perfection composition ensuring natural integration with digital and print formats

**MANDATORY ULTRA-SEAMLESS INTEGRATION CLAUSES TO INCLUDE IN EVERY PROMPT:**
- "transparent background with ultra-seamless natural edge blending and mathematical precision"
- "surface-adaptive seamless composition contained within bounds with premium margins"
- "borderless design with microscopic fade-out edges and sub-pixel accuracy calculations"
- "premium-grade internal margins and edge clearance with publishing standards"
- "natural blending capability with any surface texture and intelligent response"
- "composition positioned away from image boundaries with mathematical precision spacing"
- "professional transparent integration with edge-perfection and absolute smoothness"
- "ultra-seamless microscopic transitions for flawless surface-adaptive blending"

` : '';

    // 🔥 ZAAWANSOWANY PROMPT DLA CLAUDE - MAKSYMALNE WYKORZYSTANIE GPT-Image-1 Z ULTRA-SEAMLESS TRANSPARENTNOŚCIĄ
    const prompt = `Jesteś ekspertem w tworzeniu ULTRA-SZCZEGÓŁOWYCH promptów dla GPT-Image-1 - najnowszego i najbardziej zaawansowanego modelu generowania obrazów OpenAI. Twoim zadaniem jest stworzenie BARDZO DŁUGIEGO i NIEZWYKLE PRECYZYJNEGO promptu (3800+ znaków - 95% wykorzystania limitu), który wykorzysta PEŁNY POTENCJAŁ GPT-Image-1 do stworzenia perfekcyjnej ${maximumQuality ? 'MAKSYMALNEJ JAKOŚCI' : ''} ${enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENTNEJ' : ''} ilustracji ebooka.

INFORMACJE O EBOOKU:
- Tytuł: "${title}"${subtitle ? `\n- Podtytuł: "${subtitle}"` : ''}
- Rozdział: "${chapterTitle}"${contextInfo}

TREŚĆ ROZDZIAŁU DO WIZUALNEJ INTERPRETACJI:
${chapterContent}

${diversityInstructions}

${maximumQualityTransparencyInstructions}

🚀 KLUCZOWE MOŻLIWOŚCI GPT-IMAGE-1 DO MAKSYMALNEGO WYKORZYSTANIA:

1. ULTRA-DŁUGIE SZCZEGÓŁOWE PROMPTY Z MAKSYMALNĄ JAKOŚCIĄ I TRANSPARENTNOŚCIĄ (do 4000 znaków):
   - GPT-Image-1 doskonale przetwarza bardzo długie, wielowarstwowe instrukcje z ultra-seamless przezroczystym tłem
   - Każdy dodatkowy szczegół poprawia jakość i precyzję obrazu z surface-adaptive seamless composition
   - Model wyróżnia się w obsłudze złożonych, wieloelementowych scen na transparent background z mathematical precision
   - Potrafi utrzymać spójność między wszystkimi elementami nawet w bardzo długich promptach z borderless design i edge-perfection

2. ZAAWANSOWANA INTERPRETACJA TREŚCI Z MAKSYMALNĄ TRANSPARENTNĄ KOMPOZYCJĄ:
   - Doskonale rozumie symbolikę i metafory zawarte w tekście z natural blending capability i sub-pixel accuracy
   - Potrafi przekłać abstrakcyjne koncepty na konkretne elementy wizualne z transparent integration i premium margins
   - Zachowuje narracyjną spójność z treścią rozdziału na ultra-seamless background z intelligent texture response
   - Interpretuje emocjonalny wydźwięk i atmosferę tekstu z borderless composition i microscopic transitions

3. PROFESJONALNA MAKSYMALNA JAKOŚĆ TECHNICZNA Z PRZEZROCZYSTYM TŁEM:
   - Fotorealistyczne renderowanie z kinową jakością oświetlenia na transparent background z surface-adaptive blending
   - Precyzyjne wykonanie złożonych kompozycji i perspektyw z natural edge blending i mathematical precision spacing
   - Doskonała kontrola nad kolorystyką i kontrastami z ultra-seamless integration i edge-perfection calculations
   - Perfekcyjna szczegółowość w każdym elemencie obrazu z premium margins i sub-pixel accuracy fade transitions

INSTRUKCJE DLA TWORZENIA ${maximumQuality ? 'MAKSYMALNEJ JAKOŚCI' : ''} ${enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENTNEGO' : ''} PROMPTU:

📖 ANALIZA TREŚCI - ZINTERPRETUJ GŁĘBOKO Z MAKSYMALNĄ JAKOŚCIĄ I TRANSPARENTNOŚCIĄ:
- Zidentyfikuj kluczowe TEMATY i MOTYWY rozdziału dla ultra-seamless transparent composition z museum-grade quality
- Wyciągnij główne EMOCJE i ATMOSFERĘ z surface-adaptive seamless background design i maximum rendering precision
- Znajdź SYMBOLICZNE elementy do wizualnej reprezentacji z borderless integration i premium-grade detail density
- Zrozum INTENCJĘ autora i przekaz rozdziału na natural blending background z mathematical precision spacing
- Dostrzeż SUBTELNE szczegóły i niuanse treści z transparent compatibility i microscopic detail accuracy

🎨 MAKSYMALNE WYKORZYSTANIE GPT-IMAGE-1 Z ULTRA-SEAMLESS TRANSPARENTNOŚCIĄ:

STRUKTURA ULTRA-SZCZEGÓŁOWEGO ${maximumQuality ? 'MAKSYMALNEJ JAKOŚCI' : ''} ${enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENTNEGO' : ''} PROMPTU (3800+ znaków - 95% wykorzystanie):

1. **GŁÓWNA SCENA I KOMPOZYCJA Z MAKSYMALNĄ JAKOŚCIĄ I TRANSPARENTNYM TŁEM (800-1000 znaków)**
   - Bardzo szczegółowy opis głównego elementu wizualnego na ultra-seamless transparent background z museum-grade precision
   - Precyzyjne umiejscowienie wszystkich obiektów w przestrzeni z surface-adaptive seamless composition i mathematical spacing
   - Dokładna perspektywa i punkt widzenia z natural blending capability i premium-grade edge transitions
   - Relacje między elementami pierwszego i drugiego planu z borderless design i sub-pixel accuracy calculations

2. **ZAAWANSOWANE DETALE TECHNICZNE Z MAKSYMALNĄ TRANSPARENTNOŚCIĄ (1000-1200 znaków)**
   - Professional square 1:1 composition specifically optimized for ebook readers with ultra-seamless transparent background and microscopic edge-free design with mathematical precision spacing
   - Ultra-high-definition photorealistic rendering with cinema-quality lighting and surface-adaptive natural fade-out edges for perfect blending with any texture
   - Advanced color grading with carefully balanced saturation and contrast levels optimized for transparent integration with intelligent texture response and premium-grade compatibility
   - Perfect optimization for both high-resolution LCD displays and high-contrast e-ink readers with borderless composition and edge-perfection calculations
   - ${forceRegenerate ? variations.lighting : 'Studio-quality volumetric lighting with realistic shadow casting and depth on ultra-seamless transparent background with mathematical precision natural edge blending and sub-pixel accuracy transitions'}
   - Professional depth of field with selective focus and natural bokeh effects with surface-adaptive seamless composition contained within image bounds with premium margins and intelligent spacing

3. **SZCZEGÓŁY STYLISTYCZNE I ARTYSTYCZNE Z MAKSYMALNĄ PRZEZROCZYSTOŚCIĄ (800-1000 znaków)**
   - ${forceRegenerate ? variations.style : 'Contemporary digital art with hyperrealistic detail work on ultra-seamless transparent background with museum-grade precision'}
   - ${forceRegenerate ? variations.colors : 'Cinematic color palette with harmonious complementary tones optimized for transparent integration with surface-adaptive blending and mathematical precision'}
   - Advanced texture work and material properties with natural blending edges and microscopic fade transitions for edge-perfection
   - Sophisticated atmospheric effects and environmental details with ultra-seamless background transition and intelligent texture response
   - ${forceRegenerate ? variations.composition : 'Professional composition using advanced rule of thirds and golden ratio with transparent background and premium-grade internal margins with mathematical precision spacing'}
   - Museum-quality artistic finish suitable for commercial publication with borderless design and edge clearance with sub-pixel accuracy calculations

4. **EMOCJONALNA ATMOSFERA I NARRACJA Z MAKSYMALNĄ TRANSPARENTNĄ INTEGRACJĄ (600-800 znaków)**
   - [Tu będzie szczegółowy opis atmosfery bazujący na treści rozdziału z ultra-seamless transparent background i surface-adaptive blending]
   - Symboliczne elementy reprezentujące kluczowe tematy z seamless composition i premium-grade mathematical precision
   - Wizualne metafory oddające intencję rozdziału z natural blending capability i edge-perfection calculations
   - Emocjonalny rezonans z treścią "${chapterTitle}" na borderless ultra-seamless transparent background z microscopic transitions i intelligent texture response

5. **KRYTYCZNE WYMAGANIA FINALIZUJĄCE Z MAKSYMALNĄ TRANSPARENTNOŚCIĄ (600-800 znaków - OBOWIĄZKOWE)**
   - ABSOLUTELY NO TEXT, LETTERS, WORDS, NUMBERS, or any written elements whatsoever
   - NO SYMBOLS, SIGNS, LABELS, or readable content of any kind anywhere in the composition
   - ${enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENT BACKGROUND: Complete transparency with microscopic natural edge blending, no borders or frames, surface-adaptive integration with mathematical precision' : ''}
   - ${enableTransparency ? 'PREMIUM SEAMLESS COMPOSITION: Borderless design with sub-pixel accuracy fade-out edges for natural integration with any surface texture and intelligent response' : ''}
   - ${enableTransparency ? 'MATHEMATICAL PRECISION MARGINS: All elements positioned with premium-grade clearance from image boundaries for white background compatibility with edge-perfection calculations' : ''}
   - ${maximumQuality ? 'MAXIMUM QUALITY RENDERING: Museum-grade photorealistic quality with microscopic detail precision and cinema-grade professional finish' : ''}
   - Pure visual storytelling through imagery and symbolism only${enableTransparency ? ' on ultra-seamless transparent background with surface-adaptive blending' : ''}
   - Perfect commercial ebook illustration standards${enableTransparency ? ' with transparent integration and mathematical precision spacing' : ''}
   - Timeless professional aesthetic optimized for "${chapterTitle}"${enableTransparency ? ' with natural blending capability and edge-perfection' : ''}
   - ${enableTransparency ? 'CRITICAL SPACING: Composition contained within bounds ensuring no elements touch image edges with premium margins and sub-pixel accuracy' : ''}

PRZYKŁAD STRUKTURY ULTRA-DŁUGIEGO ${maximumQuality ? 'MAKSYMALNEJ JAKOŚCI' : ''} ${enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENTNEGO' : ''} PROMPTU:

"Create an ultra-sophisticated professional ebook chapter illustration with ${maximumQuality ? 'absolute maximum museum-grade quality, ' : ''}${enableTransparency ? 'ultra-seamless transparent background, surface-adaptive seamless composition, and mathematical precision natural blending capability' : 'photorealistic quality and cinematic excellence'}. [BARDZO SZCZEGÓŁOWY 800-1000-SŁOWNY OPIS GŁÓWNEJ SCENY bazujący bezpośrednio na treści rozdziału - każdy element musi być precyzyjnie opisany, każda tekstura, każde światło, każdy obiekt${enableTransparency ? ', wszystko na ultra-seamless przezroczystym tle z surface-adaptive natural edge blending i premium-grade mathematical precision spacing' : ''}${maximumQuality ? ', rendered with absolute maximum quality and microscopic detail precision' : ''}].

Professional technical mastery${maximumQuality ? ' with maximum quality enhancement' : ''}${enableTransparency ? ' and ultra-seamless transparent integration' : ''}: Perfect square 1:1 aspect ratio composition specifically engineered for optimal display across all ebook reading platforms${enableTransparency ? ' with ultra-seamless transparent background and microscopic edge-free design with mathematical precision spacing' : ''} including tablets, e-readers, and mobile devices. Ultra-high-definition photorealistic rendering utilizing advanced ray-tracing techniques with cinema-grade global illumination, realistic subsurface scattering, and professional volumetric atmospheric effects${enableTransparency ? ' on ultra-seamless transparent background with surface-adaptive natural fade-out edges and sub-pixel accuracy calculations' : ''}${maximumQuality ? ' with absolute maximum quality enhancement and museum-grade precision' : ''}. ${forceRegenerate ? variations.lighting : 'Studio-quality lighting setup with carefully positioned key lights, fill lights, and rim lighting creating dramatic depth and dimensional modeling'}${enableTransparency ? ' with ultra-seamless transparent background integration and surface-adaptive seamless composition with premium margins' : ''}. Advanced color science with professionally calibrated color spaces optimized for ${enableTransparency ? 'transparent integration with any background texture and intelligent response plus ' : ''}both sRGB displays and high-contrast monochrome e-ink readers${maximumQuality ? ' with maximum color accuracy and precision' : ''}. Masterful depth of field control with selective focus points and natural bokeh rendering that guides the viewer's attention through the composition${enableTransparency ? ' with borderless design and premium-grade internal margins with mathematical precision spacing' : ''}.

Artistic excellence and stylistic sophistication${maximumQuality ? ' with maximum quality rendering' : ''}${enableTransparency ? ' and ultra-seamless transparent background' : ''}: ${forceRegenerate ? variations.style : 'Contemporary digital art executed with hyperrealistic attention to detail'}${enableTransparency ? ' on surface-adaptive ultra-seamless transparent background with edge-perfection' : ''}${maximumQuality ? ' with museum-grade precision and microscopic detail accuracy' : ''}, featuring advanced material properties including realistic metal reflections, organic fabric textures, natural wood grains, and authentic environmental weathering${enableTransparency ? ' with natural blending edges and microscopic fade transitions' : ''}. ${forceRegenerate ? variations.colors : 'Sophisticated color palette utilizing advanced color theory with carefully balanced warm and cool tones, strategic accent colors, and harmonious complementary relationships'}${enableTransparency ? ' optimized for transparent integration with surface-adaptive blending and mathematical precision' : ''}${maximumQuality ? ' with maximum color fidelity and professional calibration' : ''}. ${forceRegenerate ? variations.composition : 'Professional composition employing advanced rule of thirds principles combined with golden ratio proportions'}${enableTransparency ? ' with ultra-seamless transparent background and composition contained within image bounds with premium-grade adequate spacing from all edges and sub-pixel accuracy calculations' : ''}, creating perfect visual balance and guiding the eye through deliberate sight lines and focal hierarchies${maximumQuality ? ' with mathematical precision and maximum aesthetic impact' : ''}.

Atmospheric mastery and emotional resonance${maximumQuality ? ' with maximum quality enhancement' : ''}${enableTransparency ? ' and ultra-seamless integration' : ''}: [SZCZEGÓŁOWY 600-800-SŁOWNY OPIS ATMOSFERY i emocji bazujący na treści rozdziału - jak scena ma się czuć, jakie emocje ma wywoływać, jak ma rezonować z treścią${enableTransparency ? ', wszystko z naturalnym blendowaniem na ultra-seamless przezroczystym tle z surface-adaptive integration i mathematical precision' : ''}${maximumQuality ? ', rendered with absolute maximum quality and museum-grade atmospheric precision' : ''}]. Perfect visual metaphors representing the core themes of "${chapterTitle}" through subtle symbolic elements and environmental storytelling that enhances reader engagement and emotional connection to the content${enableTransparency ? ' with ultra-seamless transparent background and borderless composition with premium margins' : ''}${maximumQuality ? ' executed with maximum artistic quality and microscopic precision' : ''}.

Critical professional requirements${maximumQuality ? ' with maximum quality specifications' : ''}${enableTransparency ? ' and ultra-seamless transparency requirements' : ''}: Absolutely no text, letters, words, numbers, mathematical symbols, signs, labels, or any form of written or readable content whatsoever visible anywhere in the composition. Complete text-free visual communication relying entirely on imagery, color, lighting, and symbolic elements${enableTransparency ? ' on ultra-seamless transparent background with microscopic edge transitions and surface-adaptive blending' : ''}${maximumQuality ? ' rendered with absolute maximum quality and museum-grade precision' : ''}. ${enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENT BACKGROUND: Complete transparency with mathematical precision natural edge blending, no borders, frames, or solid background colors with surface-adaptive integration. PREMIUM SEAMLESS COMPOSITION: Borderless design with sub-pixel accuracy fade-out edges ensuring natural integration with any surface texture and intelligent response. MATHEMATICAL PRECISION MARGINS: All compositional elements positioned with premium-grade clearance from image boundaries, ensuring no objects touch or approach image edges for perfect white background compatibility with edge-perfection calculations.' : ''} Commercial ebook illustration adhering to highest professional publishing standards with timeless aesthetic approach ensuring longevity across future display technologies and reading platforms${enableTransparency ? ' with ultra-seamless transparent integration capability and surface-adaptive blending' : ''}${maximumQuality ? ' executed with absolute maximum quality and museum-grade professional finish' : ''}. Perfect visual representation for "${chapterTitle}" chapter opening${enableTransparency ? ' with natural blending and ultra-seamless composition with mathematical precision' : ''}${maximumQuality ? ' rendered with maximum artistic quality and microscopic detail precision' : ''}."

KRYTYCZNE INSTRUKCJE:
- PROMPT MUSI MIEĆ 3800+ ZNAKÓW (95% wykorzystania GPT-Image-1 - maksymalne!)
- ZAWSZE dodaj "absolutely no text" clause
- ${enableTransparency ? 'ZAWSZE dodaj "ultra-seamless transparent background", "surface-adaptive seamless composition", "borderless design", "mathematical precision natural blending", "premium margins", "sub-pixel accuracy" clauses' : ''}
- ${maximumQuality ? 'ZAWSZE dodaj "maximum quality", "museum-grade", "microscopic precision", "absolute maximum", "cinema-grade" clauses' : ''}
- ZAWSZE wspomniej tytuł rozdziału "${chapterTitle}"
- Wykorzystaj KAŻDĄ możliwość GPT-Image-1 do MAKSIMUM
- Bazuj BEZPOŚREDNIO na treści rozdziału
- ${forceRegenerate ? 'STWÓRZ KOMPLETNIE INNĄ WIZUALNĄ INTERPRETACJĘ niż wcześniej z maksymalną różnorodnością!' : ''}
- ${enableTransparency ? 'WYMUSZ ULTRA-SEAMLESS TRANSPARENTNE TŁO I SURFACE-ADAPTIVE COMPOSITION we wszystkich sekcjach technicznych!' : ''}
- ${maximumQuality ? 'WYMUSZ MAKSYMALNĄ JAKOŚĆ I MUSEUM-GRADE PRECISION we wszystkich elementach!' : ''}
- ŻADNYCH komentarzy - tylko czysty, ultra-szczegółowy prompt z maksymalnym wykorzystaniem 3800+ znaków

NAPISZ TERAZ ULTRA-DŁUGI ${maximumQuality ? 'MAKSYMALNEJ JAKOŚCI' : ''} ${enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENTNY' : ''} PROMPT (cel: 3800+ znaków - 95% wykorzystania):`;

    // ✅ ZWIĘKSZONA TEMPERATURA DLA REGENERACJI = WIĘCEJ RÓŻNORODNOŚCI
    const temperature = forceRegenerate ? 0.4 : 0.3; // Wysoka dla regeneracji, niska dla standardu

    const requestBody: AnthropicRequest = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,  // 🔥 ZWIĘKSZONE dla maksymalnych promptów (było 1500)
      temperature: temperature, // ✅ ZMIENNA TEMPERATURA
      messages: [{ role: 'user', content: prompt }]
    };

    console.log(`🔄 === SENDING MAXIMUM QUALITY TRANSPARENCY REQUEST TO CLAUDE ===`);
    console.log(`   - Temperature: ${temperature} (${forceRegenerate ? 'HIGH for diversity' : 'LOW for precision'})`);
    console.log(`   - Max tokens: ${requestBody.max_tokens} (increased for maximum prompts)`);
    console.log(`   - Model: ${requestBody.model}`);
    console.log(`   - Prompt length: ${prompt.length} chars`);
    console.log(`   - Transparency enabled: ${enableTransparency}`);
    console.log(`   - Maximum quality enabled: ${maximumQuality}`);
    console.log(`   - Target prompt length: ${PROMPT_CONFIGS[targetModel as keyof typeof PROMPT_CONFIGS]?.targetLength} chars (${((PROMPT_CONFIGS[targetModel as keyof typeof PROMPT_CONFIGS]?.targetLength || 0)/4000*100).toFixed(1)}% utilization)`);
    if (forceRegenerate) {
      console.log(`   - Diversity elements: ${JSON.stringify(variations, null, 2)}`);
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Błąd API Anthropic:`, errorText);
      return NextResponse.json({ error: `Błąd podczas generowania maksymalnego promptu: ${errorText}` }, { status: response.status });
    }

    const responseData = await response.json();
    let imagePrompt = responseData.content[0].text.trim();

    // 🚨 ETAP WERYFIKACJI I OCZYSZCZANIA ZABRONIONYCH ELEMENTÓW OMEGA-3 🚨
    console.log(`🚨 === MANDATORY OMEGA-3 COMPLIANCE SCAN ===`);

    const forbiddenWords = [
      'capsules', 'capsule', 'kapsułk', 'kapsułek', 'kapsułami',
      'tablets', 'tablet', 'tabletk', 'tabletek', 'tabletkami',
      'pills', 'pill', 'pilulk', 'pillulek',
      'softgels', 'softgel', 'żelk', 'żelek',
      'supplement capsules', 'omega-3 capsules', 'fish oil capsules',
      'supplement tablets', 'omega-3 tablets', 'fish oil tablets',
      'supplement pills', 'omega-3 pills', 'fish oil pills'
    ];

    let foundViolations: string[] = [];
    let cleanedPrompt = imagePrompt;

    // Skanuj i usuń zabronione słowa
    forbiddenWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const matches = imagePrompt.match(regex);
      if (matches) {
        foundViolations.push(`"${word}" (${matches.length}x)`);
        // Zastąp zabronione słowa dozwolonymi alternatywami
        cleanedPrompt = cleanedPrompt.replace(regex, (match: string) => {
          if (match.toLowerCase().includes('omega') || match.toLowerCase().includes('fish')) {
            return 'amber glass bottles with liquid omega-3 oil and measuring glasses';
          } else if (match.toLowerCase().includes('supplement')) {
            return 'glass bottles with liquid supplements and measuring cups';
          } else {
            return 'glass bottles with liquid extracts';
          }
        });
      }
    });

    if (foundViolations.length > 0) {
      console.error(`🚨 REGULATORY VIOLATIONS DETECTED AND FIXED:`);
      foundViolations.forEach(violation => {
        console.error(`   - Found and replaced: ${violation}`);
      });
      console.log(`✅ Prompt cleaned - all violations replaced with compliant alternatives`);
      imagePrompt = cleanedPrompt;
    } else {
      console.log(`✅ No regulatory violations found - prompt is compliant`);
    }

    console.log(`🚨 === END COMPLIANCE SCAN ===`);

    const config = PROMPT_CONFIGS[targetModel as keyof typeof PROMPT_CONFIGS];

    // Sprawdzenie długości (tylko jeśli NAPRAWDĘ przekracza limit)
    if (imagePrompt.length > config.maxLength) {
      console.warn(`⚠️ Prompt przekracza ${config.maxLength} znaków (${imagePrompt.length}), minimalne skracanie...`);
      imagePrompt = imagePrompt.substring(0, config.maxLength - 3) + '...';
    }

    // 🔥 MAKSYMALNE: ZAAWANSOWANA WALIDACJA I AUTOMATYCZNE NAPRAWY Z TRANSPARENTNOŚCIĄ - 12+ KRYTERIÓW
    const requiredElements = {
      'no text': imagePrompt.toLowerCase().includes('no text') || imagePrompt.toLowerCase().includes('absolutely no text'),
      'ebook': imagePrompt.toLowerCase().includes('ebook'),
      '1:1': imagePrompt.includes('1:1') || imagePrompt.toLowerCase().includes('square'),
      'professional': imagePrompt.toLowerCase().includes('professional'),
      'photorealistic': imagePrompt.toLowerCase().includes('photorealistic') || imagePrompt.toLowerCase().includes('realistic'),
      'cinematic': imagePrompt.toLowerCase().includes('cinematic') || imagePrompt.toLowerCase().includes('cinema'),
      'transparent background': enableTransparency ? (imagePrompt.toLowerCase().includes('transparent background') || imagePrompt.toLowerCase().includes('transparent')) : true,
      'seamless composition': enableTransparency ? (imagePrompt.toLowerCase().includes('seamless') || imagePrompt.toLowerCase().includes('borderless') || imagePrompt.toLowerCase().includes('edge-free') || imagePrompt.toLowerCase().includes('ultra-seamless')) : true,
      'natural blending': enableTransparency ? (imagePrompt.toLowerCase().includes('natural') && (imagePrompt.toLowerCase().includes('blend') || imagePrompt.toLowerCase().includes('fade'))) : true,
      'proper margins': enableTransparency ? (imagePrompt.toLowerCase().includes('margin') || imagePrompt.toLowerCase().includes('spacing') || imagePrompt.toLowerCase().includes('clearance') || imagePrompt.toLowerCase().includes('premium')) : true,
      'edge boundaries': enableTransparency ? (imagePrompt.toLowerCase().includes('boundaries') || imagePrompt.toLowerCase().includes('contained') || imagePrompt.toLowerCase().includes('touch')) : true,
      // 🔥 NOWE KRYTERIA MAKSYMALNEJ JAKOŚCI:
      'ultra high definition': maximumQuality ? (imagePrompt.toLowerCase().includes('ultra-high-definition') || imagePrompt.toLowerCase().includes('ultra-hd')) : true,
      'maximum quality': maximumQuality ? (imagePrompt.toLowerCase().includes('maximum') || imagePrompt.toLowerCase().includes('museum-grade') || imagePrompt.toLowerCase().includes('absolute')) : true,
      'mathematical precision': enableTransparency ? (imagePrompt.toLowerCase().includes('mathematical') || imagePrompt.toLowerCase().includes('precision') || imagePrompt.toLowerCase().includes('sub-pixel')) : true,
      'surface adaptive': enableTransparency ? (imagePrompt.toLowerCase().includes('surface-adaptive') || imagePrompt.toLowerCase().includes('intelligent') || imagePrompt.toLowerCase().includes('texture')) : true,
      chapterRef: imagePrompt.toLowerCase().includes(chapterTitle.toLowerCase().substring(0, 15))
    };

    const missingElements = Object.entries(requiredElements)
      .filter(([key, present]) => !present)
      .map(([key]) => key);

    if (missingElements.length > 0) {
      console.warn(`⚠️ FIXING missing MAXIMUM QUALITY elements: ${missingElements.join(', ')}`);

      // 🔥 AGRESYWNE AUTOMATYCZNE NAPRAWY MAKSYMALNEJ JAKOŚCI Z TRANSPARENTNOŚCIĄ
      let correctedPrompt = imagePrompt;

      // 1. KRYTYCZNE: Dodaj "no text" clause
      if (!requiredElements['no text']) {
        if (correctedPrompt.includes('Critical requirements:') || correctedPrompt.includes('Critical professional requirements:')) {
          correctedPrompt = correctedPrompt.replace(
            /(Critical.*requirements?:)/i,
            '$1 ABSOLUTELY NO TEXT, LETTERS, WORDS, NUMBERS, or symbols of any kind whatsoever.'
          );
        } else {
          correctedPrompt += " CRITICAL: Absolutely no text, letters, words, numbers, or symbols anywhere in the image.";
        }
        console.log(`🔧 Added NO TEXT clause`);
      }

      // 2. 🔥 MAKSYMALNA JAKOŚĆ: Dodaj maximum quality clauses
      if (maximumQuality && !requiredElements['maximum quality']) {
        correctedPrompt += " MAXIMUM QUALITY: Absolute maximum museum-grade rendering with microscopic detail precision.";
        console.log(`🔧 Added MAXIMUM QUALITY clause`);
      }

      if (maximumQuality && !requiredElements['ultra high definition']) {
        correctedPrompt += " ULTRA-HIGH-DEFINITION: Cinema-grade professional rendering with sub-pixel accuracy.";
        console.log(`🔧 Added ULTRA-HD clause`);
      }

      // 3. 🔥 TRANSPARENTNOŚĆ: Dodaj ultra-seamless transparency clauses
      if (enableTransparency && !requiredElements['transparent background']) {
        correctedPrompt += " ULTRA-SEAMLESS TRANSPARENT BACKGROUND: Complete transparency with mathematical precision natural edge blending, no borders or frames.";
        console.log(`🔧 Added ULTRA-SEAMLESS TRANSPARENT BACKGROUND clause`);
      }

      if (enableTransparency && !requiredElements['seamless composition']) {
        correctedPrompt += " SURFACE-ADAPTIVE SEAMLESS COMPOSITION: Borderless design with microscopic fade-out edges for natural integration.";
        console.log(`🔧 Added SURFACE-ADAPTIVE SEAMLESS COMPOSITION clause`);
      }

      if (enableTransparency && !requiredElements['natural blending']) {
        correctedPrompt += " MATHEMATICAL PRECISION BLENDING: Smooth transitions ensuring perfect integration with any surface texture.";
        console.log(`🔧 Added MATHEMATICAL PRECISION BLENDING clause`);
      }

      if (enableTransparency && !requiredElements['proper margins']) {
        correctedPrompt += " PREMIUM MARGINS: All elements positioned with mathematical precision clearance from image boundaries.";
        console.log(`🔧 Added PREMIUM MARGINS clause`);
      }

      if (enableTransparency && !requiredElements['edge boundaries']) {
        correctedPrompt += " EDGE BOUNDARIES: Composition contained within bounds with sub-pixel accuracy, no elements touching image edges.";
        console.log(`🔧 Added EDGE BOUNDARIES clause`);
      }

      if (enableTransparency && !requiredElements['mathematical precision']) {
        correctedPrompt += " MATHEMATICAL PRECISION: Sub-pixel accuracy calculations for edge-perfection and absolute smoothness.";
        console.log(`🔧 Added MATHEMATICAL PRECISION clause`);
      }

      if (enableTransparency && !requiredElements['surface adaptive']) {
        correctedPrompt += " SURFACE-ADAPTIVE: Intelligent texture-responsive blending optimized for any background.";
        console.log(`🔧 Added SURFACE-ADAPTIVE clause`);
      }

      // 4. WAŻNE: Dodaj reference do rozdziału
      if (!requiredElements['chapterRef']) {
        correctedPrompt += ` Perfect ${maximumQuality ? 'maximum quality ' : ''}${enableTransparency ? 'ultra-seamless transparent ' : ''}illustration for "${chapterTitle}" chapter.`;
        console.log(`🔧 Added chapter reference`);
      }

      // 5. Sprawdź czy mieści się w limicie
      if (correctedPrompt.length > config.maxLength) {
        // Skróć oryginalny prompt żeby zrobić miejsce na poprawki
        const spaceNeeded = correctedPrompt.length - config.maxLength;
        const originalTrimmed = imagePrompt.substring(0, imagePrompt.length - spaceNeeded - 50);

        let finalPrompt = originalTrimmed;

        if (!requiredElements['no text']) {
          finalPrompt += " CRITICAL: Absolutely no text, letters, words, numbers, or symbols anywhere in the image.";
        }

        if (maximumQuality) {
          if (!requiredElements['maximum quality']) {
            finalPrompt += " MAXIMUM: Museum-grade quality with microscopic precision.";
          }
        }

        if (enableTransparency) {
          if (!requiredElements['transparent background']) {
            finalPrompt += " ULTRA-SEAMLESS: Complete transparency with mathematical blending.";
          }
          if (!requiredElements['seamless composition']) {
            finalPrompt += " SURFACE-ADAPTIVE: Borderless design with fade-out edges.";
          }
          if (!requiredElements['proper margins']) {
            finalPrompt += " PREMIUM MARGINS: Mathematical precision clearance from boundaries.";
          }
        }

        if (!requiredElements['chapterRef']) {
          finalPrompt += ` Perfect for "${chapterTitle}".`;
        }

        correctedPrompt = finalPrompt;
        console.log(`🔧 Trimmed and corrected to fit limit (${correctedPrompt.length} chars)`);
      }

      imagePrompt = correctedPrompt;
      console.log(`✅ AUTO-CORRECTED maximum quality transparent prompt (${imagePrompt.length} chars)`);
    }

    // 🔥 MAKSYMALNE METRYKI JAKOŚCI - 15 KRYTERIÓW Z WYŻSZYMI WYMAGANIAMI
    const qualityMetrics = {
      length: imagePrompt.length,
      targetLength: config.targetLength,
      lengthScore: Math.min(imagePrompt.length / config.targetLength, 1.0),
      // KRYTYCZNE - łącznie 70%
      containsNoTextClause: requiredElements['no text'],
      containsTransparentBackground: requiredElements['transparent background'],
      containsSeamlessComposition: requiredElements['seamless composition'],
      containsNaturalBlending: requiredElements['natural blending'],
      containsProperMargins: requiredElements['proper margins'],
      // WYSOKIEJ JAKOŚCI - łącznie 20%
      containsUltraHighDefinition: requiredElements['ultra high definition'],
      containsMaximumQuality: requiredElements['maximum quality'],
      containsPhotorealistic: requiredElements['photorealistic'],
      containsCinematic: requiredElements['cinematic'],
      // TECHNICZNE - łącznie 10%
      containsEdgeBoundaries: requiredElements['edge boundaries'],
      containsMathematicalPrecision: requiredElements['mathematical precision'],
      containsSurfaceAdaptive: requiredElements['surface adaptive'],
      containsEbookSpecs: requiredElements['ebook'],
      containsSquareFormat: requiredElements['1:1'],
      containsChapterRef: requiredElements['chapterRef'],
      overallQuality: 0,
      diversity_applied: forceRegenerate,
      transparency_applied: enableTransparency,
      maximum_quality_applied: maximumQuality,
      temperature_used: temperature
    };

    // 🔥 MAKSYMALNE OBLICZENIE JAKOŚCI - WYŻSZE WYMAGANIA Z MATEMATYCZNĄ PRECYZJĄ
    qualityMetrics.overallQuality = (
      // KRYTYCZNE - 70% łącznie (podwyższone wagi)
      (qualityMetrics.containsNoTextClause ? 0.25 : 0) +              // 25% - ABSOLUTNIE KRYTYCZNE
      (qualityMetrics.containsTransparentBackground ? 0.20 : 0) +     // 20% - KRYTYCZNE dla transparentności
      (qualityMetrics.containsSeamlessComposition ? 0.15 : 0) +       // 15% - KRYTYCZNE dla seamless
      (qualityMetrics.containsNaturalBlending ? 0.10 : 0) +          // 10% - KRYTYCZNE dla blending

      // WYSOKIEJ JAKOŚCI - 20% łącznie (nowe wysokie wymagania)
      (qualityMetrics.containsMaximumQuality ? 0.08 : 0) +           // 8% - NOWE: Maksymalna jakość
      (qualityMetrics.containsUltraHighDefinition ? 0.06 : 0) +      // 6% - NOWE: Ultra-HD
      (qualityMetrics.containsPhotorealistic ? 0.04 : 0) +           // 4% - Fotorealizm
      (qualityMetrics.containsCinematic ? 0.02 : 0) +                // 2% - Kinowe oświetlenie

      // TECHNICZNE - 10% łącznie (rozszerzone kryteria)
      (qualityMetrics.containsProperMargins ? 0.03 : 0) +            // 3% - Marginesy
      (qualityMetrics.containsMathematicalPrecision ? 0.02 : 0) +    // 2% - NOWE: Matematyczna precyzja
      (qualityMetrics.containsSurfaceAdaptive ? 0.02 : 0) +          // 2% - NOWE: Surface-adaptive
      (qualityMetrics.containsEdgeBoundaries ? 0.01 : 0) +           // 1% - Edge boundaries
      (qualityMetrics.containsChapterRef ? 0.01 : 0) +               // 1% - Referencja rozdziału
      (qualityMetrics.containsSquareFormat ? 0.005 : 0) +            // 0.5% - Format
      (qualityMetrics.containsEbookSpecs ? 0.005 : 0)                // 0.5% - Specs ebooka
    );

    console.log(`📊 === MAXIMUM QUALITY TRANSPARENT PROMPT METRICS ===`);
    console.log(`   Length: ${imagePrompt.length}/${config.maxLength} chars (${((imagePrompt.length/config.maxLength)*100).toFixed(1)}%)`);
    console.log(`   Target Length: ${config.targetLength} chars (${((config.targetLength/config.maxLength)*100).toFixed(1)}% utilization target)`);
    console.log(`   Length Achievement: ${imagePrompt.length >= config.targetLength ? '✅' : '⚠️'} (${(imagePrompt.length/config.targetLength*100).toFixed(1)}% of target)`);
    console.log(`   Quality Score: ${(qualityMetrics.overallQuality * 100).toFixed(1)}%`);
    console.log(`   🔄 Regeneration Mode: ${forceRegenerate ? '✅ DIVERSITY APPLIED' : '❌ Standard generation'}`);
    console.log(`   🎨 Transparency Mode: ${enableTransparency ? '✅ ULTRA-SEAMLESS ENFORCED' : '❌ Standard background'}`);
    console.log(`   🏆 Maximum Quality Mode: ${maximumQuality ? '✅ MUSEUM-GRADE ENFORCED' : '❌ Standard quality'}`);
    console.log(`   🌡️ Temperature Used: ${temperature}`);

    // KRYTYCZNE - 70%
    console.log(`   === CRITICAL ELEMENTS (70% weight) ===`);
    console.log(`   🚫 No Text Clause: ${qualityMetrics.containsNoTextClause ? '✅' : '❌ CRITICAL MISSING!'} (25%)`);
    console.log(`   🎨 Transparent Background: ${qualityMetrics.containsTransparentBackground ? '✅' : (enableTransparency ? '❌ TRANSPARENCY MISSING!' : '➖ Not required')} (20%)`);
    console.log(`   🔄 Seamless Composition: ${qualityMetrics.containsSeamlessComposition ? '✅' : (enableTransparency ? '❌ SEAMLESS MISSING!' : '➖ Not required')} (15%)`);
    console.log(`   🌊 Natural Blending: ${qualityMetrics.containsNaturalBlending ? '✅' : (enableTransparency ? '❌ BLENDING MISSING!' : '➖ Not required')} (10%)`);

    // WYSOKIEJ JAKOŚCI - 20%
    console.log(`   === HIGH QUALITY ELEMENTS (20% weight) ===`);
    console.log(`   🏆 Maximum Quality: ${qualityMetrics.containsMaximumQuality ? '✅' : (maximumQuality ? '❌ MAX QUALITY MISSING!' : '➖ Not required')} (8%)`);
    console.log(`   📺 Ultra-High Definition: ${qualityMetrics.containsUltraHighDefinition ? '✅' : (maximumQuality ? '❌ ULTRA-HD MISSING!' : '➖ Not required')} (6%)`);
    console.log(`   📷 Photorealistic: ${qualityMetrics.containsPhotorealistic ? '✅' : '❌'} (4%)`);
    console.log(`   🎬 Cinematic: ${qualityMetrics.containsCinematic ? '✅' : '❌'} (2%)`);

    // TECHNICZNE - 10%
    console.log(`   === TECHNICAL ELEMENTS (10% weight) ===`);
    console.log(`   📏 Proper Margins: ${qualityMetrics.containsProperMargins ? '✅' : (enableTransparency ? '❌ MARGINS MISSING!' : '➖ Not required')} (3%)`);
    console.log(`   🔢 Mathematical Precision: ${qualityMetrics.containsMathematicalPrecision ? '✅' : (enableTransparency ? '❌ PRECISION MISSING!' : '➖ Not required')} (2%)`);
    console.log(`   🔧 Surface-Adaptive: ${qualityMetrics.containsSurfaceAdaptive ? '✅' : (enableTransparency ? '❌ ADAPTIVE MISSING!' : '➖ Not required')} (2%)`);
    console.log(`   🔲 Edge Boundaries: ${qualityMetrics.containsEdgeBoundaries ? '✅' : (enableTransparency ? '❌ BOUNDARIES MISSING!' : '➖ Not required')} (1%)`);
    console.log(`   📖 Chapter Reference: ${qualityMetrics.containsChapterRef ? '✅' : '❌ IMPORTANT MISSING!'} (1%)`);
    console.log(`   📚 Ebook Specs: ${qualityMetrics.containsEbookSpecs ? '✅' : '❌'} (0.5%)`);
    console.log(`   📐 Square Format: ${qualityMetrics.containsSquareFormat ? '✅' : '❌'} (0.5%)`);

    if (forceRegenerate) {
      console.log(`🔄 === DIVERSITY ELEMENTS APPLIED ===`);
      console.log(`   - Lighting: ${variations.lighting}`);
      console.log(`   - Style: ${variations.style}`);
      console.log(`   - Composition: ${variations.composition}`);
      console.log(`   - Colors: ${variations.colors}`);
    }

    // 🔥 PODWYŻSZONE PROGI JAKOŚCI
    const targetScore = maximumQuality ? 0.95 : (enableTransparency ? 0.92 : 0.90); // 95%/92%/90% - znacznie wyższe wymagania
    if (qualityMetrics.overallQuality < targetScore) {
      console.warn(`⚠️ QUALITY WARNING! Score: ${(qualityMetrics.overallQuality * 100).toFixed(1)}% (target: ${(targetScore * 100).toFixed(0)}%+)`);
      if (!qualityMetrics.containsNoTextClause) {
        console.error(`❌ CRITICAL: Missing "no text" clause - images may contain text!`);
      }
      if (maximumQuality && !qualityMetrics.containsMaximumQuality) {
        console.error(`❌ CRITICAL: Missing "maximum quality" - may not achieve museum-grade rendering!`);
      }
      if (enableTransparency && !qualityMetrics.containsTransparentBackground) {
        console.error(`❌ CRITICAL: Missing "ultra-seamless transparent background" - may have solid background!`);
      }
      if (enableTransparency && !qualityMetrics.containsSeamlessComposition) {
        console.error(`❌ CRITICAL: Missing "surface-adaptive seamless composition" - may have borders!`);
      }
      if (enableTransparency && !qualityMetrics.containsProperMargins) {
        console.error(`❌ CRITICAL: Missing "premium margins" - elements may touch edges!`);
      }
      if (!qualityMetrics.containsChapterRef) {
        console.warn(`⚠️ IMPORTANT: Missing chapter reference - less targeted illustration`);
      }
    } else {
      console.log(`✅ HIGH QUALITY ${maximumQuality ? 'MAXIMUM GRADE ' : ''}${enableTransparency ? 'ULTRA-SEAMLESS TRANSPARENT ' : ''}PROMPT! Ready for GPT-Image-1`);
    }

    console.log(`📝 Preview: ${imagePrompt.substring(0, 200)}...`);
    console.log(`📊 === END MAXIMUM QUALITY TRANSPARENT METRICS ===`);

    return NextResponse.json({
      success: true,
      imagePrompt: imagePrompt,
      promptLength: imagePrompt.length,
      targetModel: targetModel,
      qualityMetrics: qualityMetrics,
      optimizedFor: `gpt-image-1-ultra-detailed-ebook${maximumQuality ? '-maximum-quality' : ''}${enableTransparency ? '-ultra-seamless-transparent' : ''}`,
      utilization: `${((imagePrompt.length/4000)*100).toFixed(1)}% of GPT-Image-1 capacity`,
      targetUtilization: `${((config.targetLength/4000)*100).toFixed(1)}% target utilization`,
      utilizationAchieved: imagePrompt.length >= config.targetLength,
      diversityApplied: forceRegenerate,
      transparencyApplied: enableTransparency,
      maximumQualityApplied: maximumQuality,
      variationElements: forceRegenerate ? variations : null,
      transparencyFeatures: enableTransparency ? {
        ultraSeamlessTransparentBackground: qualityMetrics.containsTransparentBackground,
        surfaceAdaptiveSeamlessComposition: qualityMetrics.containsSeamlessComposition,
        mathematicalPrecisionNaturalBlending: qualityMetrics.containsNaturalBlending,
        premiumMarginsSpacing: qualityMetrics.containsProperMargins,
        edgeBoundariesControl: qualityMetrics.containsEdgeBoundaries,
        mathematicalPrecisionCalculations: qualityMetrics.containsMathematicalPrecision,
        surfaceAdaptiveBlending: qualityMetrics.containsSurfaceAdaptive,
        whiteBackgroundCompatibility: true,
        borderlessDesign: qualityMetrics.containsSeamlessComposition,
        subPixelAccuracyFade: qualityMetrics.containsMathematicalPrecision,
        intelligentTextureResponse: qualityMetrics.containsSurfaceAdaptive
      } : null,
      maximumQualityFeatures: maximumQuality ? {
        museumGradeQuality: qualityMetrics.containsMaximumQuality,
        ultraHighDefinition: qualityMetrics.containsUltraHighDefinition,
        microscopicDetailPrecision: qualityMetrics.containsMaximumQuality,
        cinemaGradeProfessionalFinish: qualityMetrics.containsCinematic,
        photorealisticRendering: qualityMetrics.containsPhotorealistic,
        absoluteMaximumEnhancement: qualityMetrics.containsMaximumQuality,
        premiumRenderQuality: true,
        mathematicalPrecisionSpacing: qualityMetrics.containsMathematicalPrecision
      } : null
    });

  } catch (error) {
    console.error('❌ Błąd generowania maksymalnego transparentnego promptu:', error);
    return NextResponse.json({
      error: 'Błąd wewnętrzny serwera',
      details: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'GPT-Image-1 Maximum Quality Ultra-Seamless Transparent Prompt Generator with Full Transparency Control and Maximum Quality Enhancement',
    supportedModels: ['gpt-image-1'],
    maxPromptLength: 4000,
    targetPromptLength: 3800, // 95% utilization
    utilizationTarget: '95%',
    optimizedFor: 'maximum-quality-ultra-seamless-transparent-ebook-illustrations',
    capabilities: [
      'Ultra-long prompts (up to 4000 chars with 95% utilization target)',
      'Deep content interpretation with maximum quality enhancement',
      'Advanced technical specifications with mathematical precision',
      'Cinematic quality instructions with museum-grade rendering',
      'Professional ebook optimization with ultra-seamless transparency',
      'Diversity generation for regeneration with maximum variation',
      'Variable temperature control for precision vs creativity',
      'ULTRA-SEAMLESS TRANSPARENT BACKGROUND ENFORCEMENT',
      'Surface-adaptive seamless composition generation',
      'Mathematical precision natural blending capability',
      'Borderless design instructions with edge-perfection',
      'Premium margin control with sub-pixel accuracy',
      'Edge clearance enforcement with intelligent spacing',
      'White background compatibility with texture response',
      'MAXIMUM QUALITY ENHANCEMENT with museum-grade precision',
      'Ultra-high-definition rendering with microscopic detail',
      'Cinema-grade professional finish with absolute maximum enhancement'
    ],
    maximumQualityFeatures: {
      qualityLevel: 'absolute-maximum-museum-grade',
      enhancementLevel: 'maximum-available',
      detailFocus: 'ultra-high-microscopic-precision',
      renderQuality: 'premium-cinema-grade',
      qualityThreshold: '95% minimum requirement for maximum mode',
      qualityMetrics: '15 comprehensive criteria with mathematical precision',
      utilizationTarget: '95% of GPT-Image-1 capacity (3800+ chars)'
    },
    transparencyFeatures: {
      ultraSeamlessTransparentBackground: 'enforced maximum priority with mathematical precision',
      surfaceAdaptiveSeamlessComposition: 'microscopic edge transitions with intelligent response',
      mathematicalPrecisionNaturalBlending: 'sub-pixel accuracy calculations for edge-perfection',
      borderlessDesign: 'edge-perfection enforcement with absolute smoothness',
      whiteCompatibility: 'optimized maximum blending with texture adaptation',
      premiumMargins: 'publishing-grade internal spacing with mathematical precision',
      subPixelAccuracyFade: 'fade calculations precision with intelligent transitions',
      intelligentTextureResponse: 'surface-adaptive blending for any background optimization',
      edgeClearanceEnforcement: 'mathematical precision spacing with boundary control'
    },
    qualityValidation: {
      transparencyCompliance: 'automatic validation with 15 criteria',
      maximumQualityCompliance: 'museum-grade standard enforcement',
      omega3Compliance: 'regulatory enforcement with automatic cleaning',
      autoCorrection: 'missing elements detection with intelligent enhancement',
      comprehensiveMetrics: 'transparency and maximum quality scoring with mathematical precision',
      qualityThresholds: {
        maximum: '95% minimum requirement',
        transparency: '92% minimum requirement',
        standard: '90% minimum requirement'
      }
    },
    promptOptimization: {
      targetLength: 3800,
      utilizationGoal: '95%',
      qualityCriteria: 15,
      automaticEnhancement: true,
      mathematicalPrecision: true,
      intelligentCorrection: true
    },
    version: "3.0-maximum-quality-ultra-seamless-transparent-prompt-generation"
  }, { status: 405 });
}