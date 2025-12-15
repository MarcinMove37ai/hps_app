// src/app/api/pages/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { UserRole } from '@/types';

interface PagesApiResponse {
  pages: {
    role: string;
    id: string;
    title: string;
    headline?: string;
    creator: string;
    supervisorCode?: string;
    visits: number;
    leads: number;
    type: string;
    status: string;
    createdAt: string;
    url: string;
    draft_url: string;
    coverImage: string;
    videoPassword?: string;
    isOwnedByUser: boolean;
  }[];
  stats: {
    total: number;
    published: number;
    pending: number;
    ebook: number;
    sales: number;
    draft: number;
  };
}

export async function GET(request: NextRequest) {
  try {
    console.log("======= PAGES API REQUEST =======");
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role') as UserRole;
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);
    console.log("Cognito Sub:", cognitoSub);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    if (userRole !== 'ADMIN' && userRole !== 'GOD' && userRole !== 'USER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || null;
    const type = url.searchParams.get('type') || null;
    const search = url.searchParams.get('search') || null;

    let adminSupervisorCode = null;
    if (userRole === 'ADMIN') {
      const userQuery = `
        SELECT first_name, last_name
        FROM user_profiles
        WHERE id = $1
      `;
      const userResult = await pool.query(userQuery, [userId]);
      if (userResult.rows.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      const { first_name, last_name } = userResult.rows[0];
      const fullName = `${first_name.trim()} ${last_name.trim()}`;

      console.log("Admin Full Name (trimmed):", fullName);

      const supervisorCodeQuery = `
        SELECT code
        FROM supervisor_codes
        WHERE description ILIKE $1
      `;
      const supervisorCodeResult = await pool.query(supervisorCodeQuery, [fullName]);
      adminSupervisorCode = supervisorCodeResult.rows[0]?.code || null;

      console.log("Admin Supervisor Code found:", adminSupervisorCode);
    }

    let query = `
      SELECT
        id,
        url,
        draft_url,
        x_amz_meta_title,
        pagecontent_hero_headline,
        x_amz_meta_user_first_name,
        x_amz_meta_user_last_name,
        x_amz_meta_user_supervisor_code,
        visitors,
        leads,
        x_amz_meta_page_type,
        status,
        x_amz_meta_user_created_at,
        s3_file_key,
        video_password,
        x_amz_meta_user_id,
        x_amz_meta_user_role
      FROM pages
      WHERE 1=1
    `;

    const queryParams: (string | null)[] = [];
    let paramCounter = 1;

    // Filtrowanie po roli użytkownika
    if (userRole === 'USER') {
      query += ` AND x_amz_meta_user_id = $${paramCounter}`;
      queryParams.push(userId);
      paramCounter++;
    } else if (userRole === 'ADMIN') {
      if (adminSupervisorCode) {
        query += `
          AND (
            x_amz_meta_user_id = $${paramCounter}
            OR (
              x_amz_meta_user_supervisor_code = $${paramCounter + 1}
              AND LOWER(x_amz_meta_user_role) = 'user'
            )
          )
        `;
        queryParams.push(userId, adminSupervisorCode);
        paramCounter += 2;
      } else {
        query += ` AND x_amz_meta_user_id = $${paramCounter}`;
        queryParams.push(userId);
        paramCounter++;
      }
    }
    // Dla GOD — brak dodatkowych filtrów

    // Filtracja po statusie
    if (status) {
      query += ` AND status = $${paramCounter}`;
      queryParams.push(status);
      paramCounter++;
    }

    // Filtracja po typie
    if (type) {
      query += ` AND x_amz_meta_page_type = $${paramCounter}`;
      queryParams.push(type);
      paramCounter++;
    }

    // Wyszukiwanie
    if (search) {
      query += ` AND (
        x_amz_meta_title ILIKE $${paramCounter} OR
        pagecontent_hero_headline ILIKE $${paramCounter} OR
        x_amz_meta_user_first_name ILIKE $${paramCounter} OR
        x_amz_meta_user_last_name ILIKE $${paramCounter} OR
        x_amz_meta_user_supervisor_code ILIKE $${paramCounter}
      )`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    // Sortowanie
    query += ` ORDER BY x_amz_meta_user_created_at DESC`;

    console.log("Final SQL Query:", query);
    console.log("Query Params:", queryParams);

    const result = await pool.query(query, queryParams);
    console.log(`Found ${result.rows.length} pages`);

    const pages = result.rows.map(page => {
      const creatorName = `${page.x_amz_meta_user_first_name || ''} ${page.x_amz_meta_user_last_name || ''}`.trim();

      let displayStatus;
      if (page.status === 'active') displayStatus = 'published';
      else if (page.status === 'pending') displayStatus = 'pending';
      else displayStatus = 'draft';

      const isOwnedByUser = String(page.x_amz_meta_user_id) === userId;

      // Debug: Dodatkowe logi dla Admina
      if (userRole === 'ADMIN') {
        console.log("Page Supervisor Code:", page.x_amz_meta_user_supervisor_code);
        console.log("Page Role:", page.x_amz_meta_user_role);
        console.log("Is Owned by Admin:", isOwnedByUser);
      }

      return {
        role: page.x_amz_meta_user_role,
        id: page.id,
        title: page.x_amz_meta_title || '',
        headline: page.pagecontent_hero_headline || '',
        creator: creatorName,
        supervisorCode: page.x_amz_meta_user_supervisor_code || '',
        visits: page.visitors || 0,
        leads: page.leads || 0,
        type: page.x_amz_meta_page_type || '',
        status: displayStatus,
        createdAt: page.x_amz_meta_user_created_at,
        url: page.url || '',
        draft_url: page.draft_url || '',
        coverImage: page.s3_file_key || '',
        videoPassword: page.video_password || '',
        isOwnedByUser: isOwnedByUser
      };
    });

    // Statystyki
    const allPagesCount = pages.length;
    const publishedPagesCount = pages.filter(p => p.status === 'published').length;
    const pendingPagesCount = pages.filter(p => p.status === 'pending').length;
    const draftPagesCount = pages.filter(p => p.status === 'draft').length;
    const ebookPagesCount = pages.filter(p => p.type === 'ebook').length;
    const salesPagesCount = pages.filter(p => p.type === 'sales').length;

    const stats = {
      total: allPagesCount,
      published: publishedPagesCount,
      pending: pendingPagesCount,
      draft: draftPagesCount,
      ebook: ebookPagesCount,
      sales: salesPagesCount
    };

    const response: PagesApiResponse = {
      pages: pages,
      stats: stats
    };

    console.log("Response Prepared. Sending...");
    console.log("======= END OF PAGES API REQUEST =======");

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error in GET /api/pages:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}