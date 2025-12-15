// src/app/api/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { UserRole } from '../types';

/**
 * Handler dla żądania GET - pobiera statystyki dla strony głównej
 */
export async function GET(request: NextRequest) {
  try {
    console.log("======= STATS API REQUEST =======");
    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role') as UserRole;
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
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

    // Pobierz parametr excludeUserId
    const url = new URL(request.url);
    const excludeUserId = url.searchParams.get('excludeUserId') || userId;

    // Przygotowanie zapytania dla statystyk partnerów - dostosowane do uprawnień
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

    // Formatowanie statystyk partnerów
    const partnerStats = {
      total: 0,
      active: 0,
      pending: 0,
      blocked: 0
    };

    statsResult.rows.forEach(row => {
      if (row.status === 'active') partnerStats.active = parseInt(row.count);
      else if (row.status === 'pending') partnerStats.pending = parseInt(row.count);
      else if (row.status === 'blocked') partnerStats.blocked = parseInt(row.count);
    });

    partnerStats.total = partnerStats.active + partnerStats.pending + partnerStats.blocked;
    console.log("Calculated Partner Stats:", partnerStats);

    // NOWE: Przygotowanie zapytania dla statystyk stron
    let pagesQuery = `
      SELECT
        x_amz_meta_page_type as page_type,
        COUNT(*) as count
      FROM pages
      WHERE 1=1
    `;

    const pagesParams = [];
    let pagesParamIndex = 1;

    // Filtrujemy na podstawie roli użytkownika
    if (userRole === 'GOD') {
      // Brak filtrów - widzi wszystko
    } else if (userRole === 'ADMIN' && adminSupervisorCode) {
      // Admin widzi swoje strony i strony podopiecznych
      pagesQuery += ` AND (x_amz_meta_user_id = $${pagesParamIndex} OR x_amz_meta_user_supervisor_code = $${pagesParamIndex + 1})`;
      pagesParams.push(userId, adminSupervisorCode);
      pagesParamIndex += 2;
    } else if (userRole === 'USER') {
      // Użytkownik widzi tylko swoje strony
      pagesQuery += ` AND x_amz_meta_user_id = $${pagesParamIndex}`;
      pagesParams.push(userId);
      pagesParamIndex++;
    } else {
      // Dla admina bez kodu opiekuna lub nieznanej roli
      pagesQuery += ` AND 1=0`;
    }

    pagesQuery += ` GROUP BY x_amz_meta_page_type`;

    console.log("Pages Query:", pagesQuery);
    console.log("Pages Params:", pagesParams);

    const pagesResult = await pool.query(pagesQuery, pagesParams);

    // Formatowanie statystyk stron
    const pageStats = {
      total: 0,
      ebook: 0,
      sales: 0
    };

    pagesResult.rows.forEach(row => {
      const count = parseInt(row.count);
      if (row.page_type === 'ebook') pageStats.ebook = count;
      else if (row.page_type === 'sales') pageStats.sales = count;
    });

    pageStats.total = pageStats.ebook + pageStats.sales;
    console.log("Calculated Page Stats:", pageStats);

    // NOWE: Przygotowanie zapytania dla statystyk odwiedzin z ODDZIELNYMI parametrami
    let visitsQuery = `
      SELECT
        p.x_amz_meta_page_type as page_type,
        SUM(COALESCE(p.visitors, 0)) as visits_count
      FROM pages p
      WHERE 1=1
    `;

    // Używamy NOWYCH parametrów dla tego zapytania
    const visitsParams = [];
    let visitsParamIndex = 1;

    // Używamy takich samych filtrów jak dla stron, ale z nowymi parametrami
    if (userRole === 'GOD') {
      // Brak filtrów - widzi wszystko
    } else if (userRole === 'ADMIN' && adminSupervisorCode) {
      // Admin widzi odwiedziny swoich stron i stron podopiecznych
      visitsQuery += ` AND (p.x_amz_meta_user_id = $${visitsParamIndex} OR p.x_amz_meta_user_supervisor_code = $${visitsParamIndex + 1})`;
      visitsParams.push(userId, adminSupervisorCode);
      visitsParamIndex += 2;
    } else if (userRole === 'USER') {
      // Użytkownik widzi tylko odwiedziny swoich stron
      visitsQuery += ` AND p.x_amz_meta_user_id = $${visitsParamIndex}`;
      visitsParams.push(userId);
      visitsParamIndex++;
    } else {
      // Dla admina bez kodu opiekuna lub nieznanej roli
      visitsQuery += ` AND 1=0`;
    }

    visitsQuery += ` GROUP BY p.x_amz_meta_page_type`;

    console.log("Visits Query:", visitsQuery);
    console.log("Visits Params:", visitsParams);

    const visitsResult = await pool.query(visitsQuery, visitsParams);

    // Formatowanie statystyk odwiedzin
    const visitStats = {
      total: 0,
      ebook: 0,
      sales: 0
    };

    visitsResult.rows.forEach(row => {
      const count = parseInt(row.visits_count || 0);
      if (row.page_type === 'ebook') visitStats.ebook = count;
      else if (row.page_type === 'sales') visitStats.sales = count;
    });

    visitStats.total = visitStats.ebook + visitStats.sales;
    console.log("Calculated Visit Stats:", visitStats);

    // NOWE: Przygotowanie zapytania dla statystyk leadów
    let leadsQuery = `
      SELECT
        lead_type as page_type,
        COUNT(*) as count
      FROM leads
      WHERE 1=1
    `;

    const leadsParams = [];
    let leadsParamIndex = 1;

    // Filtrujemy na podstawie roli użytkownika - analogicznie do endpointu /api/leads
    if (userRole === 'GOD') {
      // Brak filtrów - widzi wszystko
    } else if (userRole === 'ADMIN') {
      // ADMIN widzi swoje leady + te, gdzie jest opiekunem
      if (adminSupervisorCode) {
        leadsQuery += ` AND (
          user_id = $${leadsParamIndex}
          OR
          supervisor_code = $${leadsParamIndex + 1}
        )`;
        leadsParams.push(userId);
        leadsParams.push(adminSupervisorCode);
        leadsParamIndex += 2;
      } else {
        // Jeśli admin nie ma kodu opiekuna, widzi tylko swoje
        leadsQuery += ` AND user_id = $${leadsParamIndex}`;
        leadsParams.push(userId);
        leadsParamIndex++;
      }
    } else if (userRole === 'USER') {
      // USER widzi tylko swoje leady
      leadsQuery += ` AND user_id = $${leadsParamIndex}`;
      leadsParams.push(userId);
      leadsParamIndex++;
    } else {
      // Dla nieznanej roli
      leadsQuery += ` AND 1=0`;
    }

    leadsQuery += ` GROUP BY lead_type`;

    console.log("Leads Query:", leadsQuery);
    console.log("Leads Params:", leadsParams);

    const leadsResult = await pool.query(leadsQuery, leadsParams);

    // Formatowanie statystyk leadów
    const leadStats = {
      total: 0,
      ebook: 0,
      sales: 0
    };

    leadsResult.rows.forEach(row => {
      const count = parseInt(row.count);
      if (row.page_type === 'ebook') leadStats.ebook = count;
      else if (row.page_type === 'sales') leadStats.sales = count;
    });

    leadStats.total = leadStats.ebook + leadStats.sales;
    console.log("Calculated Lead Stats:", leadStats);

    // Tworzymy obiekt z wszystkimi statystykami
    const stats = {
      partners: partnerStats,
      pages: pageStats,
      visits: visitStats,
      leads: leadStats
    };

    console.log("Response Prepared. Sending...");
    console.log("======= END OF STATS API REQUEST =======");

    return NextResponse.json(stats);
  } catch (error: unknown) {
    console.error('Error in GET /api/stats:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}