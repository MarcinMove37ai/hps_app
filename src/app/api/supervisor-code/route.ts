// src/app/api/supervisor-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { UserRole } from '../types';

/**
 * Handler dla żądania GET - pobiera kod opiekuna na podstawie imienia i nazwiska
 */
export async function GET(request: NextRequest) {
  try {
    console.log("======= SUPERVISOR CODE API REQUEST =======");

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

    // Pobierz nazwę z parametrów URL
    const url = new URL(request.url);
    const name = url.searchParams.get('name');

    if (!name) {
      return NextResponse.json({ error: 'Missing name parameter' }, { status: 400 });
    }

    console.log("Looking for supervisor code for name:", name);

    // Znajdź kod opiekuna na podstawie imienia i nazwiska w tabeli supervisor_codes
    const supervisorCodeQuery = `
      SELECT code
      FROM supervisor_codes
      WHERE description = $1
    `;

    const supervisorCodeResult = await pool.query(supervisorCodeQuery, [name]);
    const supervisorCode = supervisorCodeResult.rows[0]?.code || null;

    console.log("Supervisor Code found:", supervisorCode);
    console.log("======= END OF SUPERVISOR CODE API REQUEST =======");

    return NextResponse.json({ code: supervisorCode });
  } catch (error: unknown) {
    console.error('Error in GET /api/supervisor-code:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}