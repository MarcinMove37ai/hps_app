// src/app/api/partners/[id]/route.ts
/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { pool, updateUserProfile } from '@/lib/db';
import { UserRole, UserProfile, PartnerViewData } from '../../types';

/**
 * Handler dla żądania GET - pobiera dane pojedynczego partnera
 */
export async function GET(
  request: NextRequest,
  { params }: any
) {
  try {
    console.log("======= PARTNER DETAIL API REQUEST =======");

    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role') as UserRole;
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);
    console.log("Partner ID Requested:", params.id);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    // Sprawdź uprawnienia użytkownika - tylko ADMIN i GOD powinni mieć dostęp
    if (userRole !== 'ADMIN' && userRole !== 'GOD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Pobierz informacje o zalogowanym użytkowniku
    const userQuery = `
      SELECT first_name, last_name
      FROM user_profiles
      WHERE id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const firstName = userResult.rows[0].first_name;
    const lastName = userResult.rows[0].last_name;
    const fullName = `${firstName} ${lastName}`.trim();

    console.log("User Full Name:", fullName);

    // Dla ADMIN znajdź kod opiekuna na podstawie imienia i nazwiska w tabeli supervisor_codes
    let adminSupervisorCode = null;
    if (userRole === 'ADMIN') {
      const supervisorCodeQuery = `
        SELECT code
        FROM supervisor_codes
        WHERE description = $1
      `;
      const supervisorCodeResult = await pool.query(supervisorCodeQuery, [fullName]);
      adminSupervisorCode = supervisorCodeResult.rows[0]?.code || null;
      console.log("Admin Supervisor Code found:", adminSupervisorCode);
    }

    // Przygotuj zapytanie bazowe
    let query = `
      SELECT
        up.id,
        up.cognito_sub,
        up.first_name,
        up.last_name,
        up.email,
        up.phone_number,
        up.supervisor_code,
        up.status,
        up.role,
        up.admin_comment,
        up.created_at,
        up.updated_at,
        sc.description as supervisor_description
      FROM user_profiles up
      LEFT JOIN supervisor_codes sc ON up.supervisor_code = sc.code
      WHERE up.id = $1
    `;

    const queryParams = [params.id];
    const paramCounter = 2;

    // Dla ADMIN dodajemy warunek, że partner musi być pod jego opieką i mieć rolę USER
    if (userRole === 'ADMIN') {
      if (adminSupervisorCode) {
        query += ` AND up.supervisor_code = $${paramCounter} AND up.role = 'USER'`;
        queryParams.push(adminSupervisorCode);
      } else {
        // Jeśli admin nie ma przypisanego kodu opiekuna, zwracamy 404
        return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
      }
    } else {
      // Dla GOD sprawdzamy tylko, że nie jest to użytkownik GOD
      query += ` AND up.role != 'GOD'`;
    }

    console.log("Final Query:", query);
    console.log("Query Params:", queryParams);

    const result = await pool.query(query, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const partner = result.rows[0];
    console.log("Partner found:", partner.id, partner.first_name, partner.last_name);

    // Formatuj nazwę partnera dla wyświetlenia
    const partnerName = `${partner.first_name || ''} ${partner.last_name || ''}`.trim() || partner.email;

    // Przygotuj informację o opiekunie
    const contact = partner.supervisor_description || 'Brak przypisanego opiekuna';

    const formattedPartner: PartnerViewData = {
      id: partner.id,
      cognito_sub: partner.cognito_sub,
      name: partnerName,
      first_name: partner.first_name,
      last_name: partner.last_name,
      contact: contact,
      email: partner.email,
      phone: partner.phone_number,
      status: partner.status,
      role: partner.role,
      admin_comment: partner.admin_comment || '',
      supervisor_code: partner.supervisor_code,
      created_at: partner.created_at,
      updated_at: partner.updated_at
    };

    console.log("======= END OF PARTNER DETAIL API REQUEST =======");
    return NextResponse.json(formattedPartner);
  } catch (error: unknown) {
    console.error(`Error in GET /api/partners/${params.id}:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

/**
 * Handler dla żądania PATCH - aktualizuje dane partnera (status lub komentarz)
 */
export async function PATCH(
  request: NextRequest,
  { params }: any
) {
  try {
    console.log("======= PARTNER UPDATE API REQUEST =======");

    // Pobierz dane użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role') as UserRole;
    const cognitoSub = request.headers.get('X-User-Cognito-Sub');

    console.log("User ID:", userId);
    console.log("User Role:", userRole);
    console.log("Partner ID to Update:", params.id);

    if (!userId || !userRole || !cognitoSub) {
      return NextResponse.json({ error: 'Missing user information in headers' }, { status: 401 });
    }

    // Sprawdź uprawnienia użytkownika - tylko ADMIN i GOD powinni mieć dostęp
    if (userRole !== 'ADMIN' && userRole !== 'GOD') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Pobierz informacje o zalogowanym użytkowniku
    const userQuery = `
      SELECT first_name, last_name
      FROM user_profiles
      WHERE id = $1
    `;
    const userResult = await pool.query(userQuery, [userId]);
    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const firstName = userResult.rows[0].first_name;
    const lastName = userResult.rows[0].last_name;
    const fullName = `${firstName} ${lastName}`.trim();

    console.log("User Full Name:", fullName);

    // Dla ADMIN znajdź kod opiekuna na podstawie imienia i nazwiska w tabeli supervisor_codes
    let adminSupervisorCode = null;
    if (userRole === 'ADMIN') {
      const supervisorCodeQuery = `
        SELECT code
        FROM supervisor_codes
        WHERE description = $1
      `;
      const supervisorCodeResult = await pool.query(supervisorCodeQuery, [fullName]);
      adminSupervisorCode = supervisorCodeResult.rows[0]?.code || null;
      console.log("Admin Supervisor Code found:", adminSupervisorCode);
    }

    // Pobierz dane do aktualizacji z body
    const requestData = await request.json();
    console.log("Update Data:", requestData);

    // Sprawdź czy partner istnieje i czy użytkownik ma do niego dostęp
    let checkQuery = `
      SELECT id, supervisor_code, role FROM user_profiles WHERE id = $1
    `;

    // Dla ADMIN sprawdzamy czy ma dostęp do tego partnera
    if (userRole === 'ADMIN' && adminSupervisorCode) {
      checkQuery += ` AND supervisor_code = $2 AND role = 'USER'`;
    } else if (userRole === 'ADMIN') {
      // Jeśli ADMIN nie ma kodu opiekuna, nie ma dostępu do żadnego partnera
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    } else {
      // Dla GOD sprawdzamy tylko, że nie jest to użytkownik GOD
      checkQuery += ` AND role != 'GOD'`;
    }

    const checkParams = userRole === 'ADMIN' && adminSupervisorCode ? [params.id, adminSupervisorCode] : [params.id];
    console.log("Check Query:", checkQuery);
    console.log("Check Params:", checkParams);

    const checkResult = await pool.query(checkQuery, checkParams);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'Partner not found or you do not have permission to modify' }, { status: 404 });
    }

    // Przygotuj dane do aktualizacji
    const updateData: Partial<UserProfile> = {};

    // Aktualizacja statusu
    if (requestData.status && ['active', 'pending', 'blocked'].includes(requestData.status)) {
      updateData.status = requestData.status;
    }

    // Aktualizacja komentarza administratora
    if (requestData.admin_comment !== undefined) {
      updateData.admin_comment = requestData.admin_comment;
    }

    // Sprawdź czy są jakieś pola do aktualizacji
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    console.log("Final Update Data:", updateData);

    // Rozpocznij transakcję dla operacji aktualizacji użytkownika i kodu opiekuna
    const client = await pool.connect();
    let updatedPartner;

    try {
      await client.query('BEGIN');

      // Aktualizuj profil partnera
      updatedPartner = await updateUserProfile(params.id, updateData);
      console.log("Partner updated successfully:", updatedPartner.id);

      // Sprawdź czy mamy zaktualizować również kod opiekuna
      if (requestData.updateSupervisorCode && requestData.supervisorCode) {
        console.log("Updating supervisor code:", requestData.supervisorCode);
        console.log("Setting is_active to:", requestData.supervisorCodeStatus);

        // POPRAWIONE ZAPYTANIE - usunięta kolumna updated_at, której nie ma w tabeli
        const updateSupervisorQuery = `
          UPDATE supervisor_codes
          SET is_active = $1
          WHERE code = $2
          RETURNING *
        `;

        const updateSupervisorResult = await client.query(
          updateSupervisorQuery,
          [requestData.supervisorCodeStatus, requestData.supervisorCode]
        );

        if (updateSupervisorResult.rows.length === 0) {
          console.error("Supervisor code not found:", requestData.supervisorCode);
          // Nie przerywamy transakcji, tylko logujemy błąd
        } else {
          console.log("Supervisor code updated successfully:", updateSupervisorResult.rows[0].code);
        }
      }

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    // Pobierz informacje o opiekunie, jeśli istnieje
    let contact = 'Brak przypisanego opiekuna';
    if (updatedPartner.supervisor_code) {
      const supervisorQuery = `
        SELECT description FROM supervisor_codes WHERE code = $1
      `;
      const supervisorResult = await pool.query(supervisorQuery, [updatedPartner.supervisor_code]);
      if (supervisorResult.rows.length > 0) {
        contact = supervisorResult.rows[0].description;
      }
    }

    // Formatuj nazwę partnera dla wyświetlenia
    const partnerName = `${updatedPartner.first_name || ''} ${updatedPartner.last_name || ''}`.trim() || updatedPartner.email;

    // Przygotuj odpowiedź
    const formattedPartner: PartnerViewData = {
      id: updatedPartner.id,
      cognito_sub: updatedPartner.cognito_sub,
      name: partnerName,
      first_name: updatedPartner.first_name,
      last_name: updatedPartner.last_name,
      contact: contact,
      email: updatedPartner.email,
      phone: updatedPartner.phone_number,
      status: updatedPartner.status,
      role: updatedPartner.role,
      admin_comment: updatedPartner.admin_comment || '',
      supervisor_code: updatedPartner.supervisor_code,
      created_at: updatedPartner.created_at,
      updated_at: updatedPartner.updated_at
    };

    console.log("======= END OF PARTNER UPDATE API REQUEST =======");
    return NextResponse.json(formattedPartner);
  } catch (error: unknown) {
    console.error(`Error in PATCH /api/partners/${params.id}:`, error);
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}