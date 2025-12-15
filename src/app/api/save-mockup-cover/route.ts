// src/app/api/save-mockup-cover/route.ts
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

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { pageId, coverUrl } = data;

    if (!pageId || !coverUrl) {
      return NextResponse.json(
        { error: 'Brak wymaganych danych' },
        { status: 400 }
      );
    }

    let client;
    try {
      // Połącz z bazą danych
      client = await getDbClient();

      // Sprawdź, czy strona istnieje
      const checkResult = await client.query(
        'SELECT id FROM pages WHERE id = $1',
        [pageId]
      );

      if (checkResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Nie znaleziono strony o podanym identyfikatorze' },
          { status: 404 }
        );
      }

      console.log(`Zapisywanie publicznego URL okładki: ${coverUrl} dla strony ID: ${pageId}`);

      // Aktualizuj stronę, ustawiając wartość -999 w cover_page_index
      // oraz URL okładki w s3_file_key
      await client.query(
        'UPDATE pages SET cover_page_index = $1, s3_file_key = $2 WHERE id = $3',
        [-999, coverUrl, pageId]
      );

      return NextResponse.json({
        success: true,
        message: 'Zapisano wybór okładki mockup'
      });

    } finally {
      if (client) {
        await client.end();
      }
    }
  } catch (error) {
    console.error('Błąd podczas zapisywania wyboru okładki mockup:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas zapisywania wyboru okładki mockup', details: (error as Error).message },
      { status: 500 }
    );
  }
}