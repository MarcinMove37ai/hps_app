// src/app/api/ebooks/[ebookId]/chapters/[chapterId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

/**
 * Obsługa aktualizacji pojedynczego rozdziału (PUT)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string, chapterId: string }> }
) {
  let client;

  try {
    // W Next.js 15 params jest obiektem Promise, który trzeba rozwiązać
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);
    const chapterId = parseInt(resolvedParams.chapterId);

    console.log(`Przetwarzanie żądania PUT: ebookId=${ebookId}, chapterId=${chapterId}`);

    if (isNaN(ebookId) || isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
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

    const data = await request.json();
    const { title, content, position, image_url } = data;

    // Buduj zapytanie dynamicznie na podstawie dostarczonych pól
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (title !== undefined) {
      updateFields.push(`title = $${paramIndex}`);
      values.push(title);
      paramIndex++;
    }

    if (content !== undefined) {
      updateFields.push(`content = $${paramIndex}`);
      values.push(content);
      paramIndex++;
    }

    if (position !== undefined) {
      updateFields.push(`position = $${paramIndex}`);
      values.push(position);
      paramIndex++;
    }

    if (image_url !== undefined) {
      updateFields.push(`image_url = $${paramIndex}`);
      values.push(image_url);
      paramIndex++;
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (updateFields.length === 1) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Dodaj ID rozdziału i ID ebooka do wartości
    values.push(chapterId);
    values.push(ebookId);

    const query = `
      UPDATE ebook_chapters
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND ebook_id = $${paramIndex + 1}
      RETURNING id, title, content, position, image_url
    `;

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    // Aktualizuj datę modyfikacji ebooka
    await client.query(
      "UPDATE ebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [ebookId]
    );

    console.log(`Successfully updated chapter ID=${chapterId} in ebook ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      chapter: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating chapter:', error);
    return NextResponse.json({
      error: 'An error occurred while updating the chapter',
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
 * Obsługa usuwania rozdziału (DELETE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string, chapterId: string }> }
) {
  let client;

  try {
    // W Next.js 15 params jest obiektem Promise, który trzeba rozwiązać
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);
    const chapterId = parseInt(resolvedParams.chapterId);

    console.log(`Przetwarzanie żądania DELETE: ebookId=${ebookId}, chapterId=${chapterId}`);

    if (isNaN(ebookId) || isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
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

    // Pobierz pozycję usuwanego rozdziału
    const positionQuery = "SELECT position FROM ebook_chapters WHERE id = $1 AND ebook_id = $2";
    const positionResult = await client.query(positionQuery, [chapterId, ebookId]);

    if (positionResult.rows.length === 0) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const deletedPosition = positionResult.rows[0].position;

    // Usuń rozdział
    const deleteQuery = "DELETE FROM ebook_chapters WHERE id = $1 AND ebook_id = $2";
    await client.query(deleteQuery, [chapterId, ebookId]);

    // Zaktualizuj pozycje pozostałych rozdziałów
    const updatePositionsQuery = `
      UPDATE ebook_chapters
      SET position = position - 1, updated_at = CURRENT_TIMESTAMP
      WHERE ebook_id = $1 AND position > $2
    `;
    await client.query(updatePositionsQuery, [ebookId, deletedPosition]);

    // Aktualizuj datę modyfikacji ebooka
    await client.query(
      "UPDATE ebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [ebookId]
    );

    console.log(`Successfully deleted chapter ID=${chapterId} from ebook ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      message: 'Chapter deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting chapter:', error);
    return NextResponse.json({
      error: 'An error occurred while deleting the chapter',
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
 * Obsługa pobierania pojedynczego rozdziału (GET)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string, chapterId: string }> }
) {
  let client;

  try {
    // W Next.js 15 params jest obiektem Promise, który trzeba rozwiązać
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);
    const chapterId = parseInt(resolvedParams.chapterId);

    console.log(`Przetwarzanie żądania GET: ebookId=${ebookId}, chapterId=${chapterId}`);

    if (isNaN(ebookId) || isNaN(chapterId)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
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

    // Pobierz rozdział
    const query = `
      SELECT id, title, content, position, image_url, created_at, updated_at
      FROM ebook_chapters
      WHERE id = $1 AND ebook_id = $2
    `;

    const result = await client.query(query, [chapterId, ebookId]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    console.log(`Successfully retrieved chapter ID=${chapterId} from ebook ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      chapter: result.rows[0]
    });
  } catch (error) {
    console.error('Error fetching chapter:', error);
    return NextResponse.json({
      error: 'An error occurred while fetching the chapter',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
  }
}