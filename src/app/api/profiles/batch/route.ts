import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    // Add proper type annotations for the input data
    const { userIds = [], supervisorCodes = [] }: {
      userIds?: (string | number)[];
      supervisorCodes?: string[];
    } = await request.json();

    console.log('POST /api/profiles/batch - Parametry zapytania:', { userIds, supervisorCodes });

    const results: {
      users: Record<string, any>;
      supervisors: Record<string, any>;
    } = {
      users: {},
      supervisors: {}
    };

    // Jeśli podano user_id, pobierz dane użytkowników
    if (userIds.length > 0) {
      // Filter out falsy values and ensure we're working with unique values
      const uniqueUserIds = [...new Set(userIds.filter(Boolean))];

      if (uniqueUserIds.length > 0) {
        const userQuery = `
          SELECT id, first_name, last_name
          FROM user_profiles
          WHERE id = ANY($1::integer[])
        `;

        // Ensure each ID is properly parsed to integer
        const parsedUserIds = uniqueUserIds.map(id =>
          typeof id === 'string' ? parseInt(id, 10) : id
        );

        const userResult = await pool.query(userQuery, [parsedUserIds]);

        userResult.rows.forEach(user => {
          results.users[user.id] = {
            id: user.id,
            firstName: user.first_name,
            lastName: user.last_name,
            fullName: `${user.first_name} ${user.last_name}`.trim()
          };
        });
      }
    }

    // Jeśli podano supervisor_codes, pobierz dane opiekunów
    if (supervisorCodes.length > 0) {
      const uniqueCodes = [...new Set(supervisorCodes.filter(Boolean))];

      if (uniqueCodes.length > 0) {
        // FIXED: Używamy text[] zamiast integer[], aby dopasować typy w bazie danych
        const supervisorQuery = `
          SELECT code, description
          FROM supervisor_codes
          WHERE code = ANY($1::text[])
        `;

        // FIXED: Nie konwertujemy kodów na liczby, ponieważ są to wartości tekstowe
        const supervisorResult = await pool.query(supervisorQuery, [uniqueCodes]);

        supervisorResult.rows.forEach(supervisor => {
          results.supervisors[supervisor.code] = {
            code: supervisor.code,
            description: supervisor.description
          };
        });
      }
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Błąd podczas pobierania danych profili:', error);
    // Type assertion for error to access its properties safely
    const err = error as Error & { code?: string };
    return NextResponse.json(
      {
        error: 'Błąd serwera podczas pobierania danych profili',
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