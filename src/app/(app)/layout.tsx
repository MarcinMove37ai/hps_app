// src/app/(app)/layout.tsx
"use client"

import AdminLayout from '@/components/layout/AdminLayout';
import BlockedUserMessage from '@/components/auth/BlockedUserMessage';
import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { checkAuthStatus, user } = useAuth();
  const [isChecking, setIsChecking] = useState(true);
  const router = useRouter();

  // Sprawdzenie czy użytkownik jest zablokowany
  const isUserBlocked = user?.status?.toLowerCase() === 'blocked';

  // Sprawdzenie autoryzacji przy montowaniu komponentu
  useEffect(() => {
    const verifyAuthentication = async () => {
      try {
        // Sprawdź tylko czy użytkownik jest zalogowany
        const isAuthed = await checkAuthStatus();

        // Jeśli nie jest zalogowany, przekieruj do logowania
        if (!isAuthed) {
          router.replace('/login');
          return;
        }

        // Zakończ sprawdzanie
        setIsChecking(false);
      } catch (error) {
        console.error("Błąd weryfikacji autoryzacji:", error);
        router.replace('/login');
      }
    };

    verifyAuthentication();
  }, [checkAuthStatus, router]);

  // Renderowanie podczas sprawdzania uwierzytelnienia
  if (isChecking) {
    return <AdminLayout>{children}</AdminLayout>;
  }

  // Jeśli użytkownik jest zablokowany, wyświetl specjalny komunikat
  if (isUserBlocked) {
    return (
      <AdminLayout disableMenu={true}>
        <BlockedUserMessage />
      </AdminLayout>
    );
  }

  // Standardowe renderowanie dla niezablokowanych użytkowników
  return <AdminLayout>{children}</AdminLayout>;
}