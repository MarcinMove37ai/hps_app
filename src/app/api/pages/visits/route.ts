// src/app/api/pages/visits/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { pageId } = await request.json();

    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 });
    }

    const client = await pool.connect();

    try {
      // Sprawdź czy kolumna visitors istnieje
      const checkColumnQuery = `
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'pages' AND column_name = 'visitors'
      `;

      const columnCheck = await client.query(checkColumnQuery);

      // Jeśli kolumna nie istnieje, utwórz ją
      if (columnCheck.rows.length === 0) {
        await client.query(`
          ALTER TABLE pages
          ADD COLUMN IF NOT EXISTS visitors INTEGER DEFAULT 0
        `);
        console.log('Utworzono kolumnę visitors w tabeli pages');
      }

      // Aktualizacja licznika odwiedzin
      const result = await client.query(
        `UPDATE pages SET visitors = COALESCE(visitors, 0) + 1 WHERE id = $1 RETURNING visitors`,
        [pageId]
      );

      const updatedVisitors = result.rows[0]?.visitors || 0;

      return NextResponse.json({
        success: true,
        visitors: updatedVisitors
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating visit counter:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}