// src/lib/api-test.ts
// Narzędzie do testowania i debugowania API

/**
 * Funkcja pomocnicza do testowania API
 * Sprawdza dostępność API i diagnozuje potencjalne problemy
 */
export async function testApiEndpoint(url: string): Promise<{
  success: boolean;
  status?: number;
  message: string;
  details?: any;
  response?: any;
}> {
  console.log(`Testing API endpoint: ${url}`);

  try {
    // Sprawdzanie, czy serwer w ogóle odpowiada
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Debug': 'true'
      }
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));

    // Próba pobrania odpowiedzi jako tekst
    let responseText = '';
    try {
      responseText = await response.text();
    } catch (textError) {
      return {
        success: false,
        status: response.status,
        message: 'Nie można odczytać treści odpowiedzi',
        details: textError
      };
    }

    // Próba parsowania JSON (jeśli to możliwe)
    let responseData = null;
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed response data:', responseData);
    } catch (jsonError) {
      console.log('Response is not valid JSON:', responseText);

      // Jeśli to HTML, próbujemy wyciągnąć informacje o błędzie
      if (responseText.includes('<html') || responseText.includes('<!DOCTYPE')) {
        const errorMatch = responseText.match(/<pre>([\s\S]*?)<\/pre>/);
        const titleMatch = responseText.match(/<title>([\s\S]*?)<\/title>/);

        return {
          success: false,
          status: response.status,
          message: titleMatch ? titleMatch[1] : `Błąd serwera ${response.status}`,
          details: errorMatch ? errorMatch[1] : 'Otrzymano stronę HTML zamiast oczekiwanego JSON',
          response: responseText.substring(0, 500) + '...' // Tylko fragment, żeby nie zaśmiecać konsoli
        };
      }

      return {
        success: false,
        status: response.status,
        message: 'Odpowiedź nie jest prawidłowym JSON',
        details: jsonError,
        response: responseText
      };
    }

    // Sprawdzenie, czy odpowiedź ma pola, których oczekujemy
    if (response.ok) {
      if (url.includes('/api/leads') && (!responseData.leads || !Array.isArray(responseData.leads))) {
        return {
          success: false,
          status: response.status,
          message: 'Odpowiedź API ma nieprawidłowy format (brak tablicy "leads")',
          response: responseData
        };
      }

      return {
        success: true,
        status: response.status,
        message: 'API działa poprawnie',
        response: responseData
      };
    } else {
      return {
        success: false,
        status: response.status,
        message: `Błąd API: ${response.status} ${response.statusText}`,
        response: responseData
      };
    }
  } catch (error) {
    console.error('Error testing API:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Nie można połączyć się z API: ${errorMessage}`,
      details: error
    };
  }
}

/**
 * Funkcja sprawdzająca stan bazy danych
 * Próbuje wykonać proste zapytanie do tabeli leads
 */
export async function checkDatabaseConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const response = await fetch('/api/debug/db-check', {
      method: 'GET',
      headers: { 'Cache-Control': 'no-cache' }
    });

    if (!response.ok) {
      return {
        success: false,
        message: `Błąd sprawdzania bazy danych: ${response.status} ${response.statusText}`
      };
    }

    const data = await response.json();
    return {
      success: data.success,
      message: data.message,
      details: data.details
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Nie można sprawdzić połączenia z bazą danych: ${errorMessage}`,
      details: error
    };
  }
}