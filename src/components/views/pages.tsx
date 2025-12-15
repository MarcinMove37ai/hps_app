// src/components/views/pages.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Search, Plus, Eye, Edit, Trash2, Clock, Check, AlertTriangle,
         BookOpen, ShoppingCart, Copy, X, Video, QrCode, Lock } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react'; // Dodajemy import biblioteki QR
//import CreatePageForm from '../ui/CreatePageForm';
//import { PageData } from '../ui/CreatePageForm';
import { UserProfile } from '@/types';

// Interfejs dla danych strony
interface PageItem {
  id: string;
  title: string; // To pole będzie teraz używane jako kluczowy identyfikator (metaTitle) dla API usuwania
  headline?: string;
  creator: string;
  supervisorCode?: string; // Kod opiekuna
  visits: number;
  leads: number;
  type: string;
  status: string;
  createdAt: string;
  url: string;
  draft_url: string;
  coverImage: string;
  x_amz_meta_title?: string; // Zmienione z powrotem na opcjonalne, ponieważ nie zawsze jest dostępne
  videoPassword?: string; // Hasło do wideo
  isOwnedByUser?: boolean; // Czy strona należy do zalogowanego użytkownika
}

// Interfejs dla opisu opiekuna
interface SupervisorDescription {
  code: string;
  description: string;
}

// Interfejs dla statystyk
interface PageStats {
  total: number;
  published: number;
  pending: number;
  draft: number;
  ebook: number;
  sales: number;
}

// Interfejs dla odpowiedzi API
interface PagesApiResponse {
  pages: PageItem[];
  stats: PageStats;
}

