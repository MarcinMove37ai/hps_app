// src/app/api/anthropic/generate-toc/route.ts

import { NextResponse } from 'next/server';

// Jawna definicja runtime
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

interface TocItem {
  id: string;
  title: string;
}

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  source?: string;
}

// Funkcja POST zdefiniowana jako nazwana eksportowana funkcja
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, subtitle, description, scrapedContent } = body;

    if (!title || title.trim() === '') {
      return NextResponse.json(
        { error: 'Brak tytułu e-booka' },
        { status: 400 }
      );
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY nie jest zdefiniowany');
      return NextResponse.json(
        { error: 'Błąd konfiguracji serwera' },
        { status: 500 }
      );
    }

    // Funkcja do budowania sekcji kontekstu ze źródeł
    const buildSourcesContext = (sources: ScrapedContent[]): string => {
      if (!sources || sources.length === 0) {
        return '';
      }

      let context = '\n\n=== ŹRÓDŁA REFERENCYJNE ===\n';
      context += 'Poniższe źródła naukowe powinny być uwzględnione przy generowaniu spisu treści:\n\n';

      sources.forEach((source, index) => {
        context += `ŹRÓDŁO ${index + 1}:\n`;
        context += `• Tytuł: ${source.title}\n`;
        context += `• URL: ${source.url}\n`;
        if (source.source) {
          context += `• Źródło: ${source.source}\n`;
        }
        context += `• Treść/Abstract: ${source.content.substring(0, 1500)}${source.content.length > 1500 ? '...' : ''}\n\n`;
      });

      context += '=== INSTRUKCJE DLA ŹRÓDEŁ ===\n';
      context += '• Przeanalizuj powyższe źródła i uwzględnij ich główne tematy w strukturze spisu treści\n';
      context += '• Jeśli źródła dotyczą badań naukowych, rozważ utworzenie rozdziałów o:\n';
      context += '  - Metodologii badań\n';
      context += '  - Wynikach i analizie\n';
      context += '  - Praktycznych zastosowaniach\n';
      context += '  - Przyszłych kierunkach badań\n';
      context += '• Zachowaj spójność z tematyką główną ebooka\n';
      context += '• Nie kopiuj dosłownie tytułów z źródeł, ale inspiruj się ich treścią\n\n';

      return context;
    };

    // Funkcja do budowania sekcji z opisem użytkownika
    const buildUserContext = (userDescription: string): string => {
      if (!userDescription || userDescription.trim() === '') {
        return '';
      }

      return `\n\n=== PREFERENCJE UŻYTKOWNIKA ===\n${userDescription.trim()}\n\n=== INSTRUKCJE DLA PREFERENCJI ===\n• Uwzględnij powyższe preferencje przy generowaniu struktury spisu treści\n• Dostosuj poziom szczegółowości do grupy docelowej\n• Zachowaj spójność ze stylem pisania preferowanym przez użytkownika\n• Priorytetyzuj tematy wskazane przez użytkownika\n\n`;
    };

    // Przygotowanie rozszerzonego promptu
    let prompt = `Wygeneruj spis treści do e-booka o tytule: "${title}"`;

    if (subtitle) {
      prompt += `, podtytuł: "${subtitle}"`;
    }

    prompt += '.\n\n';

    // Dodaj kontekst użytkownika jeśli jest dostępny
    if (description && description.trim()) {
      prompt += buildUserContext(description);
    }

    // Dodaj kontekst ze źródeł jeśli są dostępne
    if (scrapedContent && Array.isArray(scrapedContent) && scrapedContent.length > 0) {
      prompt += buildSourcesContext(scrapedContent);
    }

    // Dodaj podstawowe instrukcje generowania
    prompt += `=== WYMAGANIA SPISU TREŚCI ===\n`;
    prompt += `• Spis powinien zawierać od 5 do 8 rozdziałów\n`;
    prompt += `• Rozdziały powinny być logicznie uporządkowane i tworzyć spójną całość\n`;
    prompt += `• Każdy rozdział powinien mieć konkretny, praktyczny cel\n`;

    if (subtitle) {
      prompt += `• Uwzględnij informacje z podtytułu przy generowaniu spisu treści\n`;
    }

    if (scrapedContent && Array.isArray(scrapedContent) && scrapedContent.length > 0) {
      prompt += `• Wykorzystaj wiedzę z ${scrapedContent.length} źródeł referencyjnych do stworzenia wartościowego spisu\n`;
      prompt += `• Jeśli źródła dotyczą badań naukowych, uwzględnij metodologię i wyniki\n`;
    }

    if (description && description.trim()) {
      prompt += `• Dostosuj strukturę do preferencji użytkownika podanych wyżej\n`;
    }

    // Instrukcje formatowania
    prompt += `\n=== FORMAT ODPOWIEDZI ===\n`;
    prompt += `Format odpowiedzi: lista w formacie JSON, gdzie każdy element ma strukturę { "title": "Tytuł rozdziału" }.\n`;
    prompt += `Odpowiedź MUSI być tylko w formie JSON, bez dodatkowego tekstu.\n`;
    prompt += `Nie używaj w nazwach rozdziałów żadnej formy ich numerowania takich jak "rozdział 1: ..."\n`;
    prompt += `Tytuły rozdziałów powinny być konkretne i wartościowe dla czytelnika.\n\n`;

    // Przykład
    prompt += `Przykład formatu:\n`;
    prompt += `[\n`;
    prompt += `  { "title": "Wprowadzenie do tematu" },\n`;
    prompt += `  { "title": "Kluczowe zagadnienia i pojęcia" },\n`;
    prompt += `  { "title": "Praktyczne zastosowania" }\n`;
    prompt += `]`;

    const requestBody: AnthropicRequest = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500, // Zwiększone ze względu na więcej kontekstu
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    console.log('Wysyłanie zapytania do Anthropic API...');
    console.log('Kontekst:', {
      title,
      subtitle: subtitle || 'brak',
      hasDescription: !!description,
      sourcesCount: scrapedContent?.length || 0,
      promptLength: prompt.length
    });
    console.log('=== PEŁNY PROMPT ===');
    console.log(prompt);
    console.log('=== KONIEC PROMPTU ===');

    // Wykonaj zapytanie do API Anthropic
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
      console.error('Błąd API Anthropic:', errorText);
      return NextResponse.json(
        { error: 'Błąd podczas generowania spisu treści' },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    let tocContent = responseData.content[0].text;

    console.log('Otrzymano odpowiedź z Anthropic API, długość:', tocContent.length);

    // Przetwarzanie odpowiedzi - wycinamy tylko część JSON
    try {
      // Szukamy JSON w odpowiedzi - uwzględniamy różne formaty
      const jsonPatterns = [
        /\[[\s\S]*?\]/,  // Standardowy format
        /```json\s*([\s\S]*?)\s*```/,  // JSON w bloku kodu
        /```\s*([\s\S]*?)\s*```/,  // Blok kodu bez specyfikacji języka
      ];

      let jsonContent = '';
      for (const pattern of jsonPatterns) {
        const match = tocContent.match(pattern);
        if (match) {
          jsonContent = match[1] || match[0];
          break;
        }
      }

      // Jeśli nie znaleziono JSON, spróbuj wyciąć wszystko między pierwszym [ a ostatnim ]
      if (!jsonContent) {
        const startIndex = tocContent.indexOf('[');
        const endIndex = tocContent.lastIndexOf(']');
        if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
          jsonContent = tocContent.substring(startIndex, endIndex + 1);
        } else {
          jsonContent = tocContent;
        }
      }

      // Oczyszczenie treści JSON
      jsonContent = jsonContent.trim();

      console.log('Wyciągnięto JSON:', jsonContent.substring(0, 200) + '...');

      const tocItems = JSON.parse(jsonContent);

      // Walidacja struktury
      if (!Array.isArray(tocItems)) {
        throw new Error('Odpowiedź nie jest tablicą');
      }

      // Sprawdź czy każdy element ma wymagane właściwości
      for (const item of tocItems) {
        if (!item.title || typeof item.title !== 'string') {
          throw new Error('Nieprawidłowa struktura elementu spisu treści');
        }
      }

      // Dodajemy unikalne ID dla każdego elementu
      const tocItemsWithIds: TocItem[] = tocItems.map((item: any, index: number) => ({
        id: (index + 1).toString(),
        title: item.title.trim()
      }));

      console.log(`Pomyślnie wygenerowano spis treści z ${tocItemsWithIds.length} rozdziałami`);

      return NextResponse.json({
        tocItems: tocItemsWithIds,
        contextUsed: {
          hasDescription: !!description,
          sourcesCount: scrapedContent?.length || 0,
          hasSubtitle: !!subtitle
        }
      });

    } catch (parseError) {
      console.error('Błąd parsowania JSON:', parseError);
      console.error('Oryginalna odpowiedź:', tocContent);

      return NextResponse.json(
        {
          error: 'Nie udało się przetworzyć odpowiedzi API. Spróbuj ponownie.',
          details: parseError instanceof Error ? parseError.message : 'Nieznany błąd parsowania'
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Błąd wewnętrzny serwera:', error);
    return NextResponse.json(
      {
        error: 'Błąd wewnętrzny serwera',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}

// Obsługa innych metod HTTP
export async function GET() {
  return NextResponse.json(
    { error: 'Ta metoda nie jest obsługiwana. Użyj metody POST.' },
    { status: 405 }
  );
}