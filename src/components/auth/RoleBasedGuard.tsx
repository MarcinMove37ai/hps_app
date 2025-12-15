"use client"

import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/types/types';

interface RoleBasedGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  redirectPath?: string;
  requireActiveStatus?: boolean; // Kontroluje czy strona wymaga statusu "active"
}

export default function RoleBasedGuard({
  allowedRoles,
  children,
  redirectPath = '/o3gpt',
  requireActiveStatus = true // Domyślnie wymagany jest status "active"
}: RoleBasedGuardProps) {
  const { userRole, user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const hasRedirectedRef = useRef(false);

  // Sprawdzanie czy jesteśmy po stronie klienta - tylko raz
  useEffect(() => {
    setIsClient(true);

    // Sprawdzenie wykonane tylko raz przy pierwszym renderze
    setTimeout(() => {
      setIsLoading(false);
    }, 100); // Krótkie opóźnienie aby dać czas na inicjalizację
  }, []);

  // Weryfikacja uprawnień - kontrolowana przez ref aby uniknąć zapętlenia
  useEffect(() => {
    // Zapobieganie wykonaniu na serwerze
    if (!isClient) return;

    // Zapobieganie wielokrotnym przekierowaniom
    if (hasRedirectedRef.current) return;

    const verifyAccess = async () => {
      try {
        console.log("RoleBasedGuard - checking access:", {
          isAuthenticated,
          userRole,
          status: user?.status,
          allowedRoles
        });

        // 1. Sprawdź czy użytkownik jest zalogowany
        if (!isAuthenticated) {
          console.log("User not authenticated, redirecting to login");
          hasRedirectedRef.current = true;
          router.replace('/login');
          return;
        }

        const currentStatus = user?.status?.toLowerCase();

        // 2. ZMIANA: Nie przekierowujemy zablokowanych użytkowników do logowania
        // Zamiast tego po prostu ustawiamy isAuthorized na false, co zakończy dalszą weryfikację
        // i wyświetli komunikat o przekierowywaniu (ale faktycznego przekierowania nie będzie)
        if (currentStatus === 'blocked') {
          console.log("User is blocked - skipping further verification");
          // Nie ustawiamy flagi przekierowania, tylko kończymy weryfikację
          setIsAuthorized(false);
          setIsLoading(false);
          return;
        }

        // 3. Sprawdź status "pending" dla stron wymagających "active"
        if (requireActiveStatus && currentStatus !== 'active') {
          console.log("User status is not active, redirecting to o3gpt");
          hasRedirectedRef.current = true;
          router.replace('/o3gpt');
          return;
        }

        // 4. Sprawdź rolę
        const currentRole = userRole as UserRole;
        if (!allowedRoles.includes(currentRole)) {
          console.log(`User role ${currentRole} not in allowed roles, redirecting to ${redirectPath}`);
          hasRedirectedRef.current = true;
          router.replace(redirectPath);
          return;
        }

        console.log("Access granted");
        setIsAuthorized(true);
      } catch (error) {
        console.error("Error during access verification:", error);
      } finally {
        // Zawsze zakończ ładowanie po weryfikacji
        setIsLoading(false);
      }
    };

    // Wykonaj weryfikację tylko gdy nie było jeszcze przekierowania
    if (!hasRedirectedRef.current) {
      verifyAccess();
    }
  }, [isClient, isAuthenticated, user, userRole, allowedRoles, requireActiveStatus, redirectPath, router]);

  // Podczas renderowania na serwerze nie renderuj nic
  if (!isClient) {
    return null;
  }

  // Pokaż ekran ładowania podczas weryfikacji uprawnień
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-blue-600">Weryfikacja uprawnień...</div>
      </div>
    );
  }

  // Jeśli nie mamy uprawnień ale nie nastąpiło przekierowanie, pokaż ekran ładowania
  if (!isAuthorized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-pulse text-blue-600">Przekierowywanie...</div>
      </div>
    );
  }

  // Jeśli mamy uprawnienia, wyświetl zawartość
  return <>{children}</>;
}