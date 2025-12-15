// src/app/api/db-test/route.ts
import { NextResponse } from 'next/server';
import { Client } from 'pg';

export async function GET() {
  let client;
  try {
    // Inicjalizacja klienta bazy danych
    client = new Client({
      user: process.env.POSTGRES_USER,
      host: process.env.POSTGRES_HOST,
      database: process.env.POSTGRES_DB,
      password: process.env.POSTGRES_PASSWORD,
      port: parseInt(process.env.POSTGRES_PORT || '5432'),
      ssl: {
        rejectUnauthorized: false
      }
    });

    console.log('Próba połączenia z bazą PostgreSQL...');

    // Połączenie z bazą
    await client.connect();
    console.log('Połączono z bazą PostgreSQL!');

    // Proste zapytanie testowe
    const result = await client.query('SELECT NOW() as current_time');

    return NextResponse.json({
      success: true,
      message: 'Successfully connected to database',
      currentTime: result.rows[0].current_time,
      env: {
        host: process.env.POSTGRES_HOST ? '[ustawione]' : '[brak]',
        db: process.env.POSTGRES_DB ? '[ustawione]' : '[brak]',
        user: process.env.POSTGRES_USER ? '[ustawione]' : '[brak]',
        port: process.env.POSTGRES_PORT ? '[ustawione]' : '[brak]',
        password: process.env.POSTGRES_PASSWORD ? '[zamaskowane]' : '[brak]'
      }
    });
  } catch (error) {
    console.error('Error connecting to database:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to connect to database',
      details: error instanceof Error ? error.message : 'Unknown error',
      env: {
        host: process.env.POSTGRES_HOST ? '[ustawione]' : '[brak]',
        db: process.env.POSTGRES_DB ? '[ustawione]' : '[brak]',
        user: process.env.POSTGRES_USER ? '[ustawione]' : '[brak]',
        port: process.env.POSTGRES_PORT ? '[ustawione]' : '[brak]',
        password: process.env.POSTGRES_PASSWORD ? '[zamaskowane]' : '[brak]'
      }
    }, { status: 500 });
  } finally {
    if (client) {
      try {
        await client.end();
        console.log('Połączenie z bazą PostgreSQL zakończone');
      } catch (closeError) {
        console.error('Error closing database connection:', closeError);
      }
    }
  }
}