// src/components/views/partners.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { Users, Search, ChevronDown, UserCheck, Clock, Lock, Unlock, MessageSquare, Edit, Clipboard, ArrowUpCircle } from 'lucide-react';
import { UserProfile, PartnerViewData, PartnerStats, SupervisorCode, PartnersApiResponse } from '@/types';

// Rozszerzona definicja typu PartnerViewData z admin_code
interface ExtendedPartnerViewData extends PartnerViewData {
  admin_code?: string | null;
}

const PartnersView = () => {
  // Funkcja do formatowania numeru telefonu
  const formatPhoneNumber = (phone: string | null | undefined): string => {
    if (!phone) return '';

    // Usuń wszystkie znaki niebędące cyframi
    let digits = phone.replace(/\D/g, '');

    // Sprawdź czy numer zawiera już kod kraju
    if (digits.length > 9 && digits.startsWith('48')) {
      digits = digits.substring(2); // Usuń kod kraju
    }

    // Formatuj 9 cyfr z odstępami: xxx xxx xxx
    let formatted = '';
    if (digits.length === 9) {
      formatted = digits.replace(/(\d{3})(\d{3})(\d{3})/, '$1 $2 $3');
    } else {
      // Jeśli nie 9 cyfr, zwróć jak jest
      formatted = digits;
    }

    // Dodaj kod kraju
    return `+48 ${formatted}`;
  };

  const [activeTab, setActiveTab] = useState('all');
  const [editingCommentFor, setEditingCommentFor] = useState<string | null>(null);
  const [commentInput, setCommentInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');
  const [selectedContact, setSelectedContact] = useState<string>('all');
  const [copiedCodeForPartner, setCopiedCodeForPartner] = useState<string | null>(null);
  // Stany dla modali potwierdzenia
  const [promotingUserId, setPromotingUserId] = useState<string | null>(null);
  const [blockingUserId, setBlockingUserId] = useState<string | null>(null);
  const [unblockingUserId, setUnblockingUserId] = useState<string | null>(null);

  // Stan dla danych z API - używamy ExtendedPartnerViewData zamiast PartnerViewData
  const [partners, setPartners] = useState<ExtendedPartnerViewData[]>([]);
  const [stats, setStats] = useState<PartnerStats>({ total: 0, active: 0, pending: 0, blocked: 0 });
  const [supervisors, setSupervisors] = useState<SupervisorCode[]>([]);

  // Stan dla procesu ładowania
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);

  // Funkcja do kopiowania kodu opiekuna
  const copyCodeToClipboard = (partnerId: string, code: string) => {
    if (code) {
      navigator.clipboard.writeText(code)
        .then(() => {
          setCopiedCodeForPartner(partnerId);
          // Resetuj powiadomienie po 800ms
          setTimeout(() => setCopiedCodeForPartner(null), 800);
        })
        .catch(err => {
          console.error('Błąd podczas kopiowania do schowka:', err);
        });
    }
  };

  // Funkcja do pobierania danych partnerów z API
  const fetchPartners = useCallback(async () => {
    if (!userData) return;

    try {
      setIsLoading(true);
      setError(null);

      // Przygotuj parametry zapytania
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('status', activeTab);
      }

      // Tylko GOD może filtrować po roli
      if (userData.role === 'GOD' && selectedRole !== 'all') {
        params.append('role', selectedRole);
      }

      // Tylko GOD może filtrować po opiekunie
      if (userData.role === 'GOD' && selectedContact !== 'all') {
        params.append('supervisorCode', selectedContact);
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      // Dodaj parametr z ID zalogowanego użytkownika, aby wyłączyć go z listy
      params.append('excludeUserId', userData.id);

      console.log(`Wywołanie API: /api/partners?${params.toString()}`);

      // Wywołaj API z danymi użytkownika
      const response = await fetch(`/api/partners?${params.toString()}`, {
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

      const data = await response.json() as PartnersApiResponse;
      console.log("Pobrane dane:", data);
      // Traktujemy partners jako ExtendedPartnerViewData[]
      setPartners(data.partners as ExtendedPartnerViewData[]);
      setStats(data.stats);
      setSupervisors(data.supervisors);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      console.error('Błąd podczas pobierania partnerów:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userData, activeTab, selectedRole, selectedContact, searchTerm]);

  // Pobierz dane użytkownika z sessionStorage przy pierwszym renderowaniu
  useEffect(() => {
    try {
      const storedUserData = sessionStorage.getItem('userData');
      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);
        console.log("Zalogowany użytkownik:", parsedUserData);
        setUserData(parsedUserData);
      } else {
        setError('Brak danych użytkownika w sesji');
      }
    } catch (err) {
      console.error('Błąd podczas pobierania danych użytkownika:', err);
      setError('Błąd podczas pobierania danych użytkownika');
    }
  }, []);

  // Pobierz dane partnerów przy pierwszym renderowaniu i gdy zmienią się filtry
  useEffect(() => {
    if (userData) {
      fetchPartners();
    }
  }, [userData, fetchPartners]);

  // Funkcja do obsługi awansowania partnera
  const handlePromoteUser = async (partnerId: string) => {
    if (!userData) return;

    try {
      // Wywołaj API do awansowania partnera
      const response = await fetch(`/api/partners/${partnerId}/promote`, {
        method: 'POST',
        headers: {
          'X-User-Id': userData.id,
          'X-User-Role': userData.role,
          'X-User-Cognito-Sub': userData.cognito_sub,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas awansowania użytkownika');
      }

      // Zamknij modal potwierdzenia
      setPromotingUserId(null);

      // Odśwież dane
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      console.error('Błąd podczas awansowania użytkownika:', err);
    }
  };

  // Funkcja do aktualizacji statusu partnera
  const handleStatusChange = async (partnerId: string, newStatus: 'active' | 'pending' | 'blocked') => {
    if (!userData) return;

    try {
      // Znajdź partnera, którego status zmieniamy
      const partner = partners.find(p => p.id === partnerId);
      if (!partner) {
        throw new Error('Nie znaleziono partnera');
      }

      // Przygotuj dane żądania - dodaj parametr updateSupervisorCode dla adminów
      const requestData: any = {
        status: newStatus
      };

      // Jeśli użytkownik jest adminem, oznacz, że należy również zaktualizować kod supervisora
      if (partner.role === 'ADMIN' && partner.admin_code) {
        requestData.updateSupervisorCode = true;
        requestData.supervisorCodeStatus = newStatus === 'active';
        requestData.supervisorCode = partner.admin_code;
      }

      // Wywołaj API do aktualizacji statusu
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'PATCH',
        headers: {
          'X-User-Id': userData.id,
          'X-User-Role': userData.role,
          'X-User-Cognito-Sub': userData.cognito_sub,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas aktualizacji statusu');
      }

      // Zamknij modalne okna potwierdzenia
      setBlockingUserId(null);
      setUnblockingUserId(null);

      // Odśwież dane
      fetchPartners();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      console.error('Błąd podczas aktualizacji statusu:', err);
    }
  };

  // Funkcja do edycji komentarza
  const handleCommentEdit = (partnerId: string, currentComment: string | null) => {
    setEditingCommentFor(partnerId);
    setCommentInput(currentComment || '');
  };

  // Funkcja do zapisywania komentarza
  const saveComment = async (partnerId: string) => {
    if (!userData) return;

    try {
      // Wywołaj API do aktualizacji komentarza
      const response = await fetch(`/api/partners/${partnerId}`, {
        method: 'PATCH',
        headers: {
          'X-User-Id': userData.id,
          'X-User-Role': userData.role,
          'X-User-Cognito-Sub': userData.cognito_sub,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ admin_comment: commentInput.trim() || null })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas zapisywania komentarza');
      }

      // Odśwież dane
      fetchPartners();
      setEditingCommentFor(null);
      setCommentInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      console.error('Błąd podczas zapisywania komentarza:', err);
    }
  };

  // Anulowanie edycji komentarza
  const cancelCommentEdit = () => {
    setEditingCommentFor(null);
    setCommentInput('');
  };

  // Funkcje pomocnicze do stylizacji elementów
  const getStatusBannerClass = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-200';
      case 'pending': return 'bg-amber-300';
      case 'blocked': return 'bg-red-300';
      default: return 'bg-gray-200';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case 'active': return 'bg-green-50 text-green-700 border border-green-100';
      case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-100';
      case 'blocked': return 'bg-red-50 text-red-700 border border-red-100';
      default: return 'bg-gray-50 text-gray-700 border border-gray-100';
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'active': return 'Aktywny';
      case 'pending': return 'Oczekujący';
      case 'blocked': return 'Zablokowany';
      default: return status;
    }
  };

  // Funkcja getActionButton dostosowana do wyświetlania na urządzeniach mobilnych
  const getActionButton = (partner: ExtendedPartnerViewData) => {
    // Pokaż przycisk awansowania tylko dla aktywnych USER gdy zalogowany jest GOD
    const showPromoteButton = isGod && partner.status === 'active' && partner.role === 'USER';

    switch(partner.status) {
      case 'pending':
        return (
          <button
            className="flex items-center px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors cursor-pointer"
            onClick={() => handleStatusChange(partner.id, 'active')}
          >
            <UserCheck size={16} className="mr-1.5" />
            <span className="hidden md:inline">Aktywuj</span>
          </button>
        );
      case 'active':
        return (
          <div className="flex gap-2">
            {showPromoteButton && (
              <button
                className="flex items-center px-2 md:px-3 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-md transition-colors cursor-pointer"
                onClick={() => setPromotingUserId(partner.id)}
              >
                <ArrowUpCircle size={16} className="mr-0.5 md:mr-1.5" />
                <span className="hidden md:inline">Awansuj</span>
              </button>
            )}
            <button
              className="flex items-center px-2 md:px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 rounded-md transition-colors cursor-pointer"
              onClick={() => setBlockingUserId(partner.id)}
            >
              <Lock size={16} className="mr-0.5 md:mr-1.5" />
              <span className="hidden md:inline">Zablokuj</span>
            </button>
          </div>
        );
      case 'blocked':
        return (
          <button
            className="flex items-center px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors cursor-pointer"
            onClick={() => setUnblockingUserId(partner.id)}
          >
            <Unlock size={16} className="mr-1.5" />
            <span className="hidden md:inline">Odblokuj</span>
          </button>
        );
      default:
        return null;
    }
  };

  // Komponent modalu potwierdzenia awansowania
  const renderPromotionModal = () => {
    if (!promotingUserId) return null;

    // Znajdź partnera, którego awansujemy
    const partner = partners.find(p => p.id === promotingUserId);
    if (!partner) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50" onClick={() => setPromotingUserId(null)}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-medium text-gray-900 mb-4">Potwierdź awansowanie</h3>
          <p className="text-gray-600 mb-6">
            Czy na pewno chcesz awansować użytkownika <span className="font-semibold">{partner.name}</span> do roli Opiekun? Nie da się go później zdegradować. Będziesz mógł go jedynie zablokować jeżeli zajdzie taka potrzeba.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
              onClick={() => setPromotingUserId(null)}
            >
              Anuluj
            </button>
            <button
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors cursor-pointer"
              onClick={() => handlePromoteUser(promotingUserId)}
            >
              Awansuj
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Komponent modalu potwierdzenia blokowania
  const renderBlockingModal = () => {
    if (!blockingUserId) return null;

    // Znajdź partnera, którego blokujemy
    const partner = partners.find(p => p.id === blockingUserId);
    if (!partner) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50" onClick={() => setBlockingUserId(null)}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-medium text-gray-900 mb-4">Potwierdź blokowanie</h3>
          <p className="text-gray-600 mb-6">
            Czy na pewno chcesz zablokować użytkownika <span className="font-semibold">{partner.name}</span>? Użytkownik nie będzie mógł korzystać z aplikacji, ale jego dane pozostaną w systemie.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
              onClick={() => setBlockingUserId(null)}
            >
              Anuluj
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors cursor-pointer"
              onClick={() => handleStatusChange(blockingUserId, 'pending')}
            >
              Zablokuj
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Komponent modalu potwierdzenia odblokowania
  const renderUnblockingModal = () => {
    if (!unblockingUserId) return null;

    // Znajdź partnera, którego odblokowujemy
    const partner = partners.find(p => p.id === unblockingUserId);
    if (!partner) return null;

    return (
      <div className="fixed inset-0 backdrop-blur-sm bg-white/30 flex items-center justify-center z-50" onClick={() => setUnblockingUserId(null)}>
        <div className="bg-white rounded-lg p-6 max-w-md w-full shadow-lg" onClick={(e) => e.stopPropagation()}>
          <h3 className="text-xl font-medium text-gray-900 mb-4">Potwierdź odblokowanie</h3>
          <p className="text-gray-600 mb-6">
            Czy na pewno chcesz odblokować użytkownika <span className="font-semibold">{partner.name}</span>? Użytkownik będzie mógł ponownie korzystać z aplikacji.
          </p>
          <div className="flex justify-end space-x-3">
            <button
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors cursor-pointer"
              onClick={() => setUnblockingUserId(null)}
            >
              Anuluj
            </button>
            <button
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer"
              onClick={() => handleStatusChange(unblockingUserId, 'active')}
            >
              Odblokuj
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Sprawdź czy użytkownik to GOD
  const isGod = userData?.role === 'GOD';

  // Renderowanie komponentu
  return (
    <div className="space-y-6">
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-md">
            <p>{error}</p>
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {/* Wszyscy partnerzy */}
          <div className="bg-gray-50 text-gray-700 rounded-xl shadow-sm p-4 border border-gray-100">
            <div className="flex items-center mb-2">
              <Users size={18} className="text-gray-700 mr-2" />
              <h3 className="font-bold text-gray-700">Wszyscy partnerzy</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.total}</p>
          </div>

          {/* Aktywni partnerzy */}
          <div className="bg-green-50 text-green-700 rounded-xl shadow-sm p-4 border border-green-100">
            <div className="flex items-center mb-2">
              <UserCheck size={18} className="text-green-500 mr-2" />
              <h3 className="font-medium text-green-700">Aktywni partnerzy</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.active}</p>
          </div>

          {/* Oczekujący */}
          <div className="bg-amber-50 text-amber-700 rounded-xl shadow-sm p-4 border border-amber-100">
            <div className="flex items-center mb-2">
              <Clock size={18} className="text-amber-500 mr-2" />
              <h3 className="font-medium text-amber-700">Oczekujący</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.pending}</p>
          </div>

          {/* Zablokowani */}
          <div className="bg-red-50 text-red-700 rounded-xl shadow-sm p-4 border border-red-100">
            <div className="flex items-center mb-2">
              <Lock size={18} className="text-red-500 mr-2" />
              <h3 className="font-medium text-red-700">Zablokowani</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.blocked}</p>
          </div>
        </div>

        {/* Search and filter */}
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-grow">
            <input
              type="text"
              placeholder="Szukaj partnera..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>

          {/* Filtr roli użytkownika - widoczny tylko dla GOD */}
          {isGod && (
            <div className="relative min-w-40">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 text-gray-700 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent cursor-pointer"
              >
                <option value="all">Wszyscy użytkownicy</option>
                <option value="USER">Partner</option>
                <option value="ADMIN">Opiekun</option>
              </select>
              <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
            </div>
          )}

          {/* Filtr opiekuna - widoczny tylko dla GOD */}
          {isGod && (
            <div className="relative min-w-40">
              <select
                value={selectedContact}
                onChange={(e) => setSelectedContact(e.target.value)}
                disabled={selectedRole === 'ADMIN'}
                className={`w-full appearance-none pl-4 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                  selectedRole === 'ADMIN' ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'
                }`}
              >
                <option value="all">Wszyscy opiekunowie</option>
                {supervisors.map(supervisor => (
                  <option key={supervisor.code} value={supervisor.code}>
                    {supervisor.description}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-2.5 text-gray-400 pointer-events-none" size={18} />
            </div>
          )}
        </div>

        {/* Tabs - Updated for mobile responsiveness */}
        <div className="border-b border-gray-200 mb-5 w-full">
          <nav className="flex w-full -mb-px justify-between md:justify-start md:space-x-8">
            <button
              onClick={() => setActiveTab('all')}
              className={`py-2 px-3 border-b-2 font-medium text-sm cursor-pointer flex items-center justify-center flex-1 md:flex-none ${
                activeTab === 'all'
                  ? 'border-green-400 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users size={18} className="md:mr-2" />
              <span className="hidden md:inline">Wszyscy</span>
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`py-2 px-3 border-b-2 font-medium text-sm cursor-pointer flex items-center justify-center flex-1 md:flex-none ${
                activeTab === 'active'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <UserCheck size={18} className="md:mr-2" />
              <span className="hidden md:inline">Aktywni</span>
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`py-2 px-3 border-b-2 font-medium text-sm cursor-pointer flex items-center justify-center flex-1 md:flex-none ${
                activeTab === 'pending'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Clock size={18} className="md:mr-2" />
              <span className="hidden md:inline">Oczekujący</span>
            </button>
            <button
              onClick={() => setActiveTab('blocked')}
              className={`py-2 px-3 border-b-2 font-medium text-sm cursor-pointer flex items-center justify-center flex-1 md:flex-none ${
                activeTab === 'blocked'
                  ? 'border-red-500 text-red-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Lock size={18} className="md:mr-2" />
              <span className="hidden md:inline">Zablokowani</span>
            </button>
          </nav>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            {/* Partners grid */}
            {partners.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Brak partnerów spełniających kryteria wyszukiwania
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {partners.map(partner => {
                  // Wyraźnie sprawdzamy czy to nie jest zalogowany użytkownik
                  if (userData && partner.id === userData.id) {
                    console.log(`Pomijam użytkownika ${partner.id} ponieważ jest zalogowany`);
                    return null;
                  }

                  const hasComment = partner.admin_comment !== null && partner.admin_comment !== '';

                  return (
                    <div key={partner.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                      <div className={`h-2 ${getStatusBannerClass(partner.status)}`}></div>

                      {/* Główna zawartość karty */}
                      <div className="p-4">
                        {/* Status badge - na górze po prawej */}
                        <div className="flex justify-between items-start mb-3">
                          <h3 className="font-medium text-gray-900">{partner.name}</h3>
                          <span className={`text-xs px-2 py-1 rounded-full ${getStatusBadgeClass(partner.status)}`}>
                            {getStatusLabel(partner.status)}
                          </span>
                        </div>

                        {/* Nowy układ dwukolumnowy - tylko na desktop */}
                        <div className="block md:flex md:gap-4">
                          {/* Lewa kolumna - informacje o partnerze */}
                          <div className="flex-1 mb-3 md:mb-0">
                            {/* Etykieta roli */}
                            <div className="mb-3">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                partner.role === 'ADMIN'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                  : 'bg-blue-50 text-blue-700 border border-blue-100'
                              }`}>
                                {partner.role === 'ADMIN' ? 'Opiekun' : 'Partner'}
                              </span>
                            </div>

                            {/* Informacja o opiekunie dla Partnera lub kod opiekuna dla Opiekuna */}
                            {partner.role === 'USER' ? (
                              <p className="text-sm text-gray-500 mb-3">Opiekun: {partner.contact}</p>
                            ) : (
                              <div className="text-sm text-gray-500 mb-3 relative">
                                <div className="flex items-center">
                                  <span>Kod: </span>
                                  {partner.admin_code ? (
                                    <>
                                      <span className="text-green-600 ml-1">{partner.admin_code}</span>
                                      <button
                                        onClick={() => copyCodeToClipboard(partner.id, partner.admin_code || '')}
                                        className="ml-2 p-1 text-gray-500 hover:text-green-600 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                                        title="Kopiuj kod do schowka"
                                      >
                                        <Clipboard className="h-4 w-4" />
                                      </button>

                                      {copiedCodeForPartner === partner.id && (
                                        <div className="absolute top-full left-0 bg-green-100 text-green-800 px-2 py-1 rounded-md shadow-sm text-xs z-10 animate-pulse mt-1">
                                          Kod skopiowany do schowka!
                                        </div>
                                      )}
                                    </>
                                  ) : (
                                    <span className="ml-1">Brak kodu</span>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Dane kontaktowe */}
                            <div className="text-xs text-gray-500 space-y-1">
                              <p>{partner.email}</p>
                              <p>{formatPhoneNumber(partner.phone)}</p>
                            </div>
                          </div>

                          {/* Prawa kolumna - komentarz */}
                          <div className="flex-1">
                            {editingCommentFor === partner.id ? (
                              <div>

                                <textarea
                                  className="w-full p-2 text-sm border border-gray-300 text-gray-700 rounded focus:outline-none focus:ring-1 focus:ring-green-500"
                                  placeholder="Wprowadź komentarz..."
                                  rows={4}
                                  value={commentInput}
                                  onChange={(e) => setCommentInput(e.target.value)}
                                />
                              </div>
                            ) : (
                              hasComment ? (
                                <div>

                                  <div className="p-2 bg-gray-50 text-gray-700 text-sm rounded border border-gray-100">
                                    {partner.admin_comment}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-full flex items-center justify-center">
                                  {/* Pusta przestrzeń gdy nie ma komentarza */}
                                </div>
                              )
                            )}
                          </div>
                        </div>

                        {/* Przyciski akcji - u dołu karty */}
                        <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between">
                          <div className="flex gap-2">
                            {editingCommentFor !== partner.id && getActionButton(partner)}
                          </div>
                          <div>
                            {editingCommentFor === partner.id ? (
                              <div className="flex gap-2">
                                <button
                                  className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors cursor-pointer"
                                  onClick={cancelCommentEdit}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                                  <span>Anuluj</span>
                                </button>
                                <button
                                  className="flex items-center px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-md transition-colors cursor-pointer"
                                  onClick={() => saveComment(partner.id)}
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                  <span>Zapisz</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                className="flex items-center px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md transition-colors cursor-pointer"
                                onClick={() => handleCommentEdit(partner.id, partner.admin_comment)}
                              >
                                {hasComment ? <Edit size={16} className="mr-1.5" /> : <MessageSquare size={16} className="mr-1.5" />}
                                <span>{hasComment ? "Edytuj komentarz" : "Dodaj komentarz"}</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {renderPromotionModal()}
      {renderBlockingModal()}
      {renderUnblockingModal()}
    </div>
  );
};

export default PartnersView;