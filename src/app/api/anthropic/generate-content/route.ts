// src/app/api/anthropic/generate-content/route.ts

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

interface ChapterContent {
  id: string;
  title: string;
  content: string;
}

export async function POST(request: Request) {
  console.log('Otrzymano żądanie POST do /api/anthropic/generate-content');

  try {
    const body = await request.json();
    const { title, subtitle, chapters } = body; // Dodajemy pobranie podtytułu

    if (!title || !chapters || !Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json(
        { error: 'Nieprawidłowe dane wejściowe. Wymagany tytuł e-booka i lista rozdziałów.' },
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

    // Generowanie treści rozdziałów jeden po drugim
    const chaptersWithContent: ChapterContent[] = [];

    for (const chapter of chapters) {
      console.log(`Generowanie treści dla rozdziału: ${chapter.title}`);

      // Przygotowanie promptu dla danego rozdziału - zmodyfikowane o podtytuł
      const prompt = `Napisz treść rozdziału "${chapter.title}" dla e-booka zatytułowanego "${title}"${subtitle ? `, z podtytułem "${subtitle}"` : ''}.

      Rozdział powinien zawierać około 2000-2500 znaków (objętość jednej strony A4).
      ${subtitle ? `Uwzględnij informacje z podtytułu przy generowaniu treści rozdziału, aby treść lepiej odzwierciedlała pełny kontekst ebooka.` : ''}
      Nie rozpoczynaj treści rozdziału od jego nazwy,
      Tekst powinien być:
      - Merytoryczny i szczegółowy
      - Podzielony na logiczne akapity
      - Zawierać wprowadzenie, rozwinięcie i podsumowanie
      - Napisany profesjonalnym, ale przystępnym językiem

      Nie używaj podtytułów, numeracji ani oznaczeń formatowania.`;

      const requestBody: AnthropicRequest = {
        model: 'claude-sonnet-4-20250514', // Używamy szybszego modelu dla tego zadania
        max_tokens: 2500,
        temperature: 0.7,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      };

      // Wykonanie zapytania do API Anthropic
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
        continue; // Kontynuuj z następnym rozdziałem
      }

      const responseData = await response.json();
      const chapterContent = responseData.content[0].text;

      chaptersWithContent.push({
        id: chapter.id,
        title: chapter.title,
        content: chapterContent
      });
    }

    // Zwróć wygenerowane treści rozdziałów
    return NextResponse.json({ chapters: chaptersWithContent });
  } catch (error) {
    console.error('Błąd wewnętrzny serwera:', error);
    return NextResponse.json(
      { error: 'Błąd wewnętrzny serwera' },
      { status: 500 }
    );
  }
}