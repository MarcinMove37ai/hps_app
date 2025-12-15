// src/app/api/pdf-cover/get-data/route.ts
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
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('pageId');

  if (!pageId) {
    return NextResponse.json({ error: 'Nie podano ID strony' }, { status: 400 });
  }

  let client;
  try {
    console.log(`Pobieranie danych okładki dla strony ID: ${pageId}`);

    // Połącz z bazą danych
    client = await getDbClient();

    // Pobierz informacje o stronie
    const result = await client.query(
      'SELECT s3_file_key, cover_page_index FROM pages WHERE id = $1',
      [pageId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Nie znaleziono strony o podanym identyfikatorze' },
        { status: 404 }
      );
    }

    const { s3_file_key, cover_page_index } = result.rows[0];
    console.log(`Znaleziono stronę: s3_file_key=${s3_file_key}, cover_page_index=${cover_page_index}`);

    // Jeśli brak klucza S3 lub indeksu okładki, zwróć błąd
    if (!s3_file_key || cover_page_index === null) {
      return NextResponse.json(
        { error: 'Strona nie ma przypisanej okładki' },
        { status: 404 }
      );
    }

    // Zwróć dane strony
    return NextResponse.json({
      s3_file_key,
      cover_page_index
    });

  } catch (error) {
    console.error('Błąd podczas pobierania danych okładki:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania danych okładki', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end();
      console.log('Zamknięto połączenie z bazą danych');
    }
  }
}