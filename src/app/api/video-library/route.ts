// src/app/api/video-library/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { UserRole } from '@/types';

// Interfejs dla odpowiedzi API biblioteki wideo
interface VideoLibraryResponse {
  videos: {
    id: string;
    title: string;  // pagecontent_hero_headline
    subtitle: string; // pagecontent_hero_subheadline
    description: string; // pagecontent_hero_description
    creator: string;
    videoUrl: string; // video_embed_url
    thumbnailUrl: string; // s3_file_key
    createdAt: string;
    type: string;
    publicPage: boolean; // public_page
    videoPassword: string | null; // video_password
  }[];
}

/**
 * Handler dla żądania GET - pobiera listę unikalnych materiałów wideo
 */
export async function GET(request: NextRequest) {
  try {
    console.log("======= VIDEO LIBRARY API REQUEST =======");
    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role') as UserRole;
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    // Sprawdź czy użytkownik ma jakąkolwiek dozwoloną rolę (podstawowe zabezpieczenie)
    if (userRole !== 'ADMIN' && userRole !== 'GOD' && userRole !== 'USER') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Pobierz parametry filtrowania
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || null;

    // Tworzenie zapytania z parametrami - pobieranie unikalnych wideo
    // Używamy DISTINCT ON aby zapewnić, że pobieramy unikalne wideo (unikalne video_embed_url)
    // Wybieramy tylko oryginalne materiały (bez wartości w x_amz_meta_original_creator)
    let query = `
      SELECT DISTINCT ON (video_embed_url)
        id,
        pagecontent_hero_headline,
        pagecontent_hero_subheadline,
        pagecontent_hero_description,
        x_amz_meta_user_first_name,
        x_amz_meta_user_last_name,
        video_embed_url,
        s3_file_key,
        x_amz_meta_user_created_at,
        x_amz_meta_page_type,
        public_page,
        video_password
      FROM pages
      WHERE video_embed_url IS NOT NULL
        AND video_embed_url != ''
        AND x_amz_meta_page_type = 'sales'
        AND (x_amz_meta_original_creator IS NULL OR x_amz_meta_original_creator = '')
    `;

    const queryParams: (string | null)[] = [];
    let paramCounter = 1;

    // Dodaj warunek wyszukiwania
    if (search) {
      query += ` AND (
        pagecontent_hero_headline ILIKE $${paramCounter} OR
        pagecontent_hero_subheadline ILIKE $${paramCounter} OR
        pagecontent_hero_description ILIKE $${paramCounter} OR
        x_amz_meta_user_first_name ILIKE $${paramCounter} OR
        x_amz_meta_user_last_name ILIKE $${paramCounter}
      )`;
      queryParams.push(`%${search}%`);
      paramCounter++;
    }

    // Sortowanie - najnowsze filmy pierwsze
    query += ` ORDER BY video_embed_url, x_amz_meta_user_created_at DESC`;

    console.log("Final SQL Query:", query);
    console.log("Query Params:", queryParams);

    // Wykonaj zapytanie
    const result = await pool.query(query, queryParams);
    console.log(`Found ${result.rows.length} unique videos`);

    // Przygotuj dane do zwrócenia
    const videos = result.rows.map(video => {
      // Formatuj nazwę twórcy
      const creatorName = `${video.x_amz_meta_user_first_name || ''} ${video.x_amz_meta_user_last_name || ''}`.trim();

      return {
        id: video.id,
        title: video.pagecontent_hero_headline || '',
        subtitle: video.pagecontent_hero_subheadline || '',
        description: video.pagecontent_hero_description || '',
        creator: creatorName,
        videoUrl: video.video_embed_url || '',
        thumbnailUrl: video.s3_file_key || '',
        createdAt: video.x_amz_meta_user_created_at,
        type: video.x_amz_meta_page_type || '',
        publicPage: video.public_page || false,
        videoPassword: video.video_password || null
      };
    });

    const response: VideoLibraryResponse = {
      videos: videos
    };

    console.log("Response Prepared. Sending...");
    console.log("======= END OF VIDEO LIBRARY API REQUEST =======");

    return NextResponse.json(response);
  } catch (error: unknown) {
    console.error('Error in GET /api/video-library:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}