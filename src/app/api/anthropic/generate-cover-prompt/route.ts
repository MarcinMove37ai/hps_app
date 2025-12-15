// src/app/api/anthropic/generate-cover-prompt/route.ts

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

// 🚫 KRYTYCZNE OGRANICZENIA GRAFICZNE - ZAKAZ KAPSUŁEK I STAŁYCH FORM SUPLEMENTÓW
const FORBIDDEN_SUPPLEMENT_ELEMENTS = {
  // Formy stałe suplementów - ABSOLUTNIE ZABRONIONE
  solidForms: [
    'capsules', 'capsule', 'kapsułki', 'kapsułka', 'kapsułek', 'kapsułkami',
    'tablets', 'tablet', 'tabletki', 'tabletka', 'tabletek', 'tabletkami',
    'pills', 'pill', 'pilulki', 'pilulka', 'pilulek',
    'softgels', 'softgel', 'żelki', 'żelka', 'żelek',
    'lozenges', 'lozenge', 'pastylki', 'pastylka', 'pastylek',
    'dragee', 'dragée'
  ],

  // Kombinacje omega-3 - SZCZEGÓLNIE ZABRONIONE
  omega3Combinations: [
    'omega-3 capsules', 'omega-3 tablets', 'omega-3 pills',
    'fish oil capsules', 'fish oil tablets', 'fish oil pills',
    'kapsułki omega-3', 'tabletki omega-3', 'pilulki omega-3',
    'kapsułki z olejem rybim', 'tabletki fish oil'
  ],

  // Konteksty problematyczne
  problematicContexts: [
    'scattered pills', 'rozsypane kapsułki', 'scattered capsules',
    'supplement capsules', 'vitamin tablets', 'mineral pills',
    'kapsułki witaminowe', 'tabletki mineralne', 'suplementy w kapsułkach',
    'small round objects', 'małe okrągłe obiekty',
    'transparent capsules', 'przezroczyste kapsułki',
    'gelowe kapsułki', 'blister packaging'
  ],

  // Wzorce regex do skanowania
  regexPatterns: [
    /\b(capsule|tablet|pill|softgel|kapsułk|tabletk|pilulk|żelk)s?\b/gi,
    /\b(omega-3|fish oil|supplement|vitamin)\s+(capsule|tablet|pill)s?\b/gi,
    /\bscattered\s+(capsule|tablet|pill)s?\b/gi,
    /\bsmall\s+round\s+(objects|obiekt)/gi
  ]
};

