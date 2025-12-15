/**
 * Usługa do zarządzania danymi w Session Storage
 *
 * Ten moduł zawiera funkcje do bezpiecznego zapisywania, odczytywania
 * i usuwania danych użytkownika oraz tokenów uwierzytelniających
 * w Session Storage przeglądarki.
 */

import { UserProfile, CognitoTokens } from '../types/types';
import AWS_COGNITO_CONFIG from './aws-config';

// Klucze używane w Session Storage
const STORAGE_KEYS = {
  USER_DATA: 'userData',
  AUTH_TOKENS: 'authTokens',
  SESSION_INFO: 'sessionInfo'
};

// Informacje o sesji
interface SessionInfo {
  isAuthenticated: boolean;
  lastActivity: number; // timestamp ostatniej aktywności
  expiresAt: number;    // timestamp wygaśnięcia sesji
}

/**
 * Zapisuje dane użytkownika w Session Storage
 * @param userData Dane użytkownika do zapisania
 */
export const saveUserData = (userData: UserProfile): void => {
  try {
    // Logowanie do debugowania
    console.log('Zapisuję dane użytkownika do Session Storage:', {
      email: userData.email,
      status: userData.status,
      role: userData.role
    });

    sessionStorage.setItem(STORAGE_KEYS.USER_DATA, JSON.stringify(userData));
  } catch (error) {
    console.error('Error saving user data to Session Storage:', error);
  }
};

/**
 * Pobiera dane użytkownika z Session Storage
 * @returns Dane użytkownika lub null jeśli brak danych
 */
export const getUserData = (): UserProfile | null => {
  try {
    const userData = sessionStorage.getItem(STORAGE_KEYS.USER_DATA);
    const parsedData = userData ? JSON.parse(userData) as UserProfile : null;

    // Logowanie do debugowania
    if (parsedData) {
      console.log('Pobrane dane użytkownika z Session Storage:', {
        email: parsedData.email,
        status: parsedData.status,
        role: parsedData.role
      });
    }

    return parsedData;
  } catch (error) {
    console.error('Error getting user data from Session Storage:', error);
    return null;
  }
};

/**
 * Zapisuje tokeny uwierzytelniające w Session Storage
 * @param tokens Tokeny do zapisania
 */
export const saveAuthTokens = (tokens: CognitoTokens): void => {
  try {
    sessionStorage.setItem(STORAGE_KEYS.AUTH_TOKENS, JSON.stringify(tokens));

    // Aktualizacja informacji o sesji
    const sessionInfo: SessionInfo = {
      isAuthenticated: true,
      lastActivity: Date.now(),
      expiresAt: tokens.expiresAt * 1000 // konwersja z sekund na milisekundy
    };

    sessionStorage.setItem(STORAGE_KEYS.SESSION_INFO, JSON.stringify(sessionInfo));
  } catch (error) {
    console.error('Error saving auth tokens to Session Storage:', error);
  }
};

/**
 * Pobiera tokeny uwierzytelniające z Session Storage
 * @returns Tokeny uwierzytelniające lub null jeśli brak danych
 */
export const getAuthTokens = (): CognitoTokens | null => {
  try {
    const tokens = sessionStorage.getItem(STORAGE_KEYS.AUTH_TOKENS);
    return tokens ? JSON.parse(tokens) as CognitoTokens : null;
  } catch (error) {
    console.error('Error getting auth tokens from Session Storage:', error);
    return null;
  }
};

/**
 * Aktualizuje timestamp ostatniej aktywności użytkownika
 */
export const updateLastActivity = (): void => {
  try {
    const sessionInfoStr = sessionStorage.getItem(STORAGE_KEYS.SESSION_INFO);
    if (sessionInfoStr) {
      const sessionInfo = JSON.parse(sessionInfoStr) as SessionInfo;
      sessionInfo.lastActivity = Date.now();
      sessionStorage.setItem(STORAGE_KEYS.SESSION_INFO, JSON.stringify(sessionInfo));
    }
  } catch (error) {
    console.error('Error updating last activity in Session Storage:', error);
  }
};

