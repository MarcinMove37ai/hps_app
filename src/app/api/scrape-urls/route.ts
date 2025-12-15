// src/app/api/scrape-urls/route.ts

import { NextResponse } from 'next/server';
import { JSDOM } from 'jsdom';

export const runtime = 'nodejs';

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  source?: string;
  error?: string;
}

// Funkcja do czyszczenia i skracania tekstu
function cleanAndTruncateText(text: string, maxLength: number = 4000): string {
  let cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/[\r\n\t]/g, ' ')
    .replace(/\u00A0/g, ' ') // Usuń non-breaking spaces
    .trim();

  if (cleaned.length > maxLength) {
    cleaned = cleaned.substring(0, maxLength) + '...';
  }

  return cleaned;
}

// Specjalistyczna funkcja dla PubMed
function extractPubMedContent(document: Document, url: string): { title: string; content: string; source: string } {
  let title = '';
  let content = '';

  // Wyciągnij tytuł artykułu
  const titleSelectors = [
    'h1.heading-title',
    '.abstract-title h1',
    'h1',
    '.article-title',
    '[data-article-title]'
  ];

  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent) {
      title = titleElement.textContent.trim();
      break;
    }
  }

  // Wyciągnij abstract - próbuj różnych selektorów
  const abstractSelectors = [
    '#eng-abstract',
    '#abstract',
    '.abstract-content',
    '.abstract-text',
    '[data-abstract]',
    '.abstract p',
    '.formatted-abstract'
  ];

  for (const selector of abstractSelectors) {
    const abstractElement = document.querySelector(selector);
    if (abstractElement && abstractElement.textContent) {
      let abstractText = abstractElement.textContent.trim();

      // Jeśli to structured abstract, zachowaj strukturę
      const structuredElements = abstractElement.querySelectorAll('strong, b, .label');
      if (structuredElements.length > 0) {
        // Przetwórz structured abstract zachowując nagłówki
        abstractText = Array.from(abstractElement.childNodes)
          .map(node => {
            if (node.nodeType === 3) { // Text node
              return node.textContent?.trim() || '';
            } else if (node.nodeType === 1) { // Element node
              const element = node as Element;
              if (element.tagName === 'STRONG' || element.tagName === 'B') {
                return `\n${element.textContent?.trim()}: `;
              }
              return element.textContent?.trim() || '';
            }
            return '';
          })
          .join('')
          .replace(/\n\s*\n/g, '\n')
          .trim();
      }

      content = abstractText;
      break;
    }
  }

  // Fallback - szukaj tekstu w różnych lokalizacjach
  if (!content) {
    const fallbackSelectors = [
      '.abstract',
      '.article-abstract',
      '.summary',
      '[data-qa="abstract"]',
      '.content-abstract'
    ];

    for (const selector of fallbackSelectors) {
      const element = document.querySelector(selector);
      if (element && element.textContent && element.textContent.length > 100) {
        content = element.textContent.trim();
        break;
      }
    }
  }

  // Dodatkowe metadane jeśli dostępne
  const authors = document.querySelector('.authors')?.textContent?.trim();
  const journal = document.querySelector('.journal-title, .citation-journal')?.textContent?.trim();
  const year = document.querySelector('.citation-year, .pub-date')?.textContent?.trim();

  // Wzbogać treść o podstawowe metadane
  let enrichedContent = content;
  if (authors && authors.length < 200) {
    enrichedContent = `Autorzy: ${authors}\n\n${enrichedContent}`;
  }
  if (journal) {
    enrichedContent = `Źródło: ${journal}${year ? ` (${year})` : ''}\n\n${enrichedContent}`;
  }

  return {
    title: title || url,
    content: enrichedContent,
    source: 'PubMed'
  };
}

// Funkcja dla innych naukowych źródeł
function extractScientificContent(document: Document, url: string): { title: string; content: string; source: string } {
  let title = '';
  let content = '';
  let source = 'Scientific Article';

  // Wykryj typ źródła na podstawie URL
  if (url.includes('arxiv.org')) {
    source = 'arXiv';
  } else if (url.includes('doi.org') || url.includes('dx.doi.org')) {
    source = 'DOI';
  } else if (url.includes('springer.com')) {
    source = 'Springer';
  } else if (url.includes('sciencedirect.com')) {
    source = 'ScienceDirect';
  } else if (url.includes('nature.com')) {
    source = 'Nature';
  } else if (url.includes('science.org')) {
    source = 'Science';
  }

  // Wyciągnij tytuł
  const titleSelectors = [
    'h1',
    '.article-title',
    '.title',
    '.paper-title',
    '[data-testid="article-title"]',
    '.publication-title'
  ];

  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent) {
      title = titleElement.textContent.trim();
      break;
    }
  }

  // Wyciągnij abstract/summary
  const contentSelectors = [
    '.abstract',
    '.summary',
    '.article-abstract',
    '#abstract',
    '[data-testid="abstract"]',
    '.Prose', // arXiv
    '.abstract-content',
    '.article-section__content' // niektóre wydawnictwa
  ];

  for (const selector of contentSelectors) {
    const contentElement = document.querySelector(selector);
    if (contentElement && contentElement.textContent && contentElement.textContent.length > 100) {
      content = contentElement.textContent.trim();
      break;
    }
  }

  return {
    title: title || url,
    content: content,
    source: source
  };
}

