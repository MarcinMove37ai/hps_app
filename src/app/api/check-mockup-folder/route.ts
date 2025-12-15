// src/app/api/check-mockup-folder/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';

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

    // Utwórz ścieżkę do folderu mockup
    const baseName = fileName.replace(/\.pdf$/, '');
    const mockupFolderPrefix = `mockup/${baseName}/`;

    console.log(`Sprawdzanie czy folder ${mockupFolderPrefix} istnieje w buckecie ${process.env.S3_BUCKET_NAME || 'ebooks-in'}`);

    try {
      // Sprawdź czy folder mockup z nazwą pliku istnieje
      const command = new ListObjectsV2Command({
        Bucket: process.env.S3_BUCKET_NAME || 'ebooks-in',
        Prefix: mockupFolderPrefix,
        MaxKeys: 20, // Pobierz do 20 pierwszych plików
      });

      const response = await s3Client.send(command);
      console.log(`Odpowiedź z S3 dla folderu ${mockupFolderPrefix}:`, response.Contents?.length || 0, 'elementów');

      // Jeśli folder istnieje i zawiera pliki
      if (response.Contents && response.Contents.length > 0) {
        // Filtrowanie plików (pomiń sam folder)
        const files = response.Contents.filter(item => item.Key !== mockupFolderPrefix);
        console.log(`Znaleziono ${files.length} plików w folderze mockup`);

        // Pobierz listę plików (okładek) z folderu
        const mockupFiles = files.map(item => {
          const fileKey = item.Key || '';
          const url = `/api/mockup-file?key=${encodeURIComponent(fileKey)}`;
          console.log(`Generuję URL dla ${fileKey}: ${url}`);

          return {
            key: fileKey,
            url: url,
            lastModified: item.LastModified
          };
        });

        return NextResponse.json({
          exists: true,
          mockupFolder: mockupFolderPrefix,
          mockupFiles: mockupFiles,
          message: 'Znaleziono folder z mockupami'
        });
      } else {
        // Jeśli folder nie istnieje lub jest pusty
        console.log(`Folder ${mockupFolderPrefix} nie istnieje lub jest pusty`);
        return NextResponse.json({
          exists: false,
          message: 'Nie znaleziono folderu mockup dla tego pliku'
        });
      }
    } catch (error) {
      console.error('Błąd podczas sprawdzania folderu mockup w S3:', error);
      return NextResponse.json({
        exists: false,
        error: 'Błąd podczas sprawdzania folderu mockup w S3',
        details: (error as Error).message
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Ogólny błąd podczas sprawdzania folderu mockup:', error);
    return NextResponse.json(
      { error: 'Błąd podczas sprawdzania folderu mockup', details: (error as Error).message },
      { status: 500 }
    );
  }
}