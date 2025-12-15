// src/app/api/statistics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

// Funkcja pomocnicza do formatowania dat w strefie czasowej 'Europe/Warsaw'
const formatDateInWarsawTZ = (date: Date): string => {
  return date.toLocaleDateString('en-CA', {
    timeZone: 'Europe/Warsaw',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Interfejs dla punktów danych wykresu
interface ChartDataPoint {
  date: string;
  leads: number;
  newPages: number;
}

// Handler dla metody GET - pobieranie statystyk
export async function GET(request: NextRequest) {
  console.log("======= STATISTICS API REQUEST =======");
  console.log("Aktualna data serwera:", new Date().toISOString());
  console.log("Aktualna data Warsaw TZ:", new Date().toLocaleString('pl-PL', { timeZone: 'Europe/Warsaw' }));

  try {
    // 1. Pobierz i waliduj dane użytkownika z nagłówków
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

    // 2. Pobierz parametry zapytania
    const url = new URL(request.url);
    const range = url.searchParams.get('range') || '7days';
    console.log("Requested range:", range);

    // 3. Przygotuj parametry zapytania SQL na podstawie wybranego zakresu dat
    let daysToSubtract;

    switch (range) {
      case '14days':
        daysToSubtract = 14;
        break;
      case '30days':
        daysToSubtract = 30;
        break;
      case 'all':
        daysToSubtract = 36500; // Praktycznie cała historia (100 lat)
        break;
      case '7days':
      default:
        daysToSubtract = 7;
        break;
    }

    // 4. Dla ADMIN znajdź kod opiekuna na podstawie imienia i nazwiska w tabeli supervisor_codes
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

    // 5. Przygotuj filtry dostępu w zależności od roli
    let userFilter = '';
    let params = [];
    let paramIndex = 1;

    if (userRole === 'USER') {
      userFilter = `AND p.x_amz_meta_user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    } else if (userRole === 'ADMIN' && adminSupervisorCode) {
      userFilter = `AND (p.x_amz_meta_user_id = $${paramIndex} OR p.x_amz_meta_user_supervisor_code = $${paramIndex+1})`;
      params.push(userId);
      params.push(adminSupervisorCode);
      paramIndex += 2;
    }
    // Dla GOD nie ma filtrowania

    // 6. Przygotowanie filtru dla leadów
    let leadUserFilter = '';
    let leadParams = [];

    if (userRole === 'USER') {
      leadUserFilter = `AND l.user_id = '${userId}'`;
    } else if (userRole === 'ADMIN' && adminSupervisorCode) {
      leadUserFilter = `AND (l.user_id = '${userId}' OR l.supervisor_code = '${adminSupervisorCode}')`;
    }

    // 7. Pobierz bieżącą datę w strefie czasowej 'Europe/Warsaw'
    const warsawDate = new Date();
    const formattedCurrentDate = formatDateInWarsawTZ(warsawDate);
    const yesterdayDate = new Date(warsawDate);
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const formattedYesterdayDate = formatDateInWarsawTZ(yesterdayDate);

    console.log("Formatted current date (Warsaw TZ):", formattedCurrentDate);
    console.log("Formatted yesterday date (Warsaw TZ):", formattedYesterdayDate);

    // Przygotuj daty zakresu dla zapytań
    const startDateFormatted = formatDateInWarsawTZ(
      new Date(warsawDate.getTime() - daysToSubtract * 24 * 60 * 60 * 1000)
    );

    // 8. Wykonaj zapytania do bazy danych

    // A) Pobierz statystyki całkowite z tabeli pages (wejścia, leady) - zgodnie z ustaleniami
    const totalStatsQuery = `
      SELECT
        SUM(COALESCE(visitors, 0)) as total_visits,
        SUM(COALESCE(leads, 0)) as total_leads
      FROM pages p
      WHERE p.x_amz_meta_user_created_at > NOW() - INTERVAL '${daysToSubtract} days'
        ${userFilter}
    `;

    // B) Pobierz statystyki według typu
    const typeStatsQuery = `
      SELECT
        x_amz_meta_page_type as type,
        SUM(COALESCE(visitors, 0)) as visits,
        SUM(COALESCE(leads, 0)) as leads
      FROM pages p
      WHERE p.x_amz_meta_user_created_at > NOW() - INTERVAL '${daysToSubtract} days'
        ${userFilter}
      GROUP BY x_amz_meta_page_type
    `;

    // C) Pobierz najlepsze strony - ZAKTUALIZOWANE ZAPYTANIE, dodano pola autora
    const topPagesQuery = `
      SELECT
        p.id,
        p.x_amz_meta_title as title,
        p.pagecontent_hero_headline as headline,
        p.x_amz_meta_page_type as type,
        COALESCE(p.visitors, 0) as visits,
        COALESCE(p.leads, 0) as leads,
        COALESCE(p.x_amz_meta_user_first_name, '') as first_name,
        COALESCE(p.x_amz_meta_user_last_name, '') as last_name,
        CONCAT(COALESCE(p.x_amz_meta_user_first_name, ''), ' ', COALESCE(p.x_amz_meta_user_last_name, '')) as author,
        CASE
          WHEN COALESCE(p.visitors, 0) > 0 THEN
            ROUND((COALESCE(p.leads, 0) * 100.0 / COALESCE(p.visitors, 0)), 2)
          ELSE 0
        END as conversion
      FROM pages p
      WHERE p.status = 'active'
        AND p.x_amz_meta_user_created_at > NOW() - INTERVAL '${daysToSubtract} days'
        ${userFilter}
        AND COALESCE(p.visitors, 0) > 0
      ORDER BY conversion DESC, leads DESC
      LIMIT 5
    `;

    // D) Pobierz statystyki dzienne dla wykresów (nowe strony) - zwraca już format YYYY-MM-DD
    const dailyPagesQuery = `
      SELECT
        TO_CHAR(DATE_TRUNC('day', p.x_amz_meta_user_created_at AT TIME ZONE 'Europe/Warsaw')::date, 'YYYY-MM-DD') as date,
        p.x_amz_meta_page_type as type,
        COUNT(*) as count
      FROM pages p
      WHERE p.x_amz_meta_user_created_at > NOW() - INTERVAL '${daysToSubtract} days'
        ${userFilter}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    // E) NOWA KWERENDA: Pobierz dane dzienne o leadach bezpośrednio z tabeli leads - zwraca już format YYYY-MM-DD
    // UWAGA: Używamy wartości bezpośrednio w zapytaniu
    const dailyLeadsQuery = `
      SELECT
        TO_CHAR(lead_date, 'YYYY-MM-DD') as date,
        lead_type as type,
        COUNT(*) as count
      FROM leads l
      WHERE
        lead_date >= '${startDateFormatted}'::date
        AND lead_date <= '${formattedCurrentDate}'::date
        ${leadUserFilter}
      GROUP BY 1, 2
      ORDER BY 1, 2
    `;

    // F) Pobierz liczbę nowych stron dziś - z tabeli pages wg x_amz_meta_user_created_at
    const todayPagesQuery = `
      SELECT
        x_amz_meta_page_type as type,
        COUNT(*) as count
      FROM pages p
      WHERE DATE_TRUNC('day', p.x_amz_meta_user_created_at AT TIME ZONE 'Europe/Warsaw') =
            DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Warsaw')
        ${userFilter}
      GROUP BY 1
    `;

    // G) Pobierz liczbę nowych stron wczoraj - z tabeli pages wg x_amz_meta_user_created_at
    const yesterdayPagesQuery = `
      SELECT
        x_amz_meta_page_type as type,
        COUNT(*) as count
      FROM pages p
      WHERE DATE_TRUNC('day', p.x_amz_meta_user_created_at AT TIME ZONE 'Europe/Warsaw') =
            DATE_TRUNC('day', NOW() AT TIME ZONE 'Europe/Warsaw' - INTERVAL '1 day')
        ${userFilter}
      GROUP BY 1
    `;

    // H) POPRAWIONE: Pobierz liczbę nowych leadów dziś - z tabeli leads wg lead_date
    // UWAGA: Używamy wartości bezpośrednio w zapytaniu
    const todayLeadsQuery = `
      SELECT
        lead_type as type,
        COUNT(*) as count
      FROM leads l
      WHERE lead_date = '${formattedCurrentDate}'::date
        ${leadUserFilter}
      GROUP BY 1
    `;

    // I) POPRAWIONE: Pobierz liczbę nowych leadów wczoraj - z tabeli leads wg lead_date
    // UWAGA: Używamy wartości bezpośrednio w zapytaniu
    const yesterdayLeadsQuery = `
      SELECT
        lead_type as type,
        COUNT(*) as count
      FROM leads l
      WHERE lead_date = '${formattedYesterdayDate}'::date
        ${leadUserFilter}
      GROUP BY 1
    `;

    // 9. Wykonaj zapytania równolegle
    const [
      totalStatsResult,
      typeStatsResult,
      topPagesResult,
      dailyPagesResult,
      dailyLeadsResult,
      todayPagesResult,
      yesterdayPagesResult,
      todayLeadsResult,
      yesterdayLeadsResult
    ] = await Promise.all([
      pool.query(totalStatsQuery, params),
      pool.query(typeStatsQuery, params),
      pool.query(topPagesQuery, params),
      pool.query(dailyPagesQuery, params),
      pool.query(dailyLeadsQuery),  // Bez parametrów - używamy wartości bezpośrednio w zapytaniu
      pool.query(todayPagesQuery, params),
      pool.query(yesterdayPagesQuery, params),
      pool.query(todayLeadsQuery),  // Bez parametrów - używamy wartości bezpośrednio w zapytaniu
      pool.query(yesterdayLeadsQuery)  // Bez parametrów - używamy wartości bezpośrednio w zapytaniu
    ]);

    // 10. Przetwórz dane
    const totalStats = totalStatsResult.rows[0] || { total_visits: 0, total_leads: 0 };
    const typeStats = typeStatsResult.rows;
    const topPages = topPagesResult.rows;
    const dailyPages = dailyPagesResult.rows;
    const dailyLeads = dailyLeadsResult.rows;
    const todayPages = todayPagesResult.rows;
    const yesterdayPages = yesterdayPagesResult.rows;
    const todayLeads = todayLeadsResult.rows;
    const yesterdayLeads = yesterdayLeadsResult.rows;

    // Logowanie wyników dla debugowania
    console.log("Daily pages query results count:", dailyPages.length);
    console.log("Daily pages sample:", dailyPages.slice(0, 3));
    console.log("Daily leads query results count:", dailyLeads.length);
    console.log("Daily leads sample:", dailyLeads.slice(0, 3));

    // 11. Przygotuj strukturę danych do odpowiedzi

    // A. Statystyki całkowite
    const totalVisits = parseInt(totalStats.total_visits) || 0;
    const totalLeads = parseInt(totalStats.total_leads) || 0;
    const totalConversion = totalVisits > 0 ? parseFloat(((totalLeads / totalVisits) * 100).toFixed(1)) : 0;

    // B. Statystyki według typu
    const ebookStats = typeStats.find(t => t.type === 'ebook') || { visits: 0, leads: 0 };
    const salesStats = typeStats.find(t => t.type === 'sales') || { visits: 0, leads: 0 };

    const ebookVisits = parseInt(ebookStats.visits) || 0;
    const ebookLeads = parseInt(ebookStats.leads) || 0;
    const ebookConversion = ebookVisits > 0 ? parseFloat(((ebookLeads / ebookVisits) * 100).toFixed(1)) : 0;

    const salesVisits = parseInt(salesStats.visits) || 0;
    const salesLeads = parseInt(salesStats.leads) || 0;
    const salesConversion = salesVisits > 0 ? parseFloat(((salesLeads / salesVisits) * 100).toFixed(1)) : 0;

    // C. CAŁKOWICIE PRZEBUDOWANA LOGIKA DLA DANYCH WYKRESÓW
    // Tworzymy mapę dat i wypełniamy ją danymi z zapytań

    // 1. Tworzymy zbiór wszystkich dat z zakresu
    const dateMap = new Map();

    // 2. Wypełniamy ten zakres datami od startDate do dziś, inicjalizując puste wartości
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToSubtract);

    for (let d = new Date(startDate); d <= warsawDate; d.setDate(d.getDate() + 1)) {
      const dateStr = formatDateInWarsawTZ(d);
      dateMap.set(dateStr, {
        date: dateStr,
        ebook: { newPages: 0, leads: 0 },
        sales: { newPages: 0, leads: 0 }
      });
    }

    // 3. Wypełniamy dane o NOWYCH STRONACH
    dailyPages.forEach(item => {
      try {
        const { date, type, count } = item;
        console.log(`Processing dailyPages: ${date}, ${type}, ${count}`);

        if (!date) {
          console.warn('Missing date in dailyPages item:', item);
          return;
        }

        if (dateMap.has(date)) {
          const entry = dateMap.get(date);
          if (type === 'ebook') {
            entry.ebook.newPages = parseInt(count) || 0;
          } else if (type === 'sales') {
            entry.sales.newPages = parseInt(count) || 0;
          }
          console.log(`Set new pages for ${date}: ${type} = ${count}`);
        } else {
          console.warn(`Date not found in map: ${date}. Available dates: ${Array.from(dateMap.keys()).join(', ')}`);
        }
      } catch (error) {
        console.error('Error processing daily page:', error, item);
      }
    });

    // 4. Wypełniamy dane o LEADACH
    dailyLeads.forEach(item => {
      try {
        const { date, type, count } = item;
        console.log(`Processing dailyLeads: ${date}, ${type}, ${count}`);

        if (!date) {
          console.warn('Missing date in dailyLeads item:', item);
          return;
        }

        if (dateMap.has(date)) {
          const entry = dateMap.get(date);
          if (type === 'ebook') {
            entry.ebook.leads = parseInt(count) || 0;
          } else if (type === 'sales') {
            entry.sales.leads = parseInt(count) || 0;
          }
          console.log(`Set leads for ${date}: ${type} = ${count}`);
        } else {
          console.warn(`Date not found in map: ${date}. Available dates: ${Array.from(dateMap.keys()).join(', ')}`);
        }
      } catch (error) {
        console.error('Error processing daily lead:', error, item);
      }
    });

    // 5. Przygotowujemy dane dla wykresów
    const ebookChartData: ChartDataPoint[] = [];
    const salesChartData: ChartDataPoint[] = [];

    // 6. Sortujemy daty chronologicznie
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => {
      return new Date(a).getTime() - new Date(b).getTime();
    });

    console.log("Sorted dates for chart:", sortedDates);

    // 7. Wypełniamy dane wykresów
    sortedDates.forEach(date => {
      const entry = dateMap.get(date);
      if (!entry) {
        console.warn(`No data entry for date: ${date}`);
        return;
      }

      ebookChartData.push({
        date,
        leads: entry.ebook.leads,
        newPages: entry.ebook.newPages
      });

      salesChartData.push({
        date,
        leads: entry.sales.leads,
        newPages: entry.sales.newPages
      });
    });

    // 8. Logowanie dla debugowania
    console.log("Ebook chart data count:", ebookChartData.length);
    console.log("Last 3 ebook chart entries:", ebookChartData.slice(-3));
    console.log("Last 3 sales chart entries:", salesChartData.slice(-3));

    // D. Statystyki na dzisiaj - poprawione, używamy bezpośrednio danych z odpowiednich zapytań
    const todayPagesEbook = parseInt(todayPages.find(t => t.type === 'ebook')?.count) || 0;
    const todayPagesSales = parseInt(todayPages.find(t => t.type === 'sales')?.count) || 0;
    const todayLeadsEbook = parseInt(todayLeads.find(t => t.type === 'ebook')?.count) || 0;
    const todayLeadsSales = parseInt(todayLeads.find(t => t.type === 'sales')?.count) || 0;

    // E. Statystyki na wczoraj - poprawione, używamy bezpośrednio danych z odpowiednich zapytań
    const yesterdayPagesEbook = parseInt(yesterdayPages.find(t => t.type === 'ebook')?.count) || 0;
    const yesterdayPagesSales = parseInt(yesterdayPages.find(t => t.type === 'sales')?.count) || 0;
    const yesterdayLeadsEbook = parseInt(yesterdayLeads.find(t => t.type === 'ebook')?.count) || 0;
    const yesterdayLeadsSales = parseInt(yesterdayLeads.find(t => t.type === 'sales')?.count) || 0;

    // 12. Utwórz odpowiedź
    const response = {
      // Dodajemy informację o zakresie dat
      dateRangeInfo: {
        type: range,
        days: daysToSubtract,
        startDate: formatDateInWarsawTZ(startDate),
        endDate: formattedCurrentDate
      },

      // Statystyki ogólne
      totalStats: {
        visits: totalVisits,
        leads: totalLeads,
        conversion: totalConversion
      },

      // Statystyki według typu
      ebookStats: {
        visits: ebookVisits,
        leads: ebookLeads,
        conversion: ebookConversion
      },

      salesStats: {
        visits: salesVisits,
        leads: salesLeads,
        conversion: salesConversion
      },

      // Najlepsze strony
      topPages,

      // Dane dla wykresów - usunięto pola visits i conversion
      ebookChartData,
      salesChartData,

      // Statystyki na dziś - poprawione, używamy wartości z todayPages i todayLeads
      todayStats: {
        date: formattedCurrentDate,
        visits: ebookVisits + salesVisits, // Całkowita liczba wizyt
        leads: todayLeadsEbook + todayLeadsSales, // Suma leadów z dziś
        newPages: todayPagesEbook + todayPagesSales, // Suma nowych stron z dziś
        byType: {
          ebook: {
            visits: ebookVisits, // Wizyty na stronach ebook
            leads: todayLeadsEbook, // Leady z dzisiaj typu ebook
            newPages: todayPagesEbook // Nowe strony z dzisiaj typu ebook
          },
          sales: {
            visits: salesVisits, // Wizyty na stronach sales
            leads: todayLeadsSales, // Leady z dzisiaj typu sales
            newPages: todayPagesSales // Nowe strony z dzisiaj typu sales
          }
        }
      },

      // Statystyki na wczoraj - poprawione, używamy wartości z yesterdayPages i yesterdayLeads
      yesterdayStats: {
        date: formattedYesterdayDate,
        visits: ebookVisits + salesVisits, // Całkowita liczba wizyt
        leads: yesterdayLeadsEbook + yesterdayLeadsSales, // Suma leadów z wczoraj
        newPages: yesterdayPagesEbook + yesterdayPagesSales, // Suma nowych stron z wczoraj
        byType: {
          ebook: {
            visits: ebookVisits, // Wizyty na stronach ebook
            leads: yesterdayLeadsEbook, // Leady z wczoraj typu ebook
            newPages: yesterdayPagesEbook // Nowe strony z wczoraj typu ebook
          },
          sales: {
            visits: salesVisits, // Wizyty na stronach sales
            leads: yesterdayLeadsSales, // Leady z wczoraj typu sales
            newPages: yesterdayPagesSales // Nowe strony z wczoraj typu sales
          }
        }
      }
    };

    console.log("Response prepared successfully");
    console.log("======= END OF STATISTICS API REQUEST =======");
    return NextResponse.json(response);

  } catch (error: any) {
    console.error('Error fetching statistics:', error);

    // Zwróć informację o błędzie
    return NextResponse.json(
      {
        error: 'Wystąpił błąd podczas pobierania statystyk',
        details: {
          message: error.message,
          stack: error.stack,
          code: error.code
        }
      },
      { status: 500 }
    );
  }
}