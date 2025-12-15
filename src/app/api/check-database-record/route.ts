// src/app/api/check-database-record/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

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

export async function GET(request: NextRequest) {
  console.log('API check-database-record - otrzymano zapytanie');

  // Pobierz tytuł z parametrów zapytania
  const url = new URL(request.url);
  const title = url.searchParams.get('title');

  // Logowanie parametrów zapytania
  console.log('Parametry zapytania:', { title });

  // Sprawdź, czy podano parametr title
  if (!title) {
    console.log('Brak parametru title');
    return NextResponse.json(
      { error: 'Nie podano parametru wyszukiwania (title)' },
      { status: 400 }
    );
  }

  let client;
  try {
    // Połącz z bazą danych
    console.log('Łączenie z bazą danych...');
    client = await getDbClient();
    console.log('Połączono z bazą danych');

    // Zmienne dla wyników zapytań
    let titleResult: any = null;
    let draftUrlResult: any = null;

    // Szukaj po kolumnie x_amz_meta_title
    console.log(`Szukanie rekordu po tytule: ${title}`);
    titleResult = await client.query(
      'SELECT id, x_amz_meta_title FROM pages WHERE x_amz_meta_title = $1 LIMIT 1',
      [title]
    );

    if (titleResult.rows.length > 0) {
      console.log(`Znaleziono rekord dla tytułu "${title}":`, titleResult.rows[0]);
    } else {
      console.log(`Nie znaleziono rekordu dla tytułu "${title}"`);

      // Jeśli nie znaleziono po dokładnym tytule, sprawdź po draft_url
      const draftUrl = `/preview/${title}`;
      console.log(`Szukanie rekordu po draft_url: ${draftUrl}`);

      draftUrlResult = await client.query(
        'SELECT id, draft_url FROM pages WHERE draft_url = $1 LIMIT 1',
        [draftUrl]
      );

      if (draftUrlResult.rows.length > 0) {
        console.log(`Znaleziono rekord dla draft_url "${draftUrl}":`, draftUrlResult.rows[0]);
      } else {
        console.log(`Nie znaleziono rekordu dla draft_url "${draftUrl}"`);
      }
    }

    // Wybierz wynik, który ma rekordy
    const result = (titleResult && titleResult.rows.length > 0) ? titleResult :
                   (draftUrlResult && draftUrlResult.rows.length > 0) ? draftUrlResult :
                   null;

    // Sprawdź, czy znaleziono rekord
    if (result && result.rows.length > 0) {
      return NextResponse.json({
        exists: true,
        pageId: result.rows[0].id,
        message: 'Znaleziono rekord w bazie danych'
      });
    } else {
      // Pokaż ostatnio utworzone rekordy do celów diagnostycznych
      const lastRecordResult = await client.query(
        'SELECT id, x_amz_meta_title, draft_url, created_at FROM pages ORDER BY id DESC LIMIT 5'
      );

      if (lastRecordResult.rows.length > 0) {
        console.log('Ostatnie 5 rekordów w bazie:', lastRecordResult.rows);
      }

      return NextResponse.json({
        exists: false,
        message: 'Nie znaleziono rekordu dla podanego tytułu'
      });
    }
  } catch (error) {
    console.error('Błąd podczas sprawdzania bazy danych:', error);

    // Zwróć bardziej szczegółowy komunikat błędu
    let errorMessage = 'Wystąpił błąd podczas sprawdzania bazy danych';
    let errorDetails = '';

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || '';
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: errorDetails,
        params: { title }
      },
      { status: 500 }
    );
  } finally {
    // Zamknij połączenie z bazą danych
    if (client) {
      try {
        await client.end();
        console.log('Zamknięto połączenie z bazą danych');
      } catch (closeError) {
        console.error('Błąd podczas zamykania połączenia z bazą danych:', closeError);
      }
    }
  }
}