// Funkcja czyszczenia promptu z zabronionych elementów
const cleanPromptFromForbiddenSupplements = (prompt: string): string => {
  let cleanedPrompt = prompt;

  console.log('🚫 === SUPPLEMENT RESTRICTION CLEANUP ===');

  // Sprawdzenie i usunięcie wzorców regex
  FORBIDDEN_SUPPLEMENT_ELEMENTS.regexPatterns.forEach((pattern, index) => {
    const matches = cleanedPrompt.match(pattern);
    if (matches) {
      console.log(`❌ Found forbidden pattern ${index + 1}: ${matches.join(', ')}`);
      cleanedPrompt = cleanedPrompt.replace(pattern, '[REMOVED_SUPPLEMENT_FORM]');
    }
  });

  // Usunięcie konkretnych fraz
  [...FORBIDDEN_SUPPLEMENT_ELEMENTS.solidForms,
   ...FORBIDDEN_SUPPLEMENT_ELEMENTS.omega3Combinations,
   ...FORBIDDEN_SUPPLEMENT_ELEMENTS.problematicContexts].forEach(forbidden => {
    const regex = new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(cleanedPrompt)) {
      console.log(`❌ Removing forbidden element: "${forbidden}"`);
      cleanedPrompt = cleanedPrompt.replace(regex, '[REMOVED_SUPPLEMENT]');
    }
  });

  // Czyszczenie znaczników usunięcia
  cleanedPrompt = cleanedPrompt
    .replace(/\[REMOVED_SUPPLEMENT_FORM\]/g, '')
    .replace(/\[REMOVED_SUPPLEMENT\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const changesMade = prompt.length !== cleanedPrompt.length;
  console.log(`🧹 Cleanup result: ${changesMade ? 'CHANGES MADE' : 'NO CHANGES'}`);
  if (changesMade) {
    console.log(`   Original: ${prompt.length} chars`);
    console.log(`   Cleaned: ${cleanedPrompt.length} chars`);
  }

  return cleanedPrompt;
};

// Konfiguracja zoptymalizowana pod GPT-Image-1 dla okładek
const COVER_PROMPT_CONFIG = {
  "gpt-image-1": {
    maxLength: 4000,  // 🔥 PEŁNY LIMIT GPT-Image-1 dla okładek
    targetLength: 2800, // Cel: bardzo długie, szczegółowe prompty okładek
    style: "ultra-detailed-cover-professional",
    format: "square", // 🔥 Format kwadratowy 1024x1024 dla okładek książek
    background: "transparent", // 🔥 Przezroczyste tło jako priorytet
    supportsComplexInstructions: true
  }
};

export async function POST(request: Request) {
  console.log('🎨 === GPT-IMAGE-1 COVER PROMPT GENERATOR ===');

  try {
    const body = await request.json();
    const { title, subtitle, chapters } = body;

    if (!title || !chapters || !Array.isArray(chapters)) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane wejściowe. Wymagany tytuł ebooka i lista rozdziałów.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY nie jest zdefiniowany');
      return NextResponse.json({ error: 'Błąd konfiguracji serwera' }, { status: 500 });
    }

    console.log(`🎯 Generowanie ULTRA-SZCZEGÓŁOWEGO promptu okładki dla GPT-Image-1`);
    console.log(`📖 Ebook: "${title}" ${subtitle ? `- "${subtitle}"` : ''}`);
    console.log(`📚 Rozdziały: ${chapters.length} chapters`);

    // Bogate przygotowanie kontekstu
    const chaptersContext = chapters
      .slice(0, 10) // Więcej rozdziałów dla GPT-Image-1
      .map((ch: any, index: number) => `${index + 1}. ${ch.title}`)
      .join('\n');

    const contentSamples = chapters
      .slice(0, 5) // Więcej próbek treści
      .map((ch: any) => {
        if (ch.content && ch.content.trim()) {
          return ch.content.trim().substring(0, 300) + '...'; // Dłuższe próbki
        }
        return '';
      })
      .filter(content => content.length > 0)
      .join('\n\n');

    // 🔥 ZAAWANSOWANY PROMPT DLA CLAUDE - OKŁADKI GPT-IMAGE-1 Z OGRANICZENIAMI SUPLEMENTÓW
    const prompt = `Jesteś ekspertem w tworzeniu ULTRA-SZCZEGÓŁOWYCH promptów okładek książek dla GPT-Image-1 - najnowszego i najbardziej zaawansowanego modelu generowania obrazów OpenAI. Twoim zadaniem jest stworzenie BARDZO DŁUGIEGO i NIEZWYKLE PRECYZYJNEGO promptu (2800-4000 znaków) dla OKŁADKI EBOOKA w formacie pionowym.

INFORMACJE O EBOOKU:
- Tytuł: "${title}"${subtitle ? `\n- Podtytuł: "${subtitle}"` : ''}

ROZDZIAŁY EBOOKA:
${chaptersContext}

${contentSamples ? `PRÓBKI TREŚCI Z ROZDZIAŁÓW:\n${contentSamples}` : ''}

🚫 === KRYTYCZNE OGRANICZENIA GRAFICZNE - ABSOLUTNY ZAKAZ ===

**ABSOLUTNIE ZABRONIONE ELEMENTY W OKŁADCE:**

🚫 **FORMY STAŁE SUPLEMENTÓW - CAŁKOWITY ZAKAZ:**
* Kapsułki (capsules) w jakiejkolwiek formie
* Tabletki (tablets) w jakiejkolwiek formie
* Pilulki (pills) w jakiejkolwiek formie
* Żelki (softgels) w jakiejkolwiek formie
* Pastylki (lozenges) w jakiejkolwiek formie
* Dragee w jakiejkolwiek formie
* Kapsułki żelowe w jakiejkolwiek formie

🚫 **OMEGA-3 W FORMACH STAŁYCH - SZCZEGÓLNY ZAKAZ:**
* Kapsułki omega-3 (omega-3 capsules)
* Tabletki omega-3 (omega-3 tablets)
* Pilulki omega-3 (omega-3 pills)
* Kapsułki z olejem rybim (fish oil capsules)
* Tabletki fish oil (fish oil tablets)

🚫 **PROBLEMATYCZNE KONTEKSTY WIZUALNE:**
* Rozsypane małe obiekty przypominające tabletki
* Przezroczyste kapsułki z płynem wewnątrz
* Gelowe kapsułki w różnych kolorach
* Butelki z widocznymi kapsułkami wewnątrz
* Opakowania blister z tabletkami
* Małe, okrągłe obiekty sugerujące pills
* Scattered/rozsypane elementy przypominające suplementy

🚫 **ZAKAZANE SŁOWA I FRAZY:**
* NIGDY nie używaj: capsules, capsule, tablets, tablet, pills, pill, softgels, softgel, lozenges, lozenge
* NIGDY nie używaj: kapsułki, kapsułka, tabletki, tabletka, pilulki, pilulka, żelki, pastylki
* NIGDY nie używaj: supplement capsules, vitamin tablets, omega-3 pills, fish oil capsules
* NIGDY nie używaj: scattered pills, rozsypane kapsułki, małe okrągłe obiekty

🚀 MAKSYMALNE WYKORZYSTANIE GPT-IMAGE-1 DLA OKŁADEK KSIĄŻEK:

1. ULTRA-DŁUGIE SZCZEGÓŁOWE PROMPTY OKŁADEK (do 4000 znaków):
   - GPT-Image-1 doskonale radzi sobie z bardzo długimi, wielowarstwowymi instrukcjami okładek
   - Każdy szczegół poprawia atrakcyjność marketingową okładki
   - Model wyróżnia się w tworzeniu profesjonalnych okładek książek
   - Potrafi stworzyć okładkę która sprzedaje książkę wizualnie

2. SPECJALIZACJA W OKŁADKACH KSIĄŻEK:
   - Rozumie psychologię okładek i marketing książek
   - Tworzy okładki które przyciągają uwagę na półkach (fizycznych i cyfrowych)
   - Doskonale interpretuje gatunek i ton książki
   - Zachowuje profesjonalny charakter wydawniczy

3. FORMAT KWADRATOWY Z PRZEZROCZYSTYM TŁEM:
   - GPT-Image-1 doskonale radzi sobie z formatem kwadratowym 1024x1024
   - PRIORYTET: Tworzy okładki z przezroczystym tłem (transparent background)
   - Zapewnia uniwersalność użycia na różnych podłożach
   - Profesjonalne kompozycje optymalne dla cyfrowych okładek książek

INSTRUKCJE DLA TWORZENIA PROMPTU OKŁADKI:

📖 ANALIZA KSIĄŻKI - ZROZUM GŁĘBOKO:
- Zidentyfikuj główny GATUNEK i TARGET AUDIENCE
- Wyciągnij kluczowe MOTYWY i TEMATY przewodnie
- Zrozum NASTRÓJ i ATMOSFERĘ całej książki
- Znajdź UNIKALNE elementy które wyróżnią okładkę
- Dostrzeż EMOCJONALNY PRZEKAZ który okładka ma nieść

🎨 ULTRA-SZCZEGÓŁOWY PROJEKT OKŁADKI GPT-IMAGE-1:

STRUKTURA ULTRA-DŁUGIEGO PROMPTU OKŁADKI (2800-4000 znaków):

1. **GŁÓWNA KOMPOZYCJA OKŁADKI (800-1000 znaków)**
   - Bardzo szczegółowy opis centralnego elementu okładki
   - Precyzyjne umiejscowienie wszystkich elementów wizualnych
   - Pionowa kompozycja zoptymalizowana pod format książki
   - Relacje między elementami pierwszego i drugiego planu
   - Punkt widzenia i perspektywa przyciągająca wzrok

2. **ZAAWANSOWANE SPECYFIKACJE TECHNICZNE OKŁADKI (800-1000 znaków)**
   - Professional square book cover composition in 1024x1024 format with transparent background and seamless edge design with proper internal margins
   - Ultra-high-definition photorealistic rendering with premium publishing quality, transparent background, and composition fully contained within image bounds with adequate spacing from all edges
   - Advanced color grading with market-tested color psychology optimized for transparent background with natural edge blending and internal margin preservation
   - Perfect optimization for digital applications with seamless transparent background integration, borderless design, and all elements positioned away from image edges
   - Studio-quality volumetric lighting with sophisticated transparent background and soft natural fade-out with composition margins ensuring no elements touch image boundaries
   - Professional depth of field creating visual hierarchy with clean transparent background and all compositional elements contained within central image area with proper edge clearance
   - Commercial book cover standards with transparent background, no borders or frames, natural fade-out edges, and mandatory internal spacing ensuring seamless white background integration

3. **STYLE WYDAWNICZY I MARKETINGOWY (600-800 znaków)**
   - Contemporary professional book cover design with premium aesthetic
   - Genre-appropriate visual language and market positioning
   - Sophisticated color palette designed for maximum shelf visibility
   - Advanced typography space management (without actual text)
   - Professional book cover lighting and atmospheric effects
   - Market-competitive visual quality and commercial appeal
   - Timeless design approach ensuring longevity in various markets

4. **EMOCJONALNY IMPACT I GATUNEK (400-600 znaków)**
   - [Tu będzie szczegółowy opis atmosfery bazujący na treści i gatunku]
   - Visual storytelling elements that communicate book's essence
   - Emotional hooks that attract target readers
   - Genre-specific visual cues and reader expectations
   - Symbolic representation of book's core message through "${title}"

5. **KRYTYCZNE WYMAGANIA OKŁADKOWE (400-600 znaków)**
   - ABSOLUTELY NO TEXT, LETTERS, WORDS, TITLES, or any written elements
   - NO AUTHOR NAMES, PUBLISHER LOGOS, or readable content of any kind
   - NO SYMBOLS, SIGNS, LABELS, or typographic elements whatsoever
   - Pure visual book cover design relying on imagery and color psychology
   - Professional commercial book cover suitable for all retail channels
   - Perfect visual representation of "${title}" without any text elements

6. **🚫 ABSOLUTNE ZAKAZY SUPLEMENTOWE (KRYTYCZNE)**
   - ABSOLUTELY FORBIDDEN: capsules, tablets, pills, softgels, lozenges, or any solid supplement forms
   - STRICTLY PROHIBITED: omega-3 capsules, fish oil tablets, vitamin pills, supplement capsules
   - BANNED: scattered small round objects, transparent capsules, gelcaps, blister packaging
   - NO kapsułki, tabletki, pilulki, żelki, pastylki, or any Polish supplement terminology
   - FORBIDDEN: any visual elements that could be interpreted as medication or supplement forms
   - CRITICAL: avoid all small round objects, scattered elements, or anything resembling pills/capsules

PRZYKŁAD STRUKTURY ULTRA-DŁUGIEJ OKŁADKI:

"Create an ultra-sophisticated professional book cover illustration in stunning photorealistic quality with premium commercial appeal, transparent background, and seamless edge-free composition with proper internal margins. [BARDZO SZCZEGÓŁOWY 800-SŁOWNY OPIS GŁÓWNEJ KOMPOZYCJI OKŁADKI bazujący bezpośrednio na treści książki i jej gatunku - każdy element wizualny musi być precyzyjnie opisany dla maksymalnego impaktu marketingowego, UNIKAJĄC WSZELKICH FORM STAŁYCH SUPLEMENTÓW, with clean transparent background and composition fully contained within image bounds with adequate spacing from all edges, ensuring no elements touch image boundaries].

Professional book cover mastery: Perfect square 1024x1024 composition with transparent background and seamless borderless design specifically engineered for optimal book cover proportions and natural blending capability with mandatory internal margins. Ultra-high-definition photorealistic rendering utilizing cutting-edge visualization techniques with premium publishing industry standards, crystal-clear transparent background, and soft natural edges that fade seamlessly while maintaining proper distance from image boundaries. Studio-quality lighting setup with sophisticated key lighting, ambient fill, and dramatic accent lighting creating dimensional modeling and visual hierarchy perfect for book covers with transparent background integration and edge-free composition that blends naturally with any surface, ensuring all elements are positioned with adequate clearance from image edges. Advanced color science with psychologically tested color combinations proven effective for book marketing optimized for transparent background applications with natural fade-out edges and composition contained entirely within image boundaries with proper margin spacing. Masterful depth of field control with strategic focus points, clean transparent background, and composition contained entirely within central image area ensuring no elements touch or approach image borders.

Premium publishing aesthetic: Contemporary professional book cover design executed with hyperrealistic attention to detail and market-competitive visual quality featuring transparent background and borderless seamless composition with internal spacing requirements. Sophisticated color palette utilizing advanced color psychology specifically chosen for target audience attraction and genre identification with transparent background compatibility and natural edge blending while maintaining adequate distance from image perimeter. Genre-appropriate visual language ensuring proper market positioning and reader expectation management on transparent background with seamless integration capability and composition margins that prevent any elements from reaching image edges. Professional composition employing proven book cover design principles with perfect visual balance optimized for transparent background versatility and natural blending with any surface without visible borders or frames, ensuring all compositional elements maintain proper clearance from image boundaries for seamless white background integration.

Emotional resonance and genre mastery: [SZCZEGÓŁOWY 500-SŁOWNY OPIS ATMOSFERY bazujący na gatunku książki i treści - jak okładka ma przyciągać czytelników, jakie emocje ma wzbudzać, jak ma komunikować wartość książki, with transparent background and seamless edge composition with proper internal margins]. Perfect visual metaphors representing the essence of "${title}" through masterful symbolic storytelling with clean transparent background and edge-free design that maintains adequate spacing from image boundaries, creating immediate emotional connection with potential readers and communicating book value proposition through seamless visual integration that works perfectly on white backgrounds.

Critical commercial and content requirements: Absolutely no text, letters, words, titles, author names, publisher information, or any form of written or readable content whatsoever visible anywhere on the cover design. Complete text-free visual communication with transparent background and seamless borderless composition relying entirely on powerful imagery, strategic color psychology, and emotional visual storytelling. CRITICAL SPACING: All compositional elements must be positioned with adequate margins from image edges, ensuring no objects, figures, effects, or design elements touch or approach image boundaries. MANDATORY CLEARANCE: Maintain proper internal spacing so composition appears naturally centered with breathing room from all edges for seamless integration on white backgrounds. ABSOLUTELY FORBIDDEN: capsules, tablets, pills, softgels, lozenges, kapsułki, tabletki, pilulki, or any solid supplement forms. STRICTLY PROHIBITED: omega-3 capsules, fish oil tablets, vitamin pills, scattered small round objects, transparent capsules, blister packaging, or any elements resembling medication/supplement forms. Professional commercial book cover with transparent background, no borders or frames, natural fade-out edges for seamless blending, composition contained within image bounds with proper margin spacing from all edges, adhering to highest publishing industry standards with premium market appeal ensuring success across all retail channels both physical and digital."

KRYTYCZNE INSTRUKCJE:
- PROMPT MUSI MIEĆ 2800-4000 ZNAKÓW (maksymalna długość!)
- Format KWADRATOWY 1024x1024 z PRZEZROCZYSTYM TŁEM jako PRIORYTET
- ZAWSZE wspomij "absolutely no text", "transparent background", "seamless edges", "no borders", "proper margins", "adequate spacing from edges" i tytuł "${title}"
- ZAWSZE dołącz ABSOLUTNY ZAKAZ kapsułek/tabletek/pilułek
- PRIORYTET: "with transparent background" i "seamless edge composition" w każdej sekcji technicznej
- KRYTYCZNE: "composition contained within bounds", "natural edge blending", "borderless design", "proper internal margins"
- OBOWIĄZKOWE: "no elements touch image boundaries", "adequate clearance from edges", "proper margin spacing"
- UNIKAJ: "frames", "borders", "edges", wszelkich odniesień do ramek lub granic
- MARGINES: Wszystkie elementy muszą mieć odpowiedni odstęp od krawędzi obrazu
- Skoncentruj się na ATRAKCYJNOŚCI MARKETINGOWEJ z naturalnym blendowaniem i marginesami
- Bazuj na GATUNKU i treści książki
- ŻADNYCH komentarzy - tylko czysty, ultra-szczegółowy prompt okładki
- UNIKAJ WSZELKICH form stałych suplementów

NAPISZ TERAZ ULTRA-DŁUGI PROMPT OKŁADKI Z ZAKAZAMI SUPLEMENTÓW, PRZEZROCZYSTYM TŁEM, SEAMLESS COMPOSITION I WŁAŚCIWYMI MARGINESAMI (cel: 3500+ znaków):`;

    const requestBody: AnthropicRequest = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1800,  // 🔥 Maksymalnie dla ultra-długich promptów okładek
      temperature: 0.2,  // 🔥 Bardzo niska dla maksymalnej precyzji marketingowej
      messages: [{ role: 'user', content: prompt }]
    };

    console.log(`🔄 Wysyłanie zaawansowanego zapytania do Claude o okładkę...`);

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
      return NextResponse.json({ error: `Błąd podczas generowania promptu okładki: ${errorText}` }, { status: response.status });
    }

    const responseData = await response.json();
    let coverPrompt = responseData.content[0].text.trim();

    // 🚫 KRYTYCZNE CZYSZCZENIE Z ZABRONIONYCH ELEMENTÓW SUPLEMENTOWYCH
    const originalLength = coverPrompt.length;
    coverPrompt = cleanPromptFromForbiddenSupplements(coverPrompt);

    if (originalLength !== coverPrompt.length) {
      console.log(`🧹 Prompt został oczyszczony z zabronionych elementów suplementowych`);
    }

    const config = COVER_PROMPT_CONFIG["gpt-image-1"];

    // Sprawdzenie długości (tylko jeśli NAPRAWDĘ przekracza limit)
    if (coverPrompt.length > config.maxLength) {
      console.warn(`⚠️ Cover prompt przekracza ${config.maxLength} znaków (${coverPrompt.length}), minimalne skracanie...`);
      coverPrompt = coverPrompt.substring(0, config.maxLength - 3) + '...';
    }

    // Zaawansowana walidacja okładki i automatyczne ulepszenia
    const requiredCoverElements = {
      'no text': coverPrompt.toLowerCase().includes('no text') || coverPrompt.toLowerCase().includes('absolutely no text'),
      'book cover': coverPrompt.toLowerCase().includes('book cover') || coverPrompt.toLowerCase().includes('cover'),
      'square format': coverPrompt.includes('1024x1024') || coverPrompt.toLowerCase().includes('square') || coverPrompt.toLowerCase().includes('1024x1024'),
      'transparent background': coverPrompt.toLowerCase().includes('transparent background') || coverPrompt.toLowerCase().includes('transparent'),
      'seamless composition': coverPrompt.toLowerCase().includes('seamless') || coverPrompt.toLowerCase().includes('borderless') || coverPrompt.toLowerCase().includes('edge-free') || coverPrompt.toLowerCase().includes('no borders'),
      'natural blending': coverPrompt.toLowerCase().includes('natural') && (coverPrompt.toLowerCase().includes('blend') || coverPrompt.toLowerCase().includes('fade')),
      'proper margins': coverPrompt.toLowerCase().includes('margin') || coverPrompt.toLowerCase().includes('spacing') || coverPrompt.toLowerCase().includes('clearance') || coverPrompt.toLowerCase().includes('adequate'),
      'edge boundaries': coverPrompt.toLowerCase().includes('boundaries') || coverPrompt.toLowerCase().includes('touch') || coverPrompt.toLowerCase().includes('edges') || coverPrompt.toLowerCase().includes('contained'),
      'professional': coverPrompt.toLowerCase().includes('professional'),
      'photorealistic': coverPrompt.toLowerCase().includes('photorealistic') || coverPrompt.toLowerCase().includes('realistic'),
      'commercial': coverPrompt.toLowerCase().includes('commercial') || coverPrompt.toLowerCase().includes('marketing'),
      'supplement_ban': coverPrompt.toLowerCase().includes('forbidden') || coverPrompt.toLowerCase().includes('prohibited') || coverPrompt.toLowerCase().includes('absolutely forbidden'),
      titleRef: coverPrompt.toLowerCase().includes(title.toLowerCase().substring(0, 15))
    };

    const missingCoverElements = Object.entries(requiredCoverElements)
      .filter(([key, present]) => !present)
      .map(([key]) => key);

    if (missingCoverElements.length > 0) {
      console.warn(`⚠️ FIXING missing cover elements: ${missingCoverElements.join(', ')}`);

      let correctedPrompt = coverPrompt;

      // Krytyczne naprawy dla okładek
      if (!requiredCoverElements['no text']) {
        correctedPrompt += " CRITICAL: Absolutely no text, letters, words, titles, or written elements on book cover.";
      }

      if (!requiredCoverElements['square format']) {
        correctedPrompt += " Square 1024x1024 book cover format with transparent background.";
      }

      if (!requiredCoverElements['transparent background']) {
        correctedPrompt += " PRIORITY: Professional book cover with transparent background.";
      }

      if (!requiredCoverElements['seamless composition']) {
        correctedPrompt += " CRITICAL: Seamless edge-free composition with no borders, natural blending edges.";
      }

      if (!requiredCoverElements['natural blending']) {
        correctedPrompt += " ESSENTIAL: Natural fade-out edges for seamless blending with any surface.";
      }

      if (!requiredCoverElements['proper margins']) {
        correctedPrompt += " CRITICAL: Proper internal margins with adequate spacing from all image edges.";
      }

      if (!requiredCoverElements['edge boundaries']) {
        correctedPrompt += " MANDATORY: All elements contained within image bounds, no touching image boundaries.";
      }

      if (!requiredCoverElements['supplement_ban']) {
        correctedPrompt += " ABSOLUTELY FORBIDDEN: capsules, tablets, pills, softgels, kapsułki, tabletki, pilulki, or any solid supplement forms.";
      }

      if (!requiredCoverElements['titleRef']) {
        correctedPrompt += ` Perfect cover design for "${title}".`;
      }

      // Sprawdź limit
      if (correctedPrompt.length > config.maxLength) {
        const spaceNeeded = correctedPrompt.length - config.maxLength;
        const originalTrimmed = coverPrompt.substring(0, coverPrompt.length - spaceNeeded - 50);

        let finalPrompt = originalTrimmed;
        if (!requiredCoverElements['no text']) {
          finalPrompt += " CRITICAL: Absolutely no text, letters, words, titles, or written elements on book cover.";
        }
        if (!requiredCoverElements['supplement_ban']) {
          finalPrompt += " FORBIDDEN: capsules, tablets, pills, kapsułki, tabletki.";
        }
        if (!requiredCoverElements['titleRef']) {
          finalPrompt += ` Perfect cover for "${title}".`;
        }

        correctedPrompt = finalPrompt;
      }

      coverPrompt = correctedPrompt;
      console.log(`✅ AUTO-CORRECTED cover prompt (${coverPrompt.length} chars)`);
    }

    // Końcowa walidacja na zabronione elementy
    const finalForbiddenCheck = FORBIDDEN_SUPPLEMENT_ELEMENTS.regexPatterns.some(pattern =>
      pattern.test(coverPrompt)
    );

    if (finalForbiddenCheck) {
      console.error(`❌ CRITICAL ERROR: Final prompt still contains forbidden supplement elements!`);
      // Ostatnie czyszczenie
      coverPrompt = cleanPromptFromForbiddenSupplements(coverPrompt);
    }

    // Zaawansowane metryki jakości okładki
    const coverQualityMetrics = {
      length: coverPrompt.length,
      targetLength: config.targetLength,
      lengthScore: Math.min(coverPrompt.length / config.targetLength, 1.0),
      containsNoTextClause: requiredCoverElements['no text'],
      containsBookCover: requiredCoverElements['book cover'],
      containsSquareFormat: requiredCoverElements['square format'],
      containsTransparentBackground: requiredCoverElements['transparent background'],
      containsSeamlessComposition: requiredCoverElements['seamless composition'],
      containsNaturalBlending: requiredCoverElements['natural blending'],
      containsProperMargins: requiredCoverElements['proper margins'],
      containsEdgeBoundaries: requiredCoverElements['edge boundaries'],
      containsProfessional: requiredCoverElements['professional'],
      containsPhotorealistic: requiredCoverElements['photorealistic'],
      containsCommercial: requiredCoverElements['commercial'],
      containsSupplementBan: requiredCoverElements['supplement_ban'],
      containsTitleRef: requiredCoverElements['titleRef'],
      supplementCompliance: !finalForbiddenCheck,
      overallQuality: 0
    };

    // Obliczenie jakości okładki z uwzględnieniem compliance
    coverQualityMetrics.overallQuality = (
      coverQualityMetrics.lengthScore * 0.10 +                     // Długość = 10%
      (coverQualityMetrics.containsNoTextClause ? 0.16 : 0) +      // No text = 16% (KRYTYCZNE!)
      (coverQualityMetrics.supplementCompliance ? 0.16 : 0) +      // Supplement compliance = 16% (KRYTYCZNE!)
      (coverQualityMetrics.containsTransparentBackground ? 0.14 : 0) + // Transparent background = 14% (PRIORYTET!)
      (coverQualityMetrics.containsSeamlessComposition ? 0.10 : 0) +   // Seamless composition = 10% (WAŻNE!)
      (coverQualityMetrics.containsNaturalBlending ? 0.08 : 0) +       // Natural blending = 8% (WAŻNE!)
      (coverQualityMetrics.containsProperMargins ? 0.10 : 0) +         // Proper margins = 10% (KRYTYCZNE!)
      (coverQualityMetrics.containsEdgeBoundaries ? 0.08 : 0) +        // Edge boundaries = 8% (WAŻNE!)
      (coverQualityMetrics.containsBookCover ? 0.04 : 0) +         // Book cover = 4%
      (coverQualityMetrics.containsSquareFormat ? 0.02 : 0) +      // Square format = 2%
      (coverQualityMetrics.containsProfessional ? 0.01 : 0) +      // Professional = 1%
      (coverQualityMetrics.containsPhotorealistic ? 0.01 : 0)      // Photorealistic = 1%
    );

    console.log(`📊 === COVER PROMPT QUALITY METRICS ===`);
    console.log(`   Length: ${coverPrompt.length}/${config.maxLength} chars (${((coverPrompt.length/config.maxLength)*100).toFixed(1)}%)`);
    console.log(`   Quality Score: ${(coverQualityMetrics.overallQuality * 100).toFixed(1)}%`);
    console.log(`   🚫 No Text Clause: ${coverQualityMetrics.containsNoTextClause ? '✅' : '❌ CRITICAL MISSING!'}`);
    console.log(`   🚫 Supplement Compliance: ${coverQualityMetrics.supplementCompliance ? '✅' : '❌ CRITICAL VIOLATION!'}`);
    console.log(`   🎨 Transparent Background: ${coverQualityMetrics.containsTransparentBackground ? '✅' : '❌ PRIORITY MISSING!'}`);
    console.log(`   🔄 Seamless Composition: ${coverQualityMetrics.containsSeamlessComposition ? '✅' : '❌ IMPORTANT MISSING!'}`);
    console.log(`   🌊 Natural Blending: ${coverQualityMetrics.containsNaturalBlending ? '✅' : '❌ BLEND MISSING!'}`);
    console.log(`   📏 Proper Margins: ${coverQualityMetrics.containsProperMargins ? '✅' : '❌ CRITICAL SPACING MISSING!'}`);
    console.log(`   🔲 Edge Boundaries: ${coverQualityMetrics.containsEdgeBoundaries ? '✅' : '❌ BOUNDARY CONTROL MISSING!'}`);
    console.log(`   📖 Book Cover Specs: ${coverQualityMetrics.containsBookCover ? '✅' : '❌'}`);
    console.log(`   📱 Square Format: ${coverQualityMetrics.containsSquareFormat ? '✅' : '❌'}`);
    console.log(`   🎨 Professional: ${coverQualityMetrics.containsProfessional ? '✅' : '❌'}`);
    console.log(`   📷 Photorealistic: ${coverQualityMetrics.containsPhotorealistic ? '✅' : '❌'}`);
    console.log(`   📚 Title Reference: ${coverQualityMetrics.containsTitleRef ? '✅' : '❌'}`);

    if (coverQualityMetrics.overallQuality < 0.85) {
      console.warn(`⚠️ COVER QUALITY WARNING! Score: ${(coverQualityMetrics.overallQuality * 100).toFixed(1)}% (target: 85%+)`);
      if (!coverQualityMetrics.containsNoTextClause) {
        console.error(`❌ CRITICAL: Missing "no text" clause - cover may contain text!`);
      }
      if (!coverQualityMetrics.supplementCompliance) {
        console.error(`❌ CRITICAL: Supplement compliance violation - may contain forbidden elements!`);
      }
      if (!coverQualityMetrics.containsTransparentBackground) {
        console.warn(`⚠️ PRIORITY: Missing transparent background - may not meet requirements`);
      }
      if (!coverQualityMetrics.containsSeamlessComposition) {
        console.warn(`⚠️ IMPORTANT: Missing seamless composition - may have borders/frames`);
      }
      if (!coverQualityMetrics.containsNaturalBlending) {
        console.warn(`⚠️ BLEND: Missing natural blending - may not integrate well with surfaces`);
      }
      if (!coverQualityMetrics.containsProperMargins) {
        console.error(`❌ CRITICAL: Missing proper margins - elements may touch image edges!`);
      }
      if (!coverQualityMetrics.containsEdgeBoundaries) {
        console.warn(`⚠️ BOUNDARY: Missing edge boundary control - composition may extend to edges`);
      }
    } else {
      console.log(`✅ HIGH QUALITY SEAMLESS COVER PROMPT WITH PROPER MARGINS! Ready for GPT-Image-1`);
    }

    console.log(`📝 Cover Preview: ${coverPrompt.substring(0, 200)}...`);
    console.log(`📊 === END COVER METRICS ===`);

    return NextResponse.json({
      success: true,
      coverPrompt: coverPrompt,
      promptLength: coverPrompt.length,
      targetModel: "gpt-image-1",
      format: "square-1024x1024-transparent-seamless-margins",
      qualityMetrics: coverQualityMetrics,
      supplementCompliance: coverQualityMetrics.supplementCompliance,
      transparentBackground: coverQualityMetrics.containsTransparentBackground,
      seamlessComposition: coverQualityMetrics.containsSeamlessComposition,
      naturalBlending: coverQualityMetrics.containsNaturalBlending,
      properMargins: coverQualityMetrics.containsProperMargins,
      edgeBoundaries: coverQualityMetrics.containsEdgeBoundaries,
      optimizedFor: "gpt-image-1-ultra-detailed-book-cover-supplement-safe-transparent-seamless-margins",
      utilization: `${((coverPrompt.length/4000)*100).toFixed(1)}% of GPT-Image-1 capacity`,
      restrictionsApplied: {
        supplementFormsBlocked: true,
        omega3CombinationsBlocked: true,
        problematicContextsRemoved: true,
        regexPatternsApplied: FORBIDDEN_SUPPLEMENT_ELEMENTS.regexPatterns.length,
        transparentBackgroundEnforced: true,
        squareFormatOptimized: true,
        seamlessCompositionApplied: true,
        naturalBlendingIntegrated: true,
        borderlessDesignEnforced: true,
        properMarginsEnforced: true,
        edgeBoundaryControlApplied: true,
        whiteBackgroundCompatible: true
      }
    });

  } catch (error) {
    console.error('❌ Błąd generowania promptu okładki:', error);
    return NextResponse.json({
      error: 'Błąd wewnętrzny serwera',
      details: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'GPT-Image-1 Ultra-Detailed Book Cover Prompt Generator with Supplement Restrictions',
    supportedModels: ['gpt-image-1'],
    maxPromptLength: 4000,
    recommendedFormat: 'portrait-1024x1536',
    optimizedFor: 'ultra-detailed-book-cover-design-supplement-safe',
    capabilities: [
      'Ultra-long cover prompts (up to 4000 chars)',
      'Portrait book cover format (1024x1536)',
      'Deep book content interpretation',
      'Commercial cover appeal optimization',
      'Professional publishing standards',
      'Genre-specific visual language',
      'Advanced supplement content restrictions',
      'Automatic forbidden element removal',
      'Comprehensive compliance validation'
    ],
    contentRestrictions: {
      absolutelyForbidden: [
        'Capsules, tablets, pills, softgels in any form',
        'Omega-3 supplements in solid forms',
        'Scattered small round objects resembling pills',
        'Transparent capsules or gel caps',
        'Blister packaging with medications',
        'Any visual elements suggesting supplement forms'
      ],
      automatedFiltering: true,
      complianceValidation: true,
      regexPatterns: FORBIDDEN_SUPPLEMENT_ELEMENTS.regexPatterns.length
    }
  }, { status: 405 });
}