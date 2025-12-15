// src/lib/db.ts
import { Pool } from 'pg';
import { UserProfile } from '@/types'; // Aktualizacja importu typów

// Inicjalizacja puli połączeń z konfiguracją SSL dla AWS RDS
const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST || 'hps-db.chou2cmcq1la.eu-central-1.rds.amazonaws.com',
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  // Dodanie wymaganej konfiguracji SSL
  ssl: {
    // rejectUnauthorized: false pozwala na połączenie bez weryfikacji certyfikatu
    rejectUnauthorized: false
  }
});

// Obsługa błędów na poziomie puli
pool.on('error', (err) => {
  console.error('Nieoczekiwany błąd na kliencie pg:', err);
});

// Verify caretaker code
export const verifyCaretakerCode = async (code: string): Promise<{valid: boolean, description?: string}> => {
  try {
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
      return {
        valid: true,
        description: description || 'Brak opisu'
      };
    }

    // Nie znaleziono kodu
    return {
      valid: false
    };
  } catch (error) {
    console.error('Error verifying caretaker code:', error);
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
    const query = `
      SELECT id, cognito_sub, first_name, last_name, email, phone_number, supervisor_code, status, role, admin_comment, created_at, updated_at
      FROM user_profiles
      WHERE cognito_sub = $1
    `;

    const result = await pool.query(query, [cognitoSub]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('Error fetching user by Cognito sub:', error);
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
    const query = `
      SELECT id, cognito_sub, first_name, last_name, email, phone_number, supervisor_code, status, role, admin_comment, created_at, updated_at
      FROM user_profiles
      WHERE email = $1
    `;

    const result = await pool.query(query, [email]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('Error fetching user by email:', error);
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
    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('Error creating user profile:', error);
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

    return result.rows[0] as UserProfile;
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

// Eksportowanie wszystkich nazwanych funkcji
export { pool };

// Dodanie domyślnego eksportu dla pool, aby obsłużyć import domyślny
export default pool;