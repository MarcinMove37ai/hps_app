// src/app/api/partners/[id]/promote/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { UserRole } from '@/types';

/**
 * Handler dla żądania POST - awansuje użytkownika z roli USER na ADMIN
 */
export async function POST(request: NextRequest) {
  try {
    console.log("======= PARTNER PROMOTION API REQUEST =======");

    // Pobierz ID partnera z URL
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/');
    const partnerId = pathParts[pathParts.indexOf('partners') + 1];

    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role') as UserRole;
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);
    console.log("Partner ID to Promote:", partnerId);

    // Sprawdź uprawnienia użytkownika - tylko GOD może awansować
    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    if (userRole !== 'GOD') {
      return NextResponse.json({ error: 'Insufficient permissions. Only GOD role can promote users.' }, { status: 403 });
    }

    // Sprawdź czy partner istnieje i ma status 'active' oraz rolę 'USER'
    const checkQuery = `
      SELECT id, first_name, last_name, email, status, role
      FROM user_profiles
      WHERE id = $1 AND status = 'active' AND role = 'USER'
    `;

    const checkResult = await pool.query(checkQuery, [partnerId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        error: 'Partner nie znaleziony lub nie kwalifikuje się do awansu. Tylko aktywni użytkownicy mogą zostać awansowani.'
      }, { status: 400 });
    }

    const partner = checkResult.rows[0];
    const fullName = `${partner.first_name || ''} ${partner.last_name || ''}`.trim();

    if (!fullName) {
      return NextResponse.json({
        error: 'Nie można awansować użytkownika bez imienia i nazwiska. Zaktualizuj profil użytkownika.'
      }, { status: 400 });
    }

    // Rozpocznij transakcję dla obu operacji
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Zaktualizuj rolę użytkownika na ADMIN
      const updateQuery = `
        UPDATE user_profiles
        SET role = 'ADMIN', updated_at = NOW()
        WHERE id = $1
        RETURNING *
      `;
      const updateResult = await client.query(updateQuery, [partnerId]);
      const updatedUser = updateResult.rows[0];

      // 2. Wygeneruj losowy 10-cyfrowy kod
      const supervisorCode = generateRandomCode(10);

      // 3. Utwórz nowy rekord w tabeli supervisor_codes
      const insertQuery = `
        INSERT INTO supervisor_codes (code, description, is_active)
        VALUES ($1, $2, true)
        RETURNING *
      `;
      const insertResult = await client.query(insertQuery, [supervisorCode, fullName]);
      const newSupervisorCode = insertResult.rows[0];

      await client.query('COMMIT');

      console.log("User promoted successfully:", updatedUser.id);
      console.log("Supervisor code created:", newSupervisorCode.code);

      // Przygotuj odpowiedź
      const response = {
        success: true,
        user: {
          id: updatedUser.id,
          name: fullName,
          role: updatedUser.role,
          status: updatedUser.status
        },
        supervisor_code: {
          code: newSupervisorCode.code,
          description: newSupervisorCode.description
        }
      };

      console.log("======= END OF PARTNER PROMOTION API REQUEST =======");
      return NextResponse.json(response);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error: unknown) {
    console.error(`Error in POST /api/partners/[id]/promote:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * Funkcja do generowania losowego kodu numerycznego o określonej długości
 */
function generateRandomCode(length: number): string {
  let result = '';
  for (let i = 0; i < length; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}