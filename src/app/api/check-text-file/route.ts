// src/app/api/check-text-file/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { S3ServiceException } from '@aws-sdk/client-s3';

export async function GET(request: NextRequest) {
  try {
    // Pobierz parametr fileName z zapytania
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get('fileName');

    if (!fileName) {
      return NextResponse.json({ error: 'Brak parametru fileName' }, { status: 400 });
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

    // Utwórz ścieżkę docelową w podfolderze txt (taka sama jak w funkcji Lambda)
    const baseName = fileName.replace(/\.pdf$/, '');
    const txtFileName = `txt/${baseName}.txt`;

    console.log(`Sprawdzanie czy plik ${txtFileName} istnieje w buckecie ${process.env.S3_BUCKET_NAME || 'ebooks-in'}`);

    try {
      // Sprawdź czy plik tekstowy istnieje
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME || 'ebooks-in',
          Key: txtFileName,
        })
      );

      // Jeśli plik istnieje, zwróć sukces
      return NextResponse.json({
        exists: true,
        txtFileName,
        message: 'Plik TXT został znaleziony'
      });
    } catch (error) {
      // Jeśli plik nie istnieje (błąd 404)
      const s3Error = error as S3ServiceException;
      if (s3Error.name === 'NotFound') {
        return NextResponse.json({
          exists: false,
          message: 'Plik TXT jeszcze nie istnieje, przetwarzanie trwa'
        });
      }

      // Inny błąd S3
      console.error('Błąd podczas sprawdzania pliku w S3:', error);
      return NextResponse.json({
        exists: false,
        error: 'Błąd podczas sprawdzania pliku w S3',
        details: (error as Error).message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ogólny błąd podczas sprawdzania pliku:', error);
    return NextResponse.json(
      { error: 'Błąd podczas sprawdzania pliku', details: (error as Error).message },
      { status: 500 }
    );
  }
}