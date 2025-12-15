// src/app/api/delete-page/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, ListObjectsV2CommandInput } from '@aws-sdk/client-s3';
import { Pool, PoolClient } from 'pg';

// === Konfiguracja PostgreSQL ===
// Inicjalizuj pulę połączeń tylko raz, poza funkcją handler
const pgPool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  // Używamy parseInt z bazą 10 i fallbackiem na 5432
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  // Ustawienia SSL mogą być potrzebne dla połączeń zdalnych (np. AWS RDS)
  // W prostym przypadku można zacząć od false, ale dla produkcji rozważ:
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
   ssl: process.env.POSTGRES_HOST !== 'localhost' && process.env.POSTGRES_HOST !== '127.0.0.1'
        ? { rejectUnauthorized: false } // Dostosuj rejectUnauthorized zgodnie z potrzebami
        : false,
});

// === Konfiguracja S3 ===
// Inicjalizuj klienta S3 tylko raz, poza funkcją handler
const s3Client = new S3Client({
  region: process.env.AWS_REGION, // Użyj zmiennej AWS_REGION
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

// Pobierz nazwę bucketu S3 ze zmiennych środowiskowych
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME; // Powinno być ustawione na 'ebooks-in'

// === Główna funkcja obsługi żądania POST ===
export async function POST(request: NextRequest) {
  // Sprawdzenie, czy nazwa bucketu S3 jest skonfigurowana na starcie
  if (!S3_BUCKET_NAME) {
      console.error('[DELETE-PAGE API] Krytyczny błąd konfiguracji: Brak S3_BUCKET_NAME w zmiennych środowiskowych.');
      return NextResponse.json({ error: 'Błąd konfiguracji serwera: Brak nazwy bucketu S3.' }, { status: 500 });
  }

  let dbClient; // Klient PG poza try...catch, aby można było go zwolnić w finally

  try {
    console.log('[DELETE-PAGE API] Otrzymano żądanie usunięcia strony.');

    // 1. Pobierz i sparsuj body żądania
    let body;
    try {
      // Używamy request.json() do automatycznego parsowania
      body = await request.json();
      console.log('[DELETE-PAGE API] Sparsowane dane żądania:', body);
    } catch (e) {
      console.error('[DELETE-PAGE API] Błąd parsowania JSON:', e);
      return NextResponse.json({ error: 'Nieprawidłowy format JSON w ciele żądania' }, { status: 400 });
    }

    // 2. Pobierz i zwaliduj parametry (metaTitle jest kluczowy)
    const { pageId, metaTitle } = body; // pageId dla kontekstu, metaTitle dla logiki
    console.log(`[DELETE-PAGE API] Otrzymano PageID: ${pageId}, MetaTitle: ${metaTitle}`);

    if (!metaTitle || typeof metaTitle !== 'string' || metaTitle.trim() === '') {
        console.error('[DELETE-PAGE API] Błąd walidacji: Brak lub nieprawidłowy parametr metaTitle.');
      return NextResponse.json(
        { error: 'Brak wymaganego parametru: metaTitle (tytuł roboczy)' },
        { status: 400 }
      );
    }
    // Sprawdzenie pageId nie jest krytyczne dla logiki, ale warto logować jeśli brakuje
    if (!pageId) {
      console.warn('[DELETE-PAGE API] Ostrzeżenie: Brak parametru pageId w żądaniu, kontynuacja z metaTitle.');
    }

    // 3. Walidacja użytkownika (tak jak poprzednio)
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      console.warn('[DELETE-PAGE API] Nieautoryzowane żądanie usunięcia - brak x-user-id');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log(`[DELETE-PAGE API] Żądanie usunięcia od użytkownika: ${userId}. Cel (metaTitle): ${metaTitle}`);

    // === Transakcja (opcjonalnie, ale zalecane dla spójności) ===
    // Jeśli chcesz zapewnić, że albo obie operacje (DB i S3) się powiodą,
    // albo żadna, możesz użyć transakcji bazodanowej.
    // Jednak usunięcie S3 nie jest transakcyjne z bazą danych.
    // Dlatego przyjmujemy strategię: najpierw usuń z DB, potem z S3.
    // Błąd w DB zatrzymuje wszystko. Błąd w S3 jest zgłaszany,
    // ale DB już usunięto (wymaga ewentualnego ręcznego czyszczenia S3 lub logiki kompensacyjnej).

    // 4. Usuń rekord z bazy danych PostgreSQL
    let dbDeletionSuccess = false;
    try {
      dbClient = await pgPool.connect(); // Pobierz połączenie z puli
      console.log('[DELETE-PAGE API] Połączono z bazą danych.');
      await deleteDatabaseRecord(dbClient, metaTitle); // Przekaż metaTitle
      dbDeletionSuccess = true;
      console.log(`[DELETE-PAGE API] Rekord bazy danych dla metaTitle "${metaTitle}" został pomyślnie usunięty lub nie istniał.`);
    } catch (dbError) {
      console.error(`[DELETE-PAGE API] Krytyczny błąd podczas usuwania rekordu z bazy danych dla metaTitle "${metaTitle}":`, dbError);
      return NextResponse.json(
        {
          error: 'Wystąpił błąd podczas usuwania danych strony z bazy.',
          details: dbError instanceof Error ? dbError.message : 'Nieznany błąd bazy danych'
        },
        { status: 500 }
      );
    } finally {
        if (dbClient) {
            dbClient.release(); // Zawsze zwalniaj połączenie!
            console.log('[DELETE-PAGE API] Połączenie z bazą danych zwolnione.');
        }
    }

    // 5. Usuń pliki z S3
    let s3DeletedFiles: string[] = [];
    try {
      s3DeletedFiles = await deleteS3Files(metaTitle); // Przekaż metaTitle
      console.log(`[DELETE-PAGE API] Pliki S3 dla metaTitle "${metaTitle}" zostały pomyślnie usunięte: ${s3DeletedFiles.length} plików.`);
    } catch (s3Error) {
      console.error(`[DELETE-PAGE API] Krytyczny błąd podczas usuwania plików z S3 dla metaTitle "${metaTitle}":`, s3Error);
      // Mimo że baza danych została usunięta, zwracamy błąd, bo S3 się nie powiodło
      return NextResponse.json(
        {
          error: 'Wystąpił błąd podczas usuwania plików strony z S3. Rekord bazy danych mógł zostać usunięty (wymaga weryfikacji).',
          details: s3Error instanceof Error ? s3Error.message : 'Nieznany błąd S3'
        },
        { status: 500 }
      );
    }

    // 6. Zwróć sukces
    console.log(`[DELETE-PAGE API] Strona z metaTitle "${metaTitle}" została pomyślnie usunięta (DB: ${dbDeletionSuccess}, S3: ${s3DeletedFiles.length} plików).`);
    return NextResponse.json({
      success: true,
      message: 'Strona i powiązane pliki zostały pomyślnie usunięte.',
      deletedFilesS3: s3DeletedFiles,
      deletedMetaTitle: metaTitle,
      contextPageId: pageId // Zwracamy dla informacji kontekstowej
    });

  } catch (error) {
    console.error('[DELETE-PAGE API] Nieoczekiwany błąd podczas przetwarzania żądania usunięcia:', error);
    return NextResponse.json(
      {
        error: 'Wystąpił nieoczekiwany błąd serwera podczas przetwarzania żądania',
        details: error instanceof Error ? error.message : 'Nieznany błąd'
      },
      { status: 500 }
    );
  }
}

// === Funkcja usuwająca rekord z PostgreSQL ===
/**
 * Usuwa rekord(y) z tabeli 'pages' na podstawie wartości kolumny 'x_amz_meta_title'.
 * @param client Połączony klient pg.PoolClient.
 * @param metaTitle Tytuł roboczy używany do identyfikacji rekordu.
 * @throws Błąd, jeśli zapytanie SQL zawiedzie.
 */
async function deleteDatabaseRecord(client: PoolClient, metaTitle: string): Promise<void> {
    // === DOSTOSUJ NAZWY ===
    const tableName = 'pages'; // Zmień, jeśli nazwa tabeli jest inna
    const columnName = 'x_amz_meta_title'; // Zmień, jeśli nazwa kolumny jest inna
    // =====================

    if (!client) {
        throw new Error("Klient bazy danych nie został poprawnie przekazany do deleteDatabaseRecord.");
    }
    if (!metaTitle || typeof metaTitle !== 'string' || metaTitle.trim() === '') {
        throw new Error("Nieprawidłowy metaTitle przekazany do deleteDatabaseRecord.");
    }

    console.log(`[DB Delete] Próba usunięcia rekordu z tabeli "${tableName}" gdzie "${columnName}" = $1`);
    const query = `DELETE FROM ${tableName} WHERE "${columnName}" = $1`; // Użyj cudzysłowów dla nazw tabel/kolumn, jeśli to konieczne

    try {
        const result = await client.query(query, [metaTitle]);
        console.log(`[DB Delete] Wynik zapytania DELETE dla metaTitle "${metaTitle}": rowCount=${result.rowCount}`);

        if (result.rowCount === 0) {
            // To może być normalne (np. ponowna próba usunięcia) lub błąd (jeśli spodziewaliśmy się rekordu)
            console.warn(`[DB Delete] Nie znaleziono rekordu w bazie danych dla metaTitle "${metaTitle}" do usunięcia.`);
            // Nie rzucamy błędu, pozwalamy kontynuować (np. jeśli strona została już usunięta)
        } else {
            console.log(`[DB Delete] Pomyślnie usunięto ${result.rowCount} rekord(ów) z bazy danych dla metaTitle: ${metaTitle}`);
        }
    } catch (error) {
        console.error(`[DB Delete] Błąd wykonania zapytania DELETE dla metaTitle "${metaTitle}":`, error);
        // Rzuć błąd dalej, aby główna funkcja mogła go obsłużyć
        throw new Error(`Błąd podczas usuwania rekordu z bazy danych: ${error instanceof Error ? error.message : String(error)}`);
    }
}

// === Funkcja usuwająca pliki z S3 ===
/**
 * Usuwa powiązane pliki (PDF, TXT, JSON, VIDEO) i folder mockup z S3 na podstawie tytułu roboczego.
 * Funkcja została zaktualizowana, aby obsługiwać pliki z timestamp'ami i formatem z myślnikami.
 * @param metaTitle Tytuł roboczy używany jako bazowy prefiks do wyszukiwania plików.
 * @returns Lista kluczy S3 pomyślnie usuniętych obiektów.
 * @throws Błąd, jeśli operacja listowania lub usuwania S3 napotka krytyczny problem.
 */
async function deleteS3Files(metaTitle: string): Promise<string[]> {
  const deletedFiles: string[] = [];

  if (!metaTitle || typeof metaTitle !== 'string' || metaTitle.trim() === '') {
    console.error('[S3 Delete] Nie podano prawidłowego metaTitle dla funkcji deleteS3Files');
    throw new Error('Nie podano metaTitle do usunięcia plików S3');
  }

  // Ponownie upewniamy się, że S3_BUCKET_NAME jest dostępny
  if (!S3_BUCKET_NAME) {
    console.error('[S3 Delete] Krytyczny błąd konfiguracji: Brak S3_BUCKET_NAME.');
    throw new Error('Błąd konfiguracji serwera: Brak nazwy bucketu S3.');
  }

  console.log(`[S3 Delete] Rozpoczynam usuwanie plików S3 dla tytułu roboczego: ${metaTitle}`);

  // === Przygotowanie wzorca dopasowującego do wyszukiwania plików ===
  // Zamień spacje na myślniki w metaTitle, aby lepiej dopasować format plików S3
  let baseKeyPattern = metaTitle.replace(/\s+/g, '-');

  // Usuń wszystkie znane rozszerzenia plików
  const fileExtensions = ['.pdf', '.mp4', '.txt', '.json', '.mov', '.avi', '.mp3', '.wav'];
  for (const ext of fileExtensions) {
    if (baseKeyPattern.toLowerCase().endsWith(ext)) {
      baseKeyPattern = baseKeyPattern.substring(0, baseKeyPattern.length - ext.length);
      console.log(`[S3 Delete] Usunięto rozszerzenie ${ext} z wzorca wyszukiwania.`);
      break;
    }
  }

  console.log(`[S3 Delete] Przygotowano wzorzec wyszukiwania plików: ${baseKeyPattern}`);

  const keysToDelete: { Key: string }[] = [];

  // 1. Listowanie plików w głównym katalogu (pliki PDF)
  try {
    console.log(`[S3 Delete] Listowanie plików PDF w katalogu głównym...`);
    const pdfFiles = await listS3Objects('', baseKeyPattern);
    console.log(`[S3 Delete] Znaleziono ${pdfFiles.length} plików PDF dopasowanych do wzorca`);
    keysToDelete.push(...pdfFiles.map(key => ({ Key: key })));
  } catch (error) {
    console.warn(`[S3 Delete] Ostrzeżenie podczas listowania plików PDF: ${error}`);
  }

  // 2. Listowanie plików TXT
  try {
    console.log(`[S3 Delete] Listowanie plików TXT w katalogu txt/...`);
    const txtFiles = await listS3Objects('txt/', baseKeyPattern);
    console.log(`[S3 Delete] Znaleziono ${txtFiles.length} plików TXT dopasowanych do wzorca`);
    keysToDelete.push(...txtFiles.map(key => ({ Key: key })));
  } catch (error) {
    console.warn(`[S3 Delete] Ostrzeżenie podczas listowania plików TXT: ${error}`);
  }

  // 3. Listowanie plików JSON
  try {
    console.log(`[S3 Delete] Listowanie plików JSON w katalogu json/...`);
    const jsonFiles = await listS3Objects('json/', baseKeyPattern);
    console.log(`[S3 Delete] Znaleziono ${jsonFiles.length} plików JSON dopasowanych do wzorca`);
    keysToDelete.push(...jsonFiles.map(key => ({ Key: key })));
  } catch (error) {
    console.warn(`[S3 Delete] Ostrzeżenie podczas listowania plików JSON: ${error}`);
  }

  // 4. Listowanie plików VIDEO - nowa funkcjonalność
  try {
    console.log(`[S3 Delete] Listowanie plików wideo w katalogu videos/...`);
    const videoFiles = await listS3Objects('videos/', baseKeyPattern);
    console.log(`[S3 Delete] Znaleziono ${videoFiles.length} plików wideo dopasowanych do wzorca`);
    keysToDelete.push(...videoFiles.map(key => ({ Key: key })));
  } catch (error) {
    console.warn(`[S3 Delete] Ostrzeżenie podczas listowania plików wideo: ${error}`);
  }

  // 5. Pliki w folderze mockup (podobnie jak w oryginalnym kodzie)
  try {
    // Dla folderu mockup potrzebujemy najpierw znaleźć dopasowany folder, a potem jego zawartość
    console.log(`[S3 Delete] Listowanie folderów mockup dopasowanych do wzorca ${baseKeyPattern}...`);
    const mockupFolders = await listS3ObjectsWithPrefix('mockup/', baseKeyPattern);

    // Dla każdego znalezionego folderu mockup, listujemy jego zawartość
    for (const folder of mockupFolders) {
      // Folder powinien kończyć się znakiem /
      if (!folder.endsWith('/')) continue;

      console.log(`[S3 Delete] Listowanie zawartości folderu mockup: ${folder}`);
      const mockupContents = await listS3Objects(folder, '');
      console.log(`[S3 Delete] Znaleziono ${mockupContents.length} obiektów w folderze ${folder}`);
      keysToDelete.push(...mockupContents.map(key => ({ Key: key })));

      // Dodaj sam folder do usunięcia
      keysToDelete.push({ Key: folder });
    }
  } catch (error) {
    console.warn(`[S3 Delete] Ostrzeżenie podczas listowania folderów mockup: ${error}`);
  }

  // === Usuwanie obiektów z S3 ===
  if (keysToDelete.length > 0) {
    console.log(`[S3 Delete] Przygotowano do usunięcia ${keysToDelete.length} obiektów S3.`);

    // Dzielimy na paczki po 1000 (limit DeleteObjectsCommand)
    const batchSize = 1000;
    for (let i = 0; i < keysToDelete.length; i += batchSize) {
      const batchKeys = keysToDelete.slice(i, i + batchSize);
      const deleteParams = {
        Bucket: S3_BUCKET_NAME,
        Delete: {
          Objects: batchKeys,
          Quiet: false // Chcemy informacji o sukcesie/błędzie dla każdego klucza
        }
      };

      try {
        console.log(`[S3 Delete] Usuwanie paczki ${Math.floor(i / batchSize) + 1} obiektów S3 (rozmiar: ${batchKeys.length})...`);
        const deleteCommand = new DeleteObjectsCommand(deleteParams);
        const deleteResult = await s3Client.send(deleteCommand);

        if (deleteResult.Deleted && deleteResult.Deleted.length > 0) {
          const successfullyDeleted = deleteResult.Deleted.map(d => d.Key).filter((k): k is string => k !== undefined);
          deletedFiles.push(...successfullyDeleted);
          console.log(`[S3 Delete] Pomyślnie usunięto ${successfullyDeleted.length} obiektów w tej paczce.`);
        } else {
          console.log(`[S3 Delete] W tej paczce nie usunięto żadnych obiektów (być może już nie istniały).`);
        }

        if (deleteResult.Errors && deleteResult.Errors.length > 0) {
          console.error(`[S3 Delete] Wystąpiły błędy podczas usuwania ${deleteResult.Errors.length} obiektów S3 w tej paczce:`);
          deleteResult.Errors.forEach(err => {
            console.error(`  - Klucz: ${err.Key}, Kod: ${err.Code}, Wiadomość: ${err.Message}`);
          });
          // Rzucamy błąd, jeśli wystąpiły jakiekolwiek problemy w trybie niecichym
          throw new Error(`Nie udało się usunąć ${deleteResult.Errors.length} obiektów z S3.`);
        }
      } catch (batchError) {
        console.error(`[S3 Delete] Krytyczny błąd podczas usuwania paczki obiektów S3:`, batchError);
        // Rzucamy błąd dalej, aby zatrzymać proces i zwrócić błąd API
        throw batchError; // Przekaż oryginalny błąd
      }
    }
  } else {
    console.log('[S3 Delete] Nie znaleziono żadnych kluczy S3 do usunięcia.');
  }

  console.log(`[S3 Delete] Zakończono proces usuwania plików S3. Usunięto łącznie: ${deletedFiles.length} plików.`);
  return deletedFiles; // Zwraca listę kluczy faktycznie usuniętych obiektów
}

/**
 * Listuje obiekty S3 w podanym prefiksie (folderze), które zawierają określony wzorzec.
 * @param prefix Prefiks (folder) do przeszukania
 * @param pattern Wzorzec do dopasowania w nazwach plików
 * @returns Tablica kluczy S3 dopasowanych do wzorca
 */
async function listS3Objects(prefix: string, pattern: string): Promise<string[]> {
  const matchingKeys: string[] = [];

  try {
    let continuationToken: string | undefined = undefined;

    do {
      const listCommandInput: ListObjectsV2CommandInput = {
        Bucket: S3_BUCKET_NAME,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      };

      const listCommand = new ListObjectsV2Command(listCommandInput);
      const listResponse = await s3Client.send(listCommand);

      if (listResponse.Contents && listResponse.Contents.length > 0) {
        // Filtrujemy wyniki, aby znaleźć pliki zawierające pattern (tylko jeśli pattern jest niepusty)
        if (pattern) {
          const matches = listResponse.Contents
            .filter(item => {
              // Ignorujemy wielkość liter przy porównywaniu
              return item.Key &&
                     item.Key.toLowerCase().includes(pattern.toLowerCase());
            })
            .map(item => item.Key as string);
          matchingKeys.push(...matches);
        } else {
          // Jeśli pattern jest pusty, zwracamy wszystkie pliki w prefiksie
          matchingKeys.push(...listResponse.Contents
            .filter(item => item.Key !== undefined)
            .map(item => item.Key as string));
        }
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    return matchingKeys;

  } catch (error) {
    console.error(`[S3 List] Błąd podczas listowania obiektów w prefiksie ${prefix}:`, error);
    throw error;
  }
}

/**
 * Listuje katalogi (prefiksy) w S3 w podanym prefiksie, które zawierają określony wzorzec.
 * @param basePrefix Podstawowy prefiks do przeszukania (np. 'mockup/')
 * @param pattern Wzorzec do dopasowania w nazwach folderów
 * @returns Tablica prefiksów S3 dopasowanych do wzorca
 */
async function listS3ObjectsWithPrefix(basePrefix: string, pattern: string): Promise<string[]> {
  const matchingPrefixes: string[] = [];

  try {
    // Używamy ListObjectsV2Command z delimiter='/'
    let continuationToken: string | undefined = undefined;

    do {
      const listCommandInput: ListObjectsV2CommandInput = {
        Bucket: S3_BUCKET_NAME,
        Prefix: basePrefix,
        Delimiter: '/', // Używamy separatora, aby otrzymać tylko "foldery"
        ContinuationToken: continuationToken,
      };

      const listCommand = new ListObjectsV2Command(listCommandInput);
      const listResponse = await s3Client.send(listCommand);

      // CommonPrefixes to "foldery" w S3
      if (listResponse.CommonPrefixes && listResponse.CommonPrefixes.length > 0) {
        // Filtrujemy prefiksy, aby znaleźć tylko te zawierające pattern
        const matches = listResponse.CommonPrefixes
          .filter(item => {
            // Ignorujemy wielkość liter przy porównywaniu
            return item.Prefix &&
                   item.Prefix.toLowerCase().includes(pattern.toLowerCase());
          })
          .map(item => item.Prefix as string);

        matchingPrefixes.push(...matches);
      }

      continuationToken = listResponse.NextContinuationToken;
    } while (continuationToken);

    return matchingPrefixes;

  } catch (error) {
    console.error(`[S3 List] Błąd podczas listowania prefiksów w ${basePrefix}:`, error);
    throw error;
  }
}
