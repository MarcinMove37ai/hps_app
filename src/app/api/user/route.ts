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

/**
 * Handler dla żądania GET - pobiera dane użytkownika na podstawie tokenu JWT
 */
export async function GET(request: NextRequest) {
  try {
    // Pobierz token z nagłówka Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Weryfikuj token JWT
    const payload = await verifyToken(token);

    // Pobierz cognito_sub z payload
    const cognitoSub = payload.sub;
    if (!cognitoSub) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // Pobierz dane użytkownika z bazy danych
    const user = await getUserByCognitoSub(cognitoSub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // USUNIĘTO - Weryfikacja statusu użytkownika i blokowanie odpowiedzi
    // Teraz dane użytkownika są zwracane niezależnie od statusu

    // Dodanie logowania danych użytkownika w celu diagnostyki
    console.log('Dane użytkownika pobrane z bazy:', {
      id: user.id,
      email: user.email,
      status: user.status,
      role: user.role
    });

    // Usuń wrażliwe dane przed wysłaniem odpowiedzi
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { admin_comment: _, ...safeUserData } = user;

    return NextResponse.json(safeUserData);
  } catch (error: unknown) {
    console.error('Error in GET /api/user:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * Handler dla żądania PUT - aktualizuje dane użytkownika
 */
export async function PUT(request: NextRequest) {
  try {
    // Pobierz token z nagłówka Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing or invalid authorization token' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];

    // Weryfikuj token JWT
    const payload = await verifyToken(token);

    // Pobierz cognito_sub z payload
    const cognitoSub = payload.sub;
    if (!cognitoSub) {
      return NextResponse.json({ error: 'Invalid token payload' }, { status: 401 });
    }

    // Pobierz dane użytkownika z bazy danych
    const user = await getUserByCognitoSub(cognitoSub);
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // USUNIĘTO - Weryfikacja statusu użytkownika i blokowanie aktualizacji
    // Dla metody PUT warto jednak zablokować modyfikacje dla zablokowanych użytkowników
    // Ale zwróćmy dane użytkownika z odpowiednim kodem błędu zamiast całkowicie odrzucać żądanie
    if (user.status === 'blocked') {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { admin_comment: _, ...safeUserData } = user;
      return NextResponse.json({
        error: 'User account is blocked',
        userData: safeUserData // Zwracamy dane użytkownika wraz z błędem
      }, { status: 403 });
    }

    // Pobierz dane do aktualizacji z body
    const requestData = await request.json();

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
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // Aktualizuj profil użytkownika
    const updatedUser = await updateUserProfile(user.id, updateData);

    // Usuń wrażliwe dane przed wysłaniem odpowiedzi
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { admin_comment: _, ...safeUserData } = updatedUser;

    return NextResponse.json(safeUserData);
  } catch (error: unknown) {
    console.error('Error in PUT /api/user:', error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * Funkcja do weryfikacji tokenu JWT
 */
async function verifyToken(token: string): Promise<JWTPayload> {
  try {
    // Pobierz klucze publiczne z JWKS URL
    const jwksResponse = await fetch(COGNITO_JWKS_URL);
    if (!jwksResponse.ok) {
      throw new Error('Failed to fetch JWKS');
    }

    const jwks = await jwksResponse.json();

    // Zdekoduj token bez weryfikacji, aby uzyskać kid
    const decodedHeader = JSON.parse(
      Buffer.from(token.split('.')[0], 'base64').toString()
    );

    // Znajdź klucz publiczny pasujący do kid
    const key = jwks.keys.find((k: { kid: string }) => k.kid === decodedHeader.kid);
    if (!key) {
      throw new Error('Public key not found');
    }

    // Utwórz klucz publiczny z JWKS
    const publicKey = await importJWK(key, 'RS256');

    // Zweryfikuj token
    const { payload } = await jwtVerify(token, publicKey, {
      issuer: `https://cognito-idp.eu-central-1.amazonaws.com/eu-central-1_wbvxRUvlR`,
    });

    return payload as JWTPayload;
  } catch (error) {
    console.error('Token verification error:', error);
    throw new Error('Invalid token');
  }
}