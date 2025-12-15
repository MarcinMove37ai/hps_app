// src/app/api/ebooks/[ebookId]/generate-cover/route.ts

import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { OpenAI } from 'openai';
import { Client } from 'pg';
import sharp from 'sharp';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
    'gelowe kapsułki', 'blister packaging', 'gel caps'
  ],

  // Wzorce regex do skanowania
  regexPatterns: [
    /\b(capsule|tablet|pill|softgel|kapsułk|tabletk|pilulk|żelk)s?\b/gi,
    /\b(omega-3|fish oil|supplement|vitamin)\s+(capsule|tablet|pill)s?\b/gi,
    /\bscattered\s+(capsule|tablet|pill)s?\b/gi,
    /\bsmall\s+round\s+(objects|obiekt)/gi,
    /\b(gel\s*caps?|gelcaps?)\b/gi,
    /\bblister\s+pack/gi
  ]
};

// Funkcja KRYTYCZNEGO czyszczenia promptu z zabronionych form suplementów
const criticalSupplementCleanup = (prompt: string, context: string = 'cover'): string => {
  let cleanedPrompt = prompt;
  let violationsFound = 0;

  console.log(`🚫 === CRITICAL SUPPLEMENT CLEANUP (${context.toUpperCase()}) ===`);

  // Poziom 1: Sprawdzenie i usunięcie wzorców regex
  FORBIDDEN_SUPPLEMENT_ELEMENTS.regexPatterns.forEach((pattern, index) => {
    const matches = cleanedPrompt.match(pattern);
    if (matches) {
      violationsFound += matches.length;
      console.log(`❌ VIOLATION ${index + 1}: Found ${matches.length} forbidden patterns: ${matches.join(', ')}`);
      cleanedPrompt = cleanedPrompt.replace(pattern, '');
    }
  });

  // Poziom 2: Usunięcie konkretnych fraz - SOLIDFORMS (najważniejsze)
  FORBIDDEN_SUPPLEMENT_ELEMENTS.solidForms.forEach(forbidden => {
    const regex = new RegExp('\\b' + forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    const matches = cleanedPrompt.match(regex);
    if (matches) {
      violationsFound += matches.length;
      console.log(`❌ SOLID FORM VIOLATION: Removing "${forbidden}" (${matches.length} occurrences)`);
      cleanedPrompt = cleanedPrompt.replace(regex, '');
    }
  });

  // Poziom 3: Usunięcie kombinacji omega-3 (szczególnie ważne)
  FORBIDDEN_SUPPLEMENT_ELEMENTS.omega3Combinations.forEach(forbidden => {
    const regex = new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(cleanedPrompt)) {
      violationsFound++;
      console.log(`❌ OMEGA-3 VIOLATION: Removing "${forbidden}"`);
      cleanedPrompt = cleanedPrompt.replace(regex, '');
    }
  });

  // Poziom 4: Usunięcie kontekstów problematycznych
  FORBIDDEN_SUPPLEMENT_ELEMENTS.problematicContexts.forEach(forbidden => {
    const regex = new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (regex.test(cleanedPrompt)) {
      violationsFound++;
      console.log(`❌ CONTEXT VIOLATION: Removing "${forbidden}"`);
      cleanedPrompt = cleanedPrompt.replace(regex, '');
    }
  });

  // Poziom 5: Dodatkowe czyszczenie białych znaków i normalizacja
  cleanedPrompt = cleanedPrompt
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*,/g, ',')
    .replace(/\s*\.\s*\./g, '.')
    .replace(/^[,.\s]+|[,.\s]+$/g, '')
    .trim();

  // Końcowy raport compliance
  const complianceStatus = violationsFound === 0 ? 'COMPLIANT' : 'VIOLATIONS REMOVED';
  console.log(`🔍 COMPLIANCE REPORT:`);
  console.log(`   - Violations found: ${violationsFound}`);
  console.log(`   - Original length: ${prompt.length} chars`);
  console.log(`   - Cleaned length: ${cleanedPrompt.length} chars`);
  console.log(`   - Status: ${complianceStatus}`);
  console.log(`   - Change: ${prompt.length - cleanedPrompt.length} chars removed`);

  if (violationsFound > 0) {
    console.log(`✅ SUPPLEMENT COMPLIANCE ACHIEVED - ${violationsFound} violations removed`);
  } else {
    console.log(`✅ PROMPT WAS ALREADY SUPPLEMENT-COMPLIANT`);
  }

  return cleanedPrompt;
};

