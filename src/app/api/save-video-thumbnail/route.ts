// src/app/api/save-video-thumbnail/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
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

// Inicjalizacja klienta S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

export async function POST(request: NextRequest) {
  let client;
  try {
    console.log("API save-video-thumbnail - rozpoczęcie przetwarzania");

    // Parsowanie formData
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const pageId = formData.get('pageId') as string;
    const s3Key = formData.get('s3Key') as string;

    console.log(`Otrzymane dane: pageId=${pageId}, s3Key obecny=${s3Key ? 'tak' : 'nie'}, plik=${file ? file.name : 'brak'}`);

    if (!file || !pageId || !s3Key) {
      return NextResponse.json(
        { error: 'Brak wymaganych parametrów' },
        { status: 400 }
      );
    }

    // Generowanie unikalnej nazwy pliku
    const fileBaseName = s3Key.split('/').pop()?.split('.')[0] || uuidv4();
    const thumbnailFileName = `${fileBaseName}_thumbnail_${Date.now()}.png`;
    const mockupKey = `videos/mockup/${thumbnailFileName}`;

    console.log(`Generowanie nazwy pliku: ${mockupKey}`);

    // Konwertacja File na Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log(`Konwertacja pliku o rozmiarze: ${buffer.length} bajtów`);
    console.log(`Zapisywanie miniatury w S3: bucket=${process.env.S3_BUCKET_NAME || 'ebooks-in'}, key=${mockupKey}`);

    try {
      // Zapisywanie pliku w S3
      const uploadResult = await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME || 'ebooks-in',
          Key: mockupKey,
          Body: buffer,
          ContentType: 'image/png',
          // Usuwamy ACL, który może powodować problemy
          // ACL: 'public-read',
        })
      );

      console.log("Plik zapisany w S3 pomyślnie", uploadResult);
    } catch (s3Error) {
      console.error("Błąd podczas zapisywania pliku w S3:", s3Error);
      return NextResponse.json(
        {
          error: 'Wystąpił błąd podczas zapisywania pliku w S3',
          details: (s3Error as Error).message,
          stack: (s3Error as Error).stack
        },
        { status: 500 }
      );
    }

    // Tworzenie pełnego URL miniatury
    const bucketName = process.env.S3_BUCKET_NAME || 'ebooks-in';
    const region = process.env.AWS_REGION || 'eu-central-1';
    const thumbnailUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${mockupKey}`;

    console.log(`Wygenerowano URL miniatury: ${thumbnailUrl}`);

    try {
      // Połącz z bazą danych
      console.log("Próba połączenia z bazą danych");
      client = await getDbClient();

      // Sprawdź, czy strona istnieje
      console.log(`Sprawdzanie czy strona o ID=${pageId} istnieje`);
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

      console.log(`Aktualizacja strony ID ${pageId} - ustawienie s3_file_key=${thumbnailUrl} i cover_page_index=-999`);

      // Aktualizacja rekordu strony - ustawiamy cover_page_index=-999 (tak samo jak dla mockupów)
      // oraz s3_file_key=pełny URL miniatury
      const updateResult = await client.query(
        `UPDATE pages
         SET s3_file_key = $1,
             cover_page_index = $2
         WHERE id = $3`,
        [thumbnailUrl, -999, pageId]
      );

      console.log(`Zaktualizowano rekord w bazie danych, liczba zmienionych wierszy: ${updateResult.rowCount}`);
    } catch (dbError) {
      console.error('Błąd podczas operacji na bazie danych:', dbError);
      return NextResponse.json(
        {
          error: 'Wystąpił błąd podczas aktualizacji bazy danych',
          details: (dbError as Error).message,
          stack: (dbError as Error).stack
        },
        { status: 500 }
      );
    } finally {
      if (client) {
        await client.end();
        console.log("Zakończono połączenie z bazą danych");
      }
    }

    // Zwracanie odpowiedzi
    console.log("Proces zakończony sukcesem, zwracanie odpowiedzi");
    return NextResponse.json({
      success: true,
      thumbnailUrl,
      message: 'Miniatura została pomyślnie zapisana'
    });

  } catch (error) {
    console.error('Błąd podczas zapisywania miniatury:', error);
    return NextResponse.json(
      {
        error: 'Wystąpił błąd podczas zapisywania miniatury wideo',
        details: (error as Error).message,
        stack: (error as Error).stack
      },
      { status: 500 }
    );
  } finally {
    if (client) {
      try {
        await client.end();
        console.log("Zakończono połączenie z bazą danych (finally)");
      } catch (e) {
        console.error("Błąd przy zamykaniu połączenia z bazą:", e);
      }
    }
  }
}