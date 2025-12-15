import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('user_id');
    const supervisorCode = searchParams.get('supervisor_code');

    console.log('GET /api/profiles - Parametry zapytania:', { userId, supervisorCode });

    // Przygotuj dane wynikowe
    const result: {
      user?: { id: number; firstName: string; lastName: string; fullName: string; };
      supervisor?: { code: string; description: string; }
    } = {};

    // Jeśli podano user_id, pobierz dane użytkownika
    if (userId) {
      const userQuery = `
        SELECT id, first_name, last_name
        FROM user_profiles
        WHERE id = $1
      `;

      const userResult = await pool.query(userQuery, [parseInt(userId, 10)]);

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        result.user = {
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          fullName: `${user.first_name} ${user.last_name}`.trim()
        };
      }
    }

    // Jeśli podano supervisor_code, pobierz dane opiekuna
    if (supervisorCode) {
      const supervisorQuery = `
        SELECT code, description
        FROM supervisor_codes
        WHERE code = $1
      `;

      // FIXED: Nie konwertujemy kodu na liczbę, ponieważ jest to wartość tekstowa
      const supervisorResult = await pool.query(supervisorQuery, [supervisorCode]);

      if (supervisorResult.rows.length > 0) {
        const supervisor = supervisorResult.rows[0];
        result.supervisor = {
          code: supervisor.code,
          description: supervisor.description
        };
      }
    }

    return NextResponse.json(result);

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