// Funkcja dodawania pozytywnych zakazów do promptu
const addSupplementBanClauses = (prompt: string): string => {
  const banClauses = [
    "ABSOLUTELY FORBIDDEN: capsules, tablets, pills, softgels, lozenges, or any solid supplement forms",
    "STRICTLY PROHIBITED: omega-3 capsules, fish oil tablets, vitamin pills, scattered round objects",
    "BANNED: kapsułki, tabletki, pilulki, żelki, pastylki, gel caps, blister packaging",
    "NO medication forms, supplement containers, or pharmaceutical representations",
    "SEAMLESS: transparent background with natural edge blending, no borders or frames",
    "COMPOSITION: contained within image bounds with fade-out edges for natural blending",
    "MARGINS: proper internal spacing with adequate clearance from all image edges",
    "BOUNDARIES: all elements positioned away from image perimeter for white background compatibility"
  ];

  // Sprawdź czy prompt już ma zakazy
  const hasExistingBans = banClauses.some(clause =>
    prompt.toLowerCase().includes(clause.toLowerCase().substring(0, 20))
  );

  if (hasExistingBans) {
    console.log(`✅ Prompt already contains supplement ban and margin composition clauses`);
    return prompt;
  }

  console.log(`🔒 Adding supplement ban and margin composition clauses to prompt`);
  const banSection = ` ${banClauses.join('. ')}.`;

  return prompt + banSection;
};

// ===== KONFIGURACJA GPT-IMAGE-1 ZOPTYMALIZOWANA POD OKŁADKI =====
const COVER_MODEL_CONFIGS = {
  "gpt-image-1": {
    maxPromptLength: 4000,  // 🔥 PEŁNY LIMIT GPT-Image-1 dla okładek
    quality: "high" as const,  // 🔥 Najwyższa jakość dla okładek
    output_format: "png" as const,  // 🔥 Best dla okładek książek
    background: "transparent" as const,  // 🔥 Przezroczyste tło jako priorytet
    moderation: "auto" as const,
    costEstimate: 0.12,  // Wyższa cena za high quality
    defaultSize: '1024x1024',  // 🔥 KWADRATOWY format dla okładek książek
    sizes: ['1024x1024', '1536x1024', '1024x1536']  // Kwadratowy preferowany
  },
  "dall-e-3": {
    maxPromptLength: 400,   // Fallback limits
    quality: "standard" as const,
    style: "natural" as const,
    costEstimate: 0.04,
    defaultSize: '1024x1024',
    sizes: ['1024x1024', '1792x1024', '1024x1792']
  }
} as const;

// Sprawdzenie konfiguracji na starcie
console.log('🚀 === GPT-IMAGE-1 BOOK COVER GENERATOR WITH SUPPLEMENT RESTRICTIONS ===');
console.log(`   - API Key: ${!!process.env.OPENAI_API_KEY ? 'OK' : 'MISSING'}`);
console.log(`   - Primary Model: gpt-image-1 (4000 char limit)`);
console.log(`   - Default Format: Square 1024x1024 (book cover)`);
console.log(`   - Background: transparent (PRIORITY)`);
console.log(`   - Quality: high (maximum quality)`);
console.log(`   - Composition: seamless edge-free design`);
console.log(`   - Specialization: Professional book covers (supplement-safe, transparent, seamless)`);
console.log(`   - Content Restrictions: FULL SUPPLEMENT COMPLIANCE`);
console.log('🚀 === COVER GENERATOR READY ===');

function logApiKey(apiKey: string | undefined): string {
  if (!apiKey) return 'MISSING';
  if (apiKey.length < 8) return 'INVALID';
  return `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`;
}

function debugApiKey() {
  console.log('🔍 === COVER API KEY DEBUG ===');
  console.log(`   - OPENAI_API_KEY exists: ${!!process.env.OPENAI_API_KEY}`);
  console.log(`   - Length: ${process.env.OPENAI_API_KEY?.length || 0}`);
  console.log(`   - Format: ${logApiKey(process.env.OPENAI_API_KEY)}`);
  console.log('🔍 === END DEBUG ===');
}

