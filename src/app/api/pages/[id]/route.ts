// @ts-nocheck
// src/app/api/pages/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { nanoid } from 'nanoid'; // Importujemy nanoid do generowania tokenów

// Lista wszystkich dozwolonych kolumn do aktualizacji
// Pełna lista pól używanych w szablonie
const ALLOWED_FIELDS = [
  // Podstawowe pola
  'color',
  'status',
  'url', // Pole url
  'category', // Dodano pole category
  'x_amz_meta_title',
  's3_file_key',

  // Pola sekcji hero
  'pagecontent_hero_headline',
  'pagecontent_hero_subheadline',
  'pagecontent_hero_description',
  'pagecontent_hero_buttonText',

  // Pola sekcji korzyści
  'pagecontent_benefits_title',
  'pagecontent_benefits_items_0_title',
  'pagecontent_benefits_items_0_text',
  'pagecontent_benefits_items_1_title',
  'pagecontent_benefits_items_1_text',
  'pagecontent_benefits_items_2_title',
  'pagecontent_benefits_items_2_text',
  'pagecontent_benefits_items_3_title',
  'pagecontent_benefits_items_3_text',

  // Pola sekcji opinii
  'pagecontent_testimonials_title',
  'pagecontent_testimonials_items_0_text',
  'pagecontent_testimonials_items_0_author',
  'pagecontent_testimonials_items_0_role',
  'pagecontent_testimonials_items_1_text',
  'pagecontent_testimonials_items_1_author',
  'pagecontent_testimonials_items_1_role',
  'pagecontent_testimonials_items_2_text',
  'pagecontent_testimonials_items_2_author',
  'pagecontent_testimonials_items_2_role',

  // Pola sekcji zawartości
  'pagecontent_content_title',
  'pagecontent_content_chapters_0_number',
  'pagecontent_content_chapters_0_title',
  'pagecontent_content_chapters_0_description',
  'pagecontent_content_chapters_1_number',
  'pagecontent_content_chapters_1_title',
  'pagecontent_content_chapters_1_description',
  'pagecontent_content_chapters_2_number',
  'pagecontent_content_chapters_2_title',
  'pagecontent_content_chapters_2_description',

  // Pola sekcji formularza
  'pagecontent_form_title',
  'pagecontent_form_subtitle',
  'pagecontent_form_namePlaceholder',
  'pagecontent_form_emailPlaceholder',
  'pagecontent_form_phonePlaceholder',
  'pagecontent_form_buttonText',
  'pagecontent_form_privacyText',

  // Pola sekcji gwarancji
  'pagecontent_guarantees_items_0_text',
  'pagecontent_guarantees_items_1_text',
  'pagecontent_guarantees_items_2_text',

  // Pola sekcji FAQ
  'pagecontent_faq_title',
  'pagecontent_faq_items_0_question',
  'pagecontent_faq_items_0_answer',
  'pagecontent_faq_items_1_question',
  'pagecontent_faq_items_1_answer',
  'pagecontent_faq_items_2_question',
  'pagecontent_faq_items_2_answer'
];

// Pola ze specjalnymi walidacjami
const SPECIAL_VALIDATIONS = {
  'color': {
    values: ['harmonia', 'witalnosc', 'profesjonalizm', 'harmoniaNat', 'pewnosc']
  },
  'status': {
    values: ['draft', 'pending', 'active', 'rejected']
  }
};

// Funkcja pomocnicza do generowania slug z tytułu
function generateSlug(title) {
  if (!title) return '';

  return title
    .toLowerCase()
    .replace(/ą/g, 'a').replace(/ć/g, 'c').replace(/ę/g, 'e')
    .replace(/ł/g, 'l').replace(/ń/g, 'n').replace(/ó/g, 'o')
    .replace(/ś/g, 's').replace(/ż/g, 'z').replace(/ź/g, 'z')
    .replace(/\s+/g, '-') // zamień spacje na myślniki
    .replace(/[^\w\-]+/g, '') // usuń znaki specjalne
    .replace(/\-\-+/g, '-') // zamień wielokrotne myślniki na pojedyncze
    .replace(/^-+/, '') // usuń myślniki z początku
    .replace(/-+$/, ''); // usuń myślniki z końca
}

