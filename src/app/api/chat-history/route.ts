// src/app/api/admin/chat-history/route.ts
import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const limit = searchParams.get('limit') || '5';

    // Sprawdź czy połączenie z bazą danych istnieje
    if (!pool) {
      throw new Error("Database connection pool is not initialized");
    }

    // Pobierz ostatnie chaty użytkownika
    const chatHistoryQuery = `
      SELECT
        cs.id,
        cs.title,
        cs.created_at,
        (
          SELECT json_agg(json_build_object(
            'id', cm.id,
            'content', cm.content,
            'role', cm.role,
            'tokens_in', cm.tokens_in,
            'tokens_out', cm.tokens_out,
            'created_at', cm.created_at
          ))
          FROM chat_messages cm
          WHERE cm.chat_session_id = cs.id
          ORDER BY cm.created_at DESC
          LIMIT 3
        ) as last_messages,
        (
          SELECT SUM(tokens_in)
          FROM chat_messages
          WHERE chat_session_id = cs.id
        ) as total_tokens_in,
        (
          SELECT SUM(tokens_out)
          FROM chat_messages
          WHERE chat_session_id = cs.id
        ) as total_tokens_out
      FROM chat_sessions cs
      WHERE cs.user_id = $1
      ORDER BY cs.updated_at DESC
      LIMIT $2
    `;

    const chatHistory = await pool.query(chatHistoryQuery, [userId, limit]);

    // Pobierz sumaryczne statystyki tokenów
    const tokenStatsQuery = `
      SELECT
        SUM(tokens_in) as total_tokens_in,
        SUM(tokens_out) as total_tokens_out,
        date
      FROM token_usage
      WHERE user_id = $1
      GROUP BY date
      ORDER BY date DESC
      LIMIT 30
    `;

    const tokenStats = await pool.query(tokenStatsQuery, [userId]);

    return NextResponse.json({
      chatHistory: chatHistory.rows,
      tokenStats: tokenStats.rows
    });

  } catch (error) {
    console.error('Chat history error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch chat history' },
      { status: 500 }
    );
  }
}

// Endpoint do zapisywania nowej wiadomości
export async function POST(req: Request) {
  try {
    const { userId, chatSessionId, content, role, tokensIn, tokensOut } = await req.json();

    // Sprawdź czy połączenie z bazą danych istnieje
    if (!pool) {
      throw new Error("Database connection pool is not initialized");
    }

    // Zapisz wiadomość
    const result = await pool.query(
      `INSERT INTO chat_messages
       (chat_session_id, content, role, tokens_in, tokens_out)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [chatSessionId, content, role, tokensIn, tokensOut]
    );

    // Aktualizuj statystyki tokenów
    await pool.query(
      `INSERT INTO token_usage (user_id, tokens_in, tokens_out, date)
       VALUES ($1, $2, $3, CURRENT_DATE)
       ON CONFLICT (user_id, date)
       DO UPDATE SET
         tokens_in = token_usage.tokens_in + EXCLUDED.tokens_in,
         tokens_out = token_usage.tokens_out + EXCLUDED.tokens_out`,
      [userId, tokensIn, tokensOut]
    );

    return NextResponse.json({ messageId: result.rows[0].id });

  } catch (error) {
    console.error('Save message error:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}