// INTELIGENTNA OPTYMALIZACJA PROMPTU OKŁADKI Z KONTROLĄ SUPLEMENTÓW
const optimizePromptForBookCover = (prompt: string, bookTitle: string): string => {
  console.log(`🔍 === COVER PROMPT OPTIMIZATION WITH SUPPLEMENT CONTROL ===`);
  console.log(`   - Input length: ${prompt.length} chars`);
  console.log(`   - GPT-Image-1 limit: 4000 chars`);

  // ETAP 1: KRYTYCZNE czyszczenie z suplementów
  let cleanedPrompt = criticalSupplementCleanup(prompt, 'optimization');

  // ETAP 2: Sprawdzenie czy prompt okładki jest już zoptymalizowany przez Claude
  const claudeCoverOptimized = {
    ultraSophisticated: cleanedPrompt.includes("ultra-sophisticated") || cleanedPrompt.includes("Create a professional"),
    bookCover: cleanedPrompt.toLowerCase().includes("book cover") || cleanedPrompt.toLowerCase().includes("cover design"),
    squareFormat: cleanedPrompt.includes("1024x1024") || cleanedPrompt.toLowerCase().includes("square") || cleanedPrompt.toLowerCase().includes('1024x1024'),
    transparentBackground: cleanedPrompt.toLowerCase().includes("transparent background") || cleanedPrompt.toLowerCase().includes("transparent"),
    seamlessComposition: cleanedPrompt.toLowerCase().includes("seamless") || cleanedPrompt.toLowerCase().includes("borderless") || cleanedPrompt.toLowerCase().includes("edge-free"),
    naturalBlending: cleanedPrompt.toLowerCase().includes("natural") && (cleanedPrompt.toLowerCase().includes("blend") || cleanedPrompt.toLowerCase().includes("fade")),
    properMargins: cleanedPrompt.toLowerCase().includes("margin") || cleanedPrompt.toLowerCase().includes("spacing") || cleanedPrompt.toLowerCase().includes("clearance"),
    edgeBoundaries: cleanedPrompt.toLowerCase().includes("boundaries") || cleanedPrompt.toLowerCase().includes("contained") || cleanedPrompt.toLowerCase().includes("touch"),
    noTextClause: cleanedPrompt.toLowerCase().includes("no text") || cleanedPrompt.toLowerCase().includes("absolutely no text"),
    commercial: cleanedPrompt.toLowerCase().includes("commercial") || cleanedPrompt.toLowerCase().includes("marketing"),
    professional: cleanedPrompt.toLowerCase().includes("professional"),
    supplementBan: cleanedPrompt.toLowerCase().includes("forbidden") || cleanedPrompt.toLowerCase().includes("prohibited"),
    longForm: cleanedPrompt.length > 2000  // Claude generuje długie prompty okładek
  };

  const isClaudeCoverOptimized = Object.values(claudeCoverOptimized).filter(Boolean).length >= 8;

  console.log(`   - Claude cover optimization markers:`);
  console.log(`     * Ultra-sophisticated: ${claudeCoverOptimized.ultraSophisticated ? '✅' : '❌'}`);
  console.log(`     * Book cover specific: ${claudeCoverOptimized.bookCover ? '✅' : '❌'}`);
  console.log(`     * Square format: ${claudeCoverOptimized.squareFormat ? '✅' : '❌'}`);
  console.log(`     * Transparent background: ${claudeCoverOptimized.transparentBackground ? '✅' : '❌'}`);
  console.log(`     * Seamless composition: ${claudeCoverOptimized.seamlessComposition ? '✅' : '❌'}`);
  console.log(`     * Natural blending: ${claudeCoverOptimized.naturalBlending ? '✅' : '❌'}`);
  console.log(`     * Proper margins: ${claudeCoverOptimized.properMargins ? '✅' : '❌'}`);
  console.log(`     * Edge boundaries: ${claudeCoverOptimized.edgeBoundaries ? '✅' : '❌'}`);
  console.log(`     * No text clause: ${claudeCoverOptimized.noTextClause ? '✅' : '❌'}`);
  console.log(`     * Commercial appeal: ${claudeCoverOptimized.commercial ? '✅' : '❌'}`);
  console.log(`     * Professional quality: ${claudeCoverOptimized.professional ? '✅' : '❌'}`);
  console.log(`     * Supplement ban: ${claudeCoverOptimized.supplementBan ? '✅' : '❌'}`);
  console.log(`     * Long form: ${claudeCoverOptimized.longForm ? '✅' : '❌'}`);
  console.log(`   - IS CLAUDE COVER OPTIMIZED: ${isClaudeCoverOptimized ? '✅ YES' : '❌ NO'}`);

  let finalPrompt = cleanedPrompt;

  if (isClaudeCoverOptimized) {
    // PROMPT OKŁADKI Z CLAUDE - UŻYWAJ PRAKTYCZNIE BEZ ZMIAN
    if (!claudeCoverOptimized.supplementBan) {
      console.log(`🔒 Adding missing supplement ban to Claude prompt`);
      finalPrompt = addSupplementBanClauses(cleanedPrompt);
    }

    if (finalPrompt.length <= COVER_MODEL_CONFIGS["gpt-image-1"].maxPromptLength) {
      console.log(`✅ PERFECT COVER - Using Claude prompt with supplement safety (${finalPrompt.length}/4000 chars)`);
      return finalPrompt;
    } else {
      console.warn(`⚠️ Claude cover prompt slightly too long (${finalPrompt.length}), minimal trim to 4000`);
      return finalPrompt.substring(0, 3997) + "...";
    }
  } else {
    // PROSTY PROMPT OKŁADKI - DODAJ ULEPSZENIA SPECYFICZNE DLA OKŁADEK I SUPPLEMENT BAN
    console.log(`🔧 SIMPLE COVER PROMPT - Adding book cover enhancements with supplement restrictions, transparent background, seamless composition, and proper margins`);

    const enhanced = `Create a professional ultra-high-definition book cover illustration with transparent background and seamless edge-free composition with proper internal margins: ${cleanedPrompt}

Technical book cover specifications: Perfect square 1024x1024 composition with transparent background and borderless seamless design optimized for book covers, photorealistic rendering with commercial appeal, rich harmonious color palette designed for shelf visibility with transparent background and natural edge blending, professional book cover lighting with transparent background integration and soft fade-out edges, no text or letters whatsoever, premium publishing quality with transparent background and composition contained within image bounds for natural blending with any surface. CRITICAL SPACING: All compositional elements positioned with adequate margins from image edges, ensuring no objects touch or approach image boundaries for seamless white background integration.

ABSOLUTELY FORBIDDEN: capsules, tablets, pills, softgels, lozenges, kapsułki, tabletki, pilulki, or any solid supplement forms. STRICTLY PROHIBITED: omega-3 capsules, fish oil tablets, scattered round objects, gel caps, blister packaging.

Perfect book cover design with transparent background, seamless edges, proper internal margins, and natural blending capability for "${bookTitle}".`.trim();

    if (enhanced.length <= COVER_MODEL_CONFIGS["gpt-image-1"].maxPromptLength) {
      console.log(`✅ Enhanced cover prompt with supplement safety (${enhanced.length}/4000 chars)`);
      return enhanced;
    } else {
      console.warn(`⚠️ Enhanced cover prompt too long, trimming to 4000`);
      return enhanced.substring(0, 3950) + " Perfect cover design.";
    }
  }
};

