// src/app/api/activity/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  console.log('GET /api/activity - Przetwarzanie żądania');

  try {
    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    // Sprawdź uprawnienia użytkownika
    if (userRole !== 'ADMIN' && userRole !== 'GOD' && userRole !== 'USER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Pobierz parametry zapytania
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '5');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    // Dla ADMIN znajdź kod opiekuna na podstawie imienia i nazwiska w tabeli supervisor_codes
    let adminSupervisorCode = null;
    if (userRole === 'ADMIN') {
      // Najpierw pobierz imię i nazwisko zalogowanego użytkownika
      const userQuery = `
        SELECT first_name, last_name
        FROM user_profiles
        WHERE id = $1
      `;
      const userResult = await pool.query(userQuery, [userId]);
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const firstName = userResult.rows[0].first_name;
      const lastName = userResult.rows[0].last_name;
      const fullName = `${firstName} ${lastName}`.trim();

      console.log("Admin Full Name:", fullName);

      // Znajdź kod opiekuna na podstawie pełnego imienia i nazwiska
      const supervisorCodeQuery = `
        SELECT code
        FROM supervisor_codes
        WHERE description = $1
      `;
      const supervisorCodeResult = await pool.query(supervisorCodeQuery, [fullName]);
      adminSupervisorCode = supervisorCodeResult.rows[0]?.code || null;
      console.log("Admin Supervisor Code found:", adminSupervisorCode);
    }

    // Zapytanie z filtrowaniem uprawnień w zależności od roli użytkownika
    let query = `
      SELECT
        news_id as id,
        news_kind as kind,
        notification_text as text,
        created_at as created_at,
        user_id,
        attribute_0 as supervisor_description,
        attribute_1 as type_info,
        supervisor_code
      FROM news
      WHERE 1=1
    `;

    // Zapytanie do zliczania całkowitej liczby rekordów (dla sprawdzenia, czy są jeszcze dane)
    let countQuery = `
      SELECT COUNT(*) as total
      FROM news
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];
    let paramIndex = 1;
    let countParamIndex = 1;

    // Filtrowanie na podstawie roli użytkownika
    if (userRole === 'USER') {
      // USER widzi tylko swoje aktywności
      const whereClause = ` AND user_id = $${paramIndex}`;
      query += whereClause;
      countQuery += whereClause;
      params.push(userId);
      countParams.push(userId);
      paramIndex++;
      countParamIndex++;
    } else if (userRole === 'ADMIN') {
      // ADMIN widzi swoje aktywności + te, gdzie jest opiekunem
      if (adminSupervisorCode) {
        const whereClause = ` AND (
          user_id = $${paramIndex}
          OR
          supervisor_code = $${paramIndex + 1}
        )`;
        query += whereClause;
        countQuery += whereClause;
        params.push(userId);
        params.push(adminSupervisorCode);
        countParams.push(userId);
        countParams.push(adminSupervisorCode);
        paramIndex += 2;
        countParamIndex += 2;
      } else {
        // Jeśli admin nie ma kodu opiekuna, widzi tylko swoje
        const whereClause = ` AND user_id = $${paramIndex}`;
        query += whereClause;
        countQuery += whereClause;
        params.push(userId);
        countParams.push(userId);
        paramIndex++;
        countParamIndex++;
      }
    }
    // GOD widzi wszystko - bez dodatkowych filtrów

    // Sortowanie po dacie utworzenia, dodanie OFFSET i LIMIT
    query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit);
    params.push(offset);

    console.log('Wykonywanie zapytania:', query);
    console.log('Parametry zapytania:', params);

    // Wykonanie zapytania o dane
    const result = await pool.query(query, params);
    console.log(`Zapytanie wykonane pomyślnie, zwrócono ${result.rows.length} wierszy`);

    // Wykonanie zapytania o całkowitą liczbę rekordów
    const countResult = await pool.query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].total);

    // Sprawdzenie, czy są dostępne więcej rekordy
    const hasMore = totalCount > (offset + limit);

    // Formatowanie danych dla frontendu
    const activities = result.rows.map(row => ({
      id: row.id,
      kind: row.kind,
      text: row.text,
      createdAt: row.created_at,
      userId: row.user_id,
      supervisorDescription: row.supervisor_description,
      typeInfo: row.type_info,
      supervisorCode: row.supervisor_code
    }));

    return NextResponse.json({
      activities,
      pagination: {
        offset,
        limit,
        total: totalCount,
        hasMore
      }
    });

  } catch (error) {
    console.error('Błąd podczas pobierania aktywności:', error);
    const err = error as Error & { code?: string };
    return NextResponse.json(
      {
        error: 'Błąd serwera podczas pobierania aktywności',
        details: {
          message: err.message,
          stack: err.stack,
          code: err.code
        }
      },
      { status: 500 }
    );
  }
}