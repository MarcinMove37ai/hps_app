// src/app/api/download-ebook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { pool } from '@/lib/db';

// Konfiguracja klienta S3
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'eu-central-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Nazwa bucketa S3
const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'ebooks-in';

// Funkcja do ekstrakcji identyfikatora z nazwy pliku
function extractFileId(filePath: string): string {
  // Znajdź wzorzec "nazwa-ebook-XXX-YYYYYYYY" w ścieżce
  const pattern = /([a-z0-9\-]+\d+-\d+)/i;
  const match = filePath.match(pattern);

  if (match && match[1]) {
    console.log(`Znaleziono identyfikator: ${match[1]}`);
    return match[1];
  }

  // Wyodrębnij nazwę pliku bez rozszerzenia i suffiksu
  const parts = filePath.split('/');
  const fileName = parts[parts.length - 1];
  const nameWithoutExt = fileName.replace(/\.[^/.]+$/, ''); // Usuń rozszerzenie

  // Usuń również suffix _strona_X jeśli istnieje
  const baseNameWithoutSuffix = nameWithoutExt.replace(/\_strona\_\d+$/i, '');

  console.log(`Wyodrębniona nazwa: ${baseNameWithoutSuffix}`);
  return baseNameWithoutSuffix;
}

// Funkcja do normalizacji ścieżki z pełnego URL
function normalizeS3Path(path: string): string {
  if (!path) return '';

  if (path.startsWith('http')) {
    try {
      const url = new URL(path);
      let normalized = url.pathname;

      // Usuń początkowy slash
      if (normalized.startsWith('/')) {
        normalized = normalized.substring(1);
      }

      // Usuń nazwę bucketa jeśli występuje w ścieżce
      const bucketPattern = new RegExp(`^${BUCKET_NAME}/`, 'i');
      normalized = normalized.replace(bucketPattern, '');

      return normalized;
    } catch (error) {
      console.error('Błąd podczas normalizacji URL:', error);
      return path;
    }
  }

  return path;
}