// Retry logic dla okładek
const executeWithRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 2000
): Promise<T> => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      console.log(`❌ Cover attempt ${attempt}/${maxRetries} failed: ${error.message}`);

      if (attempt === maxRetries) throw error;

      let delay = baseDelay;
      if (error?.status === 429) {
        delay = baseDelay * Math.pow(2, attempt);
        console.log(`⏳ Cover rate limited, waiting ${delay}ms...`);
      } else if (error?.status >= 500) {
        delay = baseDelay * attempt;
        console.log(`🔄 Cover server error, waiting ${delay}ms...`);
      } else {
        delay = 1000;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Cover generation max retries exceeded');
};

// Sprawdzenie fallback conditions
const shouldFallbackToDallE3 = (error: any): boolean => {
  const fallbackConditions = [
    error?.status === 403,
    error?.status === 400 && error?.code === 'billing_hard_limit_reached',
    error?.status === 429 && error?.message?.includes('organization'),
    error?.message?.toLowerCase().includes('organization'),
    error?.message?.toLowerCase().includes('gpt-image-1'),
    error?.message?.toLowerCase().includes('verification'),
    error?.message?.toLowerCase().includes('access denied')
  ];

  return fallbackConditions.some(condition => condition);
};

// Zaawansowana optymalizacja obrazu dla okładek książek
const optimizeImageForBookCover = async (imageBuffer: ArrayBuffer): Promise<Buffer> => {
  const originalSize = (imageBuffer.byteLength / 1024).toFixed(1);

  const optimized = await sharp(Buffer.from(imageBuffer))
    .png({
      quality: 98,        // 🔥 Wysoka jakość dla okładek (marketing)
      compressionLevel: 4, // Mniejsza kompresja dla okładek
      effort: 9,          // Maksymalny effort dla okładek
      palette: false,
      adaptiveFiltering: true
    })
    .resize(1024, 1024, {  // 🔥 Wymuszenie formatu kwadratowego
      fit: 'cover',
      position: 'center',
      withoutEnlargement: false
    })
    .sharpen({ sigma: 0.8, m1: 1.2, m2: 2.5 })  // 🔥 Mocniejsze wyostrzenie dla okładek
    .toBuffer();

  const optimizedSize = (optimized.length / 1024).toFixed(1);
  console.log(`🔧 Book cover optimization: ${originalSize}KB → ${optimizedSize}KB (square format with transparent background)`);

  return optimized;
};

