// src/components/auth/AuthGuard.tsx
"use client"

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import LoginForm from './LoginForm';

export default function AuthGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { checkAuthStatus } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);

  // Uzyskaj pełny URL do przekierowania po logowaniu
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  // Sprawdzenie autoryzacji przy montowaniu komponentu
  useEffect(() => {
    const verifyAuthentication = async () => {
      try {
        // Sprawdź stan uwierzytelnienia
        const isAuthed = await checkAuthStatus();

        // Jeśli nie jesteśmy zalogowani, pokaż komunikat o braku uprawnień
        if (!isAuthed) {
          setAuthFailed(true);
          return;
        }

        // Wszystko OK, możemy renderować
        setIsReady(true);
      } catch (error) {
        console.error("Błąd weryfikacji autoryzacji:", error);
        setAuthFailed(true);
      }
    };

    verifyAuthentication();
  }, [checkAuthStatus]);

  // Obsługa przycisku logowania
  const handleLoginClick = () => {
    setShowLoginForm(true);
  };

  // Pokaż indykator ładowania podczas weryfikacji autoryzacji
  if (!isReady && !authFailed) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-4 text-gray-600">Weryfikacja dostępu...</p>
        </div>
      </div>
    );
  }

  // Jeśli weryfikacja nie powiodła się, pokaż przyjazny komunikat z przyciskiem logowania
  if (authFailed && !showLoginForm) {
    return (
      <div className="flex items-center justify-center h-screen w-screen bg-gray-50">
        <div className="text-center max-w-md p-6 bg-blue-50 rounded-lg border border-blue-200">
          <h2 className="text-xl font-semibold text-blue-700 mb-4">Wymagane logowanie</h2>
          <p className="text-gray-600 mb-6">
            Aby uzyskać dostęp do podglądu strony, musisz być zalogowany.
            Zaloguj się, aby kontynuować.
          </p>
          <button
            onClick={handleLoginClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Zaloguj się
          </button>
        </div>
      </div>
    );
  }

  // Jeżeli użytkownik kliknął "Zaloguj się", pokaż formularz logowania
  // z przekazaniem URL do przekierowania po zalogowaniu
  if (showLoginForm) {
    // Można użyć samego pathname lub pełnego URL, zależnie od konfiguracji aplikacji
    // Kodujemy URL, aby uniknąć problemów z przekazywaniem parametrów
    const returnUrl = encodeURIComponent(currentUrl);

    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <LoginForm redirectParam={returnUrl} />
        </div>
      </div>
    );
  }

  // Renderujemy komponent
  return <>{children}</>;
}