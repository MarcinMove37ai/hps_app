// src/app/api/user/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getUserByCognitoSub, updateUserProfile } from '@/lib/db';
import { jwtVerify, importJWK } from 'jose';

// Klucz publiczny do weryfikacji tokenów JWT z AWS Cognito (pobierany z env)
const COGNITO_JWKS_URL = process.env.COGNITO_JWKS_URL ||
  `https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_wbvxRUvlR/.well-known/jwks.json`;

// Typy dla lepszej kontroli typów
interface JWTPayload {
  sub?: string;
  [key: string]: unknown;
}

// Helper do logowania w development
const isDev = process.env.NODE_ENV !== 'production';
const log = (message: string, data?: unknown) => {
  if (isDev) {
    console.log(`[API /user] ${message}`, data || '');
  }
};

/**
 * Handler dla żądania GET - pobiera dane użytkownika na podstawie tokenu JWT
 */
export async function GET(request: NextRequest) {
  try {
    log('📥 GET Request otrzymany');

    // Pobierz token z nagłówka Authorization
    const authHeader = request.headers.get('Authorization');
    log('🔐 Authorization header:', authHeader ? 'Obecny' : 'Brak');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log('❌ Brak lub nieprawidłowy token autoryzacji');
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    log('🔐 Token wyodrębniony, długość:', token.length);

    // Weryfikuj token JWT
    log('🔐 Weryfikacja tokenu JWT...');
    let payload: JWTPayload;
    try {
      payload = await verifyToken(token);
      log('✅ Token zweryfikowany pomyślnie');
    } catch (verifyError) {
      log('❌ Błąd weryfikacji tokenu:', verifyError);
      throw verifyError;
    }

    // Pobierz cognito_sub z payload
    const cognitoSub = payload.sub;
    log('🆔 Cognito Sub:', cognitoSub);

    if (!cognitoSub) {
      log('❌ Brak cognito_sub w payload');
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // Pobierz dane użytkownika z bazy danych
    log('🔍 Pobieranie użytkownika z bazy danych...');
    let user;
    try {
      user = await getUserByCognitoSub(cognitoSub);
      log('✅ Zapytanie do bazy wykonane');
    } catch (dbError) {
      log('❌ Błąd zapytania do bazy danych:', dbError);
      console.error('❌ [API /user] Database error details:', dbError);
      throw dbError;
    }

    if (!user) {
      log('❌ Użytkownik nie znaleziony w bazie');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Dodanie logowania danych użytkownika w celu diagnostyki
    log('✅ Dane użytkownika pobrane z bazy:', {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role
    });

    // Usuń wrażliwe dane przed wysłaniem odpowiedzi
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { admin_comment: _, ...safeUserData } = user;

    log('📤 Wysyłanie odpowiedzi z danymi użytkownika');
    return NextResponse.json(safeUserData);
  } catch (error: unknown) {
    console.error('❌❌❌ CRITICAL ERROR in GET /api/user ❌❌❌');
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
    console.error('Full error:', error);

    if (error instanceof Error) {
      console.error('Stack trace:', error.stack);
    }

    const errorMsg = error instanceof Error ? error.message : 'Internal server error';

    // Zwróć bardziej szczegółowy błąd w development
    const responseData = isDev
      ? {
          error: errorMsg,
          type: error?.constructor?.name,
          details: error instanceof Error ? error.stack : undefined
        }
      : { error: errorMsg };

    return NextResponse.json(responseData, { status: 500 });
  }
}

/**
 * Handler dla żądania PUT - aktualizuje dane użytkownika
 */
export async function PUT(request: NextRequest) {
  try {
    log('📥 PUT Request otrzymany');

    // Pobierz token z nagłówka Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      log('❌ Brak lub nieprawidłowy token autoryzacji');
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Weryfikuj token JWT
    log('🔐 Weryfikacja tokenu JWT...');
    const payload = await verifyToken(token);

    // Pobierz cognito_sub z payload
    const cognitoSub = payload.sub;
    if (!cognitoSub) {
      log('❌ Brak cognito_sub w payload');
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // Pobierz dane użytkownika z bazy danych
    log('🔍 Pobieranie użytkownika z bazy danych...');
    const user = await getUserByCognitoSub(cognitoSub);
    if (!user) {
      log('❌ Użytkownik nie znaleziony');
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Weryfikacja statusu użytkownika dla PUT
    if (user.status === 'blocked') {
      log('⚠️ Użytkownik zablokowany, odmowa aktualizacji');
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { admin_comment: _, ...safeUserData } = user;
      return NextResponse.json({
        error: 'User account is blocked',
        userData: safeUserData
      }, { status: 403 });
    }

    // Pobierz dane do aktualizacji z body
    const requestData = await request.json();
    log('📝 Dane do aktualizacji:', Object.keys(requestData));

    // Lista pól, które użytkownik może aktualizować
    const allowedFields = ['first_name', 'last_name', 'phone_number'];

    // Filtruj dane wejściowe, aby zawierały tylko dozwolone pola
    const updateData: Record<string, string> = {};
    for (const field of allowedFields) {
      if (requestData[field] !== undefined) {
        updateData[field] = requestData[field];
      }
    }

    // Sprawdź czy są jakieś pola do aktualizacji
    if (Object.keys(updateData).length === 0) {
      log('❌ Brak pól do aktualizacji');
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Aktualizuj profil użytkownika
    log('💾 Aktualizacja profilu...');
    const updatedUser = await updateUserProfile(user.id, updateData);

    // Usuń wrażliwe dane przed wysłaniem odpowiedzi
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { admin_comment: _, ...safeUserData } = updatedUser;

    log('✅ Profil zaktualizowany pomyślnie');
    return NextResponse.json(safeUserData);
  } catch (error: unknown) {
    console.error('❌❌❌ CRITICAL ERROR in PUT /api/user ❌❌❌');
    console.error('Error:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * Funkcja do weryfikacji tokenu JWT
 */
async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    log('🔐 Pobieranie kluczy publicznych z JWKS...');

    // Pobierz klucze publiczne z JWKS URL
    const jwksResponse = await fetch(COGNITO_JWKS_URL);
    if (!jwksResponse.ok) {
      log('❌ Nie udało się pobrać JWKS');
      throw new Error('Failed to fetch JWKS');
    }

    const jwks = await jwksResponse.json();
    log('✅ JWKS pobrane pomyślnie');

    // Zdekoduj token bez weryfikacji, aby uzyskać kid
    const decodedHeader = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64').toString()
    );
    log('🔐 Token header decoded, kid:', decodedHeader.kid);

    // Znajdź klucz publiczny pasujący do kid
    const key = jwks.keys.find((k: { kid: string }) => k.kid === decodedHeader.kid);
    if (!key) {
      log('❌ Nie znaleziono klucza publicznego dla kid:', decodedHeader.kid);
      throw new Error('Public key not found');
    }
    log('✅ Klucz publiczny znaleziony');

    // Utwórz klucz publiczny z JWKS
    const publicKey = await importJWK(key, 'RS256');

    // Zweryfikuj token
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: `https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_wbvxRUvlR`,
    });

    log('✅ Token zweryfikowany, sub:', payload.sub);
    return payload as JWTPayload;
  } catch (error) {
    console.error('❌ Token verification error:', error);
    throw new Error('Invalid token');
  }
}