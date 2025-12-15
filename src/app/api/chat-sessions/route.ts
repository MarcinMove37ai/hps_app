// app/api/chat-sessions/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { title } = await req.json();

    // Tymczasowo ustawiamy user_id na 1 do testów
    // W produkcji powinno to pochodzić z sesji użytkownika
    const userId = 1;

    // Sprawdź czy połączenie z bazą danych istnieje
    if (!pool) {
      throw new Error("Database connection pool is not initialized");
    }

    const result = await pool.query(
      `INSERT INTO chat_sessions (user_id, title)
       VALUES ($1, $2)
       RETURNING id, title, created_at`,
      [userId, title]
    );

    return NextResponse.json({
      chatSession: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating chat session:', error);
    return NextResponse.json(
      { error: 'Failed to create chat session' },
      { status: 500 }
    );
  }
}