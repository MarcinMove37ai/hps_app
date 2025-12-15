// src/app/api/upload-to-s3/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// Funkcja do normalizacji polskich znaków
function normalizePolishChars(text: string): string {
  return text
    .replace(/ą/g, 'a')
    .replace(/ć/g, 'c')
    .replace(/ę/g, 'e')
    .replace(/ł/g, 'l')
    .replace(/ń/g, 'n')
    .replace(/ó/g, 'o')
    .replace(/ś/g, 's')
    .replace(/ź/g, 'z')
    .replace(/ż/g, 'z')
    .replace(/Ą/g, 'A')
    .replace(/Ć/g, 'C')
    .replace(/Ę/g, 'E')
    .replace(/Ł/g, 'L')
    .replace(/Ń/g, 'N')
    .replace(/Ó/g, 'O')
    .replace(/Ś/g, 'S')
    .replace(/Ź/g, 'Z')
    .replace(/Ż/g, 'Z');
}

export async function POST(request: NextRequest) {
  try {
    // Sprawdź czy zmienne środowiskowe są ustawione
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error('Brak kluczy dostępowych AWS w zmiennych środowiskowych');
      return NextResponse.json(
        { error: 'Brak konfiguracji AWS - skontaktuj się z administratorem' },
        { status: 500 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const title = formData.get('title') as string;
    const pageType = formData.get('pageType') as string;
    const userData = formData.get('userData') as string;

    // Pobieranie danych kategorii
    const category = formData.get('category') as string || '';
    const categoryShortDesc = formData.get('categoryShortDesc') as string || '';

    // Normalizacja polskich znaków w kategorii i opisie
    const normalizedCategory = normalizePolishChars(category);
    const normalizedCategoryShortDesc = normalizePolishChars(categoryShortDesc);

    console.log('Dane kategorii:', {
      category,
      categoryShortDesc,
      normalizedCategory,
      normalizedCategoryShortDesc
    });

    if (!file) {
      return NextResponse.json({ error: 'Nie załączono pliku' }, { status: 400 });
    }

    // Konwersja File na Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Sprawdzenie czy typ pliku jest prawidłowy
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Dozwolone są tylko pliki PDF' }, { status: 400 });
    }

    // Sprawdzenie czy rozmiar pliku nie przekracza 50MB
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Maksymalny rozmiar pliku to 50MB' }, { status: 400 });
    }

    console.log('Inicjalizacja klienta S3...');
    // Inicjalizacja klienta S3
    const s3Client = new S3Client({
      region: process.env.AWS_REGION || 'eu-central-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    });

    // Generowanie unikalnej nazwy pliku
    const timestamp = Date.now();
    const sanitizedTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();
    const fileName = `${sanitizedTitle}-${timestamp}.pdf`;

    let parsedUserData = {};
    try {
      parsedUserData = JSON.parse(userData);
      console.log('Dane użytkownika:', JSON.stringify(parsedUserData));
    } catch (error) {
      console.error('Błąd podczas parsowania danych użytkownika:', error);
      return NextResponse.json({ error: 'Nieprawidłowe dane użytkownika' }, { status: 400 });
    }

    // Przygotowanie metadanych z znormalizowanymi polskimi znakami
    const metadata: Record<string, string> = {
      'title': title,
      'page-type': pageType,
      'category': normalizedCategory,            // Znormalizowana kategoria
      'short-desc': normalizedCategoryShortDesc, // Znormalizowany opis kategorii
    };

    // Dodanie wszystkich danych użytkownika do metadanych, pomijając created_at
    Object.entries(parsedUserData).forEach(([key, value]) => {
      // Pomijamy pole created_at, bo zastąpimy je bieżącą datą
      if (value !== null && value !== undefined && key !== 'created_at') {
        // Konwersja wartości do stringa (S3 akceptuje tylko stringi w metadanych)
        if (typeof value === 'object') {
          metadata[`user-${key}`] = JSON.stringify(value);
        } else {
          // Normalizacja polskich znaków w wartościach metadanych użytkownika
          const stringValue = String(value);
          metadata[`user-${key}`] = normalizePolishChars(stringValue);
        }
      }
    });

    // Dodanie bieżącej daty i godziny jako user-created_at
    metadata['user-created_at'] = new Date().toISOString();

    console.log('Próba wysłania pliku do S3 z znormalizowanymi danymi kategorii...');
    console.log('Metadane kategorii:', {
      'category': metadata['category'],
      'short-desc': metadata['short-desc']
    });

    // Wysłanie pliku do S3
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || 'ebooks-in',
        Key: fileName,
        Body: buffer,
        ContentType: 'application/pdf',
        Metadata: metadata,
      }));
      console.log('Plik został pomyślnie przesłany do S3');
    } catch (s3Error) {
      console.error('Błąd AWS S3:', s3Error);
      return NextResponse.json(
        { error: 'Błąd podczas przesyłania do S3', details: (s3Error as Error).message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      fileName,
      message: 'Plik został przesłany pomyślnie',
      categoryData: {
        originalCategory: category,
        normalizedCategory: normalizedCategory,
        originalCategoryShortDesc: categoryShortDesc,
        normalizedCategoryShortDesc: normalizedCategoryShortDesc
      }
    });

  } catch (error) {
    console.error('Ogólny błąd podczas przesyłania pliku:', error);
    return NextResponse.json(
      { error: 'Błąd podczas przesyłania pliku', details: (error as Error).message },
      { status: 500 }
    );
  }
}