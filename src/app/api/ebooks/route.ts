// src/app/api/ebooks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

/**
 * Obsługa tworzenia nowego ebooka (POST)
 */
export async function POST(request: NextRequest) {
  let client;

  try {
    // Pobierz dane użytkownika z nagłówków
    const userIdHeader = request.headers.get('X-User-Id');
    const userCognitoSubHeader = request.headers.get('X-User-Cognito-Sub');
    const userFirstNameHeader = request.headers.get('X-User-First-Name');
    const userLastNameHeader = request.headers.get('X-User-Last-Name');
    const userEmailHeader = request.headers.get('X-User-Email');
    const userRoleHeader = request.headers.get('X-User-Role');
    const userStatusHeader = request.headers.get('X-User-Status');
    const userSupervisorCodeHeader = request.headers.get('X-User-Supervisor-Code');
    const userCreatedAtHeader = request.headers.get('X-User-Created-At');
    const userUpdatedAtHeader = request.headers.get('X-User-Updated-At');

    // Konwersja ID użytkownika na liczbę całkowitą
    let userId = 1; // Domyślna wartość dla testów

    if (userIdHeader && /^\d+$/.test(userIdHeader)) {
      userId = parseInt(userIdHeader, 10);
    }

    // Pobierz dane z żądania
    const data = await request.json();
    const { title, subtitle } = data; // Dodajemy pobranie podtytułu

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    console.log(`Creating new ebook: "${title}"${subtitle ? ` with subtitle: "${subtitle}"` : ''} for user ID=${userId}`);

    // Utwórz połączenie z bazą danych
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

    // Zapis do bazy - wszystkie pola metadanych użytkownika
    const insertQuery = `
      INSERT INTO ebooks (
        title,
        subtitle, /* Dodajemy kolumnę na podtytuł */
        status,
        visitors,
        x_amz_meta_user_id,
        x_amz_meta_user_cognito_sub,
        x_amz_meta_user_first_name,
        x_amz_meta_user_last_name,
        x_amz_meta_user_email,
        x_amz_meta_user_role,
        x_amz_meta_user_status,
        x_amz_meta_user_supervisor_code,
        x_amz_meta_user_created_at,
        x_amz_meta_user_updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id
    `;

    const insertValues = [
      title,
      subtitle || null, // Dodajemy wartość podtytułu (lub null jeśli brak)
      'draft',
      0, // visitors
      userId,
      userCognitoSubHeader || null,
      userFirstNameHeader || null,
      userLastNameHeader || null,
      userEmailHeader || null,
      userRoleHeader || null,
      userStatusHeader || null,
      userSupervisorCodeHeader || null,
      userCreatedAtHeader || null,
      userUpdatedAtHeader || null
    ];

    const result = await client.query(insertQuery, insertValues);
    const ebookId = result.rows[0].id;

    console.log(`Ebook created successfully with ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      ebookId
    });
  } catch (error) {
    console.error('Error creating ebook:', error);
    return NextResponse.json({
      error: 'An error occurred while creating the ebook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
  }
}