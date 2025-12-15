// src/app/api/pages/preview/[token]/route.ts
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
  // Wyodrębnij token z URL ręcznie
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/');
  const token = pathSegments[pathSegments.length - 1];

  console.log(`Obsługa zapytania dla tokenu: ${token}`);

  // Sprawdź, czy token został wyodrębniony
  if (!token) {
    return NextResponse.json(
      { error: 'Nie podano tokenu' },
      { status: 400 }
    );
  }

  // Sprawdź, czy mamy tryb podglądu
  const isPreviewMode = request.headers.get('X-Preview-Mode') === 'true';
  console.log('Tryb podglądu:', isPreviewMode);

  // Pobierz identyfikator użytkownika z nagłówków
  const userId = request.headers.get('X-User-Id');

  // W trybie podglądu pomijamy weryfikację użytkownika
  if (!isPreviewMode && !userId) {
    return NextResponse.json(
      { error: 'Użytkownik niezalogowany' },
      { status: 401 }
    );
  }

  let client;
  try {
    client = await getDbClient();

    const result = await client.query(
      `SELECT * FROM pages WHERE draft_url = $1`,
      [`/preview/${token}`]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nie znaleziono strony dla podanego tokenu' },
        { status: 404 }
      );
    }

    const pageData = result.rows[0];
    console.log('---------- DEBUG s3_file_key ----------');
    console.log('Pobrane dane strony:', pageData);
    console.log('s3_file_key z bazy danych:', pageData.s3_file_key);
    console.log('Typ danych s3_file_key:', typeof pageData.s3_file_key);
    console.log('---------------------------------------');

    return NextResponse.json(pageData);

  } catch (error) {
    console.error('Błąd podczas pobierania danych strony:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania danych strony' },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end();
    }
  }
}