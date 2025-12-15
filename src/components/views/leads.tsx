"use client"

import React, { useState, useEffect, useRef } from 'react';
import { UserPlus, Search, Download, Calendar, Clock, Loader2, AlertCircle, Database, RefreshCw, Terminal, UserCircle, Shield, Phone, Copy, X, CheckCircle2, AlertTriangle, Archive, MessageCircle } from 'lucide-react';
import { testApiEndpoint, checkDatabaseConnection } from '@/lib/api-test';

// Define types for leads and other data structures
interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  rawSource?: string;
  page?: string;
  rawPage?: string;
  createdAt: string;
  creator?: string | number;
  opiekun?: string;
  referrer?: string;
  buyNow?: boolean;
  status?: string; // Dodane pole status
  [key: string]: any; // for any other properties
}

interface UserProfile {
  id: string | number;
  firstName: string;
  lastName: string;
  fullName?: string;
}

interface SupervisorProfile {
  code: string;
  description: string;
}

const LeadsView = () => {
  const [activeTab, setActiveTab] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('');
  const [creatorFilter, setCreatorFilter] = useState('');
  const [opiekunFilter, setOpiekunFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // Nowy filtr statusu
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);

  // Nowe stany do obsługi popupu
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0 });
  const [isCopied, setIsCopied] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);

  // Stany do zarządzania danymi z API
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [permissionErrorLeadId, setPermissionErrorLeadId] = useState<string | null>(null); // Nowy stan dla błędu uprawnień
  const [diagnosticInfo, setDiagnosticInfo] = useState<any | null>(null);
  const [isDiagnosticRunning, setIsDiagnosticRunning] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any | null>(null);

  // Stan dla subtelnego ostrzeżenia
  const [subtleWarning, setSubtleWarning] = useState<string | null>(null);
  const [warningPosition, setWarningPosition] = useState({ x: 0, y: 0 });
  const warningRef = useRef<HTMLDivElement>(null);

  // Stan do przechowywania informacji o zalogowanym użytkowniku
  const [currentUser, setCurrentUser] = useState<{
      id: string;
      role: string;
      supervisor_code?: string;
      name: string;
      cognito_sub?: string;
  } | null>(null);
  const [isUserLoading, setIsUserLoading] = useState(true);

  // Stan do przechowywania kodu supervisora użytkownika
  const [userSupervisorCode, setUserSupervisorCode] = useState<string | null>(null);
  const [isSupervisorCodeLoading, setIsSupervisorCodeLoading] = useState(false);

  // Stany do przechowywania danych profili
  const [userProfiles, setUserProfiles] = useState<Record<string | number, UserProfile>>({});
  const [supervisorProfiles, setSupervisorProfiles] = useState<Record<string, SupervisorProfile>>({});
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [profilesLoaded, setProfilesLoaded] = useState(false);

  /// Zaktualizowana funkcja do cyklicznej zmiany statusu
  const handleStatusChange = async (leadId: string, currentStatus: string, event: React.MouseEvent) => {
    // Określ następny status w cyklu
    let nextStatus = 'b_contact'; // Domyślny status (pierwszy w cyklu)

    if (currentStatus === 'b_contact') {
      nextStatus = 'a_contact';
    } else if (currentStatus === 'a_contact') {
      nextStatus = 'archive';
    } else if (currentStatus === 'archive') {
      nextStatus = 'b_contact';
    }

    // Zapisz pozycję kliknięcia dla ewentualnego ostrzeżenia
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;
    const position = {
      x: event.clientX,
      y: rect.top + scrollTop
    };
    setWarningPosition(position);

    // Używamy ID leada zamiast ogólnego stanu ładowania
    setUpdatingStatusId(leadId);
    setError(null); // Resetuj poprzednie błędy
    setSubtleWarning(null); // Resetuj poprzednie ostrzeżenia
    setPermissionErrorLeadId(null); // Reset permission error

    try {
      console.log(`Aktualizacja statusu leada ${leadId} z ${currentStatus} na ${nextStatus}`);
      console.log(`Dane użytkownika: ID=${currentUser?.id}, Rola=${currentUser?.role}`);

      const response = await fetch('/api/leads', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
          'X-User-Role': currentUser?.role || '',
          'X-User-Cognito-Sub': currentUser?.cognito_sub || ''
        },
        body: JSON.stringify({
          id: leadId,
          status: nextStatus
        })
      });

      // Pobierz dane odpowiedzi
      const data = await response.json();

      // Sprawdź czy mamy ostrzeżenie o braku uprawnień
      if (data.hasPermission === false) {
        console.log('Warning:', data.warning);

        // Ustaw ID leada z błędem uprawnień i pokaż ostrzeżenie wewnątrz przycisku
        setPermissionErrorLeadId(leadId);

        // Pokaż również subtleWarning jako dodatkowy feedback
        setSubtleWarning(data.warning || 'Możesz zmienić status tylko swoich leadów');

        // Automatyczne resetowanie po 1 sekundzie
        setTimeout(() => {
          setPermissionErrorLeadId(null);
          setSubtleWarning(null);
        }, 1000);
        return;
      }

      // Obsłuż błędy HTTP innych niż brak uprawnień
      if (!response.ok) {
        let errorMessage = 'Nie udało się zaktualizować statusu leada';

        if (data && data.error) {
          errorMessage = data.error;
        }

        console.error('Error updating lead status:', errorMessage);
        setError(errorMessage);
        return;
      }

      console.log('Status updated successfully:', data);

      // Aktualizuj lokalny stan
      setLeads(prevLeads => prevLeads.map(lead =>
        lead.id === leadId ? { ...lead, status: nextStatus } : lead
      ));

      // Wyczyść ewentualny błąd
      setError(null);

    } catch (error) {
      console.error('Error updating lead status:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Błąd aktualizacji statusu: ${errorMessage}`);
    } finally {
      setUpdatingStatusId(null);
    }
  };

  // Efekt do zamykania ostrzeżenia po kliknięciu poza nim
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (warningRef.current && !warningRef.current.contains(event.target as Node)) {
        setSubtleWarning(null);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [warningRef]);

  // Funkcja pomocnicza do renderowania ikony statusu
  const renderStatusIcon = (status: string) => {
    switch(status) {
      case 'b_contact':
        return <span aria-label="Przed kontaktem"><AlertTriangle size={16} className="text-orange-500" /></span>;
      case 'a_contact':
        return <span aria-label="Po kontakcie"><MessageCircle size={16} className="text-green-500" /></span>;
      case 'archive':
        return <span aria-label="Archiwalny"><Archive size={16} className="text-gray-500" /></span>;
      default:
        return <span aria-label="Przed kontaktem"><AlertTriangle size={16} className="text-orange-500" /></span>;
    }
  };

  // Funkcja pomocnicza do wyświetlania tekstu statusu
  const getStatusText = (status: string) => {
    switch(status) {
      case 'b_contact':
        return 'Przed kontaktem';
      case 'a_contact':
        return 'Po kontakcie';
      case 'archive':
        return 'Archiwalny';
      default:
        return 'Przed kontaktem';
    }
  };

  // Efekt do zamykania popupu po kliknięciu poza nim
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        setIsPopupOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [popupRef]);

  // Funkcja do otwierania popupu dla wybranego leada
  const handleLeadClick = (lead: Lead, event: React.MouseEvent) => {
    setSelectedLead(lead);

    // Oblicz pozycję popupu względem punktu kliknięcia
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const scrollTop = window.scrollY || document.documentElement.scrollTop;

    setPopupPosition({
      x: event.clientX,
      y: rect.top + scrollTop // Pozycja Y względem dokumentu
    });

    setIsPopupOpen(true);
    setIsCopied(false); // Resetuj stan kopiowania
  };

  // Funkcja do kopiowania emaila do schowka
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      // Reset stanu "skopiowano" po 2 sekundach
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Nie udało się skopiować do schowka:', err);
    }
  };

  // Pobieranie informacji o zalogowanym użytkowniku
  const fetchCurrentUser = () => {
      setIsUserLoading(true);

      try {
        // Pobieranie danych użytkownika z sessionStorage
        const userDataJSON = sessionStorage.getItem('userData');

        if (!userDataJSON) {
          console.error('Brak danych użytkownika w sessionStorage');
          setError('Nie udało się pobrać danych użytkownika: brak danych w sessionStorage');
          return;
        }

        // Parsowanie JSON z sessionStorage
        const userData = JSON.parse(userDataJSON);

        // Ustawienie danych użytkownika na podstawie wartości z sessionStorage
        setCurrentUser({
          id: userData.id || 'unknown',
          role: userData.role,
          supervisor_code: userData.supervisor_code || '',
          // Utwórz pełne imię z first_name i last_name
          name: `${userData.first_name || ''} ${userData.last_name || ''}`.trim() || 'Użytkownik',
          cognito_sub: userData.cognito_sub || '' // Dodajemy cognito_sub
        });

        console.log('Pobrano dane użytkownika z sessionStorage, rola:', userData.role);
      } catch (error) {
        console.error('Błąd pobierania danych użytkownika:', error);
        const errorMessage = error instanceof Error ? error.message : String(error);
        setError('Nie udało się pobrać danych użytkownika: ' + errorMessage);
      } finally {
        setIsUserLoading(false);
      }
  };

  // Funkcja do pobierania kodu supervisora
  const fetchUserSupervisorCode = async (userName: string) => {
    try {
      setIsSupervisorCodeLoading(true);
      console.log(`======= SUPERVISOR CODE API REQUEST =======`);
      console.log(`User ID: ${currentUser?.id}`);
      console.log(`User Role: ${currentUser?.role}`);
      console.log(`Looking for supervisor code for name: ${userName}`);

      const response = await fetch(`/api/supervisor-code?name=${encodeURIComponent(userName)}`, {
        method: 'GET',
        headers: {
          'X-User-Id': currentUser?.id || '',
          'X-User-Role': currentUser?.role || '',
          'X-User-Cognito-Sub': currentUser?.cognito_sub || '', // Dodajemy cognito_sub
          'X-Debug': 'true'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch supervisor code: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Supervisor Code found: ${data.code}`);
      setUserSupervisorCode(data.code);
      return data.code;
    } catch (error) {
      console.error('Error fetching supervisor code:', error);
      return null;
    } finally {
      setIsSupervisorCodeLoading(false);
      console.log(`======= END OF SUPERVISOR CODE API REQUEST =======`);
    }
  };

  // Uruchamiamy pobieranie danych użytkownika TYLKO RAZ przy montowaniu komponentu
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  function isValidPage(page: any): page is string {
      return typeof page === 'string' && page !== '';
  }
  // Type guard functions to help TypeScript understand our filtering
  function isValidUserId(id: any): id is string | number {
    return id !== undefined && id !== null && id !== '';
  }

  function isValidSupervisorCode(code: any): code is string {
    return typeof code === 'string' && code !== '';
  }

  // ZOPTYMALIZOWANA funkcja do wsadowego pobierania danych profili
  const fetchProfilesBatch = async (userIds: (string | number | null | undefined)[], supervisorCodes: (string | null | undefined)[]) => {
    if (isLoadingProfiles) return; // Zabezpieczenie przed wielokrotnym wywołaniem

    setIsLoadingProfiles(true);

    try {
      // Odfiltruj puste wartości i zapobiegaj duplikatom
      const uniqueUserIds = [...new Set(userIds.filter(isValidUserId))];
      const uniqueSupervisorCodes = [...new Set(supervisorCodes.filter(isValidSupervisorCode))];

      if (uniqueUserIds.length === 0 && uniqueSupervisorCodes.length === 0) {
        setProfilesLoaded(true);
        return;
      }

      console.log('Pobieranie profili dla:', {
        userCount: uniqueUserIds.length,
        supervisorCount: uniqueSupervisorCodes.length
      });

      const response = await fetch('/api/profiles/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
          'X-User-Role': currentUser?.role || '',
          'X-User-Cognito-Sub': currentUser?.cognito_sub || ''
        },
        body: JSON.stringify({
          userIds: uniqueUserIds,
          supervisorCodes: uniqueSupervisorCodes
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Pobrano profili:', {
          users: Object.keys(data.users || {}).length,
          supervisors: Object.keys(data.supervisors || {}).length
        });

        if (Object.keys(data.users || {}).length > 0) {
          setUserProfiles(prevState => ({...prevState, ...data.users}));
        }

        if (Object.keys(data.supervisors || {}).length > 0) {
          setSupervisorProfiles(prevState => ({...prevState, ...data.supervisors}));
        }

        setProfilesLoaded(true);
      } else {
        const errorText = await response.text();
        console.error('Błąd podczas pobierania danych profili:', errorText);
      }

    } catch (error) {
      console.error('Błąd podczas pobierania danych profili:', error);
    } finally {
      setIsLoadingProfiles(false);
    }
  };

  // Funkcja do identyfikowania brakujących profili
  const getMissingProfiles = (currentLeads: Lead[]) => {
    // Zbieramy ID użytkowników i kody opiekunów, których jeszcze nie mamy
    const missingUserIds = currentLeads
      .map(lead => lead.creator)
      .filter(isValidUserId)
      .filter(id => !userProfiles[id]);

    const missingSupervisorCodes = currentLeads
      .map(lead => lead.opiekun)
      .filter(isValidSupervisorCode)
      .filter(code => !supervisorProfiles[code]);

    return {
      userIds: missingUserIds,
      supervisorCodes: missingSupervisorCodes
    };
  };

  // Funkcja do uruchomienia diagnostyki API
  const runDiagnostics = async () => {
    setIsDiagnosticRunning(true);
    setDiagnosticInfo(null);

    try {
      // Test API
      const apiTest = await testApiEndpoint('/api/leads');

      // Test połączenia z bazą danych
      const dbTest = await checkDatabaseConnection();

      setDiagnosticInfo({
        apiTest,
        dbTest,
        timestamp: new Date().toISOString()
      });

    } catch (err) {
      console.error('Error running diagnostics:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setDiagnosticInfo({
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsDiagnosticRunning(false);
    }
  };

  // Funkcja do inicjalizacji tabeli leads jeśli nie istnieje
  const initializeLeadsTable = async () => {
    setIsInitializing(true);
    setError(null);

    try {
      const response = await fetch('/api/initialize-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || '',
          'X-User-Role': currentUser?.role || '',
          'X-User-Cognito-Sub': currentUser?.cognito_sub || ''
        },
        body: JSON.stringify({ tables: ['leads'] })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Nieznany błąd inicjalizacji bazy danych');
      }

      // Jeśli inicjalizacja się powiodła, odśwież dane
      if (data.success) {
        setDiagnosticInfo({
          ...diagnosticInfo,
          initialization: {
            success: true,
            message: data.message || 'Inicjalizacja zakończona pomyślnie',
            details: data.details
          }
        });

        // Odśwież dane po inicjalizacji
        fetchLeads();
      } else {
        throw new Error(data.message || 'Inicjalizacja nie powiodła się');
      }
    } catch (err) {
      console.error('Error initializing database:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Błąd inicjalizacji bazy danych: ${errorMessage}`);
    } finally {
      setIsInitializing(false);
    }
  };

  // Funkcja do pobierania danych - wydzielona dla lepszej czytelności i ponownego użycia
  const fetchLeads = async () => {
    // Nie pobieraj leadów, jeśli nie mamy jeszcze danych użytkownika
    if (isUserLoading || !currentUser) {
      console.log('Oczekiwanie na dane użytkownika przed pobraniem leadów');
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorDetails(null);

    try {
      let url = '/api/leads';
      console.log('Pobieranie leadów dla użytkownika:', currentUser.role);
      console.log('Cognito Sub:', currentUser.cognito_sub);

      // Przygotowanie nagłówków - dodajemy kod supervisora tylko dla ADMIN
      const headers: Record<string, string> = {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'X-Debug': 'true',
        'X-User-Id': currentUser.id,
        'X-User-Role': currentUser.role,
        'X-User-Cognito-Sub': currentUser.cognito_sub || ''
      };

      // Dodajemy kod supervisora tylko jeśli mamy do czynienia z ADMIN i kod został pobrany
      if (currentUser.role === 'ADMIN' && userSupervisorCode) {
        console.log('Używam kodu supervisora dla ADMIN:', userSupervisorCode);
        headers['X-Supervisor-Code'] = userSupervisorCode;
      } else {
        console.log('Nie używam kodu supervisora dla roli', currentUser.role);
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: headers
      });

      console.log('Response status:', response.status);

      let responseBody;
      try {
        responseBody = await response.text();
      } catch (textError) {
        console.error('Failed to read response text:', textError);
      }

      if (!response.ok) {
        try {
          const errorData = JSON.parse(responseBody || '{}');
          console.error('API Error Response Data:', errorData);

          setErrorDetails(errorData.details || null);

          const errorMessage = (errorData.error || '') + (errorData.message || '');
          const isMissingTable =
            errorMessage.includes("nie istnieje") ||
            errorMessage.includes("does not exist") ||
            (errorData.details &&
             typeof errorData.details === 'string' &&
             errorData.details.includes("relation") &&
             errorData.details.includes("does not exist"));

          if (isMissingTable) {
            throw new Error(`Tabela nie istnieje w bazie danych. ${errorData.error || ''}`);
          } else {
            throw new Error(`API błąd: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
          }
        } catch (jsonError) {
          if (!(jsonError instanceof SyntaxError)) {
            throw jsonError;
          }
          throw new Error(`API błąd: ${response.status} ${response.statusText}. Sprawdź konsole deweloperską.`);
        }
      }

      let data;
      try {
        data = JSON.parse(responseBody || '{}');
      } catch (jsonError) {
        console.error('Error parsing JSON response:', jsonError);
        throw new Error('Nieprawidłowy format odpowiedzi API (niepoprawny JSON).');
      }

      if (!data.leads) {
        console.error('Unexpected API response format:', data);
        throw new Error('Nieprawidłowy format odpowiedzi API. Brak danych "leads".');
      }

      const newLeads = data.leads;
      console.log(`Pobrano ${newLeads.length} leadów`);
      setLeads(newLeads);

      // Pobierz tylko brakujące profile dla nowych leadów
      if (newLeads.length > 0 && !isLoadingProfiles) {
        const missingProfiles = getMissingProfiles(newLeads);
        if (missingProfiles.userIds.length > 0 || missingProfiles.supervisorCodes.length > 0) {
          fetchProfilesBatch(missingProfiles.userIds, missingProfiles.supervisorCodes);
        }
      }

    } catch (err) {
      console.error('Error fetching leads:', err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(`Błąd pobierania danych: ${errorMessage}`);
      setLeads([]);
    } finally {
      setIsLoading(false);
    }
  };

  // POPRAWIONA WERSJA: Pobieranie kodu supervisora tylko dla ADMIN, a dla innych ról od razu pobieranie leadów
  useEffect(() => {
    if (!isUserLoading && currentUser) {
      console.log('Dane użytkownika załadowane, rola:', currentUser.role);

      // Kod supervisora pobieramy tylko dla użytkowników typu ADMIN
      if (currentUser.role === 'ADMIN') {
        console.log('Użytkownik ADMIN - pobieram kod supervisora:', currentUser.name);
        const userName = currentUser.name.trim();
        if (userName) {
          fetchUserSupervisorCode(userName).then(code => {
            console.log('Kod supervisora pobrany:', code || 'brak');
            fetchLeads();
          }).catch(error => {
            console.error('Błąd podczas pobierania kodu supervisora:', error);
            // Nawet jeśli nie udało się pobrać kodu supervisora, i tak próbujemy pobrać leady
            fetchLeads();
          });
        } else {
          // Jeśli nie ma nazwy użytkownika, pobieramy leady bez kodu supervisora
          fetchLeads();
        }
      } else {
        // Dla użytkowników USER i GOD od razu pobieramy leady bez kodu supervisora
        console.log('Użytkownik', currentUser.role, '- pomijam pobieranie kodu supervisora');
        fetchLeads();
      }
    }
  }, [isUserLoading, currentUser]);

  // Funkcje pomocnicze do wyświetlania danych profili
  const getUserName = (userId: string | number | null | undefined): string => {
    if (!userId) return '—';

    const profile = userProfiles[userId];
    if (profile) {
      return profile.fullName || `${profile.firstName} ${profile.lastName}`.trim() || String(userId);
    }

    return String(userId);
  };

  const getSupervisorName = (code: string | null | undefined): string => {
    if (!code) return '—';

    const profile = supervisorProfiles[code];
    if (profile) {
      return profile.description || code;
    }

    return code;
  };

  // Funkcja pomocnicza do debugowania formatów danych
  const logLeadFormats = () => {
    if (leads.length > 0) {
      console.log('Przykładowy lead:', {
        id: leads[0].id,
        source: leads[0].source,
        rawSource: leads[0].rawSource,
        createdAt: leads[0].createdAt,
        creator: leads[0].creator,
        opiekun: leads[0].opiekun,
        buyNow: leads[0].buyNow,
        status: leads[0].status // Dodane pole status do logu
      });
    }
  };

  // Wywołanie funkcji pomocniczej przy pierwszym załadowaniu danych
  useEffect(() => {
    if (leads.length > 0) {
      logLeadFormats();
    }
  }, [leads.length > 0]);

  // Funkcja do zamknięcia modalu
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setLeadToDelete(null);
  };

  // Uproszczona funkcja do parsowania daty
  const parseDate = (dateStr: string | null | undefined): Date | null => {
    if (!dateStr) return null;

    try {
      // 1. Najpierw próbujemy standardowego parsowania
      let date = new Date(dateStr);

      // 2. Sprawdź czy data jest prawidłowa
      if (!isNaN(date.getTime())) {
        return date;
      }

      // 3. Próba parsowania różnych formatów europejskich
      const europeanFormats = [
        /(\d{1,2})\.(\d{1,2})\.(\d{4})/,  // DD.MM.YYYY
        /(\d{1,2})-(\d{1,2})-(\d{4})/,    // DD-MM-YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/   // DD/MM/YYYY
      ];

      for (const regex of europeanFormats) {
        const match = dateStr.match(regex);
        if (match) {
          const [_, day, month, year] = match;
          date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }

      // 4. Sprawdź formaty z 2-cyfrowym rokiem (DD.MM.YY)
      const shortYearFormats = [
        /(\d{1,2})\.(\d{1,2})\.(\d{2})/,  // DD.MM.YY
        /(\d{1,2})-(\d{1,2})-(\d{2})/,    // DD-MM-YY
        /(\d{1,2})\/(\d{1,2})\/(\d{2})/   // DD/MM/YY
      ];

      for (const regex of shortYearFormats) {
        const match = dateStr.match(regex);
        if (match) {
          const [_, day, month, shortYear] = match;
          const year = parseInt(shortYear) < 50 ? 2000 + parseInt(shortYear) : 1900 + parseInt(shortYear);
          date = new Date(year, parseInt(month) - 1, parseInt(day));
          if (!isNaN(date.getTime())) {
            return date;
          }
        }
      }

      // 5. Sprawdź czy to timestamp
      if (/^\d+$/.test(dateStr)) {
        const timestamp = parseInt(dateStr);
        // Jeśli to sekundy (mniejsze niż 10^13), to konwertujemy na milisekundy
        date = timestamp < 10000000000000 ? new Date(timestamp * 1000) : new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }

      return null;
    } catch (error) {
      console.error("Error parsing date:", error);
      return null;
    }
  };

  // Funkcja do sprawdzania, czy dwie daty reprezentują ten sam dzień
  // Dodano sprawdzanie null/undefined
  const isSameDay = (date1: Date | null, date2: Date | null): boolean => {
    if (!date1 || !date2) return false;

    return date1.getDate() === date2.getDate() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getFullYear() === date2.getFullYear();
  };

  // Funkcja do formatowania daty w sposób przyjazny dla urządzeń mobilnych
  const formatDateForMobile = (dateStr: string): JSX.Element => {
    if (!dateStr) return <span>—</span>;

    // Znajdź pozycję spacji między datą a czasem
    const spaceIndex = dateStr.indexOf(' ');

    // Jeśli nie ma spacji, zwróć oryginalny string
    if (spaceIndex === -1) return <span>{dateStr}</span>;

    // Podziel string na datę i czas
    const datePart = dateStr.substring(0, spaceIndex);
    const timePart = dateStr.substring(spaceIndex + 1);

    // Zwróć elementy z wymuszonym łamaniem linii wewnątrz komórki, ale nie samej komórki
    return (
      <div className="whitespace-normal">
        <div>{datePart}</div>
        <div className="text-xs text-gray-400">{timePart}</div>
      </div>
    );
  };

  // Funkcja diagnostyczna do debugowania dat
  const debugDateParsing = () => {
    console.log("====== DIAGNOSTYKA DAT ======");
    console.log("Dzisiejsza data (północ):", today.toISOString());
    console.log("Wczorajsza data (północ):", yesterday.toISOString());

    if (leads.length > 0) {
      // Sprawdź kilka przykładowych dat z leadów
      console.log("Przykładowe parsowanie dat:");
      leads.slice(0, 3).forEach(lead => {
        const dateStr = lead.createdAt;
        const parsed = parseDate(dateStr);
        console.log({
          id: lead.id,
          oryginalnaData: dateStr,
          sparsowanaData: parsed ? parsed.toISOString() : "BŁĄD PARSOWANIA",
          dzisiaj: parsed ? isSameDay(parsed, today) : false,
          wczoraj: parsed ? isSameDay(parsed, yesterday) : false
        });
      });
    }

    console.log("Liczba leadów dzisiaj:", todayLeads.length);
    console.log("Liczba leadów wczoraj:", yesterdayLeads.length);
    console.log("============================");
  };

  // UPROSZCZONA funkcja getFilteredLeadsByPermission
  // Teraz po prostu zwraca wszystkie leady, bo filtrowanie odbywa się na backendzie
  const getFilteredLeadsByPermission = (): Lead[] => {
    // Jeśli nie mamy danych użytkownika, zwróć pustą tablicę
    if (!currentUser) {
      console.log("Brak danych użytkownika - zwracam pustą tablicę");
      return [];
    }

    // Dane są już przefiltrowane na poziomie API
    console.log("Dane już przefiltrowane przez API, liczba leadów:", leads.length);
    return leads;
  };

  // Filtrowane leady na podstawie wyszukiwania i innych filtrów
  const getFilteredLeads = (): Lead[] => {
    // Najpierw zastosuj filtrowanie wg uprawnień
    // (teraz to prosty pass-through, bo filtrowanie odbywa się w API)
    let filteredResults = getFilteredLeadsByPermission();

    // Następnie zastosuj filtrowanie wg. zakładek
    if (activeTab === 'ebook') {
      filteredResults = filteredResults.filter(lead => {
        // Filtruj po różnych wariantach "e-book"
        const sourceLC = (lead.source || '').toString().toLowerCase().trim();
        const rawSourceLC = (lead.rawSource || '').toString().toLowerCase().trim();
        const ebookPatterns = ['e-book', 'ebook', 'e book'];
        return ebookPatterns.some(pattern =>
          sourceLC.includes(pattern) || rawSourceLC.includes(pattern)
        );
      });
    } else if (activeTab === 'sales') {
      filteredResults = filteredResults.filter(lead => {
        // Filtruj po różnych wariantach "sprzedaż" lub "sale"
        const sourceLC = (lead.source || '').toString().toLowerCase().trim();
        const rawSourceLC = (lead.rawSource || '').toString().toLowerCase().trim();
        const salesPatterns = ['sprzedaż', 'sale', 'sprzedaz'];
        return salesPatterns.some(pattern =>
          sourceLC.includes(pattern) || rawSourceLC.includes(pattern)
        );
      });
    }

    // Zastosuj filtr wyszukiwania
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filteredResults = filteredResults.filter(lead =>
        (lead.name && lead.name.toLowerCase().includes(query)) ||
        (lead.email && lead.email.toLowerCase().includes(query)) ||
        (lead.page && lead.page.toLowerCase().includes(query))
      );
    }

    // Zastosuj filtr źródła - filtruj po polu page (nazwa źródła/strony)
    if (sourceFilter) {
      filteredResults = filteredResults.filter(lead => {
        // Porównujemy wartość pola page z wybranym filtrem
        return lead.page && String(lead.page).trim() === String(sourceFilter).trim();
      });
    }

    // Zastosuj filtr twórcy - porównujemy stringi
    if (creatorFilter) {
      filteredResults = filteredResults.filter(lead => {
        return String(lead.creator) === String(creatorFilter);
      });
    }

    // Zastosuj filtr opiekuna - porównujemy stringi
    if (opiekunFilter) {
      filteredResults = filteredResults.filter(lead => {
        return String(lead.opiekun) === String(opiekunFilter);
      });
    }

    // Zastosuj filtr statusu
    if (statusFilter) {
      if (statusFilter === 'active') {
        // Pokaż tylko aktywne leady (przed i po kontakcie)
        filteredResults = filteredResults.filter(lead =>
          lead.status === 'b_contact' || lead.status === 'a_contact' || !lead.status
        );
      } else if (statusFilter === 'archive') {
        // Pokaż tylko zarchiwizowane leady
        filteredResults = filteredResults.filter(lead => lead.status === 'archive');
      }
    }

    return filteredResults;
  };

  // Funkcja pomocnicza do sprawdzania typu leada
  const isLeadOfType = (lead: Lead | null | undefined, patterns: string[]): boolean => {
    if (!lead) return false;
    const sourceLC = (lead.source || '').toString().toLowerCase().trim();
    const rawSourceLC = (lead.rawSource || '').toString().toLowerCase().trim();

    return patterns.some(pattern =>
      sourceLC.includes(pattern) || rawSourceLC.includes(pattern)
    );
  };

  // Przygotowanie dat - dzisiejsza i wczorajsza (resetujemy czas do północy)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  // Uzyskanie przefiltrowanych leadów
  const permissionFilteredLeads = getFilteredLeadsByPermission();
  const filteredLeads = getFilteredLeads();

  // Wyliczanie danych do statystyk
  const ebookLeads = permissionFilteredLeads.filter(lead => {
    const ebookPatterns = ['e-book', 'ebook', 'e book'];
    return isLeadOfType(lead, ebookPatterns);
  });

  const salesLeads = permissionFilteredLeads.filter(lead => {
    const salesPatterns = ['sprzedaż', 'sale', 'sprzedaz'];
    return isLeadOfType(lead, salesPatterns);
  });

  const todayLeads = permissionFilteredLeads.filter(lead => {
    const leadDate = parseDate(lead.createdAt);
    return leadDate && isSameDay(leadDate, today);
  });

  const yesterdayLeads = permissionFilteredLeads.filter(lead => {
    const leadDate = parseDate(lead.createdAt);
    return leadDate && isSameDay(leadDate, yesterday);
  });

  // Dodaj diagnostykę dat po załadowaniu danych
  useEffect(() => {
    if (leads.length > 0) {
      debugDateParsing();
    }
  }, [leads.length > 0]);

  // Przygotuj dane do filtrów z uwzględnieniem nazw z profili i filtrowania wg uprawnień
  const uniquePages = [...new Set(permissionFilteredLeads.map(lead =>
      lead.page ? String(lead.page) : null
  ))].filter(isValidPage);

  // Twórcy z nazwami zamiast ID
  const creatorOptions = [...new Set(permissionFilteredLeads.map(lead => lead.creator))]
    .filter(isValidUserId)
    .map(creatorId => ({
      id: creatorId,
      name: getUserName(creatorId) || `${creatorId}`
    }))
    .sort((a, b) => {
      const nameA = String(a.name || '');
      const nameB = String(b.name || '');
      return nameA.localeCompare(nameB);
    });

  // Opiekunowie z opisami zamiast kodów
  const opiekunOptions = [...new Set(permissionFilteredLeads.map(lead => lead.opiekun))]
    .filter(isValidSupervisorCode)
    .map(opiekunCode => ({
      code: opiekunCode,
      name: getSupervisorName(opiekunCode) || `${opiekunCode}`
    }))
    .sort((a, b) => {
      const nameA = String(a.name || '');
      const nameB = String(b.name || '');
      return nameA.localeCompare(nameB);
    });

  // Funkcja pomocnicza do sprawdzenia, czy profil użytkownika istnieje
  const hasUserProfile = (userId: string | number | null | undefined): boolean => {
    if (!userId) return false;
    return !!userProfiles[userId];
  };

  // Funkcja pomocnicza do sprawdzenia, czy profil opiekuna istnieje
  const hasSupervisorProfile = (code: string | null | undefined): boolean => {
    if (!code) return false;
    return !!supervisorProfiles[code];
  };

  // Jeśli dane użytkownika są ładowane, pokaż loader
  if (isUserLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 size={32} className="animate-spin text-violet-600" />
        <span className="ml-2 text-gray-600">Ładowanie danych użytkownika...</span>
      </div>
    );
  }

  // Jeśli dane użytkownika są załadowane, ale kod supervisora jest ładowany dla ADMIN
  if (!isUserLoading && currentUser && currentUser.role === 'ADMIN' && isSupervisorCodeLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 size={32} className="animate-spin text-violet-600" />
        <span className="ml-2 text-gray-600">Pobieranie kodu supervisora...</span>
      </div>
    );
  }

  // Jeśli nie udało się załadować danych użytkownika, wyświetl błąd
  if (!currentUser) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
        <div className="flex items-start">
          <AlertCircle className="mr-2 mt-0.5" size={18} />
          <div>
            <div className="font-semibold mb-1">Błąd:</div>
            <div>Nie udało się załadować danych użytkownika.</div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchCurrentUser}
            className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  // Główny render komponentu (tylko gdy dane użytkownika są dostępne)
  return (
    <div className="space-y-6">
      <div className="p-4">
        <div className="flex justify-between items-center pb-3 mb-5 border-b border-gray-200">
          <div className="flex items-center">
            <p className="text-gray-700 text-lg">Leady</p>

          </div>
          <button className="flex items-center bg-violet-500 hover:bg-violet-600 text-white px-4 py-2 rounded-md text-sm">
            <Download size={16} className="mr-2" />
            Eksportuj leady
          </button>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          {/* Wszystkie */}
          <div className="bg-violet-50 text-violet-700 rounded-xl shadow-sm p-4 border border-violet-100">
            <div className="flex items-center mb-2">
              <UserPlus size={18} className="text-violet-500 mr-2" />
              <h3 className="font-medium text-violet-700">Wszystkie</h3>
            </div>
            <p className="text-3xl font-semibold">{permissionFilteredLeads.length}</p>
          </div>

          {/* E-booki */}
          <div className="bg-indigo-50 text-indigo-700 rounded-xl shadow-sm p-4 border border-indigo-100">
            <div className="flex items-center mb-2">
              <UserPlus size={18} className="text-indigo-500 mr-2" />
              <h3 className="font-medium text-indigo-700">E-booki</h3>
            </div>
            <p className="text-3xl font-semibold">{ebookLeads.length}</p>
          </div>

          {/* Sprzedaż */}
          <div className="bg-purple-50 text-purple-700 rounded-xl shadow-sm p-4 border border-purple-100">
            <div className="flex items-center mb-2">
              <UserPlus size={18} className="text-purple-500 mr-2" />
              <h3 className="font-medium text-purple-700">Sprzedaż</h3>
            </div>
            <p className="text-3xl font-semibold">{salesLeads.length}</p>
          </div>

          {/* Dziś */}
          <div className="bg-sky-50 text-sky-700 rounded-xl shadow-sm p-4 border border-sky-100">
            <div className="flex items-center mb-2">
              <Calendar size={18} className="text-sky-500 mr-2" />
              <h3 className="font-medium text-sky-700">Dziś</h3>
            </div>
            <p className="text-3xl font-semibold">{todayLeads.length}</p>
          </div>

          {/* Wczoraj */}
          <div className="bg-gray-50 text-gray-700 rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center mb-2">
              <Clock size={18} className="text-gray-500 mr-2" />
              <h3 className="font-medium text-gray-700">Wczoraj</h3>
            </div>
            <p className="text-3xl font-semibold">{yesterdayLeads.length}</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Szukaj leada..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-5">
          <nav className="flex -mb-px space-x-8 overflow-x-auto">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'all'
                  ? 'border-violet-500 text-violet-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Wszystkie
            </button>
            <button
              onClick={() => setActiveTab('ebook')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'ebook'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              E-booki
            </button>
            <button
              onClick={() => setActiveTab('sales')}
              className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                activeTab === 'sales'
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Sprzedaż
            </button>
          </nav>
        </div>

        {/* Error message with diagnostics and initialization */}
        {error && (
          <div className="mb-5 p-4 bg-red-50 text-red-700 rounded-md border border-red-200">
            <div className="flex items-start">
              <AlertCircle className="mr-2 mt-0.5" size={18} />
              <div className="flex-1">
                <div className="font-semibold mb-1">Błąd:</div>
                <div>{error}</div>

                {/* Wyświetlanie szczegółów błędu z API jeśli dostępne */}
                {errorDetails && (
                  <div className="mt-3 p-3 bg-red-100 rounded text-sm font-mono overflow-auto max-h-40">
                    <div className="font-medium mb-1">Szczegóły błędu:</div>
                    <pre>{typeof errorDetails === 'object'
                      ? JSON.stringify(errorDetails, null, 2)
                      : errorDetails}
                    </pre>
                  </div>
                )}

                {/* Wyświetlanie przycisku inicjalizacji jeśli błąd dotyczy brakującej tabeli */}
                {error.includes('Tabela nie istnieje') && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <div className="font-medium mb-1">Możliwe rozwiązanie:</div>
                    <p className="mb-2 text-sm">
                      Brakuje tabeli 'leads' w bazie danych. Możesz spróbować utworzyć tabelę automatycznie.
                    </p>
                    <button
                      onClick={initializeLeadsTable}
                      disabled={isInitializing}
                      className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded text-sm font-medium flex items-center"
                    >
                      {isInitializing ? (
                        <>
                          <Loader2 size={14} className="mr-1 animate-spin" />
                          Inicjalizacja tabeli...
                        </>
                      ) : (
                        <>
                          <Terminal size={14} className="mr-1" />
                          Utwórz tabelę leads
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-4 flex justify-between">
              <button
                onClick={runDiagnostics}
                className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded text-sm font-medium flex items-center"
                disabled={isDiagnosticRunning}
              >
                {isDiagnosticRunning ? (
                  <>
                    <Loader2 size={14} className="mr-1 animate-spin" />
                    Diagnostyka...
                  </>
                ) : (
                  <>
                    <Database size={14} className="mr-1" />
                    Uruchom diagnostykę
                  </>
                )}
              </button>

              <button
                onClick={fetchLeads}
                className="px-3 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded text-sm font-medium flex items-center"
                disabled={isLoading}
              >
                <RefreshCw size={14} className="mr-1" />
                Odśwież
              </button>
            </div>
          </div>
        )}

        {/* Diagnostic results */}
        {diagnosticInfo && !error && (
          <div className="mb-5 p-4 bg-blue-50 text-blue-700 rounded-md border border-blue-200">
            <div className="font-semibold mb-2">Wyniki diagnostyki:</div>

            <div className="mb-2">
              <div className="font-medium">Połączenie z API:</div>
              <div className="text-sm ml-4">
                {diagnosticInfo.apiTest?.success ? (
                  <span className="text-green-600">✓ Połączenie z API działa poprawnie</span>
                ) : (
                  <span className="text-red-600">✗ Problem z API: {diagnosticInfo.apiTest?.message}</span>
                )}
              </div>
            </div>

            <div className="mb-2">
              <div className="font-medium">Baza danych:</div>
              <div className="text-sm ml-4">
                {diagnosticInfo.dbTest?.success ? (
                  <span className="text-green-600">✓ Połączenie z bazą danych działa poprawnie</span>
                ) : (
                  <span className="text-red-600">✗ Problem z bazą danych: {diagnosticInfo.dbTest?.message}</span>
                )}
              </div>
            </div>

            <div className="mt-4 text-xs text-gray-500">
              Diagnostyka wykonana: {new Date(diagnosticInfo.timestamp).toLocaleString()}
            </div>

            <div className="mt-2 flex justify-end">
              <button
                onClick={() => setDiagnosticInfo(null)}
                className="px-2 py-1 text-xs text-blue-700 hover:underline"
              >
                Ukryj
              </button>
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center p-12">
            <Loader2 size={32} className="animate-spin text-violet-600" />
            <span className="ml-2 text-gray-600">Ładowanie danych...</span>
          </div>
        ) : (
          <>
            {/* Leads table */}
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="min-w-full divide-y divide-gray-200" style={{ tableLayout: 'fixed' }}>
                <thead className="bg-gray-50">
                  <tr>
                    {/* Data - stała szerokość dla wszystkich ról */}
                    <th scope="col" style={{ width: "180px" }} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Data
                    </th>

                    {/* Lead - szerokość zależy od liczby kolumn */}
                    <th scope="col"
                        style={{
                          width: currentUser.role === 'USER' ? "350px" : "260px"
                        }}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Lead
                    </th>

                    {/* Źródło/Strona - szerokość zależy od liczby kolumn */}
                    <th scope="col"
                        style={{
                          width: currentUser.role === 'USER' ? "350px" : "260px"
                        }}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Źródło/Strona</span>
                        <select
                          value={sourceFilter}
                          onChange={(e) => setSourceFilter(e.target.value)}
                          className="text-sm normal-case font-normal px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                          style={{ width: "120px", textOverflow: "ellipsis" }}
                        >
                          <option value="">Wszystkie</option>
                          {uniquePages.map((page, index) => (
                            <option key={index} value={page} title={page}>{page}</option>
                          ))}
                        </select>
                      </div>
                    </th>

                    {/* Twórca - wyświetlamy tylko dla roli GOD i ADMIN */}
                    {currentUser.role !== 'USER' && (
                      <th scope="col" style={{ width: "200px" }} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <span>Twórca</span>
                          <select
                            value={creatorFilter}
                            onChange={(e) => setCreatorFilter(e.target.value)}
                            className="text-sm normal-case font-normal px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                            style={{ width: "100px", textOverflow: "ellipsis" }}
                          >
                            <option value="">Wszyscy</option>
                            {creatorOptions.map((creator) => (
                              <option key={creator.id} value={creator.id} title={creator.name}>
                                {creator.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </th>
                    )}

                    {/* Opiekun - wyświetlamy tylko dla roli GOD */}
                    {currentUser.role === 'GOD' && (
                      <th scope="col" style={{ width: "200px" }} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        <div className="flex items-center space-x-2">
                          <span>Opiekun</span>
                          <select
                            value={opiekunFilter}
                            onChange={(e) => setOpiekunFilter(e.target.value)}
                            className="text-sm normal-case font-normal px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                            style={{ width: "100px", textOverflow: "ellipsis" }}
                          >
                            <option value="">Wszyscy</option>
                            {opiekunOptions.map((opiekun) => (
                              <option key={opiekun.code} value={opiekun.code} title={opiekun.name}>
                                {opiekun.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </th>
                    )}

                    {/* Status - nowa kolumna zamiast Akcji */}
                    <th scope="col" style={{ width: "140px" }} className="px-2 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <div className="flex items-center space-x-2">
                        <span>Status</span>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="text-sm normal-case font-normal px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-violet-500"
                          style={{ width: "120px", textOverflow: "ellipsis" }}
                        >
                          <option value="">Wszystkie</option>
                          <option value="active">Aktywne</option>
                          <option value="archive">Archiwalne</option>
                        </select>
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={currentUser.role === 'GOD' ? 6 : (currentUser.role === 'ADMIN' ? 5 : 4)} className="px-6 py-8 text-center text-gray-500">
                        Nie znaleziono żadnych leadów spełniających kryteria wyszukiwania.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map(lead => (
                      <tr
                        key={lead.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={(e) => handleLeadClick(lead, e)}
                      >
                        {/* Data - z formatowaniem przyjaznym dla urządzeń mobilnych */}
                        <td className="px-6 py-4 whitespace-nowrap"
                            style={{ width: "130px", maxWidth: "130px", overflow: "visible" }}>
                          <div className="text-sm text-gray-500">
                            {formatDateForMobile(lead.createdAt)}
                          </div>
                          {lead.buyNow && (
                            <div className="mt-1">
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                                Pilny kontakt!
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Lead */}
                        <td className="px-6 py-4 whitespace-nowrap"
                            style={{
                              width: currentUser.role === 'USER' ? "350px" : "260px",
                              maxWidth: currentUser.role === 'USER' ? "350px" : "260px",
                              overflow: "hidden"
                            }}>
                          <div className="flex items-center">
                            <div>
                              <div className="text-sm font-medium text-gray-900 truncate"
                                  style={{ maxWidth: currentUser.role === 'USER' ? "330px" : "240px" }}>
                                {lead.name}
                              </div>
                              <div className="text-sm text-gray-500 truncate"
                                  style={{ maxWidth: currentUser.role === 'USER' ? "330px" : "240px" }}>
                                {lead.email}
                              </div>
                              {lead.phone && <div className="text-sm text-gray-500 truncate"
                                              style={{ maxWidth: currentUser.role === 'USER' ? "330px" : "240px" }}>
                                {lead.phone}
                              </div>}
                            </div>
                          </div>
                        </td>

                        {/* Źródło/Strona */}
                        <td className="px-6 py-4 whitespace-nowrap"
                            style={{
                              width: currentUser.role === 'USER' ? "350px" : "260px",
                              maxWidth: currentUser.role === 'USER' ? "350px" : "260px",
                              overflow: "hidden"
                            }}>
                          <div className="text-sm text-gray-900 truncate"
                              style={{ maxWidth: currentUser.role === 'USER' ? "330px" : "240px" }}>
                            {lead.page}
                          </div>
                          <div className="flex items-center">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full
                              ${isLeadOfType(lead, ['e-book', 'ebook', 'e book'])
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-purple-100 text-purple-800'}`}>
                              {lead.source}
                            </span>
                          </div>
                        </td>

                        {/* Twórca - tylko dla GOD i ADMIN */}
                        {currentUser.role !== 'USER' && (
                          <td className="px-6 py-4 whitespace-nowrap"
                              style={{ width: "200px", maxWidth: "200px", overflow: "hidden" }}>
                            <div className="text-sm font-medium text-gray-900 truncate" style={{ maxWidth: "180px" }}>
                              {getUserName(lead.creator)}
                              {isLoadingProfiles && lead.creator && !hasUserProfile(lead.creator) && (
                                <span className="inline-flex items-center ml-1">
                                  <Loader2 size={10} className="animate-spin text-gray-400" />
                                </span>
                              )}
                            </div>
                            {lead.creator && !hasUserProfile(lead.creator) && !isLoadingProfiles && (
                              <div className="text-xs text-gray-500 truncate" style={{ maxWidth: "180px" }}>ID: {lead.creator}</div>
                            )}
                          </td>
                        )}

                        {/* Opiekun - tylko dla GOD */}
                        {currentUser.role === 'GOD' && (
                          <td className="px-6 py-4 whitespace-nowrap"
                              style={{ width: "200px", maxWidth: "200px", overflow: "hidden" }}>
                            <div className="text-sm font-medium text-gray-900 truncate" style={{ maxWidth: "180px" }}>
                              {getSupervisorName(lead.opiekun)}
                              {isLoadingProfiles && lead.opiekun && !hasSupervisorProfile(lead.opiekun) && (
                                <span className="inline-flex items-center ml-1">
                                  <Loader2 size={10} className="animate-spin text-gray-400" />
                                </span>
                              )}
                            </div>
                            {lead.opiekun && !hasSupervisorProfile(lead.opiekun) && !isLoadingProfiles && (
                              <div className="text-xs text-gray-500 truncate" style={{ maxWidth: "180px" }}>Kod: {lead.opiekun}</div>
                            )}
                          </td>
                        )}

                        {/* Status - nowa kolumna z estetycznymi przyciskami */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium"
                            style={{ width: "140px", maxWidth: "140px" }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation(); // Zapobiegaj wyzwoleniu onClick dla wiersza
                              if (updatingStatusId !== lead.id) { // Sprawdź czy ten lead nie jest właśnie aktualizowany
                                handleStatusChange(lead.id, lead.status || 'b_contact', e);
                              }
                            }}
                            disabled={updatingStatusId === lead.id}
                            className={`
                              w-full px-3 py-1.5 rounded-md flex items-center justify-center
                              transition-all duration-200 font-medium text-sm
                              ${updatingStatusId === lead.id ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-sm'}
                              ${permissionErrorLeadId === lead.id
                                ? 'bg-red-100 text-red-700 border border-red-300'
                                : lead.status === 'b_contact'
                                  ? 'bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100'
                                  : lead.status === 'a_contact'
                                    ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100'
                                    : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                              }
                            `}
                          >
                            {updatingStatusId === lead.id ? (
                              <Loader2 size={16} className="animate-spin text-violet-500" />
                            ) : permissionErrorLeadId === lead.id ? (
                              <div className="flex items-center">
                                <AlertCircle size={14} className="mr-1 text-red-500" />
                                <span>Brak uprawnień</span>
                              </div>
                            ) : (
                              <div className="flex items-center">
                                {renderStatusIcon(lead.status || 'b_contact')}
                                <span className="ml-1.5">{getStatusText(lead.status || 'b_contact')}</span>
                              </div>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-3">
              <div className="flex items-center">
                <p className="text-sm text-gray-700">
                  Showing <span className="font-medium">1</span> to <span className="font-medium">{filteredLeads.length}</span> of{' '}
                  <span className="font-medium">{filteredLeads.length}</span> results
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  disabled
                >
                  Previous
                </button>
                <button
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  disabled
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Popup z opcjami kontaktu - uproszczona wersja */}
      {isPopupOpen && selectedLead && (
        <div
          ref={popupRef}
          className="fixed z-50 bg-white rounded-lg shadow-xl p-4 border border-gray-200"
          style={{
            left: `${Math.min(popupPosition.x, window.innerWidth - 320)}px`,
            top: `${Math.min(popupPosition.y, window.innerHeight - 200)}px`,
            width: '300px'
          }}
        >
          <div className="relative mb-4">
            {/* Centered heading */}
            <h2 className="text-xl font-semibold text-gray-800 text-center pb-2">Szybki kontakt</h2>

            {/* Close button positioned absolutely in the top-right */}
            <button
              onClick={() => setIsPopupOpen(false)}
              className="absolute right-0 top-0 text-gray-400 hover:text-gray-600"
            >
              <X size={20} />
            </button>

            {/* Horizontal divider line */}
            <div className="border-b border-gray-200 mt-2 mb-3"></div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Przycisk do dzwonienia - wyświetlany tylko jeśli jest numer */}
            {selectedLead.phone ? (
              <a
                href={`tel:${selectedLead.phone.replace(/\s+/g, '')}`}
                className="flex flex-col items-center justify-center p-4 bg-green-50 rounded-lg border-2 border-green-100 hover:bg-green-100 transition-all"
              >
                <Phone size={28} className="text-green-600 mb-2" />
                <span className="text-base font-medium text-green-700">Zadzwoń</span>
              </a>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-gray-50 rounded-lg border-2 border-gray-100 text-gray-400">
                <Phone size={28} className="mb-2" />
                <span className="text-base font-medium">Brak tel.</span>
              </div>
            )}

            {/* Przycisk do kopiowania emaila */}
            <button
              onClick={() => copyToClipboard(selectedLead.email)}
              className="flex flex-col items-center justify-center p-4 bg-blue-50 rounded-lg border-2 border-blue-100 hover:bg-blue-100 transition-all"
            >
              {isCopied ? (
                <>
                  <CheckCircle2 size={28} className="text-green-600 mb-2" />
                  <span className="text-base font-medium text-green-700">Skopiowano!</span>
                </>
              ) : (
                <>
                  <Copy size={28} className="text-blue-600 mb-2" />
                  <span className="text-base font-medium text-blue-700">Kopiuj email</span>
                </>
              )}
            </button>
          </div>
          <div className="border-b border-gray-200 mt-4 mb-3"></div>
          <div className="mt-3 text-sm text-gray-500 text-center">
            {selectedLead.name}
          </div>
        </div>
      )}

      {/* Subtelne ostrzeżenie o braku uprawnień - teraz przy kursorze */}
      {subtleWarning && (
        <div
          ref={warningRef}
          className="fixed z-50 bg-yellow-50 text-yellow-700 px-4 py-2 rounded-md shadow-md border border-yellow-200 text-sm transition-opacity duration-300"
            style={{
              // Dodaj offset do pozycji poziomej (np. +20px w prawo)
              left: `${Math.min(warningPosition.x - 110, window.innerWidth - 250)}px`,

              // Zwiększ odsunięcie w pionie (np. -40px w górę zamiast -10px)
              top: `${Math.min(warningPosition.y - 65, window.innerHeight - 50)}px`,
              width: '250px'
            }}
        >
          <div className="flex items-center">
            <AlertTriangle size={16} className="mr-2 flex-shrink-0" />
            <span>{subtleWarning}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeadsView;