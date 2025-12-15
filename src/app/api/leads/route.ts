// src/app/api/leads/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Funkcja pomocnicza do formatowania źródła
function formatSource(source: string): string {
  if (!source || source.length <= 4) return '';

  // Obetnij ostatnie 4 znaki i zamień pierwszą literę na wielką
  const trimmedSource = source.slice(0, -4);
  return trimmedSource.charAt(0).toUpperCase() + trimmedSource.slice(1).toLowerCase();
}

// Funkcja pomocnicza do formatowania nazwy strony (page name)
function formatPageName(pageName: string): string {
  if (!pageName || pageName.length <= 4) return '';

  // Obetnij ostatnie 4 znaki i zamień pierwszą literę na wielką
  const trimmedPage = pageName.slice(0, -4);
  return trimmedPage.charAt(0).toUpperCase() + trimmedPage.slice(1).toLowerCase();
}

// Funkcja do pobierania wszystkich leadów
export async function GET(request: NextRequest) {
  console.log('GET /api/leads - Przetwarzanie żądania');

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

    // Pobierz parametry filtrowania
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || null;
    const type = url.searchParams.get('type') || null;
    const search = url.searchParams.get('search') || null;

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

    // Obsługa filtrowania
    const { searchParams } = new URL(request.url);
    const source = searchParams.get('source');
    const creator = searchParams.get('creator');
    const opiekun = searchParams.get('opiekun');

    console.log('Parametry zapytania:', { source, creator, opiekun });

    // Zaktualizowane zapytanie z filtrowaniem uprawnień - dodano pobranie kolumny status
    let query = `
      SELECT
        lead_id as id,
        lead_name as name,
        lead_email as email,
        lead_phone as phone,
        page_name as page,
        lead_type as source,
        lead_date || ' ' || lead_time as createdAt,
        'Direct' as referrer,
        user_id as creator,
        supervisor_code as opiekun,
        buy_now,
        status
      FROM leads
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    // Filtrowanie na podstawie roli użytkownika
    if (userRole === 'USER') {
      // USER widzi tylko swoje leady
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else if (userRole === 'ADMIN') {
      // ADMIN widzi swoje leady + te, gdzie jest opiekunem
      if (adminSupervisorCode) {
        query += ` AND (
          user_id = $${paramIndex}
          OR
          supervisor_code = $${paramIndex + 1}
        )`;
        params.push(userId);
        params.push(adminSupervisorCode);
        paramIndex += 2;
      } else {
        // Jeśli admin nie ma kodu opiekuna, widzi tylko swoje
        query += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }
    }
    // GOD widzi wszystko - bez dodatkowych filtrów

    // Dodatkowe parametry filtrowania
    if (source) {
      query += ` AND lead_type = $${paramIndex}`;
      params.push(source);
      paramIndex++;
    }

    if (creator) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(creator);
      paramIndex++;
    }

    if (opiekun) {
      query += ` AND supervisor_code = $${paramIndex}`;
      params.push(opiekun);
      paramIndex++;
    }

    // Filtrowanie po statusie, jeśli podano
    if (status) {
      query += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    query += ` ORDER BY lead_date DESC, lead_time DESC`;

    console.log('Wykonywanie zapytania:', query);
    console.log('Parametry zapytania:', params);

    const result = await pool.query(query, params);
    console.log(`Zapytanie wykonane pomyślnie, zwrócono ${result.rows.length} wierszy`);

    // Formatowanie danych do formatu oczekiwanego przez frontend
    const leads = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      source: row.source, // Oryginalne źródło bez formatowania
      rawSource: row.source, // Zachowanie oryginalnego źródła dla filtrowania
      page: formatPageName(row.page), // Formatowanie nazwy strony
      rawPage: row.page, // Zachowanie oryginalnej nazwy strony dla filtrowania
      createdAt: row.createdat, // PostgreSQL zwraca małymi literami
      referrer: row.referrer,
      status: row.status || 'b_contact', // Zwracanie statusu z bazy lub domyślny 'b_contact'
      creator: row.creator, // user_id jako creator
      opiekun: row.opiekun,  // supervisor_code jako opiekun
      buyNow: row.buy_now    // Dodane pole buy_now
    }));

    return NextResponse.json({ leads });

  } catch (error) {
    console.error('Błąd podczas pobierania leadów:', error);
    // Typowanie error jako Error & { code?: string } dla bezpiecznego dostępu do właściwości
    const err = error as Error & { code?: string };
    return NextResponse.json(
      {
        error: 'Błąd serwera podczas pobierania leadów',
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

// Funkcja do usuwania leada
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Brak ID leada' },
        { status: 400 }
      );
    }

    const query = `DELETE FROM leads WHERE lead_id = $1 RETURNING lead_id`;
    const result = await pool.query(query, [id]);

    if (result.rowCount === 0) {
      return NextResponse.json(
        { error: 'Nie znaleziono leada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Lead został pomyślnie usunięty'
    });

  } catch (error) {
    console.error('Błąd podczas usuwania leada:', error);
    return NextResponse.json(
      { error: 'Błąd serwera podczas usuwania leada' },
      { status: 500 }
    );
  }
}

// Funkcja do dodawania leadów
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Sprawdzenie wymaganych pól
    const requiredFields = ['pageId', 'leadName', 'leadEmail'];
    for (const field of requiredFields) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Brak wymaganego pola: ${field}` },
          { status: 400 }
        );
      }
    }

    // Pobranie informacji o stronie z bazy danych, aby pozyskać dodatkowe dane
    let pageInfo;
    try {
      const pageQuery = `
        SELECT
          x_amz_meta_title as page_name,
          x_amz_meta_page_type as page_type,
          x_amz_meta_user_id as user_id,
          x_amz_meta_user_supervisor_code as supervisor_code
        FROM pages
        WHERE id = $1
      `;
      const pageResult = await pool.query(pageQuery, [data.pageId]);

      if (pageResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Nie znaleziono strony o podanym ID' },
          { status: 404 }
        );
      }

      pageInfo = pageResult.rows[0];
    } catch (error) {
      console.error('Błąd podczas pobierania informacji o stronie:', error);
      // Kontynuuj, używając danych z żądania
      pageInfo = {
        page_name: data.pageName || 'Nieznana strona',
        page_type: data.pageType || 'ebook',
        user_id: data.userId || null,
        supervisor_code: data.supervisorCode || null
      };
    }

    // Zapisanie leada do bazy
    const now = new Date();
    const leadDate = now.toISOString().split('T')[0]; // format YYYY-MM-DD
    const leadTime = now.toTimeString().split(' ')[0]; // format HH:MM:SS

    // Ustalenie typu leada - może pochodzić z żądania lub z typu strony
    const leadType = data.leadType || (pageInfo?.page_type === 'sales' ? 'sales' : 'ebook');

    const insertQuery = `
      INSERT INTO leads (
        page_id,
        page_name,
        lead_type,
        user_id,
        supervisor_code,
        lead_date,
        lead_time,
        lead_name,
        lead_email,
        lead_phone,
        buy_now,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6::DATE, $7, $8, $9, $10, $11, $12)
      RETURNING lead_id
    `;

    const insertParams = [
      data.pageId,
      pageInfo?.page_name || data.pageName || 'Nieznana strona',
      leadType,
      pageInfo?.user_id || data.userId || null,
      pageInfo?.supervisor_code || data.supervisorCode || null,
      leadDate,
      leadTime,
      data.leadName,
      data.leadEmail,
      data.leadPhone || null,
      data.buyNow || false, // Domyślnie false, jeśli nie podano
      data.status || 'b_contact' // Domyślny status 'b_contact'
    ];

    const insertResult = await pool.query(insertQuery, insertParams);
    const leadId = insertResult.rows[0].lead_id;

    // Aktualizacja liczby leadów dla strony
    try {
      await pool.query(
        `UPDATE pages
         SET leads = COALESCE(leads, 0) + 1
         WHERE id = $1`,
        [data.pageId]
      );
    } catch (error) {
      console.error('Błąd podczas aktualizacji licznika leadów:', error);
      // Nie przerywamy procesu w przypadku błędu aktualizacji licznika
    }

    return NextResponse.json({
      success: true,
      leadId: leadId,
      message: 'Lead pomyślnie zapisany'
    });

  } catch (error) {
    console.error('Błąd podczas zapisywania leada:', error);
    return NextResponse.json(
      { error: 'Błąd serwera podczas zapisywania leada' },
      { status: 500 }
    );
  }
}

