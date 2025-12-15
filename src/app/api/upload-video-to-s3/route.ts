// src/app/api/upload-video-to-s3/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';

// Funkcja generująca losowy ciąg znaków (ID) dla URL
function generateRandomId(length: number = 10): string {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-';
  let result = '';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

// Funkcja zapisująca dane do bazy PostgreSQL
async function saveToDatabase(
  title: string,
  pageType: string,
  userData: any,
  s3Key: string,
  originalTitle: string,
  subtitle?: string,
  description?: string,
  isPublicVideo?: boolean,
  videoPassword?: string | null,
  category?: string,          // Nowy parametr dla kategorii
  categoryShortDesc?: string  // Nowy parametr dla opisu kategorii
) {
  const client = new Client({
    user: process.env.POSTGRES_USER,
    host: process.env.POSTGRES_HOST,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: parseInt(process.env.POSTGRES_PORT || '5432'),
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log('Połączono z bazą danych PostgreSQL');

    // Zaktualizowane zapytanie zawierające kolumny kategorii
    const query = `
      INSERT INTO pages (
        status,
        x_amz_meta_page_type,
        x_amz_meta_title,
        x_amz_meta_user_first_name,
        x_amz_meta_user_last_name,
        x_amz_meta_user_supervisor_code,
        x_amz_meta_user_created_at,
        x_amz_meta_user_id,
        x_amz_meta_user_cognito_sub,
        x_amz_meta_user_email,
        x_amz_meta_user_role,
        x_amz_meta_user_status,
        x_amz_meta_user_updated_at,
        s3_file_key,
        video_embed_url,
        draft_url,
        pagecontent_hero_headline,
        pagecontent_hero_subheadline,
        pagecontent_hero_description,
        public_page,
        video_password,
        category,           /* Nowa kolumna */
        short_desc          /* Nowa kolumna */
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
      RETURNING id
    `;

    // Tworzymy pełny URL do osadzenia wideo
    const bucketName = process.env.S3_BUCKET_NAME || 'ebooks-in';
    const region = process.env.AWS_REGION || 'eu-central-1';
    const videoEmbedUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${s3Key}`;

    // Używamy oryginalnego tytułu z polskimi znakami bez żadnych modyfikacji
    const heroHeadline = originalTitle || title;

    // Generujemy losowy ID dla URL, podobnie jak dla ebooków
    const randomId = generateRandomId(10);

    // Sanityzujemy tytuł dla URL (na wszelki wypadek, choć nie będzie używany w draft_url)
    const sanitizedUrlTitle = title.replace(/[^a-z0-9]/gi, '-').toLowerCase();

    console.log('Zapisuję do bazy oryginalny tytuł:', heroHeadline);
    console.log('Wygenerowany losowy ID dla URL:', randomId);

    // Format draft_url został zmieniony na spójny z pozostałymi typami stron
    const draftUrl = `/preview/${randomId}`;
    console.log('Generuję draft_url w formacie podglądu:', draftUrl);

    // Informacje o kontroli dostępu
    console.log('Zapisuję informacje o dostępie do wideo:');
    console.log('- Publiczne:', isPublicVideo === true ? 'TAK' : 'NIE');
    console.log('- Hasło dostępu:', videoPassword ? 'USTAWIONE' : 'BRAK');

    // Informacje o kategorii
    console.log('Zapisuję informacje o kategorii:');
    console.log('- Kategoria:', category || 'BRAK');
    console.log('- Opis kategorii:', categoryShortDesc || 'BRAK');

    const values = [
      'draft',                      // status - ZMIENIONO z 'pending' na 'draft'
      pageType,                     // x_amz_meta_page_type
      title,                        // x_amz_meta_title
      userData.first_name,          // x_amz_meta_user_first_name
      userData.last_name,           // x_amz_meta_user_last_name
      userData.supervisor_code,     // x_amz_meta_user_supervisor_code
      new Date().toISOString(),     // x_amz_meta_user_created_at
      userData.id,                  // x_amz_meta_user_id
      userData.cognito_sub,         // x_amz_meta_user_cognito_sub
      userData.email,               // x_amz_meta_user_email
      userData.role,                // x_amz_meta_user_role
      userData.status,              // x_amz_meta_user_status
      userData.updated_at || new Date().toISOString(), // x_amz_meta_user_updated_at
      null,                         // s3_file_key - Ustawiamy na null zamiast s3Key
      videoEmbedUrl,                // video_embed_url
      draftUrl,                     // draft_url - ZMIENIONO na format /preview/ID
      heroHeadline,                 // pagecontent_hero_headline - oryginalny tytuł z polskimi znakami
      subtitle || '',               // pagecontent_hero_subheadline - nowe pole
      description || '',            // pagecontent_hero_description - nowe pole
      isPublicVideo === true,       // public_page - nowe pole dla kontroli dostępu
      videoPassword || null,        // video_password - nowe pole dla kontroli dostępu
      category || '',               // category - NOWE pole dla kategorii
      categoryShortDesc || ''       // short_desc - NOWE pole dla opisu kategorii
    ];

    console.log('Wykonywanie zapytania SQL...');
    console.log('Klucz wideo zapisany tylko do video_embed_url, s3_file_key pozostaje null');

    const result = await client.query(query, values);

    const recordId = result.rows[0].id;
    console.log(`Pomyślnie zapisano dane w bazie PostgreSQL z ID: ${recordId}`);
    return recordId;
  } catch (error) {
    console.error('Błąd podczas zapisywania danych do bazy PostgreSQL:', error);
    throw error;
  } finally {
    await client.end();
    console.log('Zakończono połączenie z bazą PostgreSQL');
  }
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
    const originalTitle = formData.get('originalTitle') as string || title; // Jeśli brak, użyj title
    const pageType = formData.get('pageType') as string;
    const userData = formData.get('userData') as string;

    // Pobieramy pola formularza
    const subtitle = formData.get('subtitle') as string || '';
    const description = formData.get('description') as string || '';

    // Pobieramy nowe pola kontroli dostępu
    const isPublicVideo = formData.get('isPublicVideo') === 'true';
    const videoPassword = !isPublicVideo ? formData.get('videoPassword') as string : null;

    // Pobieramy dane kategorii
    const category = formData.get('category') as string || '';
    const categoryShortDesc = formData.get('categoryShortDesc') as string || '';

    console.log('Otrzymano tytuł:', title);
    console.log('Otrzymano oryginalny tytuł z polskimi znakami:', originalTitle);
    console.log('Otrzymano informacje o dostępie:', isPublicVideo ? 'Publiczne' : 'Prywatne');
    if (!isPublicVideo) {
      console.log('Hasło dostępu:', videoPassword ? 'USTAWIONE' : 'BRAK');
    }

    // Logujemy dane kategorii
    console.log('Otrzymano dane kategorii:');
    console.log('- Kategoria:', category || 'BRAK');
    console.log('- Opis kategorii:', categoryShortDesc || 'BRAK');

    if (!file) {
      return NextResponse.json({ error: 'Nie załączono pliku' }, { status: 400 });
    }

    // Konwersja File na Buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Sprawdzenie czy typ pliku jest prawidłowy
    if (!file.type.startsWith('video/')) {
      return NextResponse.json({ error: 'Dozwolone są tylko pliki wideo' }, { status: 400 });
    }

    // Sprawdzenie czy rozmiar pliku nie przekracza 250MB
    if (file.size > 250 * 1024 * 1024) {
      return NextResponse.json({ error: 'Maksymalny rozmiar pliku to 250MB' }, { status: 400 });
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

    // Pobieramy rozszerzenie pliku
    const fileExt = file.name.split('.').pop() || 'mp4';
    const fileName = `${sanitizedTitle}-${timestamp}.${fileExt}`;

    // Pełna ścieżka do pliku w buckecie S3 - dodajemy prefix videos/
    const s3Key = `videos/${fileName}`;

    let parsedUserData = {};
    try {
      parsedUserData = JSON.parse(userData);
      console.log('Dane użytkownika:', JSON.stringify(parsedUserData));
    } catch (error) {
      console.error('Błąd podczas parsowania danych użytkownika:', error);
      return NextResponse.json({ error: 'Nieprawidłowe dane użytkownika' }, { status: 400 });
    }

    // Przygotowanie metadanych
    const metadata: Record<string, string> = {
      'title': title,
      'page-type': pageType,
      'category': category,               // Dodajemy kategorię do metadanych
      'short-desc': categoryShortDesc,    // Dodajemy opis kategorii do metadanych
    };

    // Dodanie wszystkich danych użytkownika do metadanych, pomijając created_at
    Object.entries(parsedUserData).forEach(([key, value]) => {
      if (value !== null && value !== undefined && key !== 'created_at') {
        // Konwersja wartości do stringa (S3 akceptuje tylko stringi w metadanych)
        if (typeof value === 'object') {
          metadata[`user-${key}`] = JSON.stringify(value);
        } else {
          metadata[`user-${key}`] = String(value);
        }
      }
    });

    // Dodanie bieżącej daty i godziny jako user-created_at
    metadata['user-created_at'] = new Date().toISOString();

    // Dodanie informacji o kontroli dostępu do metadanych
    metadata['public-video'] = String(isPublicVideo);
    if (videoPassword) {
      metadata['has-password'] = 'true'; // Bez zapisywania hasła w metadanych S3
    }

    console.log('Próba wysłania pliku wideo do S3...');

    // Wysłanie pliku do S3
    try {
      await s3Client.send(new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME || 'ebooks-in',
        Key: s3Key,
        Body: buffer,
        ContentType: file.type,
        Metadata: metadata,
      }));
      console.log('Plik wideo został pomyślnie przesłany do S3');

      // Zapis danych do bazy PostgreSQL
      try {
        console.log('Zapisywanie danych do bazy PostgreSQL...');
        // Przekazujemy wszystkie parametry, włącznie z nowymi polami kategorii
        const recordId = await saveToDatabase(
          title,
          pageType,
          parsedUserData,
          s3Key,
          originalTitle,
          subtitle,
          description,
          isPublicVideo,
          videoPassword,
          category,           // Przekazujemy kategorię
          categoryShortDesc   // Przekazujemy opis kategorii
        );

        // Zwracamy sukces i ścieżkę do pliku oraz ID z bazy danych
        return NextResponse.json({
          success: true,
          fileName,
          s3Key: s3Key,
          pageId: recordId,
          message: 'Plik wideo został przesłany pomyślnie i zapisany w bazie danych',
          categoryData: {     // Zwracamy dane kategorii w odpowiedzi
            category,
            categoryShortDesc
          }
        });
      } catch (dbError) {
        console.error('Błąd zapisu do bazy PostgreSQL:', dbError);

        // Nawet jeśli zapis do bazy się nie powiedzie, zwracamy informację o sukcesie przesłania do S3
        return NextResponse.json({
          success: true,
          fileName,
          s3Key: s3Key,
          warning: 'Plik został przesłany do S3, ale wystąpił błąd zapisu do bazy danych',
          details: (dbError as Error).message
        });
      }

    } catch (s3Error) {
      console.error('Błąd AWS S3:', s3Error);
      return NextResponse.json(
        { error: 'Błąd podczas przesyłania do S3', details: (s3Error as Error).message },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Ogólny błąd podczas przesyłania pliku wideo:', error);
    return NextResponse.json(
      { error: 'Błąd podczas przesyłania pliku wideo', details: (error as Error).message },
      { status: 500 }
    );
  }
}