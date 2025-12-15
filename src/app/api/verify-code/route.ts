// src/app/api/verify-code/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyCaretakerCode } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    // Sprawdzenie, czy kod został podany
    if (!code) {
      return NextResponse.json(
        { success: false, message: 'Kod jest wymagany', valid: false },
        { status: 400 }
      );
    }

    try {
      // Weryfikacja kodu w bazie danych
      const result = await verifyCaretakerCode(code);

      if (result.valid) {
        return NextResponse.json({
          success: true,
          valid: true,
          message: 'Poprawny kod opiekuna',
          description: result.description || 'Brak opisu'
        });
      } else {
        return NextResponse.json({
          success: true,
          valid: false,
          message: 'Niepoprawny kod opiekuna'
        });
      }
    } catch (error) {
      console.error('Błąd weryfikacji kodu:', error);

      return NextResponse.json(
        {
          success: false,
          message: 'Błąd podczas weryfikacji kodu',
          valid: false,
          error: error instanceof Error ? error.message : 'Nieznany błąd'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Błąd przetwarzania żądania:', error);

    return NextResponse.json(
      { success: false, message: 'Błąd serwera', valid: false },
      { status: 500 }
    );
  }
}