/**
 * Sprawdza, czy tokeny uwierzytelniające są ważne
 * @returns true jeśli tokeny są ważne, false w przeciwnym razie
 */
export const areTokensValid = (): boolean => {
  try {
    const tokens = getAuthTokens();
    if (!tokens || !tokens.expiresAt) {
      return false;
    }

    const currentTime = Math.floor(Date.now() / 1000); // current timestamp in seconds
    return tokens.expiresAt > currentTime;
  } catch (error) {
    console.error('Error checking token validity:', error);
    return false;
  }
};

/**
 * Sprawdza, czy sesja użytkownika jest ważna
 * @param maxInactivityTime Maksymalny czas nieaktywności w milisekundach (domyślnie 60 minut)
 * @returns true jeśli sesja jest ważna, false w przeciwnym razie
 */
export const isSessionValid = (maxInactivityTime: number = 60 * 60 * 1000): boolean => {
  try {
    const sessionInfoStr = sessionStorage.getItem(STORAGE_KEYS.SESSION_INFO);
    if (!sessionInfoStr) {
      return false;
    }

    const sessionInfo = JSON.parse(sessionInfoStr) as SessionInfo;
    const currentTime = Date.now();

    // Sprawdzenie czasu nieaktywności
    const inactiveTime = currentTime - sessionInfo.lastActivity;
    if (inactiveTime > maxInactivityTime) {
      return false;
    }

    // Sprawdzenie czasu wygaśnięcia sesji
    return sessionInfo.expiresAt > currentTime;
  } catch (error) {
    console.error('Error checking session validity:', error);
    return false;
  }
};

/**
 * Czyści wszystkie dane sesji z Session Storage
 */
export const clearSession = (): void => {
  try {
    sessionStorage.removeItem(STORAGE_KEYS.USER_DATA);
    sessionStorage.removeItem(STORAGE_KEYS.AUTH_TOKENS);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION_INFO);

    // USUNIĘTO: Nie usuwamy już cookie autoryzacyjnego
    // removeAuthCookie();
  } catch (error) {
    console.error('Error clearing session data:', error);
  }
};

/**
 * Przygotowuje nowe tokeny uwierzytelniające, aktualizując czas wygaśnięcia
 * @param tokens Aktualne tokeny
 * @returns Zaktualizowane tokeny z nowym czasem wygaśnięcia
 */
export const prepareNewTokens = (tokens: Partial<CognitoTokens>): CognitoTokens => {
  const currentTokens = getAuthTokens() || {
    accessToken: '',
    idToken: '',
    refreshToken: '',
    expiresAt: 0
  };

  const expiresAt = Math.floor(Date.now() / 1000) + AWS_COGNITO_CONFIG.TOKEN_EXPIRES_IN;

  return {
    ...currentTokens,
    ...tokens,
    expiresAt
  };
};

/**
 * Inicjalizuje sesję na podstawie danych z Session Storage
 * @returns Obiekt zawierający informacje o stanie sesji
 */
export const initializeSession = (): {
  isAuthenticated: boolean;
  userData: UserProfile | null;
  tokens: CognitoTokens | null
} => {
  try {
    // Sprawdzenie czy tokeny są ważne
    if (!areTokensValid()) {
      clearSession();
      return { isAuthenticated: false, userData: null, tokens: null };
    }

    // Pobranie danych użytkownika i tokenów
    const userData = getUserData();
    const tokens = getAuthTokens();

    if (!userData || !tokens) {
      clearSession();
      return { isAuthenticated: false, userData: null, tokens: null };
    }

    // Aktualizacja czasu ostatniej aktywności
    updateLastActivity();

    return {
      isAuthenticated: true,
      userData,
      tokens
    };
  } catch (error) {
    console.error('Error initializing session:', error);
    clearSession();
    return { isAuthenticated: false, userData: null, tokens: null };
  }
};

// USUNIĘTO: Funkcje związane z cookies
// export function saveAuthCookie(token: string, expiry: number): boolean { ... }
// export function removeAuthCookie(): boolean { ... }
// export function getAuthCookie(): string | null { ... }