// Funkcja do aktualizacji statusu leada - UPROSZCZONA I POPRAWIONA
export async function PATCH(request: NextRequest) {
  try {
    const data = await request.json();

    // Sprawdź czy mamy potrzebne dane
    if (!data.id || !data.status) {
      return NextResponse.json(
        { error: 'Brak wymaganego pola: id lub status' },
        { status: 400 }
      );
    }

    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("PATCH - User ID:", userId);
    console.log("PATCH - User Role:", userRole);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    // Sprawdź czy lead istnieje
    const leadQuery = `
      SELECT lead_id, user_id
      FROM leads
      WHERE lead_id = $1
    `;
    const leadResult = await pool.query(leadQuery, [data.id]);

    if (leadResult.rows.length === 0) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    const lead = leadResult.rows[0];
    console.log("Lead data:", lead);
    console.log("Lead user_id:", lead.user_id, "type:", typeof lead.user_id);
    console.log("Request userId:", userId, "type:", typeof userId);

    // POPRAWIONA LOGIKA UPRAWNIEŃ:
    // Porównujemy wartości jako string, aby uniknąć problemów z różnymi typami
    const hasPermission = String(lead.user_id) === String(userId);

    console.log("Checking permission:", String(lead.user_id), "===", String(userId), "Result:", hasPermission);

    // Jeśli użytkownik nie ma uprawnień, zwracamy specjalny status, a nie błąd
    if (!hasPermission) {
      return NextResponse.json({
        warning: 'Możesz zmienić status tylko swoich leadów',
        hasPermission: false
      }, { status: 200 }); // Zwracamy status 200, a nie błąd
    }

    // Sprawdź czy status jest jednym z dozwolonych wartości
    const allowedStatuses = ['b_contact', 'a_contact', 'archive'];
    if (!allowedStatuses.includes(data.status)) {
      return NextResponse.json({
        error: 'Invalid status value. Allowed values: b_contact, a_contact, archive'
      }, { status: 400 });
    }

    // Aktualizuj status leada
    const updateQuery = `
      UPDATE leads
      SET status = $1
      WHERE lead_id = $2
      RETURNING lead_id, status
    `;

    const updateResult = await pool.query(updateQuery, [data.status, data.id]);

    return NextResponse.json({
      success: true,
      leadId: updateResult.rows[0].lead_id,
      status: updateResult.rows[0].status,
      message: 'Status leada został pomyślnie zaktualizowany',
      hasPermission: true
    });

  } catch (error) {
    console.error('Błąd podczas aktualizacji statusu leada:', error);
    const err = error as Error & { code?: string };
    return NextResponse.json(
      {
        error: 'Błąd serwera podczas aktualizacji statusu leada',
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