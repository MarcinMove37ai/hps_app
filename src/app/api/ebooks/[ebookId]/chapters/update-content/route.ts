// src/app/api/ebooks/[ebookId]/chapters/update-content/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

/**
 * Obsługa aktualizacji treści rozdziałów (PUT)
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

    // Sprawdź czy ebook istnieje
    const ebookQuery = "SELECT id FROM ebooks WHERE id = $1";
    const ebookResult = await client.query(ebookQuery, [ebookId]);
    if (ebookResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ebook not found' }, { status: 404 });
    }

    // Pobierz dane z żądania
    const data = await request.json();
    const { chapters } = data;

    if (!Array.isArray(chapters)) {
      return NextResponse.json({ error: 'Invalid chapters format' }, { status: 400 });
    }

    console.log(`Updating content for ${chapters.length} chapters in ebook ID=${ebookId}`);

    // Aktualizuj treść każdego rozdziału
    const updatedChapters = [];

    for (const chapter of chapters) {
      if (!chapter.id) {
        updatedChapters.push({ error: `Missing ID for chapter: ${chapter.title}` });
        continue;
      }

      const query = `
        UPDATE ebook_chapters
        SET content = $1, updated_at = CURRENT_TIMESTAMP
        WHERE id = $2 AND ebook_id = $3
        RETURNING id, title
      `;

      const result = await client.query(query, [
        chapter.content || '',
        chapter.id,
        ebookId
      ]);

      if (result.rows.length === 0) {
        updatedChapters.push({ error: `Chapter with ID ${chapter.id} not found` });
      } else {
        updatedChapters.push({
          id: result.rows[0].id,
          title: result.rows[0].title,
          updated: true
        });
      }
    }

    // Aktualizuj datę modyfikacji ebooka
    await client.query(
      "UPDATE ebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [ebookId]
    );

    console.log(`Successfully updated content for chapters in ebook ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      chapters: updatedChapters
    });
  } catch (error) {
    console.error('Error updating chapter content:', error);
    return NextResponse.json({
      error: 'An error occurred while updating chapter content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
  }
}