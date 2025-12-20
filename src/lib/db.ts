// src/lib/db.ts
import { Pool } from 'pg';
import { UserProfile } from '@/types'; // Aktualizacja importu typów

// Szczegółowe logowanie konfiguracji (tylko w development)
const isDev = process.env.NODE_ENV !== 'production';

if (isDev) {
  console.log('🔧 [DB CONFIG] Inicjalizacja połączenia z bazą danych...');
  console.log('🔧 [DB CONFIG] DATABASE_URL:', process.env.DATABASE_URL ? '✓ Ustawione' : '✗ Brak');
  console.log('🔧 [DB CONFIG] POSTGRES_HOST:', process.env.POSTGRES_HOST ? '✓ Ustawione' : '✗ Brak');
}

// Inicjalizacja puli połączeń - obsługuje zarówno AWS jak i Railway
const pool = new Pool({
  // Jeśli DATABASE_URL istnieje (Railway), użyj go
  ...(process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: false  // Railway nie wymaga SSL
      }
    : {
        // W przeciwnym razie użyj osobnych zmiennych (AWS)
        user: process.env.POSTGRES_USER,
        host: process.env.POSTGRES_HOST,
        database: process.env.POSTGRES_DB,
        password: process.env.POSTGRES_PASSWORD,
        port: parseInt(process.env.POSTGRES_PORT || '5432'),
        ssl: { rejectUnauthorized: false }  // AWS wymaga SSL object
      }
  )
});

if (isDev) {
  console.log('🔧 [DB CONFIG] Tryb:', process.env.DATABASE_URL ? 'Railway (DATABASE_URL)' : 'AWS (zmienne osobne)');
  console.log('🔧 [DB CONFIG] SSL:', process.env.DATABASE_URL ? 'false (wyłączone)' : '{ rejectUnauthorized: false }');
}

// Obsługa błędów na poziomie puli
pool.on('error', (err) => {
  console.error('❌ [DB ERROR] Nieoczekiwany błąd na kliencie pg:', err);
});

// Test połączenia przy starcie (tylko w development)
if (isDev) {
  pool.query('SELECT NOW() as current_time, version() as pg_version')
    .then((result) => {
      console.log('✅ [DB CONNECTION] Połączenie z bazą danych OK');
      console.log('✅ [DB CONNECTION] Czas serwera:', result.rows[0].current_time);
      console.log('✅ [DB CONNECTION] Wersja PostgreSQL:', result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1]);
    })
    .catch((err) => {
      console.error('❌ [DB CONNECTION] Błąd połączenia z bazą danych:', err.message);
      console.error('❌ [DB CONNECTION] Szczegóły:', err);
    });
}

// Verify caretaker code
export const verifyCaretakerCode = async (code: string): Promise<{valid: boolean, description?: string}> => {
  try {
    if (isDev) console.log('🔍 [DB QUERY] verifyCaretakerCode:', code);

    // Wyraźnie wybieramy kod i opis
    const result = await pool.query(
      `SELECT code, description
       FROM supervisor_codes
       WHERE code = $1
       AND is_active = true`,
      [code]
    );

    // Return true if we found a matching code along with its description
    if (result.rows.length > 0) {
      // Upewniamy się, że opis jest zawsze dostępny
      const description = result.rows[0].description;
      if (isDev) console.log('✅ [DB QUERY] Kod znaleziony:', { valid: true, description });
      return {
        valid: true,
        description: description || 'Brak opisu'
      };
    }

    // Nie znaleziono kodu
    if (isDev) console.log('❌ [DB QUERY] Kod nie znaleziony');
    return {
      valid: false
    };
  } catch (error) {
    console.error('❌ [DB ERROR] Error verifying caretaker code:', error);
    throw error;
  }
};

/**
 * Pobiera dane użytkownika na podstawie identyfikatora Cognito
 * @param cognitoSub Identyfikator użytkownika z Cognito
 * @returns Dane użytkownika lub null jeśli nie znaleziono
 */
export async function getUserByCognitoSub(cognitoSub: string): Promise<UserProfile | null> {
  try {
    if (isDev) console.log('🔍 [DB QUERY] getUserByCognitoSub:', cognitoSub);

    const query = `
      SELECT id, cognito_sub, first_name, last_name, email, phone_number, supervisor_code, status, role, admin_comment, created_at, updated_at
      FROM user_profiles
      WHERE cognito_sub = $1
    `;

    const result = await pool.query(query, [cognitoSub]);

    if (result.rows.length === 0) {
      if (isDev) console.log('❌ [DB QUERY] Użytkownik nie znaleziony');
      return null;
    }

    if (isDev) console.log('✅ [DB QUERY] Użytkownik znaleziony:', {
      id: result.rows[0].id,
      email: result.rows[0].email,
      status: result.rows[0].status,
      role: result.rows[0].role
    });

    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('❌ [DB ERROR] Error fetching user by Cognito sub:', error);
    console.error('❌ [DB ERROR] cognito_sub:', cognitoSub);
    if (error instanceof Error) {
      console.error('❌ [DB ERROR] Message:', error.message);
      console.error('❌ [DB ERROR] Stack:', error.stack);
    }
    throw error;
  }
}

