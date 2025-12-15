// src/app/api/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createUserProfile, getUserByEmail } from '@/lib/db';
import { UserRole } from '@/types/types';

// Usunięto nieużywany interfejs ErrorWithMessage

/**
 * Handler dla żądania POST - zapisuje dane użytkownika po rejestracji w Cognito
 */
export async function POST(request: NextRequest) {
  try {
    // Pobierz dane z body żądania
    const userData = await request.json();

    // Sprawdź wymagane pola
    const requiredFields = ['cognito_sub', 'email', 'first_name', 'last_name', 'phone_number', 'supervisor_code'];
    for (const field of requiredFields) {
      if (!userData[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Sprawdź czy użytkownik z tym adresem email już istnieje
    const existingUser = await getUserByEmail(userData.email);
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Ustaw domyślne wartości
    const userProfileData = {
      cognito_sub: userData.cognito_sub,
      first_name: userData.first_name,
      last_name: userData.last_name,
      email: userData.email,
      phone_number: userData.phone_number,
      supervisor_code: userData.supervisor_code,
      status: userData.status || 'pending', // Domyślnie 'pending'
      role: userData.role || 'USER' as UserRole, // Domyślnie 'USER'
      admin_comment: userData.admin_comment || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Dodanie logowania do debugowania
    console.log('Rejestracja nowego użytkownika z danymi:', {
      email: userProfileData.email,
      status: userProfileData.status,
      role: userProfileData.role
    });

    // Utwórz profil użytkownika w bazie danych
    const createdUser = await createUserProfile(userProfileData);

    // Usuń wrażliwe dane przed wysłaniem odpowiedzi
    // Używamy destrukturyzacji z przypisaniem pomijanej wartości aby uniknąć błędu
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { admin_comment: _, ...safeUserData } = createdUser;

    return NextResponse.json(
      { success: true, user: safeUserData },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Error in POST /api/register:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}