// Funkcja do sprawdzania, czy plik istnieje w S3
async function checkIfFileExists(key: string): Promise<boolean> {
  if (!key) return false;

  try {
    console.log(`Sprawdzanie czy istnieje plik: ${key}`);
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });

    await s3Client.send(command);
    console.log(`✓ Plik istnieje: ${key}`);
    return true;
  } catch (error) {
    console.log(`✗ Plik nie istnieje: ${key}`);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parsowanie danych z żądania
    const body = await request.json();
    const { pageId, s3Key, email } = body;

    console.log('Otrzymane parametry:', { pageId, s3Key, email });

    if (!pageId || !s3Key) {
      return NextResponse.json(
        { error: 'Brak wymaganych parametrów: pageId lub s3Key' },
        { status: 400 }
      );
    }

    // Normalizuj ścieżkę s3Key
    const normalizedS3Key = normalizeS3Path(s3Key);
    console.log(`Znormalizowany klucz S3: ${normalizedS3Key}`);

    // Sprawdź w bazie danych oryginalne dane strony
    let client;
    let originalFilePath = null;
    let originalFileName = null;

    try {
      client = await pool.connect();

      // Pobierz dane strony
      const result = await client.query(
        `SELECT * FROM pages WHERE id = $1`,
        [pageId]
      );

      if (result.rows.length === 0) {
        console.error('Nie znaleziono strony w bazie danych:', pageId);
        return NextResponse.json(
          { error: 'Nie znaleziono strony' },
          { status: 404 }
        );
      }

      // Sprawdź dostępne ścieżki do plików
      const page = result.rows[0];
      console.log('Dane strony:', {
        id: page.id,
        title: page.pagecontent_hero_headline
      });

      // Sprawdź, czy w bazie jest zapisana ścieżka do oryginalnego pliku PDF
      if (page.original_file_path) {
        originalFilePath = normalizeS3Path(page.original_file_path);
        console.log(`Znaleziono ścieżkę do oryginalnego pliku w bazie: ${originalFilePath}`);
      }

      // Sprawdź inne potencjalne pola, które mogą zawierać ścieżkę do PDF
      const possiblePdfFields = [
        'pdf_file_path',
        'file_path',
        'document_path',
        'pdf_path'
      ];

      for (const field of possiblePdfFields) {
        if (page[field]) {
          console.log(`Znaleziono potencjalną ścieżkę do PDF w polu ${field}: ${page[field]}`);
          originalFilePath = normalizeS3Path(page[field]);
          break;
        }
      }

      // Zapis informacji o pobraniu
      if (email) {
        console.log('Zapisywanie informacji o pobraniu dla:', { pageId, email });
        try {
          await client.query(
            `INSERT INTO download_logs (page_id, email, downloaded_at)
             VALUES ($1, $2, NOW())
             ON CONFLICT (page_id, email) DO UPDATE
             SET downloaded_at = NOW()`,
            [pageId, email]
          );
          console.log('Zapisano informacje o pobraniu');
        } catch (logError) {
          console.error('Błąd podczas zapisywania logu pobrania:', logError);
          // Kontynuujemy
        }
      }
    } catch (dbError) {
      console.error('Błąd bazy danych:', dbError);
      // Kontynuujemy
    } finally {
      if (client) {
        client.release();
      }
    }

    // Wyodrębnij identyfikator pliku z ścieżki
    const fileId = extractFileId(normalizedS3Key);
    console.log(`Wyodrębniony identyfikator pliku: ${fileId}`);

    // Utwórz nazwę pliku PDF na podstawie identyfikatora
    const pdfFileName = `${fileId}.pdf`;
    console.log(`Wygenerowana nazwa pliku PDF: ${pdfFileName}`);

    // Przygotuj listę możliwych ścieżek do sprawdzenia
    const possiblePaths = [
      // 1. Oryginalna ścieżka z bazy danych, jeśli istnieje
      originalFilePath,

      // 2. Plik PDF o tej samej nazwie, tylko w głównym katalogu
      pdfFileName,

      // 3. Plik PDF w katalogu pdfs
      `pdfs/${pdfFileName}`,

      // 4. Plik PDF w katalogu documents
      `documents/${pdfFileName}`,

      // 5. Ta sama ścieżka co obrazek, tylko ze zmianą rozszerzenia na PDF
      normalizedS3Key.replace(/\.png$/i, '.pdf'),

      // 6. Ścieżka do obrazka bez suffiksu _strona_X.png, z rozszerzeniem PDF
      normalizedS3Key.replace(/\_strona\_\d+\.png$/i, '.pdf'),

      // 7. Spróbuj podfolderu z identyfikatorem
      `${fileId}/${pdfFileName}`,

      // 8. Spróbuj ustawić rozszerzenie PDF bez zmiany ścieżki
      `${normalizedS3Key.replace(/\.[^/.]+$/, '')}.pdf`
    ].filter((path): path is string => typeof path === 'string' && path.length > 0); // Użycie predykatu typu do usunięcia null i pustych stringów

    console.log('Sprawdzanie możliwych ścieżek do pliku PDF:', possiblePaths);

    let pdfKey = null;

    // Sprawdź każdą możliwą ścieżkę
    for (const path of possiblePaths) {
      if (await checkIfFileExists(path)) {
        pdfKey = path;
        console.log(`Znaleziono plik PDF pod ścieżką: ${pdfKey}`);
        break;
      }
    }

    if (!pdfKey) {
      console.error('Nie znaleziono pliku PDF pod żadną z możliwych ścieżek');
      return NextResponse.json(
        { error: 'Nie znaleziono pliku PDF dla tej strony. Skontaktuj się z administratorem.' },
        { status: 404 }
      );
    }

    // Tworzenie podpisanego URL do pobrania pliku
    console.log(`Generowanie podpisanego URL dla pliku: ${pdfKey} z bucketa ${BUCKET_NAME}`);

    // Wyodrębnij nazwę pliku do nagłówka Content-Disposition
    const downloadFileName = pdfKey.split('/').pop() || pdfFileName;

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: pdfKey,
      ResponseContentDisposition: `attachment; filename="${downloadFileName}"`,
      ResponseContentType: 'application/pdf'
    });

    // Generowanie podpisanego URL z czasem ważności 15 minut
    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });
    console.log('Wygenerowano podpisany URL');

    // Odpowiedź z URL do pobrania
    return NextResponse.json({
      downloadUrl: signedUrl,
      success: true,
      message: 'URL do pobrania wygenerowany pomyślnie',
      originalKey: s3Key,
      pdfKey: pdfKey,
      fileName: downloadFileName
    });
  } catch (error) {
    console.error('Nieobsłużony błąd podczas generowania linku do pobrania:', error);
    return NextResponse.json(
      { error: 'Wystąpił nieoczekiwany błąd podczas przetwarzania żądania' },
      { status: 500 }
    );
  }
}