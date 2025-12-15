// src/components/layout/AdminLayout.tsx
"use client"

import React, { useState, ReactNode, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import Image from 'next/image';
import {
  Home,
  FileText,
  Users,
  Menu,
  X,
  Power,
  PieChart,
  UserPlus,
  MessageSquare,
  AlertTriangle,
  Lock,
  Clipboard,
  BookOpen
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/types';

// Rozszerzony typ UserStatus o status 'blocked'
type UserStatus = 'pending' | 'active' | 'blocked';

interface MenuItem {
  IconComponent: LucideIcon;
  label: string;
  path: string;
  roles: UserRole[];
  requiredStatus?: UserStatus[];
  fullWidth?: boolean;
}

const menuItems: MenuItem[] = [
  {
    IconComponent: Home,
    label: 'Dashboard',
    path: '/home',
    roles: ['ADMIN', 'GOD'], // Usunięto 'USER' - brak dostępu dla zwykłych użytkowników
    requiredStatus: ['active']
  },
  {
    IconComponent: Users,
    label: 'Partnerzy',
    path: '/partners',
    roles: ['ADMIN', 'GOD'], // Usunięto 'USER' - brak dostępu dla zwykłych użytkowników
    requiredStatus: ['active']
  },
  {
    IconComponent: FileText,
    label: 'Strony',
    path: '/pages',
    roles: ['ADMIN', 'USER', 'GOD'],
    requiredStatus: ['active']
  },
  {
    IconComponent: UserPlus,
    label: 'Leady',
    path: '/leads',
    roles: ['ADMIN', 'USER', 'GOD'],
    requiredStatus: ['active']
  },
  {
    IconComponent: PieChart,
    label: 'Statystyki',
    path: '/statistics',
    roles: ['ADMIN', 'USER', 'GOD'],
    requiredStatus: ['active']
  },
  {
    IconComponent: BookOpen,
    label: 'Ebook',
    path: '/ebook',
    roles: ['GOD','ADMIN'],
    requiredStatus: ['active']
  },
  {
    IconComponent: MessageSquare,
    label: 'Omega3gpt',
    path: '/o3gpt',
    roles: ['ADMIN', 'USER', 'GOD'],
    // Brak wymagania statusu - dostępne dla wszystkich
    fullWidth: true
  }
];

const getCurrentPageLabel = (path: string | null) => {
  if (!path) return 'Dashboard';
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  const menuItem = menuItems.find(item => normalizedPath === item.path);
  return menuItem?.label || 'Dashboard';
};

interface AdminLayoutProps {
  children: ReactNode;
  disableMenu?: boolean; // Nowy parametr do wyłączania menu
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, disableMenu = false }) => {
  const pathname = usePathname();
  const { signOut, user, userRole } = useAuth();
  const [hoveredSidebar, setHoveredSidebar] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [adminSupervisorCode, setAdminSupervisorCode] = useState<string | null>(null);
  const [isLoadingSupervisorCode, setIsLoadingSupervisorCode] = useState(false);
  const [showCopiedNotification, setShowCopiedNotification] = useState(false);
  // Dodany nowy stan do obsługi renderowania ikon po stronie klienta
  const [isClient, setIsClient] = useState(false);

  const normalizedPathname = pathname?.endsWith('/') ? pathname.slice(0, -1) : pathname;
  const userStatus = user?.status?.toLowerCase() as UserStatus | undefined;
  const userRoleFromAuth = (userRole || 'USER') as UserRole;

  // Check if current page needs full width
  const currentMenuItem = menuItems.find(item => normalizedPathname === item.path);
  const isFullWidthPage = currentMenuItem?.fullWidth || false;

  // Inicjalizacja stanu isClient na true po montażu komponentu
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Funkcja kopiująca kod opiekuna do schowka
  const copyCodeToClipboard = () => {
    if (adminSupervisorCode) {
      navigator.clipboard.writeText(adminSupervisorCode)
        .then(() => {
          setShowCopiedNotification(true);
          // Resetuj komunikat po 2 sekundach
          setTimeout(() => setShowCopiedNotification(false), 800);
        })
        .catch(err => {
          console.error('Błąd podczas kopiowania do schowka:', err);
        });
    }
  };

  // Efekt do pobierania kodu opiekuna dla administratora i super administratora
  useEffect(() => {
    if ((userRoleFromAuth === 'ADMIN' || userRoleFromAuth === 'GOD') && user?.id) {
      setIsLoadingSupervisorCode(true);

      // Pobieramy dane tylko jeśli mamy imię i nazwisko użytkownika
      if (user.first_name && user.last_name) {
        const fullName = `${user.first_name} ${user.last_name}`.trim();

        // Zapytanie do API wykorzystuje ten sam mechanizm, co w API /api/partners
        fetch(`/api/supervisor-code?name=${encodeURIComponent(fullName)}`, {
          headers: {
            'X-User-Id': user.id,
            'X-User-Role': userRoleFromAuth,
            'X-User-Cognito-Sub': user.cognito_sub || '',
          }
        })
          .then(response => {
            if (!response.ok) {
              throw new Error(`Błąd pobierania danych: ${response.status}`);
            }
            return response.json();
          })
          .then(data => {
            setAdminSupervisorCode(data.code || null);
            setIsLoadingSupervisorCode(false);
          })
          .catch(error => {
            console.error('Błąd podczas pobierania kodu opiekuna:', error);
            setIsLoadingSupervisorCode(false);
            // W przypadku błędu, ustawiamy null, aby wyświetlony został odpowiedni komunikat
            setAdminSupervisorCode(null);
          });
      } else {
        // Brak pełnego imienia i nazwiska, więc nie możemy znaleźć kodu opiekuna
        setAdminSupervisorCode(null);
        setIsLoadingSupervisorCode(false);
      }
    }
  }, [userRoleFromAuth, user]);

  // Filtrujemy menu na podstawie roli i statusu
  // Jeśli disableMenu=true, zwracamy pustą tablicę
  const filteredMenuItems = disableMenu ? [] : menuItems.filter(item => {
    // Sprawdź rolę
    const hasRequiredRole = item.roles.includes(userRoleFromAuth);

    // Sprawdź status (jeśli jest wymagany)
    const hasRequiredStatus = !item.requiredStatus ||
                             (userStatus && item.requiredStatus.includes(userStatus));

    return hasRequiredRole && hasRequiredStatus;
  });

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Funkcja do wylogowania użytkownika
  const handleLogout = async () => {
    console.log("Wylogowywanie użytkownika...");
    try {
      await signOut();
      // Bezpośrednie przekierowanie do logowania - bezpieczne rozwiązanie
      window.location.href = '/login';
    } catch (error) {
      console.error("Błąd podczas wylogowywania:", error);
    }
  };

  // Funkcja do przekierowania na stronę główną po kliknięciu logo
  const goToHome = () => {
    if (userStatus === 'pending') {
      window.location.href = '/o3gpt';
    } else if (userStatus === 'blocked') {
      // Zmiana: Nie wylogowujemy zablokowanego użytkownika po kliknięciu logo
      // signOut().then(() => window.location.href = '/login');
      // Zamiast tego zostajemy na tej samej stronie
      return;
    } else if (userRoleFromAuth === 'USER') {
      window.location.href = '/o3gpt';
    } else {
      window.location.href = '/home';
    }
  };

  // Funkcja zwracająca przetłumaczony status
  const getStatusLabel = (status: string | undefined) => {
    if (!status) return '';

    switch(status.toLowerCase()) {
      case 'pending':
        return 'Oczekujący';
      case 'active':
        return 'Aktywny';
      case 'blocked':
        return 'Zablokowany';
      default:
        return status;
    }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Pasek boczny - ukryty jeśli disableMenu=true */}
      {!disableMenu && (
        <div
          className={`fixed left-0 z-50 top-[calc(4rem)] h-[calc(90vh)]
            ${isMobile
              ? isMobileMenuOpen
                ? 'translate-x-0 w-64 bg-white/60 backdrop-blur-lg backdrop-saturate-150 shadow-xl rounded-r-3xl'
                : '-translate-x-full'
              : `bg-white shadow-lg rounded-r-2xl ${hoveredSidebar ? 'w-64' : 'w-20'}`
            }
            transition-all duration-300 ease-in-out overflow-y-auto`}
          onMouseEnter={() => !isMobile && setHoveredSidebar(true)}
          onMouseLeave={() => !isMobile && setHoveredSidebar(false)}
        >
          <nav className="py-4">
            <ul className="space-y-2 px-3">
              {filteredMenuItems.map((item) => (
                <li key={item.path}>
                  <Link
                    href={item.path}
                    className={`
                      flex items-center h-11 px-3
                      rounded-lg transition-colors
                      ${normalizedPathname === item.path ? 'bg-blue-100' : 'hover:bg-gray-50'}
                    `}
                    onClick={() => isMobile && setIsMobileMenuOpen(false)}
                  >
                    <div className={`
                      flex-shrink-0 w-6 text-center
                      ${normalizedPathname === item.path ? 'text-blue-600' : 'text-gray-600'}
                    `}>
                      {/* Użyj stanu isClient zamiast bezpośredniego sprawdzania window */}
                      {isClient && <item.IconComponent size={24} />}
                    </div>
                    <span className={`
                      ml-3 text-gray-700 whitespace-nowrap
                      transition-all duration-300
                      ${(hoveredSidebar || isMobileMenuOpen) ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}
                    `}>
                      {item.label}
                    </span>
                  </Link>
                </li>
              ))}
              {/* Wyświetl powiadomienie dla użytkowników oczekujących */}
              {userStatus === 'pending' && (
                <li className="mt-4">
                  <div className={`
                    flex items-center px-3 py-2
                    rounded-lg bg-yellow-50 border border-yellow-200
                    ${(hoveredSidebar || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0'}
                    transition-opacity duration-300
                  `}>
                    <div className="flex-shrink-0 w-6 text-center text-yellow-600">
                      {isClient && <AlertTriangle size={20} />}
                    </div>
                    <span className={`
                      ml-3 text-yellow-700 text-xs
                      ${(hoveredSidebar || isMobileMenuOpen) ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}
                    `}>
                      Twoje konto oczekuje na zatwierdzenie przez administratora
                    </span>
                  </div>
                </li>
              )}
              {/* Wyświetl powiadomienie dla użytkowników zablokowanych */}
              {userStatus === 'blocked' && !disableMenu && (
                <li className="mt-4">
                  <div className={`
                    flex items-center px-3 py-2
                    rounded-lg bg-red-50 border border-red-200
                    ${(hoveredSidebar || isMobileMenuOpen) ? 'opacity-100' : 'opacity-0'}
                    transition-opacity duration-300
                  `}>
                    <div className="flex-shrink-0 w-6 text-center text-red-600">
                      {isClient && <Lock size={20} />}
                    </div>
                    <span className={`
                      ml-3 text-red-700 text-xs
                      ${(hoveredSidebar || isMobileMenuOpen) ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}
                    `}>
                      Twoje konto zostało zablokowane. Skontaktuj się z administratorem.
                    </span>
                  </div>
                </li>
              )}
              {isMobile && (
                <li>
                  <button
                    onClick={handleLogout}
                    className={`
                      flex items-center h-11 px-3 w-full
                      rounded-lg transition-colors hover:bg-gray-50 cursor-pointer
                    `}
                  >
                    <div className="flex-shrink-0 w-6 text-center text-gray-600">
                      {isClient && <Power size={24} />}
                    </div>
                    <span className={`
                      ml-3 text-gray-700 whitespace-nowrap
                      transition-all duration-300
                      ${(hoveredSidebar || isMobileMenuOpen) ? 'opacity-100 w-auto' : 'opacity-0 w-0 overflow-hidden'}
                    `}>
                      Wyloguj się
                    </span>
                  </button>
                </li>
              )}
            </ul>
          </nav>
        </div>
      )}

      <div
        className={`transition-all duration-300 ease-in-out
          ${isMobile ? 'ml-0' : disableMenu ? 'ml-0' : hoveredSidebar ? 'ml-64' : 'ml-20'}
          flex-1 overflow-auto mt-16`}
      >
        <header className={`fixed top-0 left-0 w-full h-16 bg-white shadow-md z-50 flex items-center justify-between ${isMobile ? 'px-4' : 'px-6'}`}>
          <div className="flex items-center">
            {isMobile && !disableMenu && (
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="mr-4 p-2 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                aria-label={isMobileMenuOpen ? 'Zamknij menu' : 'Otwórz menu'}
              >
                {isMobileMenuOpen ? (
                  isClient && <X className="h-6 w-6 text-gray-600" />
                ) : (
                  isClient && <Menu className="h-6 w-6 text-gray-600" />
                )}
              </button>
            )}
            <div
              className={`h-8 md:h-12 w-auto mr-4 ${!disableMenu ? 'cursor-pointer' : ''}`}
              onClick={!disableMenu ? goToHome : undefined}
            >
              <Image
                src="/logo.png"
                alt="Logo aplikacji"
                width={120}
                height={48}
                className="h-full w-auto"
                priority
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                {user?.first_name && user?.last_name
                  ? `${user.first_name} ${user.last_name}`
                  : user?.email || ''}
              </span>

              {/* Zmieniona logika wyświetlania etykiet */}
              {userRoleFromAuth === 'GOD' && (
                <span className="text-xs px-2 py-1 rounded bg-violet-100 text-violet-800">
                  Super Admin
                </span>
              )}

              {userRoleFromAuth === 'ADMIN' && (
                <span className="text-xs px-2 py-1 rounded bg-violet-100 text-violet-800">
                  Admin
                </span>
              )}

              {userRoleFromAuth === 'USER' && userStatus && (
                <span className={`text-xs px-2 py-1 rounded ${
                  userStatus === 'pending'
                    ? 'bg-yellow-100 text-yellow-800'
                    : userStatus === 'blocked'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-blue-100 text-blue-800'
                }`}>
                  {getStatusLabel(user?.status)}
                </span>
              )}
            </div>
            {!isMobile && !disableMenu && (
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Wyloguj się"
              >
                {isClient && <Power className="h-5 w-5" />}
              </button>
            )}

            {/* Dodany przycisk wylogowania dla zablokowanych użytkowników */}
            {(disableMenu || userStatus === 'blocked') && (
              <button
                onClick={handleLogout}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                aria-label="Wyloguj się"
              >
                {isClient && <Power className="h-5 w-5" />}
              </button>
            )}
          </div>
        </header>

        <main className="pt-2 pb-6">
          {/* Only show the breadcrumb if not a full width page */}
            {!isFullWidthPage && !disableMenu && (
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-2 mx-4 md:mx-6">
                {/* Mobile layout - path with fitted width and supervisor code side by side */}
                <div className="flex flex-row items-center w-full md:w-auto gap-2">
                  <div className="bg-white px-4 py-1 rounded-lg shadow-sm inline-block">
                    <h2 className="text-s font-semibold text-gray-500">
                      {getCurrentPageLabel(pathname)}
                    </h2>
                  </div>

                  {/* Kod opiekuna na mobilnych urządzeniach - OBOK ścieżki strony po prawej */}
                  {isMobile && (userRoleFromAuth === 'ADMIN' || userRoleFromAuth === 'GOD') && (
                    <div className="bg-white px-4 py-1 rounded-lg shadow-sm flex-1 flex justify-center items-center">
                      <span className="text-s text-gray-500">
                        Kod: {
                          isLoadingSupervisorCode ?
                            '...' :
                            (adminSupervisorCode ?
                              <span className="text-green-600">{adminSupervisorCode}</span> :
                              'Oczekiwanie'
                            )
                        }
                      </span>

                      {adminSupervisorCode && !isLoadingSupervisorCode && (
                        <button
                          onClick={copyCodeToClipboard}
                          className="ml-2 p-1 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                          title="Kopiuj kod do schowka"
                        >
                          {isClient && <Clipboard className="h-4 w-4" />}
                        </button>
                      )}

                      {showCopiedNotification && (
                        <div className="absolute top-full mt-1 right-0 bg-green-100 text-green-800 px-3 py-2 rounded-md shadow-md text-xs z-50 animate-pulse">
                          Kod skopiowany do schowka!
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Desktop layout - kod opiekuna po środku, data po prawej */}
                <div className="hidden md:flex w-full justify-between items-center">
                  {/* Kod opiekuna na desktop - wyśrodkowany w ramce dopasowanej do tekstu */}
                  {!isMobile && (userRoleFromAuth === 'ADMIN' || userRoleFromAuth === 'GOD') && (
                    <div className="flex justify-center flex-1">
                      <div className="bg-white px-4 py-1 rounded-lg shadow-sm inline-flex items-center relative">
                        <span className="text-s text-gray-500">
                          Twój kod opiekuna: {
                            isLoadingSupervisorCode ?
                              '...' :
                              (adminSupervisorCode ?
                                <span className="text-green-600">{adminSupervisorCode}</span> :
                                'Oczekiwanie na dodanie kodu opiekuna'
                              )
                          }
                        </span>

                        {adminSupervisorCode && !isLoadingSupervisorCode && (
                          <button
                            onClick={copyCodeToClipboard}
                            className="ml-2 p-1 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                            title="Kopiuj kod do schowka"
                          >
                            {isClient && <Clipboard className="h-4 w-4" />}
                          </button>
                        )}

                        {showCopiedNotification && (
                          <div className="absolute top-full mt-1 right-0 bg-green-100 text-green-800 px-3 py-2 rounded-md shadow-md text-xs z-50 animate-pulse">
                            Kod skopiowany do schowka!
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Data tylko na desktopie */}
                  {isClient && (
                    <div className="hidden md:block bg-white px-4 py-1 rounded-lg shadow-sm ml-auto">
                      <span className="text-s font-semibold text-gray-500">
                        {new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

          {/* Apply different styling for full width pages */}
          <div className={`
            ${isFullWidthPage || disableMenu
              ? 'bg-white rounded-lg shadow-sm p-0 min-h-[calc(100vh-6rem)] overflow-hidden mx-4 md:mx-6'
              : 'bg-white rounded-lg shadow-sm p-1 md:p-6 min-h-[calc(100vh-160px)] mx-0 md:mx-6'
            }`}
          >
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;