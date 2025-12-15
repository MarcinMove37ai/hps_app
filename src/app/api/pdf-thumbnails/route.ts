// src/app/api/pdf-thumbnails/route.ts
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
  // Pobierz parametr s3Key z URL
  const { searchParams } = new URL(request.url);
  const s3Key = searchParams.get('s3Key');

  if (!s3Key) {
    return NextResponse.json({ error: 'Nie podano klucza S3' }, { status: 400 });
  }

  try {
    console.log(`Symulacja pobierania miniatur dla pliku S3, klucz: ${s3Key}`);

    // Symulacja opóźnienia dla bardziej realistycznego doświadczenia
    await new Promise(resolve => setTimeout(resolve, 500));

    // Generowanie przykładowych miniatur (w rzeczywistości będą one pobierane z S3)
    // Zamiast generować je w locie, symulujemy 3 miniatury
    const thumbnails: string[] = [];

    // Używamy adresów do publicznych placeholderów dla symulacji
    thumbnails.push('data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" fill="#666">Okładka 1</text></svg>').toString('base64'));
    thumbnails.push('data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" fill="#666">Strona 2</text></svg>').toString('base64'));
    thumbnails.push('data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600"><rect width="100%" height="100%" fill="#f0f0f0"/><text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" fill="#666">Strona 3</text></svg>').toString('base64'));

    return NextResponse.json({
      thumbnails,
      pageCount: 3,
      s3Key
    });
  } catch (error) {
    console.error('Błąd podczas generowania miniatur PDF:', error);
    return NextResponse.json({
      error: 'Wystąpił błąd podczas generowania miniatur',
      details: (error as Error).message,
    }, { status: 500 });
  }
}

// Endpoint do zapisywania wybranej okładki
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const { pageId, selectedPage, s3Key } = data;

    if (!pageId || selectedPage === undefined || !s3Key) {
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

      // Aktualizuj stronę, dodając informację o wybranej okładce
      await client.query(
        'UPDATE pages SET cover_page_index = $1, s3_file_key = $2 WHERE id = $3',
        [selectedPage, s3Key, pageId]
      );

      return NextResponse.json({
        success: true,
        message: 'Zapisano wybór okładki'
      });

    } finally {
      if (client) {
        await client.end();
      }
    }
  } catch (error) {
    console.error('Błąd podczas zapisywania wyboru okładki:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas zapisywania wyboru okładki' },
      { status: 500 }
    );
  }
}