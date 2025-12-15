// src/app/api/partners/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { UserRole, PartnersApiResponse } from '../types';

/**
 * Handler dla żądania GET - pobiera listę partnerów (użytkowników)
 */
export async function GET(request: NextRequest) {
  try {
    console.log("======= PARTNERS API REQUEST =======");
    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role') as UserRole;
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    // Sprawdź uprawnienia użytkownika - tylko ADMIN i GOD powinni mieć dostęp
    if (userRole !== 'ADMIN' && userRole !== 'GOD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Pobierz informacje o zalogowanym użytkowniku
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

    console.log("User Full Name:", fullName);

    // Dla ADMIN znajdź kod opiekuna na podstawie imienia i nazwiska w tabeli supervisor_codes
    let adminSupervisorCode = null;
    if (userRole === 'ADMIN') {
      const supervisorCodeQuery = `
        SELECT code
        FROM supervisor_codes
        WHERE description = $1
      `;
      const supervisorCodeResult = await pool.query(supervisorCodeQuery, [fullName]);
      adminSupervisorCode = supervisorCodeResult.rows[0]?.code || null;
      console.log("Admin Supervisor Code found:", adminSupervisorCode);
    }

    // Pobierz parametry filtrowania
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || null;
    const role = url.searchParams.get('role') || null;
    const supervisorCode = url.searchParams.get('supervisorCode') || null;
    const search = url.searchParams.get('search') || null;
    const excludeUserId = url.searchParams.get('excludeUserId') || userId; // Używamy ID z nagłówka jako domyślnej wartości

    // Tworzenie zapytania z parametrami
    let query = `
      SELECT
        up.id,
        up.cognito_sub,
        up.first_name,
        up.last_name,
        up.email,
        up.phone_number,
        up.supervisor_code,
        up.status,
        up.role,
        up.admin_comment,
        up.created_at,
        up.updated_at,
        sc.description as supervisor_description
      FROM user_profiles up
      LEFT JOIN supervisor_codes sc ON up.supervisor_code = sc.code
      WHERE 1=1
    `;

    const queryParams: string[] = [];
    let paramCounter = 1;

    // Wykluczamy użytkowników z rolą GOD
    query += ` AND up.role != 'GOD'`;

    // Dodaj warunek wykluczania zalogowanego użytkownika
    if (excludeUserId) {
      query += ` AND up.id != $${paramCounter}`;
      queryParams.push(excludeUserId);
      paramCounter++;
    }

    // Dla ADMIN wyświetlamy tylko partnerów, których jest opiekunem
    if (userRole === 'ADMIN') {
      if (adminSupervisorCode) {
        query += ` AND up.supervisor_code = $${paramCounter} AND up.role = 'USER'`;
        queryParams.push(adminSupervisorCode);
        paramCounter++;
      } else {
        // Jeśli nie znaleziono kodu opiekuna dla admina, zwracamy pustą listę
        query += ` AND 1=0`;
      }
    } else if (userRole === 'GOD') {
      // Filtrowanie dla GOD
      if (role) {
        query += ` AND up.role = $${paramCounter}`;
        queryParams.push(role);
        paramCounter++;
      }

      if (supervisorCode) {
        query += ` AND up.supervisor_code = $${paramCounter}`;
        queryParams.push(supervisorCode);
        paramCounter++;
      }
    }

    // Dodaj warunek filtrowania według statusu
    if (status) {
      query += ` AND up.status = $${paramCounter}`;
      queryParams.push(status);
      paramCounter++;
    }

    // Dodaj warunek wyszukiwania
    if (search) {
      query += ` AND (
        up.first_name ILIKE $${paramCounter} OR
        up.last_name ILIKE $${paramCounter} OR
        up.email ILIKE $${paramCounter}
      )`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    // Sortowanie
    query += ` ORDER BY up.created_at DESC`;

    console.log("Final SQL Query:", query);
    console.log("Query Params:", queryParams);

    // Wykonaj zapytanie
    const result = await pool.query(query, queryParams);
    console.log(`Found ${result.rows.length} partners`);

    // Przygotuj dane do zwrócenia - bez wrażliwych informacji
    const partners = await Promise.all(result.rows.map(async partner => {
      // Formatuj nazwę partnera dla wyświetlenia
      const partnerName = `${partner.first_name || ''} ${partner.last_name || ''}`.trim() || partner.email;
      // Przygotuj informację o opiekunie
      const contact = partner.supervisor_description || 'Brak przypisanego opiekuna';
      // Dla ADMIN znajdź kod opiekuna z tabeli supervisor_codes
      let adminCode = null;
      if (partner.role === 'ADMIN') {
        const adminName = `${partner.first_name || ''} ${partner.last_name || ''}`.trim();
        const adminCodeQuery = `
          SELECT code
          FROM supervisor_codes
          WHERE description = $1
        `;
        const adminCodeResult = await pool.query(adminCodeQuery, [adminName]);
        adminCode = adminCodeResult.rows[0]?.code || null;
      }
      return {
        id: partner.id,
        cognito_sub: partner.cognito_sub,
        name: partnerName,
        first_name: partner.first_name,
        last_name: partner.last_name,
        contact: contact,
        email: partner.email,
        phone: partner.phone_number,
        status: partner.status,
        role: partner.role,
        admin_comment: partner.admin_comment || '',
        supervisor_code: partner.supervisor_code,
        admin_code: adminCode,  // Nowe pole z kodem opiekuna
        created_at: partner.created_at,
        updated_at: partner.updated_at
      };
    }));

    // Przygotowanie zapytania dla statystyk - dostosowane do uprawnień
    let statsQuery = `
      SELECT
        status,
        COUNT(*) as count
      FROM user_profiles
      WHERE id != $1
    `;

    const statsParams = [excludeUserId];
    let statsParamIndex = 2;

    // Wykluczamy użytkowników z rolą GOD
    statsQuery += ` AND role != 'GOD'`;

    // Dla ADMIN filtrujemy po kodzie opiekuna znalezionym na podstawie imienia i nazwiska
    if (userRole === 'ADMIN' && adminSupervisorCode) {
      statsQuery += ` AND supervisor_code = $${statsParamIndex} AND role = 'USER'`;
      statsParams.push(adminSupervisorCode);
      statsParamIndex++;
    } else if (userRole === 'ADMIN') {
      // Jeśli nie znaleziono kodu opiekuna dla admina, zwracamy puste statystyki
      statsQuery += ` AND 1=0`;
    }

    statsQuery += ` GROUP BY status`;

    console.log("Stats Query:", statsQuery);
    console.log("Stats Params:", statsParams);

    const statsResult = await pool.query(statsQuery, statsParams);

    // Formatowanie statystyk
    const stats = {
      total: 0,
      active: 0,
      pending: 0,
      blocked: 0
    };

    statsResult.rows.forEach(row => {
      if (row.status === 'active') stats.active = parseInt(row.count);
      else if (row.status === 'pending') stats.pending = parseInt(row.count);
      else if (row.status === 'blocked') stats.blocked = parseInt(row.count);
    });

    stats.total = stats.active + stats.pending + stats.blocked;
    console.log("Calculated Stats:", stats);

    // Pobierz listę opiekunów dostosowaną do uprawnień
    let supervisorsQuery = '';
    const supervisorsParams: string[] = [];

    if (userRole === 'GOD') {
      // GOD widzi wszystkich opiekunów
      supervisorsQuery = `
        SELECT DISTINCT code, description, is_active
        FROM supervisor_codes
        WHERE is_active = true
        ORDER BY description
      `;
    } else if (userRole === 'ADMIN' && adminSupervisorCode) {
      // ADMIN widzi tylko swój kod opiekuna
      supervisorsQuery = `
        SELECT code, description, is_active
        FROM supervisor_codes
        WHERE code = $1 AND is_active = true
      `;
      supervisorsParams.push(adminSupervisorCode);
    } else {
      // Pusty wynik, gdyby coś poszło nie tak
      supervisorsQuery = `SELECT null as code, null as description, false as is_active WHERE 1=0`;
    }

    console.log("Supervisors Query:", supervisorsQuery);
    console.log("Supervisors Params:", supervisorsParams);

    const supervisorsResult = await pool.query(supervisorsQuery, supervisorsParams);
    console.log(`Found ${supervisorsResult.rows.length} supervisors`);

    const response: PartnersApiResponse = {
      partners: partners,
      stats: stats,
      supervisors: supervisorsResult.rows
    };

    console.log("Response Prepared. Sending...");
    console.log("======= END OF PARTNERS API REQUEST =======");

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error in GET /api/partners:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}