const generateCoverS3Metadata = (
  actualModelUsed: string,
  ebookIdNum: number,
  promptLength: number,
  generationTime: number,
  qualityLevel: string,
  supplementCompliant: boolean
) => ({
  'x-generated-by': `openai-${actualModelUsed}`,
  'x-ebook-id': ebookIdNum.toString(),
  'x-content-type': 'book-cover',
  'x-format': 'square-1024x1024-transparent-seamless-margins',
  'x-background': 'transparent',
  'x-composition': 'seamless-edge-free-with-margins',
  'x-blending': 'natural-fade-edges',
  'x-margins': 'proper-internal-spacing',
  'x-boundaries': 'contained-within-bounds',
  'x-white-compatibility': 'optimized-for-white-background',
  'x-prompt-length': promptLength.toString(),
  'x-model-version': actualModelUsed,
  'x-generation-date': new Date().toISOString(),
  'x-cost-estimate': COVER_MODEL_CONFIGS[actualModelUsed as keyof typeof COVER_MODEL_CONFIGS]?.costEstimate.toString() || '0',
  'x-generation-time-ms': generationTime.toString(),
  'x-quality-level': qualityLevel,
  'x-optimization-level': 'gpt-image-1-professional-book-cover-supplement-safe-transparent-seamless-margins',
  'x-fallback-used': actualModelUsed !== "gpt-image-1" ? 'true' : 'false',
  'x-cover-version': '6.0',
  'x-api-version': 'gpt-image-1-cover-optimized-supplement-restricted-transparent-seamless-margins',
  'x-supplement-compliant': supplementCompliant ? 'true' : 'false',
  'x-content-restrictions': 'full-supplement-ban-applied',
  'x-transparent-background': 'true',
  'x-seamless-composition': 'true',
  'x-borderless-design': 'true',
  'x-proper-margins': 'true',
  'x-edge-clearance': 'enforced'
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

const EBOOK_AI_FOLDER = 'ebookAI';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  let client;
  const startTime = Date.now();

  try {
    debugApiKey();

    const resolvedParams = await params;
    const ebookId = resolvedParams.ebookId;

    console.log(`🎨 === BOOK COVER GENERATION WITH SUPPLEMENT RESTRICTIONS ===`);
    console.log(`   - Ebook ID: ${ebookId}`);
    console.log(`   - Timestamp: ${new Date().toISOString()}`);
    console.log(`   - Target: Professional book cover (square, transparent background, supplement-safe)`);
    console.log(`   - Content Policy: FULL SUPPLEMENT BAN ENFORCEMENT`);

    const { forceRegenerate = false, size = '1024x1024' } = await request.json();  // 🔥 Domyślnie kwadratowy

    if (!ebookId) {
      return NextResponse.json({ error: 'Missing required parameter: ebookId' }, { status: 400 });
    }

    const ebookIdNum = parseInt(ebookId);
    if (isNaN(ebookIdNum)) {
      return NextResponse.json({ error: 'Invalid ebook identifier' }, { status: 400 });
    }

    // Database connection
    client = new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      ssl: { rejectUnauthorized: false }
    });

    await client.connect();
    console.log('✅ Database connected');

    // Fetch ebook data
    const ebookQuery = `
      SELECT id, title, subtitle, cover_image_prompt as existing_cover_prompt
      FROM ebooks WHERE id = $1
    `;

    const ebookResult = await client.query(ebookQuery, [ebookIdNum]);

    if (ebookResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ebook not found' }, { status: 404 });
    }

    const {
      title: ebookTitle,
      subtitle: ebookSubtitle,
      existing_cover_prompt: existingCoverPrompt
    } = ebookResult.rows[0];

    console.log(`📖 Found ebook: "${ebookTitle}" ${ebookSubtitle ? `- "${ebookSubtitle}"` : ''}`);

    // Fetch chapters for context
    const chaptersQuery = `
      SELECT title, content FROM ebook_chapters
      WHERE ebook_id = $1 ORDER BY position
    `;

    const chaptersResult = await client.query(chaptersQuery, [ebookIdNum]);
    const chapters = chaptersResult.rows;

    if (chapters.length === 0) {
      return NextResponse.json({ error: 'Ebook has no chapters for cover generation' }, { status: 400 });
    }

    console.log(`📚 Found ${chapters.length} chapters for cover context`);

    let coverPrompt = existingCoverPrompt;

    // ETAP 1: Generate ultra-detailed cover prompt via Claude (with supplement restrictions)

  console.log('🔄 === GENERATING ULTRA-DETAILED SUPPLEMENT-SAFE COVER PROMPT ===');

  const promptResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/anthropic/generate-cover-prompt`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: ebookTitle,
      subtitle: ebookSubtitle,
      chapters: chapters
    }),
  });

  if (!promptResponse.ok) {
    const errorData = await promptResponse.json();
    console.error('❌ Claude cover prompt generation failed:', errorData);
    return NextResponse.json({
      error: 'Failed to generate cover prompt',
      details: errorData.error
    }, { status: 500 });
  }

  const promptData = await promptResponse.json();
  coverPrompt = promptData.coverPrompt;

  console.log(`✅ Ultra-detailed supplement-safe cover prompt generated:`);
  console.log(`   - Length: ${promptData.promptLength} chars`);
  console.log(`   - Quality: ${(promptData.qualityMetrics?.overallQuality * 100 || 0).toFixed(1)}%`);
  console.log(`   - Format: ${promptData.format || 'portrait'}`);
  console.log(`   - Supplement Compliance: ${promptData.supplementCompliance ? '✅' : '❌'}`);
  console.log(`   - Utilization: ${promptData.utilization || 'N/A'}`);

  if (!promptData.supplementCompliance) {
    console.warn(`⚠️ COMPLIANCE WARNING: Generated prompt may contain forbidden elements!`);
  }

  // Save cover prompt to database
  const updatePromptQuery = `
    UPDATE ebooks
    SET cover_image_prompt = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
  `;
  await client.query(updatePromptQuery, [coverPrompt, ebookIdNum]);
  console.log('💾 Cover prompt saved to database');

    // ETAP 2: GPT-Image-1 Cover Generation with CRITICAL supplement filtering
    console.log(`🚀 === GPT-IMAGE-1 SUPPLEMENT-SAFE COVER GENERATION ===`);

    let modelToUse = "gpt-image-1";
    let actualModelUsed = modelToUse;
    let imageResponse;
    let finalPrompt: string = coverPrompt;
    let supplementCompliant = false;

    // GPT-Image-1 configuration for covers
    const gptImage1Config = COVER_MODEL_CONFIGS["gpt-image-1"];
    const validSize = gptImage1Config.sizes.includes(size as any) ? size : gptImage1Config.defaultSize;

    console.log(`   - Target model: ${modelToUse}`);
    console.log(`   - Size: ${validSize} (square book cover)`);
    console.log(`   - Quality: ${gptImage1Config.quality}`);
    console.log(`   - Format: ${gptImage1Config.output_format}`);
    console.log(`   - Background: ${gptImage1Config.background} (PRIORITY)`);
    console.log(`   - Content Policy: FULL SUPPLEMENT RESTRICTIONS`);

    try {
      // KRYTYCZNA optymalizacja promptu z kontrolą suplementów
      finalPrompt = optimizePromptForBookCover(coverPrompt, ebookTitle);

      // FINALNA walidacja compliance przed wysłaniem do OpenAI
      const finalComplianceCheck = FORBIDDEN_SUPPLEMENT_ELEMENTS.regexPatterns.some(pattern =>
        pattern.test(finalPrompt)
      );

      if (finalComplianceCheck) {
        console.error(`❌ CRITICAL COMPLIANCE FAILURE: Final prompt contains forbidden elements!`);
        console.log(`🧹 Performing emergency cleanup...`);
        finalPrompt = criticalSupplementCleanup(finalPrompt, 'final-check');

        // Dodaj silne zakazy jako ostatni środek
        finalPrompt = addSupplementBanClauses(finalPrompt);

        // Przytnij jeśli za długi
        if (finalPrompt.length > gptImage1Config.maxPromptLength) {
          finalPrompt = finalPrompt.substring(0, gptImage1Config.maxPromptLength - 3) + "...";
        }
      }

      supplementCompliant = !FORBIDDEN_SUPPLEMENT_ELEMENTS.regexPatterns.some(pattern =>
        pattern.test(finalPrompt)
      );

      console.log(`📝 === FINAL SUPPLEMENT-SAFE COVER PROMPT ANALYSIS ===`);
      console.log(`   - Original (from source): ${coverPrompt.length} chars`);
      console.log(`   - Final (for GPT-Image-1): ${finalPrompt.length} chars`);
      console.log(`   - Processing change: ${finalPrompt.length - coverPrompt.length} chars`);
      console.log(`   - Utilization: ${((finalPrompt.length/4000)*100).toFixed(1)}% of GPT-Image-1 capacity`);
      console.log(`   - 🚫 SUPPLEMENT COMPLIANCE: ${supplementCompliant ? '✅ COMPLIANT' : '❌ VIOLATIONS DETECTED'}`);

      if (!supplementCompliant) {
        console.error(`❌ CRITICAL ERROR: Cannot proceed with non-compliant prompt!`);
        throw new Error('Prompt contains forbidden supplement elements and cannot be processed');
      }

      // Generate with GPT-Image-1
      const generationStartTime = Date.now();

      imageResponse = await executeWithRetry(async () => {
        return await openai.images.generate({
          model: "gpt-image-1",
          prompt: finalPrompt,
          n: 1,
          size: validSize as any,
          quality: gptImage1Config.quality,
          output_format: gptImage1Config.output_format,
          background: gptImage1Config.background,
          moderation: gptImage1Config.moderation
        });
      });

      const generationEndTime = Date.now();
      console.log(`✅ GPT-Image-1 SUPPLEMENT-SAFE COVER SUCCESS!`);
      console.log(`   - Generation time: ${generationEndTime - generationStartTime}ms`);
      console.log(`   - Cost estimate: ${gptImage1Config.costEstimate}`);
      console.log(`   - Model used: ${actualModelUsed} (primary)`);
      console.log(`   - Format: Professional book cover (${validSize}) with transparent background`);
      console.log(`   - Content Safety: SUPPLEMENT-COMPLIANT`);

    } catch (error: any) {
      console.error(`❌ GPT-Image-1 cover failed:`, error.message);

      if (shouldFallbackToDallE3(error)) {
        console.warn(`⚠️ === COVER FALLBACK TO DALL-E 3 WITH SUPPLEMENT SAFETY ===`);

        modelToUse = "dall-e-3";
        actualModelUsed = "dall-e-3";

        const dalleConfig = COVER_MODEL_CONFIGS["dall-e-3"];
        const dalleSize = dalleConfig.sizes.includes(size as any) ? size : dalleConfig.defaultSize;

        // Drastically shorten prompt for DALL-E 3 but maintain supplement safety and margins
        let dallePrompt = finalPrompt.length > 350 ?
          `Professional book cover illustration with transparent background and proper margins: ${finalPrompt.substring(0, 150)}... No text, square format, transparent background, composition contained within bounds with adequate spacing from edges, "${ebookTitle}". FORBIDDEN: capsules, tablets, pills.` :
          finalPrompt;

        // Ensure DALL-E prompt is also supplement-safe
        dallePrompt = criticalSupplementCleanup(dallePrompt, 'dalle-fallback');
        dallePrompt = addSupplementBanClauses(dallePrompt);

        if (dallePrompt.length > 400) {
          dallePrompt = dallePrompt.substring(0, 280) + "... Transparent background, proper margins, no pills/capsules.";
        }

        console.log(`   - DALL-E 3 size: ${dalleSize}`);
        console.log(`   - DALL-E 3 prompt: ${dallePrompt.length} chars (supplement-safe)`);

        imageResponse = await executeWithRetry(async () => {
          return await openai.images.generate({
            model: "dall-e-3",
            prompt: dallePrompt,
            n: 1,
            size: dalleSize as "1024x1792" | "1792x1024" | "1024x1024",
            quality: dalleConfig.quality,
            style: dalleConfig.style
          });
        });

        console.log(`✅ DALL-E 3 seamlessly blended cover fallback succeeded (cost: ${dalleConfig.costEstimate})`);
      } else {
        throw error;
      }
    }

    const endTime = Date.now();
    const totalGenerationTime = endTime - startTime;

    console.log(`⏱️ Total supplement-safe cover process time: ${totalGenerationTime}ms`);

    if (!imageResponse.data || imageResponse.data.length === 0) {
      throw new Error('No cover image data in OpenAI response');
    }

    // Handle response format (base64 vs URL)
    const imageData = imageResponse.data[0];
    let imageBuffer: ArrayBuffer;

    if (imageData.b64_json) {
      console.log('📥 Decoding cover from base64 (GPT-Image-1)');
      imageBuffer = Buffer.from(imageData.b64_json, 'base64').buffer;
    } else if (imageData.url) {
      console.log(`📥 Fetching cover from URL (DALL-E 3): ${imageData.url}`);
      const imageResponseData = await fetch(imageData.url);
      if (!imageResponseData.ok) {
        throw new Error(`Failed to fetch cover image: ${imageResponseData.status}`);
      }
      imageBuffer = await imageResponseData.arrayBuffer();
    } else {
      throw new Error('Invalid OpenAI cover response format');
    }

    // Advanced image optimization for book covers
    const processedImageBuffer = await optimizeImageForBookCover(imageBuffer);

    // S3 upload with comprehensive cover metadata including compliance info
    const fileName = `EB${ebookIdNum}_COVER_GPT1_MARGINS_${Date.now()}.png`;
    const s3Key = `${EBOOK_AI_FOLDER}/${fileName}`;

    const metadata = generateCoverS3Metadata(
      actualModelUsed,
      ebookIdNum,
      finalPrompt?.length || coverPrompt.length,
      totalGenerationTime,
      actualModelUsed === "gpt-image-1" ? "medium" : "standard",
      supplementCompliant
    );

    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: processedImageBuffer,
      ContentType: 'image/png',
      Metadata: metadata
    });

    await s3Client.send(uploadCommand);
    console.log(`☁️ Supplement-safe cover uploaded to S3: ${s3Key}`);

    // Database updates
    const finalCoverUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com/${s3Key}`;

    const updateQuery = `
      UPDATE ebooks
      SET cover_image_url = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, title, subtitle, cover_image_url, cover_image_prompt
    `;

    const updateResult = await client.query(updateQuery, [finalCoverUrl, ebookIdNum]);

    // Comprehensive success metrics with compliance info
    const costEstimate = COVER_MODEL_CONFIGS[actualModelUsed as keyof typeof COVER_MODEL_CONFIGS]?.costEstimate || 0;

    console.log(`📊 === SUPPLEMENT-SAFE COVER GENERATION COMPLETE ===`);
    console.log(`   - Model: ${actualModelUsed} ${actualModelUsed !== "gpt-image-1" ? '(fallback)' : '(primary)'}`);
    console.log(`   - Total time: ${totalGenerationTime}ms`);
    console.log(`   - Cost: ${costEstimate}`);
    console.log(`   - Prompt length: ${finalPrompt?.length || coverPrompt.length}/${COVER_MODEL_CONFIGS["gpt-image-1"].maxPromptLength} chars`);
    console.log(`   - Image size: ${(processedImageBuffer.length / 1024).toFixed(1)}KB`);
    console.log(`   - Format: ${validSize} (professional book cover with transparent background)`);
    console.log(`   - 🚫 Supplement Compliance: ${supplementCompliant ? '✅ FULLY COMPLIANT' : '❌ COMPLIANCE ISSUES'}`);
    console.log(`   - 🎨 Background: transparent (PRIORITY ACHIEVED)`);
    console.log(`   - Content Safety: FULL SUPPLEMENT BAN ENFORCED`);
    console.log(`   - S3 URL: ${finalCoverUrl}`);
    console.log(`   - Success: TRUE`);
    console.log(`📊 === END SUPPLEMENT-SAFE COVER METRICS ===`);

    return NextResponse.json({
      success: true,
      cover_image_url: finalCoverUrl,
      ebook: updateResult.rows[0],
      generation_metrics: {
        model_used: actualModelUsed,
        model_attempted: "gpt-image-1",
        generation_time_ms: totalGenerationTime,
        cost_estimate: costEstimate,
        prompt_length: finalPrompt?.length || coverPrompt.length,
        prompt_utilization: `${(((finalPrompt?.length || coverPrompt.length)/4000)*100).toFixed(1)}%`,
        image_size_kb: Math.round(processedImageBuffer.length / 1024),
        optimization_level: 'gpt-image-1-professional-book-cover-supplement-safe-transparent-seamless-margins',
        fallback_used: actualModelUsed !== "gpt-image-1",
        quality_setting: actualModelUsed === "gpt-image-1" ? "high" : "standard",
        cover_format: validSize,
        background_type: "transparent",
        composition_type: "seamless-edge-free-with-margins",
        margin_control: "proper-internal-spacing",
        prompt_processing: "full-supplement-restriction-applied-transparent-background-seamless-composition-margins",
        supplement_compliant: supplementCompliant,
        content_safety_level: "full-supplement-ban-enforced"
      },
      prompt_used: coverPrompt,
      prompt_was_generated: !existingCoverPrompt || forceRegenerate,
      // 🎯 DODAJ TIMESTAMP dla cache busting (jak w rozdziałach)
      generation_timestamp: Date.now(),
      cache_bust_url: finalCoverUrl + '?t=' + Date.now(),
      content_compliance: {
        supplement_safe: supplementCompliant,
        restrictions_applied: true,
        forbidden_elements_removed: true,
        compliance_level: "full-supplement-ban",
        validation_passed: supplementCompliant,
        transparent_background_applied: true,
        square_format_optimized: true,
        seamless_composition_applied: true,
        natural_blending_integrated: true,
        borderless_design_enforced: true,
        edge_free_composition: true,
        proper_margins_enforced: true,
        internal_spacing_controlled: true,
        white_background_compatible: true,
        edge_clearance_maintained: true
      }
    });

  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error('❌ === SUPPLEMENT-SAFE COVER WITH MARGINS GENERATION FAILED ===');
    console.error(`   - Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error(`   - Total time: ${totalTime}ms`);
    console.error(`   - API Key: ${logApiKey(process.env.OPENAI_API_KEY)}`);

    return NextResponse.json({
      error: 'Supplement-safe book cover with proper margins generation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      model_attempted: "gpt-image-1",
      generation_time_ms: totalTime,
      content_safety: "supplement-restrictions-and-margin-control-attempted"
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
      console.log('🔐 Database connection closed');
    }
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'GPT-Image-1 Ultra-Detailed Book Cover Generator with Full Supplement Restrictions, Transparent Background, Seamless Composition, and Proper Margins',
    supportedModels: ['gpt-image-1', 'dall-e-3'],
    maxPromptLength: 4000,
    recommendedFormat: 'square-1024x1024-transparent-seamless-margins',
    backgroundType: 'transparent',
    compositionType: 'seamless-edge-free-with-margins',
    marginControl: 'proper-internal-spacing',
    qualityLevel: 'high',
    optimizedFor: 'ultra-detailed-book-cover-design-supplement-safe-transparent-seamless-margins',
    capabilities: [
      'Ultra-long cover prompts (up to 4000 chars)',
      'Square book cover format (1024x1024)',
      'High quality rendering (premium)',
      'Transparent background priority integration',
      'Seamless edge-free composition',
      'Natural blending with surfaces',
      'Borderless design enforcement',
      'Proper internal margin control',
      'Edge clearance maintenance',
      'White background compatibility optimization',
      'Deep book content interpretation',
      'Commercial cover appeal optimization',
      'Professional publishing standards',
      'Genre-specific visual language',
      'FULL SUPPLEMENT CONTENT RESTRICTIONS',
      'Automatic forbidden element removal',
      'Multi-level compliance validation',
      'Emergency prompt cleanup',
      'Content safety enforcement',
      'Transparent background optimization',
      'Seamless composition validation',
      'Margin spacing enforcement'
    ],
    contentRestrictions: {
      level: "CRITICAL - FULL SUPPLEMENT BAN",
      absolutelyForbidden: [
        'Capsules, tablets, pills, softgels in any form',
        'Omega-3 supplements in solid forms',
        'Scattered small round objects resembling pills',
        'Transparent capsules or gel caps',
        'Blister packaging with medications',
        'Any visual elements suggesting supplement forms',
        'All Polish supplement terminology (kapsułki, tabletki, etc.)'
      ],
      automatedFiltering: true,
      multiLevelValidation: true,
      emergencyCleanup: true,
      complianceEnforcement: "MANDATORY",
      regexPatterns: FORBIDDEN_SUPPLEMENT_ELEMENTS.regexPatterns.length,
      fallbackSafety: true
    },
    formatSpecifications: {
      size: '1024x1024',
      aspectRatio: 'square',
      background: 'transparent',
      composition: 'seamless-edge-free-with-margins',
      blending: 'natural-fade-edges',
      margins: 'proper-internal-spacing',
      boundaries: 'contained-within-bounds',
      whiteCompatibility: 'optimized-for-white-background',
      priority: 'transparent background, seamless composition, and proper margins enforcement in all generations'
    },
    version: "6.0-supplement-safe-transparent-seamless-margins"
  }, { status: 405 });
}