import { NextResponse } from 'next/server';
import { SearchModule } from '@/lib/search_module';
import Anthropic from '@anthropic-ai/sdk';
import type { ChatMessage } from '@/types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || ''
});

const searchModule = new SearchModule();

const systemPrompt = `Jesteś asystentem specjalizującym się w analizie badań klinicznych nad kwasami omega-3 i ich wpływem na zdrowie człowieka. Odpowiadaj WYŁĄCZNIE na podstawie dostarczonych badań. Komunikuj się w języku polskim.

WAŻNE INSTRUKCJE:
1. Z wszystkich dostarczonych badań WYBIERZ 5 najlepiej odpowiadających pytaniu użytkownika
2. Oceń trafność każdego badania względem konkretnego pytania - nie wszystkie badania będą równie istotne
3. Odpowiadaj zwięźle i konkretnie. Unikaj powtórzeń i nadmiernych szczegółów
4. Skup się na najważniejszych informacjach odpowiadających bezpośrednio na pytanie użytkownika

Formatuj swoje odpowiedzi według następującej struktury:

1. Rozpocznij od krótkiej tezy która jednym zdaniem daje odpowiedź na pytanie użytkownika na podstawie kontekstu. Ogranicz się do jednego zdania złożonego które będzie **pogrubione**.
2. W kolejnych akapitach rozwiń szczegóły, grupując powiązane informacje. ZAWSZE odwołuj się do konkretnych badań w nawiasach, używając sformułowania "(Badanie 2 - lista poniżej)" lub "(Badania 1,3,7 - lista poniżej)".
3. Używaj **pogrubienia** dla:
   - wszystkich wartości liczbowych, w tym procentowych (np. **20mg/dzień**, **28-36%**)
   - nazw związków (np. **EPA**, **DHA**)
   - kluczowych wniosków i stwierdzeń
4. Używaj list z myślnikami dla wymieniania:
   - korzyści zdrowotnych
   - grup badanych
   - obserwowanych efektów
5. Przy każdym istotnym stwierdzeniu lub wniosku ZAWSZE podawaj źródło używając dokładnie takiego formatu: "(Badanie 2 - lista poniżej)" lub "(Badania 1,3,7 - lista poniżej)".
6. Przy każdym istotnym stwierdzeniu lub wniosku ZAWSZE wskazuj praktyczne korzyści w sposób zrozumiały dla osób nie znających się na medycynie.
7. Zakończ krótkim, praktycznym podsumowaniem odwołującym się bezpośrednio do pytania użytkownika.

PAMIĘTAJ:
- Używaj TYLKO 5 najlepiej dopasowanych badań z dostarczonych
- Bądź merytoryczny, ale zwięzły
- Lepiej krócej i na temat niż długo i rozwlekle
- Jeśli badanie nie odpowiada na pytanie, nie używaj go w odpowiedzi`;

// Definiowanie interfejsu dla wyników wyszukiwania
interface SearchResult {
  title: string;
  journal?: string;
  publication_date?: string;
  __nn_distance?: number;
  abstract?: string;
  measured_outcomes?: string;
  observed_outcomes?: string;
  trial_population?: string;
  [key: string]: unknown; // Dla innych potencjalnych pól
}

function formatSearchResult(result: SearchResult, index: number) {
  const sections = [
    `[${index + 1}] Tytuł: ${result.title}`,
    `Czasopismo: ${result.journal || 'Brak informacji'}`,
    `Rok publikacji: ${result.publication_date || 'Brak informacji'}`,
    `Trafność: ${result.__nn_distance ? ((1 - result.__nn_distance) * 100).toFixed(1) : 0}%`,
    `Abstrakt: ${result.abstract || 'Brak abstraktu'}`
  ];

  if (result.measured_outcomes) {
    sections.push(`Badane aspekty: ${result.measured_outcomes}`);
  }
  if (result.observed_outcomes) {
    sections.push(`Zaobserwowane wyniki: ${result.observed_outcomes}`);
  }
  if (result.trial_population) {
    sections.push(`Badana populacja: ${result.trial_population}`);
  }

  return sections.join('\n');
}

function prepareConversationHistory(history: ChatMessage[]) {
  // Filtruj wiadomości, zachowując tylko role 'user' i 'assistant',
  // które są akceptowane przez API Anthropic
  return history
    .filter(msg => msg.role === 'user' || msg.role === 'assistant')
    .map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.type === 'user' ? msg.originalMessage || msg.content : msg.content
    }));
}

// Definiowanie interfejsu dla parametrów wyszukiwania
interface SearchParams {
  query_mode: string;
  search_type: string;
  top_k: number;
  alpha: number;
}

export async function POST(req: Request) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('Missing ANTHROPIC_API_KEY');
    }

    const { message, conversationHistory = [], searchParams } = await req.json() as {
      message: string;
      conversationHistory: ChatMessage[];
      searchParams: SearchParams;
    };

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // 1. Przygotowanie zapytań w zależności od trybu
    const userMessages = conversationHistory
      .filter((msg: ChatMessage) => msg.type === 'user')
      .map((msg: ChatMessage) => msg.originalMessage || msg.content);

    const queries = searchParams.query_mode === 'all'
      ? [...userMessages, message]
      : [message];

    console.log('Search mode:', searchParams.query_mode);
    console.log('Search queries:', queries);

    // 2. Wyszukiwanie w bazie badań
    const searchResults = await searchModule.search({
      queries,
      searchType: searchParams.search_type,
      topK: searchParams.top_k,
      alpha: searchParams.alpha
    });

    if (!searchResults.results.length) {
      return NextResponse.json({
        response: "Nie znaleziono odpowiednich badań dla tego zapytania. Proszę spróbować przeformułować pytanie.",
        sources: []
      });
    }

    // 3. Przygotowanie kontekstu z wyników
    const context = searchResults.results
      .map((result, index) => formatSearchResult(result as unknown as SearchResult, index))
      .join('\n\n');

    // 4. Przygotowanie historii konwersacji
    const messages = [
      ...prepareConversationHistory(conversationHistory),
      {
        role: 'user' as const,
        content: `Na podstawie tych badań:\n\n${context}\n\nPytanie: ${message}`
      }
    ];

    // 5. Wywołanie API Claude'a
    const modelResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages,
      system: systemPrompt,
      temperature: 0.7,
    });

    return NextResponse.json({
      response: modelResponse.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join(''),

      sources: searchResults.results
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unexpected error' },
      { status: 500 }
    );
  }
}