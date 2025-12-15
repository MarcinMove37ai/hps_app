// src/app/api/pdf-cover/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
// Usuwamy import ReadableStream, który może powodować konflikty typów
// import { ReadableStream } from 'stream/web';

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

// Funkcja do pobierania pliku mockup z endpointu mockup-file
async function fetchMockupFile(mockupUrl: string): Promise<{ buffer: Buffer; contentType: string }> {
  console.log(`Próba pobrania mockupu z URL: ${mockupUrl}`);

  try {
    // Ekstrahuj parametr key z URL
    const urlObj = new URL(mockupUrl, "http://localhost:3000");
    const key = urlObj.searchParams.get('key');

    if (!key) {
      throw new Error(`Brak parametru 'key' w URL: ${mockupUrl}`);
    }

    console.log(`Wyodrębniono klucz S3: ${key}`);

    // Sprawdź czy zmienne środowiskowe są ustawione
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error('Brak kluczy dostępowych AWS w zmiennych środowiskowych');
    }

    // Inicjalizacja klienta S3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });

    // Pobierz plik z S3
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || 'ebooks-in',
      Key: key,
    });

    console.log(`Wysyłanie żądania GetObject do S3 dla klucza: ${key}`);
    const response = await s3Client.send(command);

    if (!response.Body) {
      throw new Error('Nie można odczytać treści pliku z S3');
    }

    // Używamy metody transformToByteArray zamiast for await
    const fileData = await response.Body.transformToByteArray();
    const fileBuffer = Buffer.from(fileData);

    console.log(`Pobrano plik z S3, rozmiar: ${fileBuffer.length} bajtów`);

    // Określ typ MIME na podstawie rozszerzenia pliku
    let contentType = response.ContentType || 'application/octet-stream';
    if (key.endsWith('.png')) contentType = 'image/png';
    if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
    if (key.endsWith('.gif')) contentType = 'image/gif';
    if (key.endsWith('.svg')) contentType = 'image/svg+xml';

    console.log(`Typ zawartości pliku: ${contentType}`);

    return {
      buffer: fileBuffer,
      contentType: contentType
    };
  } catch (error) {
    console.error('Błąd podczas pobierania pliku mockup:', error);
    throw error;
  }
}

// Funkcja do generowania przykładowego obrazu SVG jako placeholder
const generatePlaceholderImage = (width = 400, height = 600, pageIndex = 0): Buffer => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#f0f0f0"/>
      <text x="50%" y="50%" font-family="Arial" font-size="24" text-anchor="middle" fill="#666">
        Okładka ${pageIndex + 1}
      </text>
    </svg>
  `;
  return Buffer.from(svg);
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const pageId = searchParams.get('pageId');

  if (!pageId) {
    return NextResponse.json({ error: 'Nie podano ID strony' }, { status: 400 });
  }

  let client;
  try {
    console.log(`Pobieranie okładki dla strony ID: ${pageId}`);

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

    // Specjalny przypadek dla okładek mockup (cover_page_index = -999)
    if (cover_page_index === -999) {
      console.log(`Wykryto okładkę mockup: ${s3_file_key}`);

      try {
        // Zamiast przekierowania, pobieramy plik z S3 i zwracamy go bezpośrednio
        // Najpierw normalizujemy URL (dodając domyślną domenę jeśli potrzeba)
        const mockupUrl = s3_file_key.startsWith('http')
          ? s3_file_key
          : `http://localhost:3000${s3_file_key.startsWith('/') ? '' : '/'}${s3_file_key}`;

        // Pobieramy plik mockup
        const { buffer, contentType } = await fetchMockupFile(mockupUrl);

        // Zwracamy plik jako odpowiedź HTTP
        console.log(`Zwracanie mockupu dla strony ${pageId}, typ: ${contentType}, rozmiar: ${buffer.length} bajtów`);

        return new NextResponse(buffer, {
          headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=86400' // Cache na 24h
          }
        });
      } catch (error) {
        console.error('Błąd podczas pobierania mockupu:', error);
        return NextResponse.json({
          error: 'Błąd podczas pobierania mockupu',
          details: (error as Error).message
        }, { status: 500 });
      }
    }

    // Symulacja opóźnienia dla bardziej realistycznego doświadczenia
    await new Promise(resolve => setTimeout(resolve, 300));

    // Generowanie przykładowego obrazu zamiast prawdziwej konwersji
    // W rzeczywistości tu byłoby pobieranie gotowego obrazu z S3
    const image = generatePlaceholderImage(400, 600, cover_page_index);

    console.log(`Wysyłam symulowany obraz okładki dla strony ${pageId}`);

    // Zwróć obraz jako odpowiedź
    return new NextResponse(image, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=86400' // Cache na 24h
      }
    });

  } catch (error) {
    console.error('Błąd podczas generowania okładki:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas generowania okładki', details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    if (client) {
      await client.end();
      console.log('Zamknięto połączenie z bazą danych');
    }
  }
}