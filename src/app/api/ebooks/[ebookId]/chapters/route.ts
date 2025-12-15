// src/app/api/ebooks/[ebookId]/chapters/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Client } from 'pg';

/**
 * Obsługa pobierania wszystkich rozdziałów (GET)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  let client: Client | undefined;

  try {
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);

    console.log(`Pobieranie rozdziałów dla ebooka ID=${ebookId}`);

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

    // Pobierz ebooka z wszystkimi rozdziałami - DODANO cover_image_url i cover_image_prompt
    const query = `
      WITH ebook_data AS (
        SELECT id, title, subtitle, status, cover_image_url, cover_image_prompt FROM ebooks WHERE id = $1
      ),
      chapter_data AS (
        SELECT id, title, content, position, image_url, created_at, updated_at
        FROM ebook_chapters
        WHERE ebook_id = $1
        ORDER BY position ASC
      )
      SELECT
        json_build_object(
          'id', e.id,
          'title', e.title,
          'subtitle', e.subtitle,
          'status', e.status,
          'cover_image_url', e.cover_image_url,
          'cover_image_prompt', e.cover_image_prompt,
          'chapters', COALESCE(json_agg(c.*), '[]'::json)
        ) as ebook
      FROM ebook_data e
      LEFT JOIN chapter_data c ON true
      GROUP BY e.id, e.title, e.subtitle, e.status, e.cover_image_url, e.cover_image_prompt
    `;

    const result = await client.query(query, [ebookId]);

    if (result.rows.length === 0 || !result.rows[0].ebook) {
      return NextResponse.json({ error: 'Ebook not found' }, { status: 404 });
    }

    console.log(`Successfully retrieved ebook with chapters, ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      ebook: result.rows[0].ebook
    });
  } catch (error) {
    console.error('Error fetching ebook chapters:', error);
    return NextResponse.json({
      error: 'An error occurred while fetching ebook chapters',
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
 * Obsługa dodawania nowych rozdziałów (POST)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  let client: Client | undefined;

  try {
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);

    console.log(`Dodawanie rozdziałów dla ebooka ID=${ebookId}`);

    if (isNaN(ebookId)) {
      return NextResponse.json({ error: 'Invalid ebook ID' }, { status: 400 });
    }

    // Pobierz dane z żądania
    const data = await request.json();
    const { chapters } = data;

    if (!Array.isArray(chapters) || chapters.length === 0) {
      return NextResponse.json({ error: 'Chapters array is required' }, { status: 400 });
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

    // Sprawdź, czy ebook istnieje
    const checkEbookQuery = "SELECT id FROM ebooks WHERE id = $1";
    const ebookResult = await client.query(checkEbookQuery, [ebookId]);

    if (ebookResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ebook not found' }, { status: 404 });
    }

    // Pobierz aktualną maksymalną pozycję
    const maxPositionQuery = "SELECT COALESCE(MAX(position), -1) as max_position FROM ebook_chapters WHERE ebook_id = $1";
    const positionResult = await client.query(maxPositionQuery, [ebookId]);
    const startPosition = (positionResult.rows[0].max_position + 1) || 0;

    console.log(`Ostatnia pozycja rozdziału: ${startPosition - 1}, dodawanie ${chapters.length} nowych rozdziałów`);

    // Przygotuj zapytanie do wstawienia wielu rozdziałów
    const values: (string | number | null)[] = [];
    const placeholders: string[] = [];
    let paramIndex = 1;

    chapters.forEach((chapter: { title: string, content?: string | null, image_url?: string | null }, index: number) => {
      const position = startPosition + index;
      const { title, content = null, image_url = null } = chapter;

      placeholders.push(`($${paramIndex}, $${paramIndex + 1}, $${paramIndex + 2}, $${paramIndex + 3}, $${paramIndex + 4})`);
      values.push(ebookId, title, position, content, image_url);
      paramIndex += 5;
    });

    console.log(`Executing insert with ${placeholders.length} placeholders and ${values.length} values`);

    const insertQuery = `
      INSERT INTO ebook_chapters (ebook_id, title, position, content, image_url)
      VALUES ${placeholders.join(', ')}
      RETURNING id, title, position, content, image_url
    `;

    const insertResult = await client.query(insertQuery, values);
    const insertedChapters = insertResult.rows;

    // Aktualizuj datę modyfikacji ebooka
    await client.query(
      "UPDATE ebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [ebookId]
    );

    console.log(`Successfully added ${insertedChapters.length} chapters to ebook ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      chapters: insertedChapters
    });
  } catch (error) {
    console.error('Error adding chapters:', error);
    return NextResponse.json({
      error: 'An error occurred while adding chapters',
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
 * Obsługa usuwania wszystkich rozdziałów (DELETE)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  let client: Client | undefined;

  try {
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);

    console.log(`Usuwanie wszystkich rozdziałów dla ebooka ID=${ebookId}`);

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

    // Usuń wszystkie rozdziały dla danego ebooka
    const deleteQuery = "DELETE FROM ebook_chapters WHERE ebook_id = $1 RETURNING id";
    const result = await client.query(deleteQuery, [ebookId]);
    const deletedCount = result.rowCount;

    // Aktualizuj datę modyfikacji ebooka
    await client.query(
      "UPDATE ebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [ebookId]
    );

    console.log(`Successfully deleted ${deletedCount} chapters from ebook ID=${ebookId}`);

    return NextResponse.json({
      success: true,
      deletedCount
    });
  } catch (error) {
    console.error('Error deleting chapters:', error);
    return NextResponse.json({
      error: 'An error occurred while deleting chapters',
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
 * Obsługa zmiany kolejności rozdziałów (PATCH)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ ebookId: string }> }
) {
  let client: Client | undefined;

  try {
    const resolvedParams = await params;
    const ebookId = parseInt(resolvedParams.ebookId);

    console.log(`Przetwarzanie żądania PATCH (reordering): ebookId=${ebookId}`);

    if (isNaN(ebookId)) {
      return NextResponse.json({ error: 'Invalid ebook ID' }, { status: 400 });
    }

    // Pobierz dane z żądania
    const data = await request.json();
    const { operation, chapterId, direction } = data;

    if (operation !== 'reorder' || !chapterId || !direction) {
      return NextResponse.json({ error: 'Missing required fields for reordering' }, { status: 400 });
    }

    if (direction !== 'up' && direction !== 'down') {
      return NextResponse.json({ error: 'Invalid direction' }, { status: 400 });
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

    // Rozpocznij transakcję
    await client.query('BEGIN');

    // Pobierz aktualną pozycję rozdziału
    const positionQuery = "SELECT position FROM ebook_chapters WHERE id = $1 AND ebook_id = $2";
    const positionResult = await client.query(positionQuery, [chapterId, ebookId]);

    if (positionResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const currentPosition = positionResult.rows[0].position;
    let newPosition: number;

    if (direction === 'up') {
      if (currentPosition === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Cannot move the first chapter up' }, { status: 400 });
      }
      newPosition = currentPosition - 1;
    } else { // direction === 'down'
      // Sprawdź, czy to nie jest ostatni rozdział
      const maxPositionQuery = "SELECT MAX(position) as max_position FROM ebook_chapters WHERE ebook_id = $1";
      const maxPositionResult = await client.query(maxPositionQuery, [ebookId]);
      const maxPosition = maxPositionResult.rows[0].max_position;

      if (currentPosition === maxPosition) {
        await client.query('ROLLBACK');
        return NextResponse.json({ error: 'Cannot move the last chapter down' }, { status: 400 });
      }
      newPosition = currentPosition + 1;
    }

    // Znajdź rozdział, z którym będziemy zamieniać pozycję
    const targetChapterQuery = "SELECT id FROM ebook_chapters WHERE ebook_id = $1 AND position = $2";
    const targetChapterResult = await client.query(targetChapterQuery, [ebookId, newPosition]);

    if (targetChapterResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Target position does not exist' }, { status: 400 });
    }

    const targetChapterId = targetChapterResult.rows[0].id;

    // Wykonaj zamianę pozycji
    // Ustaw tymczasową pozycję dla aktualnego rozdziału (-1, żeby uniknąć konfliktu)
    await client.query(
      "UPDATE ebook_chapters SET position = -1 WHERE id = $1 AND ebook_id = $2",
      [chapterId, ebookId]
    );

    // Zaktualizuj pozycję docelowego rozdziału
    await client.query(
      "UPDATE ebook_chapters SET position = $1 WHERE id = $2 AND ebook_id = $3",
      [currentPosition, targetChapterId, ebookId]
    );

    // Zaktualizuj pozycję aktualnego rozdziału
    await client.query(
      "UPDATE ebook_chapters SET position = $1 WHERE id = $2 AND ebook_id = $3",
      [newPosition, chapterId, ebookId]
    );

    // Aktualizuj datę modyfikacji ebooka
    await client.query(
      "UPDATE ebooks SET updated_at = CURRENT_TIMESTAMP WHERE id = $1",
      [ebookId]
    );

    // Zatwierdź transakcję
    await client.query('COMMIT');

    console.log(`Successfully reordered chapters in ebook ID=${ebookId}`);
    console.log(`Chapter ID=${chapterId} moved from position ${currentPosition} to ${newPosition}`);
    console.log(`Chapter ID=${targetChapterId} moved from position ${newPosition} to ${currentPosition}`);

    return NextResponse.json({
      success: true,
      updates: [
        { id: parseInt(chapterId), position: newPosition },
        { id: targetChapterId, position: currentPosition }
      ]
    });
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK').catch(() => {});
    }
    console.error('Error reordering chapters:', error);
    return NextResponse.json({
      error: 'An error occurred while reordering chapters',
      details: error instanceof Error ? error.message: 'Unknown error'
    }, { status: 500 });
  } finally {
    if (client) {
      await client.end();
      console.log('Database connection closed');
    }
  }
}