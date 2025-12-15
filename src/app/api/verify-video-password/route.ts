// src/app/api/verify-video-password/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Handler dla żądania POST - weryfikuje hasło dostępu do przesyłania wideo
 */
export async function POST(request: NextRequest) {
  try {
    // Pobierz hasło z body requestu
    const body = await request.json();
    const { password } = body;

    // Pobierz prawidłowe hasło ze zmiennej środowiskowej
    const correctPassword = process.env.VIDEO_PASS;

    if (!correctPassword) {
      console.error('Błąd konfiguracji: Zmienna środowiskowa VIDEO_PASS nie jest ustawiona');
      return NextResponse.json(
        { error: 'Błąd konfiguracji serwera' },
        { status: 500 }
      );
    }

    // Sprawdź czy hasło jest poprawne
    if (password === correctPassword) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Nieprawidłowe hasło', success: false },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Błąd podczas weryfikacji hasła:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas weryfikacji hasła', success: false },
      { status: 500 }
    );
  }
}