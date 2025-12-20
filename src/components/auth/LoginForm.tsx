// src/components/auth/LoginForm.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface LoginFormProps {
  redirectParam?: string; // Dodajemy prop do przekazania URL do przekierowania
}

export default function LoginForm({ redirectParam }: LoginFormProps = {}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { signIn, loading, error, isAuthenticated, user, getRedirectPath } = useAuth();
  const searchParams = useSearchParams();

  // Dodany stan do kontrolowania renderowania po stronie klienta
  const [isClient, setIsClient] = useState(false);

  // Stan do przechowywania wartości loading tylko po stronie klienta
  const [clientLoading, setClientLoading] = useState(false);

  // Inicjalizacja isClient po montażu komponentu
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Synchronizuj clientLoading z loading tylko po stronie klienta
  useEffect(() => {
    if (isClient) {
      setClientLoading(loading);
    }
  }, [isClient, loading]);

  // Funkcja do zarządzania przekierowaniem po zalogowaniu
  // Opakowana w useCallback, aby uniknąć rekurencji w useEffect
  const handleRedirect = useCallback(() => {
    // Priorytet 0: Parametr redirectParam z propsa (ma najwyższy priorytet)
    if (redirectParam) {
      const decodedUrl = decodeURIComponent(redirectParam);
      console.log("Wykonuję przekierowanie do (z propsa):", decodedUrl);
      window.location.href = decodedUrl;
      return;
    }

    // Priorytet 1: Parametr redirect z URL
    const redirectParamFromUrl = searchParams.get('redirect');

    // Priorytet 2: Domyślne przekierowanie na podstawie roli i statusu
    const defaultRedirect = getRedirectPath();

    // Określ końcową ścieżkę przekierowania
    const redirectPath = redirectParamFromUrl || defaultRedirect;
    console.log("Wykonuję przekierowanie do:", redirectPath);

    // Przekierowanie
    window.location.href = redirectPath;
  }, [searchParams, getRedirectPath, redirectParam]);

  // Przekierowanie po zalogowaniu - usuwamy ekran "Pomyślnie zalogowano"
  useEffect(() => {
    if (isAuthenticated && !loading && user) {
      console.log("Przekierowanie po zalogowaniu: dane użytkownika dostępne", {
        status: user?.status,
        role: user?.role
      });
      handleRedirect();
    }
  }, [isAuthenticated, user, loading, handleRedirect]);

  // Obsługa formularza logowania
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      console.log("Rozpoczynanie procesu logowania");
      await signIn(username, password);
      // Przekierowanie jest obsługiwane przez useEffect powyżej
    } catch (err) {
      console.error('Błąd logowania:', err);
    }
  };

  const resetSuccess = searchParams.get('reset') === 'success';
  const registeredSuccess = searchParams.get('registered') === 'true';
  const blockedAccount = searchParams.get('blocked') === 'true';

  // Użyj clientLoading tylko jeśli isClient jest true, w przeciwnym razie użyj false
  const isDisabled = isClient ? clientLoading : false;
  const buttonText = isClient ? (clientLoading ? 'Logowanie...' : 'Zaloguj się') : 'Zaloguj się';

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-sm mx-auto">
      <div className="text-center mb-4">
        <hr className="mb-4 border-t border-gray-200" />
        <h2 className="text-2xl font-bold text-gray-900">Logowanie</h2>
        <hr className="mt-4 border-t border-gray-200" />
      </div>

      {resetSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded relative text-sm">
          Hasło zostało pomyślnie zresetowane. Możesz się teraz zalogować.
        </div>
      )}

      {registeredSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-600 px-3 py-2 rounded relative text-sm">
          Konto zostało utworzone. Sprawdź swoją skrzynkę email, aby zweryfikować adres. Administrator wkrótce zatwierdzi Twoje konto.
        </div>
      )}

      {blockedAccount && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded relative text-sm">
          Twoje konto zostało zablokowane. Skontaktuj się z administratorem.
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded relative text-sm">
          <span className="block text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700">
            Adres email
          </label>
          <div className="mt-1">
            <input
              id="username"
              name="username"
              type="email"
              required
              autoComplete="email"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              disabled={isDisabled}
            />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Hasło
          </label>
          <div className="mt-1">
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              disabled={isDisabled}
            />
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link
                href="/restore"
                className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
              >
                Zapomniałeś hasła?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isDisabled}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {buttonText}
          </button>
        </div>
      </form>

      <div className="text-center mt-4">
        <p className="text-sm text-gray-600">
          Nie masz jeszcze konta?{' '}
          <Link
            href="/register"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            Zarejestruj się
          </Link>
        </p>
      </div>
    </div>
  );
}