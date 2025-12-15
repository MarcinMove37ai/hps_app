// src/app/api/anthropic/generate-single-chapter/route.ts

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

interface Chapter {
  id: string;
  title: string;
  content?: string;
  position?: number;
}

interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  source?: string;
}

export async function POST(request: Request) {
  console.log('Otrzymano żądanie POST do /api/anthropic/generate-single-chapter');

  try {
    const body = await request.json();
    const { title, subtitle, chapter, allChapters, description, scrapedContent } = body;

    // Walidacja podstawowych danych
    if (!title || !chapter || !chapter.title) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane wejściowe. Wymagany tytuł e-booka i informacje o rozdziale.' },
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

    // Funkcja do budowania kontekstu spisu treści
    const buildTableOfContentsContext = (chapters: Chapter[]): string => {
      if (!chapters || chapters.length === 0) {
        return '';
      }

      let context = '\n\n=== PEŁNY SPIS TREŚCI E-BOOKA ===\n';
      context += 'Kontekst całego e-booka dla zachowania spójności:\n\n';

      chapters.forEach((ch, index) => {
        const isCurrentChapter = ch.id === chapter.id || ch.title === chapter.title;
        context += `${index + 1}. ${ch.title}${isCurrentChapter ? ' ← AKTUALNIE GENEROWANY ROZDZIAŁ' : ''}\n`;
      });

      context += '\n=== INSTRUKCJE SPÓJNOŚCI ===\n';
      context += '• Wygenerowana treść musi być spójna z pozostałymi rozdziałami\n';
      context += '• Odwołuj się do poprzednich rozdziałów gdy to ma sens (np. "jak wspomnieliśmy wcześniej")\n';
      context += '• Przygotowuj grunt pod następne rozdziały gdy to naturalne\n';
      context += '• Zachowaj jednolity ton i styl pisania w całym e-booku\n';
      context += '• Unikaj powtarzania treści z innych rozdziałów\n\n';

      return context;
    };

    // Funkcja do budowania kontekstu ze źródeł naukowych
    const buildSourcesContext = (sources: ScrapedContent[]): string => {
      if (!sources || sources.length === 0) {
        return '';
      }

      let context = '\n\n=== ŹRÓDŁA NAUKOWE DO WYKORZYSTANIA ===\n';
      context += 'Poniższe źródła mogą być wykorzystane w treści rozdziału:\n\n';

      sources.forEach((source, index) => {
        context += `ŹRÓDŁO ${index + 1}:\n`;
        context += `• Tytuł: ${source.title}\n`;
        context += `• URL: ${source.url}\n`;
        if (source.source) {
          context += `• Pochodzenie: ${source.source}\n`;
        }
        context += `• Treść/Abstract: ${source.content.substring(0, 1200)}${source.content.length > 1200 ? '...' : ''}\n\n`;
      });

      context += '=== INSTRUKCJE DLA ŹRÓDEŁ ===\n';
      context += '• Wykorzystaj informacje ze źródeł gdy są relevatne dla tego rozdziału\n';
      context += '• Nie kopiuj dosłownie - przeformułowuj i adaptuj treść\n';
      context += '• Jeśli używasz danych z badań, wspomnij że są to wyniki badań naukowych\n';
      context += '• Zachowaj merytoryczność i rzetelność naukową\n';
      context += '• Możesz dodać ogólne referencje typu "badania wskazują" bez podawania konkretnych cytowań\n\n';

      return context;
    };

    // Funkcja do budowania kontekstu użytkownika
    const buildUserContext = (userDescription: string): string => {
      if (!userDescription || userDescription.trim() === '') {
        return '';
      }

      return `\n\n=== PREFERENCJE STYLU I TREŚCI ===\n${userDescription.trim()}\n\n=== INSTRUKCJE STYLISTYCZNE ===\n• Dostosuj poziom języka i szczegółowości do grupy docelowej\n• Zachowaj styl pisania preferowany przez użytkownika\n• Uwzględnij wskazane priorytety tematyczne\n• Dopasuj ton do oczekiwań czytelników\n\n`;
    };

    // Funkcja do określenia pozycji rozdziału w spisie
    const getChapterPosition = (chapters: Chapter[], currentChapter: Chapter): { position: number; total: number; isFirst: boolean; isLast: boolean } => {
      const position = chapters.findIndex(ch => ch.id === currentChapter.id || ch.title === currentChapter.title) + 1;
      const total = chapters.length;
      return {
        position: position || 1,
        total,
        isFirst: position === 1,
        isLast: position === total
      };
    };

    console.log(`Generowanie treści dla rozdziału: "${chapter.title}"`);

    // Zbuduj rozszerzony prompt
    let prompt = `Napisz treść rozdziału "${chapter.title}" dla e-booka zatytułowanego "${title}"`;

    if (subtitle) {
      prompt += `, z podtytułem "${subtitle}"`;
    }

    prompt += '.\n\n';

    // Dodaj kontekst użytkownika
    if (description && description.trim()) {
      prompt += buildUserContext(description);
    }

    // Dodaj kontekst spisu treści
    if (allChapters && Array.isArray(allChapters) && allChapters.length > 0) {
      prompt += buildTableOfContentsContext(allChapters);

      const chapterPos = getChapterPosition(allChapters, chapter);
      prompt += `=== POZYCJA W STRUKTURZE ===\n`;
      prompt += `To jest rozdział ${chapterPos.position} z ${chapterPos.total} w e-booku.\n`;

      if (chapterPos.isFirst) {
        prompt += `Jest to rozdział wprowadzający - ustaw odpowiedni ton dla całego e-booka.\n`;
      } else if (chapterPos.isLast) {
        prompt += `Jest to ostatni rozdział - podsumuj kluczowe wątki i daj praktyczne wnioski.\n`;
      } else {
        prompt += `Nawiązuj do wcześniejszych rozdziałów i przygotowuj grunt pod kolejne.\n`;
      }
      prompt += '\n';
    }

    // Dodaj kontekst ze źródeł naukowych
    if (scrapedContent && Array.isArray(scrapedContent) && scrapedContent.length > 0) {
      prompt += buildSourcesContext(scrapedContent);
    }

    // Główne wymagania dla treści
    prompt += `=== WYMAGANIA DLA TREŚCI ROZDZIAŁU ===\n`;
    prompt += `• Rozdział powinien zawierać około 2500-3500 znaków (1-1.5 strony A4)\n`;
    prompt += `• NIE rozpoczynaj treści od nazwy rozdziału - idź od razu do merytoryki\n`;
    prompt += `• Struktura: wprowadzenie → rozwinięcie → praktyczne wnioski/podsumowanie\n`;
    prompt += `• Język profesjonalny ale przystępny, dostosowany do grupy docelowej\n`;
    prompt += `• Podziel na logiczne akapity (3-5 akapitów optymalnie)\n`;
    prompt += `• Unikaj podtytułów, numeracji i formatowania markdown\n`;
    prompt += `• Dodaj wartość praktyczną - czytelnicy powinni coś konkretnego wynieść\n`;

    if (subtitle) {
      prompt += `• Uwzględnij kontekst z podtytułu: "${subtitle}"\n`;
    }

    if (scrapedContent && Array.isArray(scrapedContent) && scrapedContent.length > 0) {
      prompt += `• Wykorzystaj dostarczone źródła naukowe tam gdzie to celowe\n`;
      prompt += `• Zachowaj rzetelność merytoryczną opartą na badaniach\n`;
    }

    if (description && description.trim()) {
      prompt += `• Zastosuj preferencje stylistyczne podane przez użytkownika\n`;
    }

    prompt += `\n=== FORMAT ODPOWIEDZI ===\n`;
    prompt += `Zwróć tylko czystą treść rozdziału bez dodatkowych komentarzy, tytułów czy formatowania.`;

    // Przygotuj żądanie do Anthropic API
    const requestBody: AnthropicRequest = {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 3000, // Zwiększone dla dłuższej treści
      temperature: 0.7,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    };

    console.log('Wysyłanie zapytania do Anthropic API...');
    console.log('Kontekst rozdziału:', {
      chapterTitle: chapter.title,
      ebookTitle: title,
      hasSubtitle: !!subtitle,
      hasDescription: !!description,
      sourcesCount: scrapedContent?.length || 0,
      totalChapters: allChapters?.length || 0,
      promptLength: prompt.length
    });

    // Opcjonalne: logowanie pełnego promptu do debugowania
    // console.log('=== PEŁNY PROMPT ROZDZIAŁU ===');
    // console.log(prompt);
    // console.log('=== KONIEC PROMPTU ROZDZIAŁU ===');

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
      console.error(`Błąd API Anthropic dla rozdziału "${chapter.title}":`, errorText);
      return NextResponse.json(
        { error: `Błąd podczas generowania treści rozdziału: ${response.status}` },
        { status: response.status }
      );
    }

    const responseData = await response.json();
    const chapterContent = responseData.content[0].text;

    console.log(`Pomyślnie wygenerowano treść rozdziału "${chapter.title}" (${chapterContent.length} znaków)`);

    // Zwróć wygenerowaną treść rozdziału
    return NextResponse.json({
      chapter: {
        id: chapter.id,
        title: chapter.title,
        content: chapterContent.trim()
      },
      contextUsed: {
        hasDescription: !!description,
        sourcesCount: scrapedContent?.length || 0,
        totalChapters: allChapters?.length || 0,
        hasSubtitle: !!subtitle
      }
    });

  } catch (error) {
    console.error('Błąd wewnętrzny serwera:', error);
    return NextResponse.json(
      {
        error: 'Błąd wewnętrzny serwera podczas generowania treści rozdziału',
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