/**
 * Pobiera dane użytkownika na podstawie adresu email
 * @param email Adres email użytkownika
 * @returns Dane użytkownika lub null jeśli nie znaleziono
 */
export async function getUserByEmail(email: string): Promise<UserProfile | null> {
  try {
    if (isDev) console.log('🔍 [DB QUERY] getUserByEmail:', email);

    const query = `
      SELECT id, cognito_sub, first_name, last_name, email, phone_number, supervisor_code, status, role, admin_comment, created_at, updated_at
      FROM user_profiles
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      if (isDev) console.log('❌ [DB QUERY] Użytkownik nie znaleziony');
      return null;
    }

    if (isDev) console.log('✅ [DB QUERY] Użytkownik znaleziony:', {
      id: result.rows[0].id,
      email: result.rows[0].email,
      status: result.rows[0].status,
      role: result.rows[0].role
    });

    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('❌ [DB ERROR] Error fetching user by email:', error);
    console.error('❌ [DB ERROR] email:', email);
    throw error;
  }
}

/**
 * Tworzy nowy profil użytkownika w bazie danych
 * @param userData Dane użytkownika do zapisania
 * @returns Utworzony profil użytkownika
 */
export async function createUserProfile(userData: Omit<UserProfile, 'id'>): Promise<UserProfile> {
  try {
    if (isDev) console.log('🔍 [DB QUERY] createUserProfile:', {
      email: userData.email,
      cognito_sub: userData.cognito_sub
    });

    const query = `
      INSERT INTO user_profiles (
        cognito_sub, first_name, last_name, email, phone_number, supervisor_code, status, role, admin_comment, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id, cognito_sub, first_name, last_name, email, phone_number, supervisor_code, status, role, admin_comment, created_at, updated_at
    `;

    const now = new Date().toISOString(); // Formatujemy jako string zgodnie z definicją typu

    const values = [
      userData.cognito_sub,
      userData.first_name,
      userData.last_name,
      userData.email,
      userData.phone_number,
      userData.supervisor_code,
      userData.status || 'pending',
      userData.role || 'USER',  // Dodana domyślna wartość roli 'USER'
      userData.admin_comment || '',
      userData.created_at || now,
      userData.updated_at || now
    ];

    const result = await pool.query(query, values);

    if (isDev) console.log('✅ [DB QUERY] Użytkownik utworzony:', {
      id: result.rows[0].id,
      email: result.rows[0].email
    });

    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('❌ [DB ERROR] Error creating user profile:', error);
    console.error('❌ [DB ERROR] userData:', {
      email: userData.email,
      cognito_sub: userData.cognito_sub
    });
    throw error;
  }
}

/**
 * Aktualizuje dane użytkownika
 * @param id Identyfikator użytkownika w bazie danych
 * @param data Dane do aktualizacji (częściowe)
 * @returns Zaktualizowany profil użytkownika
 */
export async function updateUserProfile(id: string, data: Partial<UserProfile>): Promise<UserProfile> {
  try {
    if (isDev) console.log('🔍 [DB QUERY] updateUserProfile:', { id, fields: Object.keys(data) });

    // Tworzymy dynamiczny zestaw pól do aktualizacji
    const updates: string[] = [];
    const values: (string | number | null)[] = []; // Poprawiony typ
    let paramIndex = 1;

    // Dodajemy każde pole które ma być zaktualizowane
    if (data.first_name !== undefined) {
      updates.push(`first_name = $${paramIndex++}`);
      values.push(data.first_name);
    }

    if (data.last_name !== undefined) {
      updates.push(`last_name = $${paramIndex++}`);
      values.push(data.last_name);
    }

    if (data.email !== undefined) {
      updates.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (data.phone_number !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      values.push(data.phone_number);
    }

    if (data.supervisor_code !== undefined) {
      updates.push(`supervisor_code = $${paramIndex++}`);
      values.push(data.supervisor_code);
    }

    if (data.status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }

    if (data.role !== undefined) {
      updates.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }

    if (data.admin_comment !== undefined) {
      updates.push(`admin_comment = $${paramIndex++}`);
      values.push(data.admin_comment);
    }

    // Zawsze aktualizuj updated_at
    updates.push(`updated_at = $${paramIndex++}`);
    values.push(new Date().toISOString()); // Formatujemy jako string zgodnie z definicją typu

    // Dodaj ID jako ostatni parametr
    values.push(id);

    // Jeśli nie ma nic do aktualizacji, rzuć błąd
    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    const query = `
      UPDATE user_profiles
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, cognito_sub, first_name, last_name, email, phone_number, supervisor_code, status, role, admin_comment, created_at, updated_at
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      throw new Error('User not found');
    }

    if (isDev) console.log('✅ [DB QUERY] Użytkownik zaktualizowany:', {
      id: result.rows[0].id,
      email: result.rows[0].email
    });

    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('❌ [DB ERROR] Error updating user profile:', error);
    console.error('❌ [DB ERROR] id:', id);
    console.error('❌ [DB ERROR] data:', data);
    throw error;
  }
}

// Eksportowanie wszystkich nazwanych funkcji
export { pool };

// Dodanie domyślnego eksportu dla pool, aby obsłużyć import domyślny
export default pool;