// Funkcja aktualizująca stronę w bazie danych - bez używania updated_at i updated_by
async function updatePage(id, data) {
  // Tworzymy dynamiczny zestaw pól do aktualizacji
  const updates = [];
  const values = [];
  let paramIndex = 1;

  // Dodajemy każde pole które ma być zaktualizowane
  Object.entries(data).forEach(([key, value]) => {
    updates.push(`${key} = $${paramIndex++}`);
    values.push(value);
  });

  // Dodaj ID jako ostatni parametr
  values.push(id);

  // Jeśli nie ma nic do aktualizacji, rzuć błąd
  if (updates.length === 0) {
    throw new Error('No fields to update');
  }

  const query = `
    UPDATE pages
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await pool.query(query, values);

  if (result.rows.length === 0) {
    throw new Error('Page not found');
  }

  return result.rows[0];
}

// Funkcja pobierająca stronę z bazy danych
async function getPageById(id) {
  const query = `
    SELECT *
    FROM pages
    WHERE id = $1
  `;

  const result = await pool.query(query, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// Handler dla PATCH
export async function PATCH(request, context) {
  try {
    // Pobierz ID strony z parametrów URL
    const pageId = (await context.params).id;

    // Pobierz ID użytkownika z nagłówków
    const userId = request.headers.get('X-User-Id');

    // Pobierz dane z body
    const requestData = await request.json();

    // Przygotowanie danych do aktualizacji
    const updateData = {};
    const errors = [];

    // Przetwarzanie każdego pola z request
    Object.entries(requestData).forEach(([key, value]) => {
      // Sprawdź czy pole jest dozwolone do aktualizacji
      if (!ALLOWED_FIELDS.includes(key)) {
        errors.push(`Pole '${key}' nie jest dozwolone do aktualizacji`);
        return;
      }

      // Sprawdź czy pole ma specjalne walidacje
      if (SPECIAL_VALIDATIONS[key]) {
        const validation = SPECIAL_VALIDATIONS[key];

        // Sprawdź listę dozwolonych wartości
        if (validation.values && !validation.values.includes(value)) {
          errors.push(`Nieprawidłowa wartość dla pola '${key}'. Dozwolone wartości: ${validation.values.join(', ')}`);
          return;
        }
      }

      // Dodaj pole do danych aktualizacji
      updateData[key] = value;
    });

    // Jeśli są błędy, zwróć je
    if (errors.length > 0) {
      return NextResponse.json(
        { errors },
        { status: 400 }
      );
    }

    // Pobierz aktualny stan strony, aby sprawdzić zmianę statusu i kategorię
    const currentPage = await getPageById(pageId);
    if (!currentPage) {
      return NextResponse.json(
        { error: 'Nie znaleziono strony o podanym ID' },
        { status: 404 }
      );
    }

    // Jeśli status zmienia się na 'active' (publikacja) lub aktualizujemy kategorię strony aktywnej
    const isPublishing = currentPage.status !== 'active' && updateData.status === 'active';
    const isCategoryChanging = currentPage.status === 'active' && updateData.category && currentPage.category !== updateData.category;

    if (isPublishing || isCategoryChanging) {
      // Pobierz kategorię - użyj nowej wartości z requestu lub obecnej z bazy
      const category = updateData.category || currentPage.category || 'p';

      // Pobierz lub wygeneruj token, jeśli nie ma już publicznego URL
      let token;
      const urlParts = currentPage.url ? currentPage.url.split('/') : [];

      if (urlParts.length >= 3) {
        // Użyj istniejącego tokenu
        token = urlParts[urlParts.length - 2]; // Pobierz przedostatni segment URL
      } else {
        // Lub wygeneruj nowy, jeśli nie ma URL lub token nie może być wyodrębniony
        token = nanoid(10);
      }

      // Pobierz tytuł strony do wygenerowania slug
      const title = currentPage.x_amz_meta_title || currentPage.pagecontent_hero_headline || 'strona';
      const slug = generateSlug(title);

      // Utwórz nowy URL z kategorią
      const relativePath = `/${category}/${token}/${slug}`;

      // Pobierz aktualną domenę z żądania
      const host = request.headers.get('host') || '';
      const protocol = request.headers.get('x-forwarded-proto') || 'http';

      // Utwórz pełny URL z aktualną domeną
      const fullUrl = `${protocol}://${host}${relativePath}`;

      // Dodaj nowy URL do danych aktualizacji
      updateData.url = fullUrl;
      console.log(`Generowanie nowego URL: ${fullUrl}`);
    }

    // Jeśli nie ma żadnych danych do aktualizacji
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: 'Brak danych do aktualizacji' },
        { status: 400 }
      );
    }

    // Wykonaj aktualizację w bazie danych
    const updatedPage = await updatePage(pageId, updateData);

    // Zwróć odpowiedź z sukcesem i zaktualizowanymi danymi strony
    return NextResponse.json(updatedPage, { status: 200 });

  } catch (error) {
    console.error('Błąd podczas aktualizacji strony:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas aktualizacji strony' },
      { status: 500 }
    );
  }
}

// Handler dla GET
export async function GET(request, context) {
  try {
    // Pobierz ID strony z parametrów URL
    const pageId = (await context.params).id;

    // Pobierz stronę z bazy danych
    const page = await getPageById(pageId);

    if (!page) {
      return NextResponse.json(
        { error: 'Nie znaleziono strony o podanym ID' },
        { status: 404 }
      );
    }

    // Zwróć dane strony
    return NextResponse.json(page, { status: 200 });

  } catch (error) {
    console.error('Błąd podczas pobierania strony:', error);
    return NextResponse.json(
      { error: 'Wystąpił błąd podczas pobierania strony' },
      { status: 500 }
    );
  }
}