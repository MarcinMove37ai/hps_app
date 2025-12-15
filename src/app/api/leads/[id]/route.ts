// @ts-nocheck
// src/app/api/leads/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function PATCH(
  request: NextRequest,
  { params }: any
) {
  const leadId = params.id;

  if (!leadId) {
    return NextResponse.json({ error: 'Brak identyfikatora leada' }, { status: 400 });
  }

  console.log('API: Aktualizacja leada z ID:', leadId);

  let client;
  try {
    const body = await request.json();
    const { buy_now } = body;

    // Sprawdzamy czy buy_now jest przekazany
    if (buy_now === undefined) {
      return NextResponse.json({ error: 'Brak wymaganych danych' }, { status: 400 });
    }

    client = await pool.connect();

    // Używamy poprawnej nazwy kolumny lead_id i nie aktualizujemy updated_at
    const updateQuery = `UPDATE leads SET buy_now = $1 WHERE lead_id = $2 RETURNING *`;
    console.log('Wykonuję zapytanie:', updateQuery, [buy_now, leadId]);

    const result = await client.query(updateQuery, [buy_now, leadId]);

    if (result.rowCount === 0) {
      console.log(`Nie znaleziono leada o lead_id=${leadId}`);
      return NextResponse.json({ error: 'Nie znaleziono leada o podanym ID' }, { status: 404 });
    }

    console.log('Lead zaktualizowany pomyślnie:', result.rows[0]);
    return NextResponse.json(result.rows[0]);

  } catch (error) {
    console.error('Błąd podczas aktualizacji leada:', error);
    return NextResponse.json({
      error: 'Wystąpił błąd podczas przetwarzania żądania',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  } finally {
    if (client) {
      client.release();
    }
  }
}