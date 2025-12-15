// src/app/api/supervisor/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

/**
 * Handler dla żądania GET - pobiera opis opiekuna na podstawie kodu
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    console.log("======= SUPERVISOR DESCRIPTION API REQUEST =======");

    // Zaczekaj na dostęp do params.code
    const { code } = await params;
    console.log("Supervisor Code:", code);

    // Sprawdź czy kod jest przekazany
    if (!code) {
      return NextResponse.json({ error: 'Brak kodu opiekuna' }, { status: 400 });
    }

    // Zapytanie do bazy danych
    const query = `
      SELECT description
      FROM supervisor_codes
      WHERE code = $1
    `;

    const result = await pool.query(query, [code]);

    // Jeśli nie znaleziono opisu dla danego kodu
    if (result.rows.length === 0) {
      console.log("Nie znaleziono opisu dla kodu:", code);
      return NextResponse.json({
        code: code,
        description: `Nieznany opiekun (${code})`
      });
    }

    console.log("Znaleziono opis:", result.rows[0].description);

    // Zwróć znaleziony opis
    return NextResponse.json({
      code: code,
      description: result.rows[0].description
    });

  } catch (error: unknown) {
    // Pobierz kod bezpiecznie dla komunikatu o błędzie
    let errorCode = "unknown";
    try {
      const { code } = await params;
      errorCode = code;
    } catch (e) {
      // Ignoruj błędy podczas pobierania kodu w obsłudze błędów
    }

    console.error(`Error in GET /api/supervisor/${errorCode}:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}