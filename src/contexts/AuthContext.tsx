"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile, CognitoTokens, UserRole } from '../types/types';

// Import usług Cognito i zarządzania sesją
import * as cognitoService from '../lib/cognito';
import {
  saveUserData,
  getUserData,
  getAuthTokens,
  saveAuthTokens,
  clearSession,
  initializeSession
  // Usunięto import saveAuthCookie i removeAuthCookie
} from '../lib/session-storage';

// Interfejs dla kontekstu autoryzacji
interface AuthContextType {
  // Stan autoryzacji
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  userRole: UserRole; // Dodane pole dla roli użytkownika
  tokens: CognitoTokens | null;
  error: string | null;

  // Metody autoryzacyjne
  login: (email: string, password: string) => Promise<boolean>;
  register: (userData: Omit<UserProfile, 'id' | 'cognito_sub' | 'status' | 'role'>, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<boolean>;
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<boolean>;
  confirmRegistration: (email: string, code: string) => Promise<boolean>;
  resendVerificationCode: (email: string) => Promise<boolean>;
  getCurrentUser: () => Promise<UserProfile | null>;

  // Metoda odświeżania sesji
  refreshSession: () => Promise<boolean>;
}

// Utworzenie kontekstu z wartością domyślną undefined
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook do używania kontekstu autoryzacji
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Interfejsy do obsługi błędów i danych
interface ErrorWithMessage {
  message: string;
  type?: string;
  [key: string]: unknown;
}

// Właściwości komponentu AuthProvider
interface AuthProviderProps {
  children: ReactNode;
}

// Provider kontekstu autoryzacji
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  // Stany
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tokens, setTokens] = useState<CognitoTokens | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Efekt inicjalizujący - sprawdza czy użytkownik jest zalogowany przy ładowaniu aplikacji
  useEffect(() => {
    const initialize = async () => {
      try {
        setIsLoading(true);

        const session = initializeSession();

        if (session.isAuthenticated && session.userData && session.tokens) {
          console.log('Dane użytkownika z Session Storage:', {
            email: session.userData.email,
            status: session.userData.status,
            role: session.userData.role
          });

          setUser(session.userData);
          setTokens(session.tokens);
          setIsAuthenticated(true);
        } else {
          // Próba odświeżenia tokenu
          try {
            const refreshedTokens = await cognitoService.refreshSession();

            // Sprawdź czy otrzymaliśmy tokeny - jeśli nie, użytkownik nie jest zalogowany
            if (!refreshedTokens) {
              // To normalna sytuacja (nie błąd), więc nie wyświetlamy komunikatu o błędzie
              clearSession();
              setIsAuthenticated(false);
              setUser(null);
              setTokens(null);
            } else {
              const userData = getUserData();
              if (userData) {
                setUser(userData);
                setTokens(refreshedTokens);
                setIsAuthenticated(true);
              }
            }
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          } catch (_refreshError) {
            // Nie udało się odświeżyć tokenu, użytkownik musi się zalogować ponownie
            clearSession();
            setIsAuthenticated(false);
            setUser(null);
            setTokens(null);
          }
        }
      } catch (error) {
        console.error('Error initializing auth context:', error);
        clearSession();
        setIsAuthenticated(false);
        setUser(null);
        setTokens(null);
      } finally {
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  // Funkcja logowania - POPRAWIONA WERSJA
  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Rozpoczynanie procesu logowania dla:', email);

      // Wywołanie autentykacji przez Cognito
      const authTokens = await cognitoService.signIn(email, password);
      console.log('Uwierzytelnienie Cognito zakończone pomyślnie');

      // Pobranie podstawowych danych użytkownika z Cognito
      const _cognitoUserData = await cognitoService.getCurrentUser(authTokens.accessToken);
      console.log('Pobrano podstawowe dane z Cognito');

      // Zapisanie tokenów wcześniej, aby uniknąć problemów z autoryzacją API
      saveAuthTokens(authTokens);
      console.log('Zapisano tokeny w Session Storage');

      // USUNIĘTO: Nie zapisujemy już tokena w cookie dla middleware
      // const idToken = authTokens.idToken;
      // const expiryTimestamp = new Date(authTokens.expiration);
      // if (idToken) {
      //   saveAuthCookie(idToken, expiryTimestamp);
      //   console.log('Zapisano token w cookie');
      // }

      // Ustawienie tokenów w stanie
      setTokens(authTokens);

      try {
        // Pobranie pełnego profilu użytkownika z API
        console.log('Pobieranie pełnego profilu użytkownika z API');
        const response = await fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${authTokens.accessToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Błąd pobierania danych użytkownika: ${response.status}`);
        }

        const userProfile: UserProfile = await response.json();

        // Dodanie logowania do debugowania
        console.log('Dane użytkownika pobrane z API po logowaniu:', {
          email: userProfile.email,
          status: userProfile.status,
          role: userProfile.role
        });

        // Zapisanie danych użytkownika
        saveUserData(userProfile);
        setUser(userProfile);

      } catch (apiError) {
        console.error('Błąd podczas pobierania danych użytkownika z API:', apiError);

        // Nawet jeśli wystąpi błąd API, uwierzytelnienie się powiodło
        // Ustawimy podstawowe dane na podstawie informacji z Cognito
        const basicUserData: UserProfile = {
          id: '',
          cognito_sub: _cognitoUserData.sub || '',
          email: email,
          first_name: _cognitoUserData.given_name || '',
          last_name: _cognitoUserData.family_name || '',
          phone_number: _cognitoUserData.phone_number || '',
          role: 'USER', // Domyślna rola
          status: 'pending', // Domyślny status
          supervisor_code: '',
          admin_comment: '',
          created_at: '',
          updated_at: ''
        };

        console.log('Używanie podstawowych danych użytkownika z Cognito:', {
          email: basicUserData.email,
          role: basicUserData.role,
          status: basicUserData.status
        });

        saveUserData(basicUserData);
        setUser(basicUserData);
      }

      // Na końcu oznaczamy, że użytkownik jest uwierzytelniony
      setIsAuthenticated(true);
      console.log('Logowanie zakończone pomyślnie, użytkownik uwierzytelniony');

      return true;
    } catch (err: unknown) {
      let errorMessage = 'Błąd logowania';

      // Obsługa specyficznych błędów Cognito
      const errorWithMessage = err as ErrorWithMessage;
      if (errorWithMessage.type === cognitoService.CognitoErrorType.INVALID_CREDENTIALS) {
        errorMessage = 'Nieprawidłowy email lub hasło';
      } else if (errorWithMessage.type === cognitoService.CognitoErrorType.USER_NOT_CONFIRMED) {
        errorMessage = 'Konto nie zostało potwierdzone. Sprawdź swój email.';
      } else if (errorWithMessage.type === cognitoService.CognitoErrorType.USER_NOT_FOUND) {
        errorMessage = 'Nie znaleziono użytkownika z podanym adresem email';
      } else if (errorWithMessage.message) {
        errorMessage = errorWithMessage.message;
      }

      setError(errorMessage);
      console.error('Login error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja rejestracji
  const register = async (
    userData: Omit<UserProfile, 'id' | 'cognito_sub' | 'status' | 'role'>,
    password: string
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      // Rejestracja użytkownika w Cognito
      const cognitoUserId = await cognitoService.signUp(
        userData.email,
        password,
        {
          firstName: userData.first_name,
          lastName: userData.last_name,
          phoneNumber: userData.phone_number
        }
      );

      // Zapisanie danych użytkownika w bazie danych
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          cognito_sub: cognitoUserId,
          first_name: userData.first_name,
          last_name: userData.last_name,
          email: userData.email,
          phone_number: userData.phone_number,
          supervisor_code: userData.supervisor_code,
          status: 'pending', // Nowi użytkownicy mają status 'pending'
          role: 'USER' // Nowi użytkownicy mają domyślną rolę 'USER'
        })
      });

      if (!response.ok) {
        throw new Error('Błąd zapisywania danych użytkownika');
      }

      return true;
    } catch (err: unknown) {
      let errorMessage = 'Błąd rejestracji';

      const errorWithMessage = err as ErrorWithMessage;
      if (errorWithMessage.type === cognitoService.CognitoErrorType.USERNAME_EXISTS) {
        errorMessage = 'Użytkownik z podanym adresem email już istnieje';
      } else if (errorWithMessage.message) {
        errorMessage = errorWithMessage.message;
      }

      setError(errorMessage);
      console.error('Registration error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja potwierdzenia rejestracji
  const confirmRegistration = async (email: string, code: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await cognitoService.confirmSignUp(email, code);
      return true;
    } catch (err: unknown) {
      let errorMessage = 'Błąd potwierdzania konta';

      const errorWithMessage = err as ErrorWithMessage;
      if (errorWithMessage.type === cognitoService.CognitoErrorType.CODE_MISMATCH) {
        errorMessage = 'Nieprawidłowy kod weryfikacyjny';
      } else if (errorWithMessage.type === cognitoService.CognitoErrorType.CODE_EXPIRED) {
        errorMessage = 'Kod weryfikacyjny wygasł. Poproś o nowy kod.';
      } else if (errorWithMessage.message) {
        errorMessage = errorWithMessage.message;
      }

      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja ponownego wysłania kodu weryfikacyjnego
  const resendVerificationCode = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await cognitoService.resendConfirmationCode(email);
      return true;
    } catch (err: unknown) {
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Błąd wysyłania kodu weryfikacyjnego');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja wylogowania
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      // Wylogowanie użytkownika z Cognito
      await cognitoService.globalSignOut();

      // USUNIĘTO: Nie usuwamy już cookie autoryzacyjnego
      // removeAuthCookie();

      // Czyszczenie danych z Session Storage
      clearSession();

      // Aktualizacja stanu
      setUser(null);
      setTokens(null);
      setIsAuthenticated(false);
    } catch (err: unknown) {
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Błąd wylogowania');
      console.error('Logout error:', err);

      // Nawet w przypadku błędu, czyścimy lokalną sesję
      // USUNIĘTO: Nie usuwamy już cookie autoryzacyjnego
      // removeAuthCookie();

      clearSession();
      setUser(null);
      setTokens(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja resetowania hasła
  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await cognitoService.forgotPassword(email);
      return true;
    } catch (err: unknown) {
      let errorMessage = 'Błąd wysyłania kodu resetującego';

      const errorWithMessage = err as ErrorWithMessage;
      if (errorWithMessage.type === cognitoService.CognitoErrorType.USER_NOT_FOUND) {
        errorMessage = 'Nie znaleziono użytkownika z podanym adresem email';
      } else if (errorWithMessage.message) {
        errorMessage = errorWithMessage.message;
      }

      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja potwierdzenia resetowania hasła
  const confirmResetPassword = async (email: string, code: string, newPassword: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      setError(null);

      await cognitoService.confirmForgotPassword(email, code, newPassword);
      return true;
    } catch (err: unknown) {
      let errorMessage = 'Błąd zmiany hasła';

      const errorWithMessage = err as ErrorWithMessage;
      if (errorWithMessage.type === cognitoService.CognitoErrorType.CODE_MISMATCH) {
        errorMessage = 'Nieprawidłowy kod weryfikacyjny';
      } else if (errorWithMessage.type === cognitoService.CognitoErrorType.CODE_EXPIRED) {
        errorMessage = 'Kod weryfikacyjny wygasł. Poproś o nowy kod.';
      } else if (errorWithMessage.message) {
        errorMessage = errorWithMessage.message;
      }

      setError(errorMessage);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja pobierania aktualnego użytkownika
  const getCurrentUser = async (): Promise<UserProfile | null> => {
    if (user) {
      return user;
    }

    try {
      // Próba pobrania danych z Session Storage
      const userData = getUserData();
      if (userData) {
        setUser(userData);
        return userData;
      }

      // Jeśli brak danych w Storage, a mamy token, próbujemy pobrać dane z Cognito
      const authTokens = getAuthTokens();
      if (authTokens?.accessToken) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const _cognitoUserData = await cognitoService.getCurrentUser(authTokens.accessToken);

        // Pobranie pełnego profilu użytkownika z API
        const response = await fetch('/api/user', {
          headers: {
            'Authorization': `Bearer ${authTokens.accessToken}`
          }
        });

        if (response.ok) {
          const userProfile: UserProfile = await response.json();

          // Dodanie logowania do debugowania
          console.log('Dane użytkownika pobrane z API podczas getCurrentUser:', {
            email: userProfile.email,
            status: userProfile.status,
            role: userProfile.role
          });

          saveUserData(userProfile);
          setUser(userProfile);
          return userProfile;
        }
      }

      return null;
    } catch (error) {
      console.error('Error getting current user:', error);
      return null;
    }
  };

  // Funkcja odświeżania sesji
  const refreshSession = async (): Promise<boolean> => {
    try {
      console.log('Rozpoczynanie odświeżania sesji');
      const refreshedTokens = await cognitoService.refreshSession();

      // Jeśli nie ma tokenów, użytkownik nie jest zalogowany
      if (!refreshedTokens) {
        console.log('Brak tokenów odświeżających - użytkownik niezalogowany');
        // To normalna sytuacja, a nie błąd
        clearSession();
        setUser(null);
        setTokens(null);
        setIsAuthenticated(false);
        return false;
      }

      console.log('Tokeny odświeżone pomyślnie');

      // USUNIĘTO: Nie zapisujemy już cookie po odświeżeniu tokenu
      // // Po pomyślnym odświeżeniu, dodaj zapis cookie
      // const newIdToken = refreshedTokens.idToken;
      // const expiryTimestamp = new Date(refreshedTokens.expiration);
      // if (newIdToken) {
      //   saveAuthCookie(newIdToken, expiryTimestamp);
      //   console.log('Zapisano odświeżony token w cookie');
      // }

      // Po odświeżeniu tokena, pobieramy ponownie dane użytkownika
      if (refreshedTokens.accessToken) {
        try {
          console.log('Pobieranie danych użytkownika po odświeżeniu tokenów');
          const response = await fetch('/api/user', {
            headers: {
              'Authorization': `Bearer ${refreshedTokens.accessToken}`
            }
          });

          if (response.ok) {
            const userProfile: UserProfile = await response.json();
            console.log('Dane użytkownika odświeżone z API:', {
              email: userProfile.email,
              status: userProfile.status,
              role: userProfile.role
            });
            saveUserData(userProfile);
            setUser(userProfile);
          }
        } catch (error) {
          console.error('Error refreshing user data:', error);
        }
      }

      setTokens(refreshedTokens);
      setIsAuthenticated(true);
      console.log('Odświeżanie sesji zakończone pomyślnie');
      return true;
    } catch (error) {
      console.error('Refresh session error:', error);

      // W przypadku błędu wylogowujemy użytkownika
      // USUNIĘTO: Nie usuwamy już cookie
      // removeAuthCookie();

      clearSession();
      setUser(null);
      setTokens(null);
      setIsAuthenticated(false);

      return false;
    }
  };

  // Wartość roli użytkownika - z obsługą wartości domyślnej
  const userRole: UserRole = user?.role || 'USER';

  // Wartość kontekstu
  const value: AuthContextType = {
    isAuthenticated,
    isLoading,
    user,
    userRole, // Dodana wartość roli
    tokens,
    error,
    login,
    register,
    logout,
    resetPassword,
    confirmResetPassword,
    confirmRegistration,
    resendVerificationCode,
    getCurrentUser,
    refreshSession
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;