const PagesView = () => {
  // Konfiguracja wielkości okładki - wartość w pikselach
  const coverImageSize = 240; // Reguluj tę wartość, aby zmienić rozmiar okładki

  const [activeTab, setActiveTab] = useState('all');
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  // Stan dla danych z API
  const [pages, setPages] = useState<PageItem[]>([]);
  const [stats, setStats] = useState<PageStats>({
    total: 0,
    published: 0,
    pending: 0,
    draft: 0,
    ebook: 0,
    sales: 0
  });
  // Stan dla opisów opiekunów
  const [supervisorDescriptions, setSupervisorDescriptions] = useState<Record<string, string>>({});
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  // Stan dla procesu usuwania
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<PageItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  // Stan dla procesu ładowania
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  // Stan dla podglądu okładki
  const [previewImage, setPreviewImage] = useState<{url: string, title: string} | null>(null);
  // Stan dla powiadomienia o otwieraniu podglądu
  const [previewNotification, setPreviewNotification] = useState<boolean>(false);
  // Stan dla modalu z kodem QR
  const [qrCodeData, setQrCodeData] = useState<{url: string, title: string, creator: string, logoUrl?: string} | null>(null);
  // Stan dla informacji o kopiowaniu QR kodu
  const [copyingQr, setCopyingQr] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  // Referencja do elementu QR code
  const qrCodeRef = React.useRef<SVGSVGElement>(null);

    // Komponent dla placeholdera okładki z ikoną wideo
    const VideoCoverPlaceholder = ({
      width,
      height,
      className = ""
    }: {
      width: number | string;
      height: number | string;
      className?: string;
    }) => (
      <div
        className={`bg-gray-100 rounded-md flex flex-col items-center justify-center border border-gray-200 ${className}`}
        style={{ width, height }}
      >
        <Video size={typeof width === 'number' ? width/3 : 48} className="text-gray-400 mb-2" />
        <span className="text-gray-400 text-xs">Brak okładki</span>
      </div>
    );

  // Funkcja do pobierania opisu opiekuna
  const fetchSupervisorDescription = useCallback(async (code: string) => {
    if (!code) return null;

    try {
      const response = await fetch(`/api/supervisor/${code}`);
      if (!response.ok) {
        console.error(`Błąd podczas pobierania opisu opiekuna (kod ${code}): ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.description;
    } catch (error) {
      console.error(`Błąd podczas pobierania opisu opiekuna (kod ${code}):`, error);
      return null;
    }
  }, []);

  // Funkcja do pobierania opisów wszystkich opiekunów
  const fetchAllSupervisorDescriptions = useCallback(async (pagesToProcess: PageItem[]) => {
    if (!pagesToProcess || pagesToProcess.length === 0) return;

    setLoadingSupervisors(true);

    try {
      // Zbierz unikalne kody opiekunów
      const supervisorCodes = Array.from(
        new Set(
          pagesToProcess
            .filter(page => page.supervisorCode)
            .map(page => page.supervisorCode as string)
        )
      );

      if (supervisorCodes.length === 0) {
        setLoadingSupervisors(false);
        return;
      }

      console.log('Pobieranie opisów dla opiekunów:', supervisorCodes);

      // Pobierz opisy dla wszystkich kodów
      const results = await Promise.all(
        supervisorCodes.map(async (code) => {
          const description = await fetchSupervisorDescription(code);
          return { code, description };
        })
      );

      // Utwórz mapę kod -> opis
      const descriptionsMap: Record<string, string> = {};
      results.forEach(result => {
        if (result.code && result.description) {
          descriptionsMap[result.code] = result.description;
        }
      });

      console.log('Pobrane opisy opiekunów:', descriptionsMap);
      setSupervisorDescriptions(descriptionsMap);
    } catch (error) {
      console.error('Błąd podczas pobierania opisów opiekunów:', error);
    } finally {
      setLoadingSupervisors(false);
    }
  }, [fetchSupervisorDescription]);

  // Funkcja do kopiowania URL do schowka
  const copyUrlToClipboard = (pageId: string, url: string) => {
    if (url) {
      navigator.clipboard.writeText(url)
        .then(() => {
          setCopiedUrl(pageId);
          // Resetuj powiadomienie po 800ms
          setTimeout(() => setCopiedUrl(null), 800);
        })
        .catch(err =>
        {
          console.error('Błąd podczas kopiowania do schowka:', err);
        });
    }
  };

  // Funkcja do otwierania podglądu okładki
  const openCoverPreview = (url: string, title: string) => {
    setPreviewImage({ url, title });
  };

  // Funkcja do zamykania podglądu okładki
  const closeCoverPreview = () => {
    setPreviewImage(null);
  };

  // Funkcja do otwierania podglądu kodu QR
  const openQrCode = (url: string, title: string, creator: string) => {
    // URL do logo - możesz podmienić na faktyczny URL do logo Twojej firmy
    const logoUrl = '/logo.png'; // Domyślna ścieżka do logo
    setQrCodeData({ url, title, creator, logoUrl });
  };

  // Funkcja do zamykania podglądu kodu QR
  const closeQrCode = () => {
    setQrCodeData(null);
    setQrCopied(false);
  };

  // Funkcja do kopiowania kodu QR do schowka
  const copyQrCodeToClipboard = async () => {
    if (!qrCodeRef.current) return;

    try {
      setCopyingQr(true);

      // Konwertuj SVG na obrazek
      const svgElement = qrCodeRef.current;
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Utwórz obraz z SVG
      const img = new Image();
      img.onload = async () => {
        // Ustaw wymiary canvas
        canvas.width = img.width;
        canvas.height = img.height;

        // Wypełnij tło na biało (dla lepszej czytelności)
        if (ctx) {
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
        }

        // Przekonwertuj na Blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              // Kopiuj do schowka
              const clipboardItem = new ClipboardItem({ 'image/png': blob });
              await navigator.clipboard.write([clipboardItem]);

              setQrCopied(true);
              setTimeout(() => setQrCopied(false), 2000);
            } catch (error) {
              console.error('Błąd podczas kopiowania do schowka:', error);
              alert('Nie udało się skopiować kodu QR. Upewnij się, że używasz przeglądarki obsługującej API Clipboard.');
            }
          }
          setCopyingQr(false);
        }, 'image/png');
      };

      // Ustaw źródło obrazu jako data URL z SVG
      img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));

    } catch (error) {
      console.error('Błąd podczas kopiowania kodu QR:', error);
      setCopyingQr(false);
    }
  };

  // Funkcja do pobierania danych stron z API
  const fetchPages = useCallback(async () => {
    if (!userData) return;

    try {
      setIsLoading(true);
      setError(null);

      // Przygotuj parametry zapytania
      const params = new URLSearchParams();

      // Mapowanie zakładek UI na parametry API
      if (activeTab === 'published') {
        params.append('status', 'active');
      } else if (activeTab === 'pending') {
        params.append('status', 'pending');
      } else if (activeTab === 'draft') {
        params.append('status', 'draft');
      } else if (activeTab === 'ebook') {
        params.append('type', 'ebook');
      } else if (activeTab === 'sales') {
        params.append('type', 'sales');
      }

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      console.log(`Wywołanie API: /api/pages?${params.toString()}`);

      // Wywołaj API z danymi użytkownika
      const response = await fetch(`/api/pages?${params.toString()}`, {
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

      const data = await response.json() as PagesApiResponse;
      console.log("Pobrane dane:", data);
      setPages(data.pages);
      setStats(data.stats);

      // Pobierz opisy opiekunów
      fetchAllSupervisorDescriptions(data.pages);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      console.error('Błąd podczas pobierania stron:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userData, activeTab, searchTerm, fetchAllSupervisorDescriptions]);

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

  // Pobierz dane stron przy pierwszym renderowaniu i gdy zmienią się filtry
  useEffect(() => {
    if (userData) {
      fetchPages();
    }
  }, [userData, fetchPages]);

  // Funkcja do otwierania edycji strony
  const openEditor = (draftUrl: string) => {
    const editorUrl = `${window.location.origin}/${draftUrl}`;
    window.location.href = editorUrl;
  };

  // Funkcja do otwierania podglądu strony - ulepszona
  const openPreview = (draftUrl: string) => {
    // Pobierz dane użytkownika do przekazania do trybu podglądu
    const userData = sessionStorage.getItem('userData');

    // Przygotuj URL z parametrem trybu podglądu
    const previewUrl = `${window.location.origin}/${draftUrl}?view_mode=preview`;

    // Pokaż powiadomienie
    showPreviewNotification();

    // Otwórz podgląd w nowej karcie
    window.open(previewUrl, '_blank');
  };

  // Funkcja wyświetlająca powiadomienie o otwarciu podglądu
  const showPreviewNotification = () => {
    setPreviewNotification(true);

    // Ukryj powiadomienie po 2 sekundach
    setTimeout(() => {
      setPreviewNotification(false);
    }, 2000);
  };

  // Funkcja do obsługi udanego utworzenia strony
  const handlePageCreated = (newPage: any, shouldCloseForm: boolean = false) => {
    // Odśwież listę stron po utworzeniu nowej
    fetchPages();
    // Zamknij formularz tylko jeśli zostało to wyraźnie określone
    if (shouldCloseForm) {
      setIsCreateFormOpen(false);
    }
  };

  // Funkcja obsługująca usuwanie strony
  const handleDeletePage = (page: PageItem) => {
    setPageToDelete(page);
    setIsDeleteModalOpen(true);
    setDeleteError(null);
  };

  // Funkcja zatwierdzająca usunięcie strony - używa pageToDelete.title jako metaTitle
  const confirmDeletePage = async () => {
    if (!pageToDelete || !userData) {
      console.error('Brak danych: pageToDelete lub userData jest null/undefined');
      setDeleteError('Brak wymaganych danych do usunięcia strony');
      return;
    }

    // === WALIDACJA KLUCZOWEGO POLA 'title' ===
    if (!pageToDelete.title) {
        console.error('Krytyczny błąd: Brak wymaganego pola "title" w danych strony do usunięcia.');
        setDeleteError('Nie można usunąć strony - brak podstawowego tytułu strony. Skontaktuj się z administratorem.');
        setIsDeleting(false);
        // Zatrzymaj proces
        return;
    }
    // === KONIEC WALIDACJI POLA 'title' ===

    setIsDeleting(true);
    setDeleteError(null);

    try {
      // Użyj pageToDelete.title jako głównego klucza (metaTitle) do usuwania
      const metaTitle = pageToDelete.title;
      console.log('Używam pola "title" jako klucza metaTitle:', metaTitle);

      // Przygotuj dane do wysłania
      const requestData = {
        pageId: pageToDelete.id, // Wysyłamy nadal pageId dla kontekstu/logowania na backendzie
        metaTitle: metaTitle     // Kluczowy identyfikator dla operacji usuwania na backendzie
      };
      console.log('Wysyłanie żądania usunięcia:', requestData);

      const response = await fetch('/api/delete-page', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userData.id || 'unknown',
          'X-User-Role': userData.role || 'unknown',
          'X-User-Cognito-Sub': userData.cognito_sub || 'unknown'
        },
        body: JSON.stringify(requestData)
      });

      // Debugowanie
      console.log(`Status odpowiedzi: ${response.status} ${response.statusText}`);
      const textData = await response.text();
      if (!textData || textData.trim() === '') {
        throw new Error('Serwer zwrócił pustą odpowiedź');
      }
      console.log('Surowa odpowiedź:', textData);

      if (textData.includes('<!DOCTYPE html>') || textData.includes('<html>')) {
        console.error('Serwer zwrócił HTML zamiast JSON:', textData.substring(0, 500));
        throw new Error('Endpoint API zwrócił stronę HTML zamiast JSON.');
      }

      let data;
      try {
        data = JSON.parse(textData);
      } catch (jsonError) {
        console.error('Nie można sparsować JSON:', textData.substring(0, 200));
        if (jsonError instanceof Error) {
          throw new Error(`Odpowiedź nie jest prawidłowym JSON: ${jsonError.message}`);
        } else {
          throw new Error('Odpowiedź nie jest prawidłowym JSON');
        }
      }

      if (!response.ok) {
        console.error('Błąd z API:', data);
        throw new Error(data.error || `Błąd podczas usuwania strony: ${response.status}`);
      }

      console.log('Odpowiedź z API:', data);
      await fetchPages(); // Odśwież listę stron
      setIsDeleteModalOpen(false);
      setPageToDelete(null);
    } catch (err) {
      console.error('Błąd podczas usuwania strony:', err);
      setDeleteError(err instanceof Error ? err.message : 'Wystąpił nieznany błąd podczas usuwania strony');
    } finally {
      setIsDeleting(false);
    }
  };

  // Funkcja do anulowania usuwania strony
  const cancelDeletePage = () => {
    setIsDeleteModalOpen(false);
    setPageToDelete(null);
    setDeleteError(null);
  };

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  // Funkcja pomocnicza do pobierania opisu opiekuna
  const getSupervisorDescription = (code?: string) => {
    if (!code) return null;
    return supervisorDescriptions[code] || code; // Zwróć opis lub kod jeśli opis nie jest dostępny
  };

  // Sprawdzenie czy użytkownik ma rolę GOD
  const isGodRole = userData?.role === 'GOD';

  return (
    <div className="space-y-6">
      <div className="p-4">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-md">
            <p>{error}</p>
          </div>
        )}

        <div className="flex justify-between items-center pb-3 mb-5 border-b border-gray-200">
          <p className="text-gray-700 text-lg">Strony</p>
          <button
            className="flex items-center bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded-md text-sm cursor-pointer"
            onClick={() => setIsCreateFormOpen(true)}
          >
            <Plus size={16} className="mr-2" />
            Utwórz stronę
          </button>
         </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {/* Wszystkie */}
          <div className="bg-sky-50 text-sky-700 rounded-xl shadow-sm p-4 border border-sky-100">
            <div className="flex items-center mb-2">
              <FileText size={18} className="text-sky-500 mr-2" />
              <h3 className="font-medium text-sky-700">Wszystkie</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.total}</p>
          </div>

          {/* Opublikowane */}
          <div className="bg-green-50 text-green-700 rounded-xl shadow-sm p-4 border border-green-100">
            <div className="flex items-center mb-2">
              <Check size={18} className="text-green-500 mr-2" />
              <h3 className="font-medium text-green-700">Opublikowane</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.published}</p>
          </div>

          {/* Oczekujące */}
          <div className="bg-amber-50 text-amber-700 rounded-xl shadow-sm p-4 border border-amber-100">
            <div className="flex items-center mb-2">
              <Clock size={18} className="text-amber-500 mr-2" />
              <h3 className="font-medium text-amber-700">Oczekujące</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.pending}</p>
          </div>

          {/* E-booki */}
          <div className="bg-indigo-50 text-indigo-700 rounded-xl shadow-sm p-4 border border-indigo-100">
             <div className="flex items-center mb-2">
              <BookOpen size={18} className="text-indigo-500 mr-2" />
              <h3 className="font-medium text-indigo-700">E-booki</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.ebook}</p>
          </div>

          {/* Sprzedażowe */}
          <div className="bg-purple-50 text-purple-700 rounded-xl shadow-sm p-4 border border-purple-100">
            <div className="flex items-center mb-2">
              <ShoppingCart size={18} className="text-purple-500 mr-2" />
              <h3 className="font-medium text-purple-700">Sprzedażowe</h3>
            </div>
            <p className="text-3xl font-semibold">{stats.sales}</p>
          </div>
        </div>

        {/* Search bar */}
        <div className="mb-6">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Szukaj strony..."
              className="text-gray-600 w-full pl-10 pr-4 py-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-300 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-5">
          <nav className="flex -mb-px space-x-6 overflow-x-auto">
            {/* Grupa zakładek statusu */}
            <div className="flex space-x-6">
              <button
                onClick={() => setActiveTab('all')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'all'
                    ? 'border-sky-400 text-sky-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Wszystkie
              </button>
              <button
                 onClick={() => setActiveTab('published')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'published'
                    ? 'border-green-400 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Opublikowane
              </button>
              <button
                 onClick={() => setActiveTab('pending')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'pending'
                    ? 'border-amber-400 text-amber-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Oczekujące
              </button>
              <button
                 onClick={() => setActiveTab('draft')}
                className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap cursor-pointer ${
                  activeTab === 'draft'
                    ? 'border-gray-400 text-gray-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Szkice
              </button>
            </div>

             {/* Separator */}
            <div className="border-l border-gray-200 h-6 self-center"></div>

            {/* Grupa zakładek typu */}
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveTab('ebook')}
                 className={`py-1.5 px-3 rounded-xs flex items-center text-sm font-medium cursor-pointer ${
                  activeTab === 'ebook'
                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    : 'bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100'
                }`}
              >
                <BookOpen size={14} className="mr-1.5" />
                E-booki
               </button>
              <button
                onClick={() => setActiveTab('sales')}
                className={`py-1.5 px-3 rounded-xs flex items-center text-sm font-medium cursor-pointer ${
                  activeTab === 'sales'
                     ? 'bg-purple-100 text-purple-700 border border-purple-200'
                    : 'bg-purple-50 text-purple-600 border border-purple-100 hover:bg-purple-100'
                }`}
              >
                <ShoppingCart size={14} className="mr-1.5" />
                Sprzedażowe
               </button>
            </div>
          </nav>
        </div>

        {/* Loading state */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
          </div>
        ) : (
          <>
            {/* Pages grid */}
            {pages.length === 0 ? (
               <div className="text-center py-12 text-gray-500">
                Brak stron spełniających kryteria wyszukiwania
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pages.map(page => (
                   <div key={page.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition-shadow duration-200">
                    <div className={`h-2
                      ${page.status === 'published' ? 'bg-green-500' :
                        page.status === 'pending' ? 'bg-amber-400' : 'bg-gray-400'}
                      ${page.type === 'ebook' ? 'opacity-90' : 'opacity-90'}`}>
                    </div>
                    <div className="p-5">
                      {/* Nagłówek z tytułem i statusami */}
                       <div className="flex mb-4">
                        <div className="flex justify-between items-start w-full">
                          <h3 className="font-medium text-gray-900 text-lg line-clamp-2 max-w-[65%] min-h-[3rem]">{page.headline}</h3>
                           <div className="flex flex-nowrap space-x-1.5 min-w-fit ml-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap
                              ${page.type === 'ebook'
                                 ? 'bg-indigo-100 text-indigo-700'
                                : 'bg-purple-100 text-purple-700'}`}>
                              {page.type === 'ebook' ? 'e-book' : 'sprzedaż'}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap
                              ${page.status === 'published'
                                 ? 'bg-green-100 text-green-700'
                                : page.status === 'pending'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'}`}>
                              {page.status === 'published' ? 'opublikowany' :
                               page.status === 'pending' ? 'oczekujący' : 'szkic'}
                            </span>
                          </div>
                        </div>
                       </div>
                       <div className="border-t border-gray-100 mb-4"></div>

                      {/* Sekcja z ramkami statystyk i okładką - układ dostosowany dla mobile i desktop */}
                      <div className="block sm:flex sm:gap-4">

                        {/* Mobile: UKŁAD DWUKOLUMNOWY (całość widoczna tylko na mobile) */}
                        <div className="flex flex-row gap-1 sm:hidden mb-4"> {/* Zmniejszony gap z 3 na 1 */}

                          {/* Lewa kolumna na mobilnych - informacje o stronie + URL */}
                          <div className="w-3/5"> {/* Zmieniono z flex-1 na w-3/5 (60%) */}

                            {/* Metadane - Zmodernizowany wygląd */}
                            <div className="bg-gray-50 rounded-lg p-3 space-y-2.5">
                                <div className="flex items-center">
                                  <div className="w-20 text-gray-400 text-xs whitespace-nowrap">Tytuł SEO:</div>
                                  <div className="text-gray-600 font-medium flex-1 truncate text-xs">{page.title ? page.title.slice(0, -4) : ""}</div>
                                </div>

                                <div className="flex items-center">
                                  <div className="w-20 text-gray-400 text-xs whitespace-nowrap">Twórca:</div>
                                  <div className="text-gray-800 font-medium flex-1 truncate text-xs">{page.creator}</div>
                                </div>
                                <div className="border-t border-gray-200 my-1.5"></div>
                                {page.supervisorCode && !isGodRole && (
                                  <div className="flex items-center">
                                    <div className="w-20 text-gray-400 text-xs whitespace-nowrap">Opiekun:</div>
                                    <div className="text-gray-800 font-medium flex-1 truncate text-xs">
                                      {getSupervisorDescription(page.supervisorCode)}
                                    </div>
                                  </div>
                                )}

                                <div className="flex items-center">
                                  <div className="w-20 text-gray-400 text-xs whitespace-nowrap">Data:</div>
                                  <div className="text-gray-800 flex-1 truncate text-xs">{formatDate(page.createdAt)}</div>
                                </div>

                                {/* Dodane: Wyświetlanie hasła do wideo dla własnych stron */}
                                {page.isOwnedByUser && page.videoPassword && (
                                  <>
                                    <div className="border-t border-gray-200 my-1.5"></div>
                                    <div className="flex items-center">
                                      <div className="w-20 text-gray-400 text-xs whitespace-nowrap flex items-center">
                                        <Lock size={12} className="mr-1 text-amber-500" /> Hasło:
                                      </div>
                                      <div className="text-amber-600 font-medium flex-1 truncate text-xs">
                                        {page.videoPassword}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>

                            {/* URL z możliwością kopiowania - tylko dla mobile */}
                            {page.url && (
                               <div className="mt-2.5 flex items-center relative bg-gray-50 rounded-lg p-3">
                                <p className="text-xs text-gray-500 truncate w-full"> {/* Dodano w-full aby zapewnić dobre skracanie */}
                                  <span className="text-gray-400 mr-1 hidden sm:inline">Link:</span>
                                  <span className="text-sky-600 font-medium truncate">{page.url}</span> {/* Dodano truncate żeby URL był skracany */}
                                </p>
                                <div className="flex items-center ml-2">
                                  <button
                                    onClick={() => openQrCode(page.url, page.headline || page.title, page.creator)}
                                    className="flex-shrink-0 p-1 text-gray-500 hover:text-sky-600 hover:bg-gray-200 rounded transition-colors cursor-pointer mr-1"
                                    title="Generuj kod QR"
                                  >
                                    <QrCode className="h-4 w-4" />
                                  </button>
                                  <button
                                    onClick={() => copyUrlToClipboard(page.id, page.url)}
                                    className="flex-shrink-0 p-1 text-gray-500 hover:text-sky-600 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                                    title="Kopiuj link do schowka"
                                  >
                                    <Copy className="h-4 w-4" />
                                  </button>
                                </div>
                                {copiedUrl === page.id && (
                                  <div className="absolute right-0 -top-7 bg-green-100 text-green-800 px-2 py-1 rounded-md shadow-sm text-xs z-10 animate-pulse">
                                    URL skopiowany!
                                  </div>
                                )}
                              </div>
                            )}

                           </div> {/* Koniec lewej kolumny mobilnej */}

                          {/* Prawa kolumna na mobilnych - okładka */}
                          <div className="w-2/5 flex items-center p-0"> {/* Usunięty justify-center i dodany p-0 */}
                             {page.coverImage ? (
                              <img
                                src={page.coverImage}
                                alt={`Okładka ${page.title}`}
                                className="w-full h-auto object-cover cursor-pointer rounded-md"
                                style={{
                                  maxHeight: `${coverImageSize * 0.7}px`,
                                  objectFit: 'contain'
                                }}
                                onClick={() => openCoverPreview(page.coverImage, page.headline || page.title)}
                                onError={(e) => {
                                  // Zastąp obrazek placeholderem z ikoną wideo
                                  const imgElement = e.currentTarget;
                                  const parent = imgElement.parentNode;

                                  if (parent) {
                                    // Tworzymy nowy element div na placeholder
                                    const placeholderDiv = document.createElement('div');
                                    placeholderDiv.className = "w-full h-full rounded-md bg-gray-100 flex flex-col items-center justify-center border border-gray-200";
                                    placeholderDiv.style.height = `${coverImageSize * 0.7}px`;

                                    // Dodaj ikonę wideo i tekst
                                    placeholderDiv.innerHTML = `
                                      <svg xmlns="http://www.w3.org/2000/svg" width="${coverImageSize/4}" height="${coverImageSize/4}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mb-2">
                                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                      </svg>
                                      <span class="text-gray-400 text-xs">Brak okładki</span>
                                    `;

                                    // Zastąp obrazek placeholderem
                                    parent.replaceChild(placeholderDiv, imgElement);
                                  }
                                }}
                               />
                            ) : (
                              <div
                                className="bg-gray-100 rounded-md flex flex-col items-center justify-center border border-gray-200 w-full"
                                style={{
                                  height: `${coverImageSize * 0.7}px`
                                }}
                              >
                                <Video size={coverImageSize/4} className="text-gray-400 mb-2" />
                                <span className="text-gray-400 text-xs">Brak okładki</span>
                              </div>
                            )}
                          </div> {/* Koniec prawej kolumny mobilnej */}

                         </div> {/* Koniec układu dwukolumnowego dla mobile */}


                        {/* Desktop: Lewa kolumna - oryginalne style (ukryta na mobile) */}
                        <div className="hidden sm:block sm:w-3/5 sm:space-y-4 sm:pr-4">
                          {/* Metadane - Zmodernizowany wygląd */}
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2.5">
                             <div className="flex items-center text-sm">
                              <div className="w-24 text-gray-400">Tytuł SEO:</div>
                              <div className="text-gray-800 font-medium flex-1 truncate">{page.title ? page.title.slice(0, -4) : ""}</div>
                             </div>

                            <div className="flex items-center text-sm">
                              <div className="w-24 text-gray-400">Twórca:</div>
                               <div className="text-gray-800 font-medium flex-1 truncate">{page.creator}</div>
                            </div>
                            <div className="border-t border-gray-200 my-1.5"></div>
                            {page.supervisorCode && !isGodRole && (
                               <div className="flex items-center text-sm">
                                <div className="w-24 text-gray-400">Opiekun:</div>
                                <div className="text-gray-800 font-medium flex-1 truncate">
                                  {getSupervisorDescription(page.supervisorCode)}
                                </div>
                               </div>
                            )}

                            <div className="flex items-center text-sm">
                               <div className="w-24 text-gray-400">Utworzono:</div>
                              <div className="text-gray-800 flex-1 truncate">{formatDate(page.createdAt)}</div>
                            </div>

                            {/* Dodane: Wyświetlanie hasła do wideo dla własnych stron - wersja desktop */}
                            {page.isOwnedByUser && page.videoPassword && (
                              <>
                                <div className="border-t border-gray-200 my-1.5"></div>
                                <div className="flex items-center text-sm">
                                  <div className="w-24 text-gray-400 flex items-center">
                                    <Lock size={14} className="mr-1.5 text-amber-500" /> Hasło:
                                  </div>
                                  <div className="text-amber-600 font-medium flex-1 truncate">
                                    {page.videoPassword}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                           {/* Statystyki dla desktop - oryginalne style */}
                          <div className="flex gap-3">
                            <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-100 hover:border-blue-200 transition-colors">
                               <p className="text-blue-600 text-xl font-semibold">{page.visits}</p>
                              <p className="text-blue-500 text-xs uppercase tracking-wide font-medium">wejść</p>
                            </div>

                             <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-100 hover:border-green-200 transition-colors">
                              <p className="text-green-600 text-xl font-semibold">{page.leads}</p>
                              <p className="text-green-500 text-xs uppercase tracking-wide font-medium">leadów</p>
                             </div>
                          </div>

                          {/* Informacja o statusie strony tylko dla oczekujących - desktop */}
                           {page.status === 'pending' && (
                            <div className="text-amber-500 flex items-center text-sm">
                              <Clock size={16} className="mr-2" />
                               Oczekuje na publikację
                            </div>
                          )}
                        </div>

                         {/* Desktop: Prawa kolumna - okładka - oryginalne style (ukryta na mobile) */}
                        <div className="hidden sm:flex sm:w-2/5 sm:items-center sm:justify-center">
                          {page.coverImage ? (
                            <img
                              src={page.coverImage}
                              alt={`Okładka ${page.title}`}
                              style={{
                                maxWidth: `${coverImageSize * 0.75}px`,
                                maxHeight: `${coverImageSize}px`,
                                objectFit: 'contain'  // Zmiana z 'cover' na 'contain'
                              }}
                              className="mx-auto rounded-md cursor-pointer"
                              onClick={() => openCoverPreview(page.coverImage, page.headline || page.title)}
                              onError={(e) => {
                                // Zastąp obrazek placeholderem z ikoną wideo
                                const imgElement = e.currentTarget;
                                const parent = imgElement.parentNode;

                                if (parent) {
                                  // Tworzymy nowy element div na placeholder
                                  const placeholderDiv = document.createElement('div');
                                  placeholderDiv.className = "mx-auto rounded-md bg-gray-100 flex flex-col items-center justify-center border border-gray-200";
                                  placeholderDiv.style.height = `${coverImageSize}px`;
                                  placeholderDiv.style.width = `${coverImageSize * 0.75}px`;

                                  // Dodaj ikonę wideo i tekst
                                  placeholderDiv.innerHTML = `
                                    <svg xmlns="http://www.w3.org/2000/svg" width="${coverImageSize/3}" height="${coverImageSize/3}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mb-2">
                                      <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                      <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                                    </svg>
                                    <span class="text-gray-400 text-xs">Brak okładki</span>
                                  `;

                                  // Zastąp obrazek placeholderem
                                  parent.replaceChild(placeholderDiv, imgElement);
                                }
                              }}
                             />
                          ) : (
                            <div
                              style={{
                                height: `${coverImageSize}px`,
                                width: `${coverImageSize * 0.75}px`
                              }}
                              className="mx-auto bg-gray-100 rounded-md flex flex-col items-center justify-center border border-gray-200"
                            >
                              <Video size={coverImageSize/3} className="text-gray-400 mb-2" />
                              <span className="text-gray-400 text-xs">Brak okładki</span>
                            </div>
                          )}
                        </div>

                        {/* Statystyki dla mobile - pełna szerokość (widoczne tylko na mobile) */}
                         <div className="block sm:hidden w-full"> {/* Ten div jest widoczny tylko na mobile, poniżej układu kolumnowego */}
                          <div className="flex gap-3">
                            <div className="flex-1 bg-blue-50 rounded-lg p-3 border border-blue-100 hover:border-blue-200 transition-colors">
                               <p className="text-blue-600 text-xl font-semibold">{page.visits}</p>
                              <p className="text-blue-500 text-xs uppercase tracking-wide font-medium">wejść</p>
                            </div>

                             <div className="flex-1 bg-green-50 rounded-lg p-3 border border-green-100 hover:border-green-200 transition-colors">
                              <p className="text-green-600 text-xl font-semibold">{page.leads}</p>
                              <p className="text-green-500 text-xs uppercase tracking-wide font-medium">leadów</p>
                             </div>
                          </div>
                        </div>

                        {/* Informacja o statusie strony tylko dla oczekujących - mobile (widoczna tylko na mobile) */}
                         {page.status === 'pending' && (
                          <div className="block sm:hidden text-amber-500 flex items-center text-sm mt-3">
                            <Clock size={16} className="mr-2" />
                             Oczekuje na moderację
                          </div>
                        )}
                      </div> {/* Koniec głównego bloku .block.sm:flex */}

                       {/* Link publiczny z możliwością kopiowania - tylko dla desktop (ukryty na mobile) */}
                      {page.url && (
                        <div className="hidden sm:flex mt-4 items-center relative bg-gray-50 rounded-md p-2"> {/* Ten div jest ukryty na mobile */}
                           <p className="text-xs text-gray-500 truncate flex-grow">
                            <span className="text-gray-400 mr-1">Link:</span>
                            <span className="text-sky-600 font-medium">{page.url}</span>
                          </p>
                          <div className="flex items-center ml-2">
                            <button
                              onClick={() => openQrCode(page.url, page.headline || page.title, page.creator)}
                              className="p-1 text-gray-500 hover:text-sky-600 hover:bg-gray-200 rounded transition-colors cursor-pointer mr-1"
                              title="Generuj kod QR"
                            >
                              <QrCode className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => copyUrlToClipboard(page.id, page.url)}
                              className="p-1 text-gray-500 hover:text-sky-600 hover:bg-gray-200 rounded transition-colors cursor-pointer"
                              title="Kopiuj link do schowka"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          {copiedUrl === page.id && (
                            <div className="absolute right-0 top-8 bg-green-100 text-green-800 px-2 py-1 rounded-md shadow-sm text-xs z-10 animate-pulse">
                               URL skopiowany!
                            </div>
                          )}
                        </div>
                      )}

                      {/* Przyciski akcji */}
                      <div className="mt-5 pt-3 border-t border-gray-100 flex justify-between">
                        <div className="space-x-3">
                          <button
                             className="text-sm text-sky-600 hover:text-sky-700 cursor-pointer bg-sky-50 hover:bg-sky-100 px-2.5 py-1.5 rounded transition-colors"
                            onClick={() => openEditor(page.draft_url)}
                          >
                             <Edit size={14} className="inline mr-1.5" />
                            Edytuj
                          </button>
                          <button
                             className="text-sm text-gray-600 hover:text-gray-700 cursor-pointer bg-gray-50 hover:bg-gray-100 px-2.5 py-1.5 rounded transition-colors"
                            onClick={() => openPreview(page.draft_url)}
                          >
                             <Eye size={14} className="inline mr-1.5" />
                            Podgląd
                          </button>
                        </div>
                         <button
                          className="text-sm text-red-600 hover:text-red-700 cursor-pointer bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded transition-colors"
                          onClick={() => handleDeletePage(page)}
                           title="Usuń stronę"
                        >
                          <Trash2 size={14} className="inline mr-1.5" />
                          Usuń
                         </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
             )}
          </>
        )}

        {/* Add more pages button */}
        <div className="mt-6 flex justify-center">
          <button className="flex items-center border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-md text-sm cursor-pointer">
            <Plus size={16} className="mr-2" />
            Pokaż więcej stron
          </button>
        </div>
      </div>

      {/* Popup formularza tworzenia strony */}
      {isCreateFormOpen && (
        <CreatePageForm
          isOpen={isCreateFormOpen}
          onClose={() => setIsCreateFormOpen(false)}
          onPageCreated={handlePageCreated}
        />
      )}

       {/* Modal potwierdzenia usunięcia */}
      {isDeleteModalOpen && pageToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Przyciemnione tło */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={cancelDeletePage} />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
             <h3 className="text-lg font-semibold text-gray-800 mb-2">Potwierdź usunięcie</h3>

            <div className="my-4">
              <p className="text-gray-600 mb-2">
                Czy na pewno chcesz usunąć stronę <span className="font-semibold text-gray-800">{pageToDelete.headline || pageToDelete.title}</span>?
              </p>
              <p className="text-sm text-red-600">
                Ta operacja jest nieodwracalna. Wszystkie pliki i dane związane z tą stroną zostaną usunięte.
              </p>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                <p>{deleteError}</p>
              </div>
            )}

             <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={cancelDeletePage}
                disabled={isDeleting}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 disabled:opacity-50"
               >
                Anuluj
              </button>
              <button
                type="button"
                onClick={confirmDeletePage}
                disabled={isDeleting}
                 className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-md text-white disabled:bg-red-400"
              >
                {isDeleting ? (
                  <div className="flex items-center">
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    <span>Usuwanie...</span>
                  </div>
                 ) : (
                  'Usuń stronę'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal podglądu okładki */}
      {previewImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Przyciemnione, rozmyte tło */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeCoverPreview} />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-lg max-w-3xl max-h-screen p-6 mx-4 overflow-hidden">
            <button
              onClick={closeCoverPreview}
              className="absolute top-2 right-2 p-2 rounded-full bg-white/80 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{previewImage.title}</h3>
              <img
                src={previewImage.url}
                alt={`Okładka ${previewImage.title}`}
                className="max-h-[70vh] max-w-full object-contain rounded-md"
                onError={(e) => {
                  // Zastąp obrazek placeholderem z ikoną wideo
                  const imgElement = e.target as HTMLImageElement;
                  const parent = imgElement.parentNode;

                  if (parent) {
                    // Tworzymy nowy element div na placeholder
                    const placeholderDiv = document.createElement('div');
                    placeholderDiv.className = "max-w-full rounded-md bg-gray-100 flex flex-col items-center justify-center border border-gray-200";
                    placeholderDiv.style.height = '70vh';
                    placeholderDiv.style.maxHeight = '70vh';

                    // Dodaj ikonę wideo i tekst
                    placeholderDiv.innerHTML = `
                      <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400 mb-3">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      <span class="text-gray-500 text-sm">Podgląd okładki niedostępny</span>
                    `;

                    // Zastąp obrazek placeholderem
                    parent.replaceChild(placeholderDiv, imgElement);
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Powiadomienie o otwieraniu podglądu */}
      {previewNotification && (
        <div className="fixed bottom-4 right-4 bg-indigo-600 text-white px-4 py-3 rounded-lg shadow-lg z-50 flex items-center animate-fade-in">
          <Eye className="h-5 w-5 mr-3" />
          <span>Otwieranie podglądu w nowej karcie...</span>
        </div>
      )}

      {/* Modal z kodem QR */}
      {qrCodeData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Przyciemnione, rozmyte tło */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={closeQrCode} />

          {/* Modal */}
          <div className="relative bg-white rounded-lg shadow-lg p-6 mx-4 max-w-md w-full">
            <button
              onClick={closeQrCode}
              className="absolute top-2 right-2 p-2 rounded-full bg-white/80 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <X size={24} />
            </button>

            <div className="flex flex-col items-center">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{qrCodeData.title}</h3>

              {/* Logo i informacje */}
              <div className="mb-4 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-2 overflow-hidden border border-gray-200">
                  {qrCodeData.logoUrl ? (
                    <img
                      src={qrCodeData.logoUrl}
                      alt="Logo firmy"
                      className="w-full h-full object-contain p-1"
                      onError={(e) => {
                        // Fallback do ikony FileText jeśli logo nie może zostać załadowane
                        const imgElement = e.currentTarget as HTMLImageElement;
                        imgElement.style.display = 'none';
                        const parent = imgElement.parentElement;
                        if (parent) {
                          const fallbackIcon = document.createElement('div');
                          fallbackIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-blue-600"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
                          parent.appendChild(fallbackIcon);
                        }
                      }}
                    />
                  ) : (
                    <FileText size={32} className="text-blue-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-1">Twórca: {qrCodeData.creator}</p>
                <p className="text-xs text-gray-500 truncate max-w-xs">{qrCodeData.url}</p>
              </div>

              {/* Kod QR */}
              <div className="w-64 h-64 bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-center relative">
                {/* Prawdziwy kod QR generowany przez bibliotekę */}
                <QRCodeSVG
                  value={qrCodeData.url}
                  size={200}
                  bgColor={"#ffffff"}
                  fgColor={"#000000"}
                  level={"H"}
                  includeMargin={true}
                  ref={qrCodeRef}
                />

                {/* Informacja o kodzie QR */}
                <div className="absolute -bottom-8 text-center w-full">
                  <p className="text-xs text-gray-500">Zeskanuj kod QR, aby odwiedzić stronę</p>
                </div>
              </div>

              {/* Przyciski akcji */}
              <div className="mt-14 flex flex-col space-y-3">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                  onClick={copyQrCodeToClipboard}
                  disabled={copyingQr || qrCopied}
                >
                  {copyingQr ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      <span>Kopiowanie...</span>
                    </>
                  ) : qrCopied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      <span>Skopiowano do schowka!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      <span>Kopiuj kod QR do schowka</span>
                    </>
                  )}
                </button>

                <button
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                  onClick={closeQrCode}
                >
                  Zamknij
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Style dla animacji powiadomienia */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default PagesView;