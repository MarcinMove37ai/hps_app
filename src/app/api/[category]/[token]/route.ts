// src/app/api/[category]/[token]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ category: string, token: string }> }
) {
  const { category, token } = await context.params;
  let client;

  try {
    client = await pool.connect();

    // Zmodyfikowane zapytanie, używamy parametru kategorii z URL
    const result = await client.query(
      `SELECT * FROM pages WHERE url LIKE $1 AND status = 'active'`,
      [`%/${category}/${token}%`]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Strona nie istnieje lub nie jest opublikowana' },
        { status: 404 }
      );
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Błąd podczas pobierania publicznej strony:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania strony' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}