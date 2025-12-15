// src/app/api/pages/generate-preview/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { nanoid } from 'nanoid';

// Konfiguracja połączenia z bazą danych
const getDbClient = async () => {
  const client = new Client({
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    ssl: {
      rejectUnauthorized: false
    }
  });
  await client.connect();
  return client;
};

export async function POST(request: NextRequest) {
  try {
    // Parsowanie danych z żądania
    const data = await request.json();
    const { pageId } = data;

    if (!pageId) {
      return NextResponse.json(
        { error: 'Nie podano identyfikatora strony' },
        { status: 400 }
      );
    }

    let client;
    try {
      // Połącz z bazą danych
      client = await getDbClient();

      // Sprawdź, czy strona istnieje i pobierz jej kategorię
      const checkResult = await client.query(
        'SELECT id, draft_url, category FROM pages WHERE id = $1',
        [pageId]
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Nie znaleziono strony o podanym identyfikatorze' },
          { status: 404 }
        );
      }

      let previewUrl = checkResult.rows[0].draft_url;
      // Pobierz kategorię z bazy danych lub użyj 'p' jako domyślnej wartości
      const category = checkResult.rows[0].category || 'p';

      // Jeśli URL podglądu nie istnieje, wygeneruj go
      if (!previewUrl) {
        // Generuj unikalny token dla URL podglądu
        const previewToken = nanoid(10);
        // Utwórz URL podglądu uwzględniając kategorię
        previewUrl = `/preview/${previewToken}`;

        // Zapisz URL podglądu w bazie danych
        await client.query(
          'UPDATE pages SET draft_url = $1 WHERE id = $2 RETURNING draft_url',
          [previewUrl, pageId]
        );
      }

      return NextResponse.json({
        success: true,
        previewUrl,
        category // Dołączamy kategorię do odpowiedzi API
      });

    } finally {
      // Zamknij połączenie z bazą danych
      if (client) {
        await client.end();
      }
    }
  } catch (error) {
    console.error('Błąd podczas generowania podglądu:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas generowania podglądu' },
      { status: 500 }
    );
  }
}