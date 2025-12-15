// src/app/api/categories/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { UserRole } from '@/types';

interface CategoryData {
  id: number;
  category: string;
  short_desc: string;
}

export async function GET(request: NextRequest) {
  try {
    console.log("======= CATEGORIES API REQUEST =======");
    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role') as UserRole;
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);
    console.log("Cognito Sub:", cognitoSub);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    // Sprawdź czy użytkownik ma uprawnienia (USER, ADMIN, GOD)
    if (userRole !== 'USER' && userRole !== 'ADMIN' && userRole !== 'GOD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Pobierz parametry zapytania
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || null;

    // Przygotuj zapytanie SQL do pobrania kategorii - usunięto odwołania do is_active
    let query = `
      SELECT id, category, short_desc
      FROM omega3_categories
      WHERE 1=1
    `;

    const queryParams: string[] = [];
    let paramCounter = 1;

    // Dodaj filtrowanie wyszukiwania
    if (search) {
      query += ` AND (
        category ILIKE $${paramCounter} OR
        short_desc ILIKE $${paramCounter}
      )`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    // Sortowanie alfabetyczne po kategorii
    query += ` ORDER BY category ASC`;

    console.log("Final SQL Query:", query);
    console.log("Query Params:", queryParams);

    // Wykonaj zapytanie do bazy danych
    const result = await pool.query(query, queryParams);
    console.log(`Found ${result.rows.length} categories`);

    // Mapowanie wyników do oczekiwanego formatu - usunięto is_active
    const categories: CategoryData[] = result.rows.map(row => ({
      id: row.id,
      category: row.category,
      short_desc: row.short_desc
    }));

    console.log("Response Prepared. Sending...");
    console.log("======= END OF CATEGORIES API REQUEST =======");

    return NextResponse.json(categories);
  } catch (error: unknown) {
    console.error('Error in GET /api/categories:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}