// Funkcja do ogólnego wyciągania treści
function extractGeneralContent(document: Document, url: string): { title: string; content: string; source: string } {
  let title = '';
  let content = '';

  // Wyciągnij tytuł
  const titleElement = document.querySelector('title');
  if (titleElement) {
    title = titleElement.textContent?.trim() || '';
  }

  // Spróbuj znaleźć główną treść
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '.article-content',
    '#content',
    '.main-content',
    '.page-content'
  ];

  for (const selector of contentSelectors) {
    const element = document.querySelector(selector);
    if (element && element.textContent && element.textContent.length > 200) {
      content = element.textContent;
      break;
    }
  }

  // Fallback - użyj body
  if (!content) {
    const bodyElement = document.querySelector('body');
    if (bodyElement) {
      content = bodyElement.textContent || '';
    }
  }

  return {
    title: title || url,
    content: content,
    source: 'General Web'
  };
}

// Funkcja do pobierania pojedynczego URL
async function scrapeUrl(url: string): Promise<ScrapedContent> {
  try {
    console.log(`Rozpoczynanie scrapingu: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 sekund timeout

    // Przygotuj headers które nie wyglądają jak bot
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'max-age=0'
    };

    const response = await fetch(url, {
      headers,
      signal: controller.signal,
      redirect: 'follow'
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const dom = new JSDOM(html);
    const document = dom.window.document;

    let extractedData: { title: string; content: string; source: string };

    // Wybierz odpowiednią strategię na podstawie URL
    if (url.includes('pubmed.ncbi.nlm.nih.gov')) {
      extractedData = extractPubMedContent(document, url);
    } else if (url.includes('arxiv.org') ||
               url.includes('doi.org') ||
               url.includes('springer.com') ||
               url.includes('sciencedirect.com') ||
               url.includes('nature.com') ||
               url.includes('science.org')) {
      extractedData = extractScientificContent(document, url);
    } else {
      extractedData = extractGeneralContent(document, url);
    }

    const result: ScrapedContent = {
      url,
      title: cleanAndTruncateText(extractedData.title, 200),
      content: cleanAndTruncateText(extractedData.content, 4000),
      source: extractedData.source
    };

    console.log(`Pomyślnie przetworzono: ${url} (${result.content.length} znaków)`);
    return result;

  } catch (error) {
    console.error(`Błąd scrapingu ${url}:`, error);

    let errorMessage = 'Nieznany błąd';
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout - strona nie odpowiada';
      } else if (error.message.includes('403')) {
        errorMessage = 'Dostęp zabroniony - strona blokuje automatyczne pobieranie';
      } else if (error.message.includes('404')) {
        errorMessage = 'Strona nie znaleziona';
      } else if (error.message.includes('ENOTFOUND')) {
        errorMessage = 'Nie można połączyć się ze stroną';
      } else {
        errorMessage = error.message;
      }
    }

    return {
      url,
      title: url,
      content: '',
      error: errorMessage
    };
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json(
        { error: 'Brak prawidłowej listy URL-ów' },
        { status: 400 }
      );
    }

    if (urls.length > 5) {
      return NextResponse.json(
        { error: 'Maksymalna liczba URL-ów to 5' },
        { status: 400 }
      );
    }

    // Walidacja URL-ów
    const validUrls: string[] = [];
    for (const url of urls) {
      try {
        const urlObj = new URL(url);
        // Sprawdź czy to nie jest niebezpieczny protokół
        if (urlObj.protocol === 'http:' || urlObj.protocol === 'https:') {
          validUrls.push(url);
        }
      } catch (error) {
        console.warn(`Nieprawidłowy URL: ${url}`);
      }
    }

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: 'Brak prawidłowych URL-ów' },
        { status: 400 }
      );
    }

    console.log(`Rozpoczynanie pobierania ${validUrls.length} URL-ów`);

    // Pobierz treści równolegle z ograniczeniem czasu
    const scrapePromises = validUrls.map(url => scrapeUrl(url));
    const scrapedResults = await Promise.all(scrapePromises);

    // Filtruj tylko udane rezultaty (z treścią powyżej minimum)
    const successfulScrapes = scrapedResults.filter(result =>
      result.content && result.content.length > 50 && !result.error
    );

    // Zbierz błędy dla diagnostyki
    const errors = scrapedResults.filter(result => result.error).map(result => ({
      url: result.url,
      error: result.error
    }));

    console.log(`Pomyślnie pobrano treść z ${successfulScrapes.length}/${validUrls.length} URL-ów`);

    if (errors.length > 0) {
      console.log('Błędy:', errors);
    }

    return NextResponse.json({
      success: true,
      scrapedContent: successfulScrapes,
      totalRequested: validUrls.length,
      successfullyScraped: successfulScrapes.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error) {
    console.error('Błąd w endpoint scrape-urls:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera podczas pobierania treści' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json(
    { error: 'Ta metoda nie jest obsługiwana. Użyj metody POST.' },
    { status: 405 }
  );
}