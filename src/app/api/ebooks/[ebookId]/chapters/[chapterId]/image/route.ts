// src/app/api/ebooks/[ebookId]/chapters/[chapterId]/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';

/**
 * Obsługa przesyłania obrazu dla rozdziału (POST)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string, chapterId: string }> }
) {
  let client;
  let s3Client;

  try {
    // Rozwiązanie parametrów z URL
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);
    const chapterId = parseInt(resolvedParams.chapterId);

    console.log(`Przetwarzanie żądania przesłania obrazu dla ebookId=${ebookId}, chapterId=${chapterId}`);

    if (isNaN(ebookId) || isNaN(chapterId)) {
      return NextResponse.json({ error: 'Nieprawidłowe parametry' }, { status: 400 });
    }

    // Sprawdzenie typu zawartości
    const contentType = request.headers.get('content-type') || '';
    console.log('Content-Type:', contentType);

    let imageFile;

    // Obsługa różnych typów zawartości
    if (contentType.includes('multipart/form-data')) {
      // Standardowa obsługa formData
      try {
        const formData = await request.formData();
        imageFile = formData.get('image') as File | null;
      } catch (formError) {
        console.error('Błąd podczas parsowania formData:', formError);
        return NextResponse.json({
          error: 'Nie można przetworzyć formularza',
          details: 'Upewnij się, że żądanie jest wysyłane jako multipart/form-data'
        }, { status: 400 });
      }
    } else {
      // Alternatywna metoda: bezpośrednie odczytanie pliku z request.body
      // Użyj tego tylko jeśli formData nie działa
      try {
        const buffer = await request.arrayBuffer();
        const blob = new Blob([buffer]);
        imageFile = new File([blob], 'uploaded-image.jpg', {
          type: contentType.includes('image/') ? contentType : 'image/jpeg'
        });
        console.log('Przetworzono plik bezpośrednio z body requestu');
      } catch (bodyError) {
        console.error('Błąd podczas odczytu body:', bodyError);
        return NextResponse.json({
          error: 'Nie można przetworzyć pliku',
          contentTypeReceived: contentType
        }, { status: 400 });
      }
    }

    if (!imageFile) {
      return NextResponse.json({ error: 'Brak pliku obrazu' }, { status: 400 });
    }

    // Sprawdzenie typu pliku
    const fileType = imageFile.type;
    console.log('Typ pliku:', fileType);

    if (!fileType.startsWith('image/') && !contentType.startsWith('image/')) {
      return NextResponse.json({
        error: 'Wybrany plik nie jest obrazem',
        fileType,
        contentType
      }, { status: 400 });
    }

    // Konwersja pliku do ArrayBuffer
    const buffer = await imageFile.arrayBuffer();

    // Przetwarzanie obrazu za pomocą sharp
    let processedImageBuffer;
    let outputContentType;
    let fileExtension;

    if (fileType.includes('png') || contentType.includes('png') ||
        fileType.includes('webp') || contentType.includes('webp')) {
      // Przetwarzanie jako PNG z zachowaniem przezroczystości
      processedImageBuffer = await sharp(Buffer.from(buffer))
        .png({ quality: 90, compressionLevel: 9 })
        .toBuffer();
      outputContentType = 'image/png';
      fileExtension = 'png';
    } else {
      // Przetwarzanie jako JPEG
      processedImageBuffer = await sharp(Buffer.from(buffer))
        .jpeg({ quality: 85 })
        .toBuffer();
      outputContentType = 'image/jpeg';
      fileExtension = 'jpg';
    }

    // Konfiguracja klienta S3
    s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });

    // Folder docelowy w S3
    const EBOOK_AI_FOLDER = 'ebookAI';

    // Generowanie unikalnej nazwy pliku zgodnie z wymaganiami
    const fileName = `EB${ebookId}_CH${chapterId}.${fileExtension}`;
    const s3Key = `${EBOOK_AI_FOLDER}/${fileName}`;

    console.log(`Zapisywanie obrazu jako ${s3Key} w S3`);

    // Przesłanie pliku do S3
    const uploadCommand = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: s3Key,
      Body: processedImageBuffer,
      ContentType: outputContentType  // Poprawiony też błąd z nieprawidłowym Content-Type
      // Usunięto sekcję Metadata
    });

    await s3Client.send(uploadCommand);

    // Generowanie publicznego URL dla obrazu
    const imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION || 'eu-central-1'}.amazonaws.com/${s3Key}`;

    // Aktualizacja URL obrazu w bazie danych
    client = new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      ssl: {
        rejectUnauthorized: false
      }
    });

    await client.connect();
    console.log('Connected to PostgreSQL database');

    // Aktualizacja URL obrazu w bazie danych
    const query = `
      UPDATE ebook_chapters
      SET image_url = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND ebook_id = $3
      RETURNING id, title, image_url
    `;

    const result = await client.query(query, [imageUrl, chapterId, ebookId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Nie znaleziono rozdziału' }, { status: 404 });
    }

    // Aktualizacja daty modyfikacji ebooka
    await client.query(
      "UPDATE ebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [ebookId]
    );

    console.log(`Pomyślnie zaktualizowano URL obrazu dla rozdziału ID=${chapterId} w ebooku ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      image_url: imageUrl,
      chapter: result.rows[0]
    });
  } catch (error) {
    console.error('Błąd podczas przesyłania obrazu:', error);
    return NextResponse.json({
      error: 'Wystąpił błąd podczas przesyłania obrazu',
      details: error instanceof Error ? error.message : 'Nieznany błąd'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
  }
}