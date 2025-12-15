// src/app/api/chat-limits/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const chatId = searchParams.get('chatId');

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing userId parameter' },
        { status: 400 }
      );
    }

    // Sprawdź czy połączenie z bazą danych istnieje
    if (!pool) {
      throw new Error("Database connection pool is not initialized");
    }

    // Pobierz liczbę czatów z dzisiaj
    const chatCountResult = await pool.query(
      `SELECT COUNT(*) as count
       FROM chat_sessions
       WHERE cognito_id = $1
       AND DATE(created_at) = CURRENT_DATE`,
      [userId]
    );

    const dailyChatsUsed = parseInt(chatCountResult.rows[0].count, 10);

    // Jeśli podano chatId, pobierz też liczbę wiadomości w tym czacie
    let messageCount = 0;
    if (chatId) {
      // Nie musimy sprawdzać pool ponownie, bo już to zrobiliśmy wcześniej
      const messageCountResult = await pool.query(
        `SELECT COUNT(*) as count
         FROM chat_messages
         WHERE chat_session_id = $1
         AND role = 'user'`,
        [chatId]
      );
      messageCount = parseInt(messageCountResult.rows[0].count, 10);
    }

    return NextResponse.json({
      dailyChatsUsed,
      messageCount,
      dailyChatsLeft: Math.max(0, 2 - dailyChatsUsed),
      canSendMessage: messageCount < 1 // dla wersji demo - limit 1 wiadomości
    });

  } catch (error) {
    console.error('Error checking limits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}