// src/app/api/mockup-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    // Pobierz parametr key z zapytania
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');

    if (!key) {
      return NextResponse.json({ error: 'Brak parametru key' }, { status: 400 });
    }

    // Sprawdź czy zmienne środowiskowe są ustawione
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('Brak kluczy dostępowych AWS w zmiennych środowiskowych');
      return NextResponse.json(
        { error: 'Brak konfiguracji AWS - skontaktuj się z administratorem' },
        { status: 500 }
      );
    }

    // Inicjalizacja klienta S3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });

    console.log(`Pobieranie pliku z S3: ${key}`);

    try {
      // Pobierz plik z S3
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || 'ebooks-in',
        Key: key,
      });

      const response = await s3Client.send(command);

      if (!response.Body) {
        return NextResponse.json({ error: 'Nie można odczytać treści pliku' }, { status: 500 });
      }

      // W AWS SDK v3, response.Body może mieć różne interfejsy w zależności od środowiska
      // Użyjemy metody transformToByteArray dostępnej dla obu typów (Blob i SdkStreamMixin)
      const fileData = await response.Body.transformToByteArray();
      const fileBuffer = Buffer.from(fileData);

      // Określ typ MIME na podstawie rozszerzenia pliku
      let contentType = response.ContentType || 'application/octet-stream';
      if (key.endsWith('.png')) contentType = 'image/png';
      if (key.endsWith('.jpg') || key.endsWith('.jpeg')) contentType = 'image/jpeg';
      if (key.endsWith('.gif')) contentType = 'image/gif';
      if (key.endsWith('.svg')) contentType = 'image/svg+xml';

      // Zwróć plik jako odpowiedź
      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400' // Cache na 24h
        }
      });
    } catch (error) {
      console.error('Błąd podczas pobierania pliku z S3:', error);
      return NextResponse.json({
        error: 'Błąd podczas pobierania pliku z S3',
        details: (error as Error).message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ogólny błąd podczas pobierania pliku:', error);
    return NextResponse.json(
      { error: 'Błąd podczas pobierania pliku', details: (error as Error).message },
      { status: 500 }
    );
  }
}