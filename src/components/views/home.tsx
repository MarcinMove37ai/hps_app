// src/components/views/home.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Users, FileText, BarChart3, UserPlus, Bell, User, ChevronDown } from 'lucide-react';
import { UserProfile } from '@/types';

// Interfejs dla statystyk systemu
interface SystemStats {
  partners: {
    total: number;
    active: number;
    pending: number;
    blocked: number;
  };
  pages: {
    total: number;
    ebook: number;
    sales: number;
  };
  visits: {
    total: number;
    ebook: number;
    sales: number;
  };
  leads: {
    total: number;
    ebook: number;
    sales: number;
  };
}

// Nowy interfejs dla aktywności
interface Activity {
  id: string;
  kind: string;
  text: string;
  createdAt: string;
  userId: string;
  supervisorDescription?: string;
  typeInfo?: string;
  supervisorCode?: string;
}

// Interfejs dla paginacji
interface Pagination {
  offset: number;
  limit: number;
  total: number;
  hasMore: boolean;
}

const HomeView = () => {
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [stats, setStats] = useState<SystemStats>({
    partners: { total: 0, active: 0, pending: 0, blocked: 0 },
    pages: { total: 0, ebook: 0, sales: 0 },
    visits: { total: 0, ebook: 0, sales: 0 },
    leads: { total: 0, ebook: 0, sales: 0 }
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stany dla obsługi aktywności
  const [activities, setActivities] = useState<Activity[]>([]);
  const [isLoadingActivities, setIsLoadingActivities] = useState(true);
  const [activityError, setActivityError] = useState<string | null>(null);

  // Nowe stany dla obsługi paginacji
  const [pagination, setPagination] = useState<Pagination>({
    offset: 0,
    limit: 5,
    total: 0,
    hasMore: false
  });
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Funkcja do pobierania statystyk systemowych
  const fetchStats = useCallback(async () => {
    if (!userData) return;

    try {
      setIsLoading(true);
      setError(null);

      // Przygotuj parametry zapytania
      const params = new URLSearchParams();

      // Dodaj parametr z ID zalogowanego użytkownika, aby wyłączyć go z listy
      params.append('excludeUserId', userData.id);

      // Wywołaj API z danymi użytkownika
      const response = await fetch(`/api/stats?${params.toString()}`, {
        headers: {
          'X-User-Id': userData.id,
          'X-User-Role': userData.role,
          'X-User-Cognito-Sub': userData.cognito_sub,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas pobierania danych');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Błąd podczas pobierania statystyk:', err);
      setError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
    } finally {
      setIsLoading(false);
    }
  }, [userData]);

  // Zmodyfikowana funkcja do pobierania aktywności z obsługą paginacji
  const fetchActivities = useCallback(async (offset = 0, append = false) => {
    if (!userData) return;

    try {
      if (offset === 0) {
        setIsLoadingActivities(true);
      } else {
        setIsLoadingMore(true);
      }
      setActivityError(null);

      // Przygotuj parametry zapytania
      const params = new URLSearchParams();
      params.append('limit', '5'); // Limit do 5 aktywności
      params.append('offset', offset.toString());

      // Wywołaj API z danymi użytkownika
      const response = await fetch(`/api/activity?${params.toString()}`, {
        headers: {
          'X-User-Id': userData.id,
          'X-User-Role': userData.role,
          'X-User-Cognito-Sub': userData.cognito_sub,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas pobierania aktywności');
      }

      const data = await response.json();

      // Aktualizacja stanu w zależności od tego, czy dodajemy dane czy zastępujemy
      if (append) {
        setActivities(prev => [...prev, ...data.activities]);
      } else {
        setActivities(data.activities);
      }

      // Aktualizacja informacji o paginacji
      setPagination(data.pagination);

    } catch (err) {
      console.error('Błąd podczas pobierania aktywności:', err);
      setActivityError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd');
    } finally {
      if (offset === 0) {
        setIsLoadingActivities(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  }, [userData]);

  // Funkcja do ładowania kolejnych aktywności
  const loadMoreActivities = useCallback(() => {
    if (pagination.hasMore && !isLoadingMore) {
      const newOffset = pagination.offset + pagination.limit;
      fetchActivities(newOffset, true);
    }
  }, [pagination, isLoadingMore, fetchActivities]);

  // Pobierz dane użytkownika z sessionStorage przy pierwszym renderowaniu
  useEffect(() => {
    try {
      const storedUserData = sessionStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        console.log("Zalogowany użytkownik:", parsedUserData);
        setUserData(parsedUserData);
      }
    } catch (err) {
      console.error('Błąd podczas pobierania danych użytkownika:', err);
    }
  }, []);

  // Pobierz statystyki przy pierwszym renderowaniu i gdy zmienią się dane użytkownika
  useEffect(() => {
    if (userData) {
      fetchStats();
    }
  }, [userData, fetchStats]);

  // Pobierz aktywności przy pierwszym renderowaniu i gdy zmienią się dane użytkownika
  useEffect(() => {
    if (userData) {
      fetchActivities(0, false);
    }
  }, [userData, fetchActivities]);

  // Funkcja pomocnicza do formatowania daty
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString('pl-PL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateString;
    }
  };

  // Funkcja pomocnicza do wybierania ikony aktywności
  const getActivityIcon = (kind: string) => {
    switch (kind) {
      case 'new_lead':
        return <UserPlus size={18} className="text-violet-600" />;
      case 'new_page':
        return <FileText size={18} className="text-sky-600" />;
      case 'new_user':
        return <User size={18} className="text-emerald-600" />;
      default:
        return <Bell size={18} className="text-gray-600" />;
    }
  };

  // Funkcja pomocnicza do określania koloru tła dla aktywności
  const getActivityBgColor = (kind: string) => {
    switch (kind) {
      case 'new_lead':
        return 'bg-violet-100';
      case 'new_page':
        return 'bg-sky-100';
      case 'new_user':
        return 'bg-emerald-100';
      default:
        return 'bg-gray-100';
    }
  };

  // Funkcja pomocnicza do określania koloru obramowania dla aktywności
  const getActivityBorderColor = (kind: string) => {
    switch (kind) {
      case 'new_lead':
        return 'border-violet-200';
      case 'new_page':
        return 'border-sky-200';
      case 'new_user':
        return 'border-emerald-200';
      default:
        return 'border-gray-200';
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-4">
        <p className="text-gray-700 text-lg pb-3 mb-5 border-b border-gray-200">Witaj w Health Pro System CRM!</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-md">
            <p>{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {/* Partnerzy - delikatny pastelowy zielony */}
          <div className="bg-emerald-100 text-emerald-800 rounded-xl shadow-sm p-4 border border-emerald-200">
            <div className="flex items-center mb-2">
              <Users size={18} className="text-emerald-600 mr-2" />
              <h3 className="font-medium text-emerald-800">Partnerzy</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <p className="text-2xl font-semibold">{isLoading ? "..." : stats.partners.active}</p>
                <p className="text-emerald-600 text-xs">aktywni</p>
              </div>
              <div className="bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                <p className="text-2xl font-semibold">{isLoading ? "..." : stats.partners.pending}</p>
                <p className="text-emerald-600 text-xs">oczekujący</p>
              </div>
            </div>
          </div>

          {/* Strony - delikatny pastelowy niebieski */}
          <div className="bg-sky-100 text-sky-800 rounded-xl shadow-sm p-4 border border-sky-200">
            <div className="flex items-center mb-2">
              <FileText size={18} className="text-sky-600 mr-2" />
              <h3 className="font-medium text-sky-800">Strony</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-sky-50 p-2 rounded-lg border border-sky-200">
                <p className="text-2xl font-semibold">{isLoading ? "..." : stats.pages.ebook}</p>
                <p className="text-sky-600 text-xs">e-book</p>
              </div>
              <div className="bg-sky-50 p-2 rounded-lg border border-sky-200">
                <p className="text-2xl font-semibold">{isLoading ? "..." : stats.pages.sales}</p>
                <p className="text-sky-600 text-xs">sprzedaż</p>
              </div>
            </div>
          </div>

          {/* Wejścia - delikatny pastelowy pomarańczowy */}
          <div className="bg-orange-100 text-orange-800 rounded-xl shadow-sm p-4 border border-orange-200">
            <div className="flex items-center mb-2">
              <BarChart3 size={18} className="text-orange-600 mr-2" />
              <h3 className="font-medium text-orange-800">Wejścia</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-orange-50 p-2 rounded-lg border border-orange-200">
                <p className="text-2xl font-semibold">{isLoading ? "..." : stats.visits.ebook}</p>
                <p className="text-orange-600 text-xs">e-book</p>
              </div>
              <div className="bg-orange-50 p-2 rounded-lg border border-orange-200">
                <p className="text-2xl font-semibold">{isLoading ? "..." : stats.visits.sales}</p>
                <p className="text-orange-600 text-xs">sprzedaż</p>
              </div>
            </div>
          </div>

          {/* Leady - delikatny pastelowy fioletowy */}
          <div className="bg-violet-100 text-violet-800 rounded-xl shadow-sm p-4 border border-violet-200">
            <div className="flex items-center mb-2">
              <UserPlus size={18} className="text-violet-600 mr-2" />
              <h3 className="font-medium text-violet-800">Leady</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="bg-violet-50 p-2 rounded-lg border border-violet-200">
                <p className="text-2xl font-semibold">{isLoading ? "..." : stats.leads.ebook}</p>
                <p className="text-violet-600 text-xs">e-book</p>
              </div>
              <div className="bg-violet-50 p-2 rounded-lg border border-violet-200">
                <p className="text-2xl font-semibold">{isLoading ? "..." : stats.leads.sales}</p>
                <p className="text-violet-600 text-xs">sprzedaż</p>
              </div>
            </div>
          </div>
        </div>

        {/* Ostatnia aktywność - zaktualizowana sekcja z przyciskiem "Załaduj więcej" */}
        <div className="mt-6 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="text-md font-semibold text-gray-800">Ostatnia aktywność</h2>
          </div>

          {activityError && (
            <div className="bg-red-50 border-b border-red-200 text-red-700 p-3 text-sm">
              <p>{activityError}</p>
            </div>
          )}

          <div className="divide-y divide-gray-100">
            {isLoadingActivities ? (
              <div className="p-4 text-gray-500 text-center">
                <div className="animate-pulse flex justify-center">
                  <div className="h-4 w-4 bg-gray-300 rounded-full mx-1"></div>
                  <div className="h-4 w-4 bg-gray-300 rounded-full mx-1"></div>
                  <div className="h-4 w-4 bg-gray-300 rounded-full mx-1"></div>
                </div>
                <p className="mt-2">Ładowanie aktywności...</p>
              </div>
            ) : activities.length === 0 ? (
              <div className="p-4 text-gray-500 italic text-center">
                Brak aktywności do wyświetlenia
              </div>
            ) : (
              <>
                {activities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 h-10 w-10 rounded-full ${getActivityBgColor(activity.kind)} flex items-center justify-center border ${getActivityBorderColor(activity.kind)}`}>
                        {getActivityIcon(activity.kind)}
                      </div>
                      <div className="flex-1 min-w-0">
                        {activity.text.includes('|') ? (
  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
    <span className="font-semibold">{activity.text.split('|')[0]}</span>
    {activity.text.indexOf('|') > -1 && '|' + activity.text.substring(activity.text.indexOf('|') + 1)}
  </p>
) : (
  <p className="text-sm text-gray-800 font-medium whitespace-pre-wrap break-words">{activity.text}</p>
)}
                        <div className="flex flex-wrap gap-x-4 mt-1 text-xs text-gray-500">
                          <span>{formatDate(activity.createdAt)}</span>
                          {activity.supervisorDescription && (
                            <span className="flex items-center">
                              <span className="h-1 w-1 rounded-full bg-gray-300 mr-1"></span>
                              <span>Opiekun: {activity.supervisorDescription}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Przycisk "Załaduj więcej" */}
                {pagination.hasMore && (
                  <div className="p-3 bg-gray-50 border-t border-gray-200 text-center">
                    <button
                      onClick={loadMoreActivities}
                      disabled={isLoadingMore}
                      className="px-4 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mx-auto"
                    >
                      {isLoadingMore ? (
                        <>
                          <div className="animate-pulse flex justify-center mr-2">
                            <div className="h-1 w-1 bg-gray-500 rounded-full mx-0.5"></div>
                            <div className="h-1 w-1 bg-gray-500 rounded-full mx-0.5"></div>
                            <div className="h-1 w-1 bg-gray-500 rounded-full mx-0.5"></div>
                          </div>
                          Ładowanie...
                        </>
                      ) : (
                        <>
                          Załaduj więcej
                          <ChevronDown size={16} className="ml-1" />
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Informacja, gdy nie ma więcej danych */}
                {!pagination.hasMore && activities.length > 0 && pagination.total > 5 && (
                  <div className="p-3 text-gray-500 text-xs text-center border-t border-gray-200">
                    Wyświetlono wszystkie aktywności ({pagination.total})
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomeView;