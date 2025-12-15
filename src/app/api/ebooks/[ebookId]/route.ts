// src/app/api/ebooks/[ebookId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

/**
 * Obsługa aktualizacji ebooka (PUT)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  let client;

  try {
    // W Next.js 15 params jest obiektem Promise, który trzeba rozwiązać
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);

    if (isNaN(ebookId)) {
      return NextResponse.json({ error: 'Invalid ebook ID' }, { status: 400 });
    }

    // Pobierz dane z żądania
    const data = await request.json();
    const { title, subtitle } = data; // Dodajemy pobranie podtytułu

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    console.log(`Updating ebook ID=${ebookId} to title="${title}"${subtitle !== undefined ? `, subtitle="${subtitle}"` : ''}`);

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

    // Aktualizuj tytuł i podtytuł ebooka
    const query = `
      UPDATE ebooks
      SET title = $1, subtitle = $2, updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING id, title, subtitle, updated_at
    `;

    const result = await client.query(query, [title.trim(), subtitle || null, ebookId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ebook not found' }, { status: 404 });
    }

    console.log(`Successfully updated ebook ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      ebook: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating ebook:', error);
    return NextResponse.json({
      error: 'An error occurred while updating the ebook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
  }
}

/**
 * Obsługa pobierania szczegółów ebooka (GET)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  let client;

  try {
    // W Next.js 15 params jest obiektem Promise, który trzeba rozwiązać
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);

    if (isNaN(ebookId)) {
      return NextResponse.json({ error: 'Invalid ebook ID' }, { status: 400 });
    }

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

    // Pobierz dane ebooka włącznie z podtytułem
    const query = `
      SELECT id, title, subtitle, status, draft_url, visitors, created_at, updated_at
      FROM ebooks
      WHERE id = $1
    `;

    const result = await client.query(query, [ebookId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ebook not found' }, { status: 404 });
    }

    console.log(`Successfully retrieved ebook ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      ebook: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching ebook:', error);
    return NextResponse.json({
      error: 'An error occurred while fetching the ebook',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
  }
}