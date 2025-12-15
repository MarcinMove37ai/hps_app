// src/app/api/create-page-from-video/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { nanoid } from 'nanoid';

/**
 * Handler dla żądania POST - tworzy nową stronę na podstawie istniejącego wideo
 */
export async function POST(request: NextRequest) {
  try {
    console.log("======= CREATE PAGE FROM VIDEO API REQUEST =======");

    // Pobierz dane użytkownika z nagłówków
    const userIdHeader = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID Header:", userIdHeader);
    console.log("User Role:", userRole);

    // Konwersja ID użytkownika na liczbę całkowitą
    let userId: number | null = null;

    if (userIdHeader && /^\d+$/.test(userIdHeader)) {
      userId = parseInt(userIdHeader, 10);
    }

    if (!userId || isNaN(userId)) {
      return NextResponse.json({ error: `Invalid user ID: ${userIdHeader}` }, { status: 400 });
    }

    if (!userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    // Pobierz dane użytkownika tworzącego stronę
    const userQuery = `
      SELECT first_name, last_name, email, supervisor_code, status
      FROM user_profiles
      WHERE id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const user = userResult.rows[0];
    const firstName = user.first_name;
    const lastName = user.last_name;
    const email = user.email;
    const supervisorCode = user.supervisor_code || null;
    const userStatus = user.status || 'active';

    // Pobierz dane z requestu
    const reqData = await request.json();
    console.log("Request data:", reqData);

    const {
      title,              // Tytuł z sufiksem (znormalizowany)
      originalTitle,      // Oryginalny tytuł (może zawierać polskie znaki)
      subtitle,           // Podtytuł
      description,        // Opis
      videoUrl,           // URL do wideo
      thumbnailUrl,       // URL do miniatury
      originalCreator,    // Oryginalny twórca wideo
      pageType,           // Typ strony (zawsze 'sales')
      isPublicVideo,      // Nowe pole - dostęp publiczny (true/false)
      videoPassword,      // Nowe pole - hasło dostępu do wideo
      category,           // Nazwa kategorii
      categoryShortDesc   // Krótki opis kategorii
    } = reqData;

    // Walidacja wymaganych pól
    if (!title) {
      return NextResponse.json({ error: 'Missing required field: title' }, { status: 400 });
    }

    if (!videoUrl) {
      return NextResponse.json({ error: 'Missing required field: videoUrl' }, { status: 400 });
    }

    // Przygotuj obecną datę
    const currentDate = new Date().toISOString();

    // Generujemy losowy token dla URL
    const previewToken = nanoid(10);
    const draftUrl = `/preview/${previewToken}`;
    console.log("Wygenerowano unikalny token dla draft_url:", previewToken);

    // Informacje o kontroli dostępu
    console.log("Kontrola dostępu do wideo:");
    console.log("- Publiczne:", isPublicVideo === true ? "TAK" : "NIE");
    console.log("- Hasło dostępu:", videoPassword ? "USTAWIONE" : "BRAK");

    // Informacje o kategorii
    console.log("Informacje o kategorii:");
    console.log("- Kategoria:", category || "BRAK");
    console.log("- Opis kategorii:", categoryShortDesc || "BRAK");

    // Dodajemy wszystkie wymagane pola do zapytania, włącznie z polami kategorii
    const insertQuery = `
      INSERT INTO pages (
        url,
        draft_url,
        status,
        visitors,
        leads,
        x_amz_meta_title,
        x_amz_meta_page_type,
        x_amz_meta_user_id,
        x_amz_meta_user_first_name,
        x_amz_meta_user_last_name,
        x_amz_meta_user_email,
        x_amz_meta_user_cognito_sub,
        x_amz_meta_user_created_at,
        x_amz_meta_user_role,
        x_amz_meta_user_status,
        x_amz_meta_user_supervisor_code,
        x_amz_meta_user_updated_at,
        pagecontent_hero_headline,
        pagecontent_hero_subheadline,
        pagecontent_hero_description,
        video_embed_url,
        s3_file_key,
        cover_page_index,
        x_amz_meta_original_creator,
        public_page,
        video_password,
        category,
        short_desc
      ) VALUES (
        NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27
      )
      RETURNING id
    `;

    const insertValues = [
      draftUrl,                   // draft_url
      'draft',                    // status - zmienione na draft zamiast pending
      0,                          // visitors (INTEGER)
      0,                          // leads (INTEGER)
      title,                      // x_amz_meta_title
      pageType,                   // x_amz_meta_page_type
      userId,                     // x_amz_meta_user_id (INTEGER)
      firstName,                  // x_amz_meta_user_first_name
      lastName,                   // x_amz_meta_user_last_name
      email,                      // x_amz_meta_user_email
      cognitoSub,                 // x_amz_meta_user_cognito_sub
      currentDate,                // x_amz_meta_user_created_at
      userRole,                   // x_amz_meta_user_role
      userStatus,                 // x_amz_meta_user_status
      supervisorCode,             // x_amz_meta_user_supervisor_code
      currentDate,                // x_amz_meta_user_updated_at
      originalTitle,              // pagecontent_hero_headline
      subtitle || '',             // pagecontent_hero_subheadline
      description || '',          // pagecontent_hero_description (bez modyfikacji)
      videoUrl,                   // video_embed_url
      thumbnailUrl || '',         // s3_file_key
      -1,                         // cover_page_index dla wideo
      originalCreator || '',      // x_amz_meta_original_creator
      isPublicVideo === true,     // public_page - nowe pole dla kontroli dostępu
      videoPassword || null,      // video_password - nowe pole dla kontroli dostępu
      category || '',             // category - nazwa kategorii
      categoryShortDesc || ''     // short_desc - krótki opis kategorii
    ];

    console.log("Executing query with updated values");
    console.log("User ID:", userId, "type:", typeof userId);
    console.log("draft_url:", draftUrl);
    console.log("x_amz_meta_title:", title);
    console.log("x_amz_meta_original_creator:", originalCreator || '');
    console.log("public_page:", isPublicVideo === true);
    console.log("video_password:", videoPassword ? "USTAWIONE" : "NULL");
    console.log("category:", category || '');
    console.log("short_desc:", categoryShortDesc || '');

    try {
      const result = await pool.query(insertQuery, insertValues);

      if (result.rows.length === 0) {
        throw new Error('Failed to insert new page record');
      }

      // Pobierz wygenerowane ID z bazy danych
      const pageId = result.rows[0].id;
      console.log(`Created new page with ID: ${pageId}`);
      console.log("======= END OF CREATE PAGE FROM VIDEO API REQUEST =======");

      return NextResponse.json({
        success: true,
        pageId,
        categoryData: {
          category: category || '',
          categoryShortDesc: categoryShortDesc || ''
        }
      });
    } catch (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json({
        error: `Database error: ${(dbError as Error).message}`,
        details: dbError
      }, { status: 500 });
    }
  } catch (error: unknown) {
    console.error('Error in POST /api/create-page-from-video:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg, stack: (error as Error).stack }, { status: 500 });
  }
}