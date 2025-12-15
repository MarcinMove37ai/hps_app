"use client";

// src/hooks/useAuth.ts
import { useState, useCallback, useEffect } from 'react';
import { useAuthContext } from '../contexts/AuthContext';
import { getUserData, getAuthTokens, areTokensValid } from '@/lib/session-storage';
import { UserRole } from '@/types/types';

// Interfejs dla dodatkowych danych użytkownika podczas rejestracji
interface UserRegistrationInfo {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  supervisorCode: string;
  email: string;
  role?: UserRole; // Opcjonalne pole roli - domyślnie 'USER'
}

// Interfejs dla obsługi błędów
interface ErrorWithMessage {
  message: string;
  [key: string]: unknown;
}

/**
 * Hook useAuth do zarządzania autoryzacją
 * Zapewnia łatwy w użyciu interfejs do uwierzytelniania, rejestracji i zarządzania sesją
 * używając kontekstu autoryzacji (AuthContext) pod spodem
 */
export function useAuth() {
  const authContext = useAuthContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Funkcja sprawdzania czy użytkownik jest zalogowany
  // WAŻNE: Zdefiniowane PRZED użyciem w useEffect
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    try {
      console.log("useAuth.checkAuthStatus: Sprawdzanie statusu autoryzacji");

      // Najpierw sprawdzamy stan w kontekście
      if (authContext.isAuthenticated && authContext.user) {
        console.log("useAuth.checkAuthStatus: Użytkownik zalogowany według kontekstu");
        return true;
      }

      // Jeśli kontekst nie potwierdza autoryzacji, sprawdzamy bezpośrednio Session Storage
      const userData = getUserData();
      const tokens = getAuthTokens();
      const tokensValid = areTokensValid();

      console.log("useAuth.checkAuthStatus: Dane z Session Storage:", {
        userData: !!userData,
        tokens: !!tokens,
        tokensValid
      });

      if (userData && tokens && tokensValid) {
        console.log("useAuth.checkAuthStatus: Dane w Session Storage są prawidłowe");
        // Aktualizujemy kontekst, jeśli dane w Session Storage są prawidłowe
        await authContext.getCurrentUser();
        return true;
      }

      console.log("useAuth.checkAuthStatus: Użytkownik niezalogowany");
      return false;
    } catch (err) {
      console.error('Błąd sprawdzania statusu autoryzacji:', err);
      return false;
    }
  }, [authContext]);

  // Synchronizuj stan przy montowaniu komponentu
  // Używane PO zdefiniowaniu checkAuthStatus
  useEffect(() => {
    const checkInitialAuth = async () => {
      await checkAuthStatus();
    };

    if (!authContext.isAuthenticated) {
      checkInitialAuth();
    }
  }, [authContext.isAuthenticated, checkAuthStatus]);

  // Funkcja logowania
  const signIn = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const result = await authContext.login(email, password);

      if (!result && authContext.error) {
        setError(authContext.error);
      }

      return result;
    } catch (err: unknown) {
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Wystąpił nieoczekiwany błąd podczas logowania');
      return false;
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  // Funkcja rejestracji
  const register = useCallback(async (
    email: string,
    password: string,
    userInfo: UserRegistrationInfo
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const result = await authContext.register(
        {
          first_name: userInfo.firstName,
          last_name: userInfo.lastName,
          email: userInfo.email,
          phone_number: userInfo.phoneNumber,
          supervisor_code: userInfo.supervisorCode,
          admin_comment: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        password
      );

      if (!result && authContext.error) {
        setError(authContext.error);
      }

      return result;
    } catch (err: unknown) {
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Wystąpił nieoczekiwany błąd podczas rejestracji');
      return false;
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  // Funkcja potwierdzenia rejestracji
  const confirmRegistration = useCallback(async (email: string, code: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const result = await authContext.confirmRegistration(email, code);

      if (!result && authContext.error) {
        setError(authContext.error);
      }

      return result;
    } catch (err: unknown) {
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Wystąpił nieoczekiwany błąd podczas potwierdzania rejestracji');
      return false;
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  // Funkcja ponownego wysłania kodu weryfikacyjnego
  const resendVerificationCode = useCallback(async (email: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const result = await authContext.resendVerificationCode(email);

      if (!result && authContext.error) {
        setError(authContext.error);
      }

      return result;
    } catch (err: unknown) {
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Wystąpił nieoczekiwany błąd podczas wysyłania kodu weryfikacyjnego');
      return false;
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  // Funkcja resetowania hasła
  const resetPassword = useCallback(async (email: string): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const result = await authContext.resetPassword(email);

      if (!result && authContext.error) {
        setError(authContext.error);
      }

      return result;
    } catch (err: unknown) {
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Wystąpił nieoczekiwany błąd podczas resetowania hasła');
      return false;
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  // Funkcja potwierdzania resetu hasła
  const confirmResetPassword = useCallback(async (
    email: string,
    code: string,
    newPassword: string
  ): Promise<boolean> => {
    try {
      setLoading(true);
      setError(null);

      const result = await authContext.confirmResetPassword(email, code, newPassword);

      if (!result && authContext.error) {
        setError(authContext.error);
      }

      return result;
    } catch (err: unknown) {
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Wystąpił nieoczekiwany błąd podczas zmiany hasła');
      return false;
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  // Funkcja wylogowania
  const signOut = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      console.log("useAuth.signOut: Rozpoczęcie procesu wylogowania");

      await authContext.logout();

      // Dodane sprawdzenie po wylogowaniu
      console.log("useAuth.signOut: Zakończono wylogowanie, sprawdzam dane w Session Storage");
      const userData = getUserData();
      const tokens = getAuthTokens();
      console.log("useAuth.signOut: Dane po wyczyszczeniu:", { userData, tokens });

    } catch (err: unknown) {
      console.error("useAuth.signOut: Błąd podczas wylogowywania:", err);
      const errorWithMessage = err as ErrorWithMessage;
      setError(errorWithMessage.message || 'Wystąpił nieoczekiwany błąd podczas wylogowywania');
    } finally {
      setLoading(false);
    }
  }, [authContext]);

  // Funkcja odświeżania sesji
  const refreshSession = useCallback(async (): Promise<boolean> => {
    try {
      return await authContext.refreshSession();
    } catch (err: unknown) {
      console.error('Błąd odświeżania sesji:', err);
      return false;
    }
  }, [authContext]);

  // Funkcja do określania ścieżki przekierowania na podstawie roli i statusu
  const getRedirectPath = useCallback(() => {
    if (!authContext.user) return '/o3gpt';

    const userStatus = authContext.user.status?.toLowerCase();

    // ZMIANA: Usunięto specjalne przekierowanie dla statusu 'blocked'
    // Teraz użytkownicy zablokowani będą kierowani zgodnie z regułami dla ich roli

    if (userStatus === 'pending') {
      return '/o3gpt';
    }

    // Dla wszystkich użytkowników, na podstawie roli
    if (authContext.userRole === 'USER') {
      return '/o3gpt';
    } else if (authContext.userRole === 'ADMIN' || authContext.userRole === 'GOD') {
      return '/home';
    }

    // Domyślne przekierowanie
    return '/o3gpt';
  }, [authContext.user, authContext.userRole]);

  return {
    signIn,
    register,
    confirmRegistration,
    resendVerificationCode,
    resetPassword,
    confirmResetPassword,
    signOut,
    refreshSession,
    checkAuthStatus,
    getRedirectPath,
    loading: loading || authContext.isLoading,
    error: error || authContext.error,
    isAuthenticated: authContext.isAuthenticated,
    user: authContext.user,
    userRole: authContext.userRole
  };
}