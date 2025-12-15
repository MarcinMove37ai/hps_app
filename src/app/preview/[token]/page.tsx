// src/app/preview/[token]/page.tsx
"use client"

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { AlertCircle, Eye, ArrowLeft, X, AlertTriangle, Check, Edit, Save } from 'lucide-react';
import AuthGuard from '@/components/auth/AuthGuard';
import Link from 'next/link';
import DemoView, { colorSchemes } from '@/components/views/demo';
import DemoVideo from '@/components/views/demoVideo'; // Import komponentu DemoVideo
import EditModeProvider, { useEditMode } from '@/contexts/EditModeContext';

// Interfejsy zostały zaktualizowane, aby uwzględnić pola color, id i status
interface PageData {
  id?: string;
  color?: string;
  status?: string;
  x_amz_meta_title?: string;
  s3_file_key?: string;
  x_amz_meta_page_type?: string; // Dodane pole do rozróżniania typów stron
  video_embed_url?: string; // Dodane pole dla URL wideo
  video_thumbnail_url?: string; // Dodane pole dla miniatury wideo
  video_provider?: string; // Dodane pole dla dostawcy wideo
  video_id?: string; // Dodane pole dla ID wideo
  pagecontent_hero_headline?: string;
  pagecontent_hero_subheadline?: string;
  pagecontent_hero_description?: string;
  pagecontent_benefits_items_0_title?: string;
  pagecontent_benefits_items_0_text?: string;
  pagecontent_benefits_items_1_title?: string;
  pagecontent_benefits_items_1_text?: string;
  pagecontent_benefits_items_2_title?: string;
  pagecontent_benefits_items_2_text?: string;
  pagecontent_benefits_items_3_title?: string;
  pagecontent_benefits_items_3_text?: string;
  pagecontent_testimonials_items_0_text?: string;
  pagecontent_testimonials_items_0_author?: string;
  pagecontent_testimonials_items_0_role?: string;
  pagecontent_testimonials_items_1_text?: string;
  pagecontent_testimonials_items_1_author?: string;
  pagecontent_testimonials_items_1_role?: string;
  pagecontent_testimonials_items_2_text?: string;
  pagecontent_testimonials_items_2_author?: string;
  pagecontent_testimonials_items_2_role?: string;
  pagecontent_content_chapters_0_title?: string;
  pagecontent_content_chapters_0_description?: string;
  pagecontent_content_chapters_1_title?: string;
  pagecontent_content_chapters_1_description?: string;
  pagecontent_content_chapters_2_title?: string;
  pagecontent_content_chapters_2_description?: string;
  pagecontent_form_title?: string;
  pagecontent_faq_items_0_question?: string;
  pagecontent_faq_items_0_answer?: string;
  pagecontent_faq_items_1_question?: string;
  pagecontent_faq_items_1_answer?: string;
  pagecontent_faq_items_2_question?: string;
  pagecontent_faq_items_2_answer?: string;
  [key: string]: string | undefined;
}

interface PageContent {
  s3_file_key: string;
  hero: {
    headline: string;
    subheadline: string;
    description: string;
    buttonText: string;
    stats: Array<{ value: string; label: string }>;
  };
  benefits: {
    title: string;
    items: Array<{ title: string; text: string }>;
  };
  testimonials: {
    title: string;
    items: Array<{
      avatar: string;
      text: string;
      author: string;
      role: string;
      rating: number;
    }>;
  };
  content: {
    title: string;
    chapters: Array<{
      number: string;
      title: string;
      description: string;
    }>;
  };
  form: {
    title: string;
    subtitle: string;
    namePlaceholder: string;
    emailPlaceholder: string;
    phonePlaceholder: string;
    buttonText: string;
    privacyText: string;
  };
  guarantees: {
    items: Array<{ text: string }>;
  };
  faq: {
    title: string;
    items: Array<{
      question: string;
      answer: string;
    }>;
  };
}

// Interfejs dla strony sprzedażowej z wideo - zaktualizowany
interface VideoPageContent {
  title: string;
  description?: string;
  videoEmbedUrl: string;
  videoThumbnailUrl?: string;
  videoProvider: "vimeo" | "voomly";
  ctaButtonText?: string;
}

// Komponent Toast Notification - eleganckie powiadomienia
const ToastNotification = ({
  type = 'success',
  message,
  onClose
}: {
  type: 'success' | 'error';
  message: string;
  onClose: () => void;
}) => {
  // Automatycznie zamknij toast po 3 sekundach
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed left-4 bottom-16 z-50 p-3 rounded-md shadow-lg flex items-center space-x-3 transition-all duration-300 animate-slideUp ${
        type === 'success'
          ? 'bg-green-50 text-green-800 border border-green-200'
          : 'bg-red-50 text-red-800 border border-red-200'
      }`}
    >
      <div className={`flex-shrink-0 w-5 h-5 ${type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
        {type === 'success' ? (
          <Check className="w-5 h-5" />
        ) : (
          <X className="w-5 h-5" />
        )}
      </div>
      <p className="text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Komponent banera ostrzegawczego dla trybu podglądu - przeniesiony na dół strony
const PreviewModeBanner = ({ onClose, title }: { onClose: () => void, title?: string }) => {
  return (
    <>
      {/* Wodoznak informujący o trybie podglądu */}
      <div className="fixed inset-0 pointer-events-none z-30 flex items-center justify-center">
        <div className="text-gray-200 text-9xl font-bold opacity-5 transform -rotate-45 select-none">
          PODGLĄD
        </div>
      </div>

      {/* Główny baner na dole ekranu - z dodaną przezroczystością */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-indigo-700/90 backdrop-blur-sm py-3 px-4 text-white flex justify-between items-center shadow-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 mr-3 text-yellow-300" />
          <div>
            <span className="font-bold block text-sm sm:text-base">TRYB PODGLĄDU (TYLKO DO ODCZYTU)</span>
            <span className="text-indigo-200 text-xs sm:text-sm">
              Ten link jest tymczasowy i nie powinien być udostępniany.
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="flex items-center bg-white text-indigo-700 px-3 py-2 rounded text-sm font-medium hover:bg-indigo-50 transition-colors ml-2 cursor-pointer"
        >
          <X className="h-4 w-4 mr-1" />
          Zamknij podgląd
        </button>
      </div>
    </>
  );
};

// Komponent dialogu potwierdzającego z wyblurowanym tłem
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel
}: {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-sm bg-white/30 transition-all duration-300 animate-fadeIn">
      <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl border border-gray-200 animate-scaleIn">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 transition-colors cursor-pointer"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Przycisk kolorystyki
const ColorSchemeButton = ({
  scheme,
  currentScheme,
  onClick,
  colorName,
  color,
  disabled
}: {
  scheme: string,
  currentScheme: string,
  onClick: (scheme: string) => void,
  colorName: string,
  color: string,
  disabled?: boolean
}) => {
  return (
    <button
      onClick={() => !disabled && onClick(scheme)}
      className={`flex items-center justify-center p-1.5 sm:p-2 rounded-full border-2 w-8 h-8 sm:w-10 sm:h-10 transition-all ${
        currentScheme === scheme ? 'border-gray-800' : 'border-gray-300'
      } ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
      }`}
      title={colorName}
      aria-label={`Zmień kolorystykę na ${colorName}`}
      disabled={disabled}
    >
      <div
        className="w-full h-full rounded-full"
        style={{ backgroundColor: color }}
      />
    </button>
  );
};

// Wspólna klasa tła dla wszystkich stanów - grafitowy kolor
const containerClass = "min-h-screen bg-white";

// Komponent ładowania z grafitowym tłem
const LoadingState = () => (
  <div className={`${containerClass} flex items-center justify-center h-screen`}>
    <div className="text-center">
      <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-400 border-r-transparent"></div>
      <p className="mt-4 text-gray-700">Ładowanie podglądu strony...</p>
    </div>
  </div>
);

// Komponent błędu z grafitowym tłem
const ErrorState = ({ message, onRetry }: { message: string, onRetry?: () => void }) => (
  <div className={`${containerClass} flex items-center justify-center h-screen`}>
    <div className="text-center max-w-md p-6 bg-red-900 rounded-lg border border-red-700">
      <div className="flex justify-center mb-4">
        <AlertCircle className="h-12 w-12 text-red-300" />
      </div>
      <h2 className="text-xl font-semibold text-red-100 mb-2">Wystąpił błąd</h2>
      <p className="text-red-100">{message}</p>
      <div className="mt-6 flex justify-center space-x-4">
        {onRetry && (
          <button
            onClick={onRetry}
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
          >
            Spróbuj ponownie
          </button>
        )}
        <Link
          href="/pages"
          className="inline-block px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors cursor-pointer"
        >
          Powrót do listy stron
        </Link>
      </div>
    </div>
  </div>
);

// Główny komponent strony podglądu
const PreviewPageContent = () => {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token as string;
  const searchParams = useSearchParams(); // Pobierz parametry URL
  const isPreviewMode = searchParams.get('view_mode') === 'preview'; // Sprawdź tryb podglądu
  const editMode = searchParams.get('mode') === 'edit'; // Sprawdź czy przyszliśmy z przycisku "Edytuj"

  const { user } = useAuth();
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentColorScheme, setCurrentColorScheme] = useState<keyof typeof colorSchemes>('harmonia');
  const [originalColorScheme, setOriginalColorScheme] = useState<keyof typeof colorSchemes>('harmonia');
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Nowy stan dla trybu edycji tekstu - domyślnie wyłączony, ale włączymy go automatycznie w useEffect
  const [isTextEditMode, setIsTextEditMode] = useState(false);

  // Stany dla lokalnego śledzenia zmian (gdy nie używamy kontekstu)
  const [localTextChanges, setLocalTextChanges] = useState<Record<string, string>>({});
  const [hasLocalColorChange, setHasLocalColorChange] = useState(false);

  // Sprawdź czy korzystamy z kontekstu
  const editModeContext = useEditMode();
  const useContextMode = !!editModeContext;

  // Nowy stan dla powiadomień typu toast
  const [toast, setToast] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Nowe stany dla obsługi dialogów i nowego statusu
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmDialogConfig, setConfirmDialogConfig] = useState({
    title: '',
    message: '',
    confirmText: '',
    cancelText: '',
    onConfirm: () => {}
  });
  const [newStatus, setNewStatus] = useState<string | null>(null);

  // Funkcja do zamykania podglądu (powrót do listy stron)
  const closePreview = () => {
    // Próba zamknięcia zakładki
    window.close();

    // Sprawdź, czy zakładka została zamknięta
    // W niektórych przeglądarkach zamykanie przez JavaScript może być zablokowane
    setTimeout(() => {
      // Jeśli zakładka nadal jest otwarta, pokaż komunikat i przekieruj
      if (!window.closed) {
        // Wyświetl komunikat dla użytkownika
        const confirmation = window.confirm(
          'Ta przeglądarka nie pozwala na automatyczne zamknięcie zakładki. Czy chcesz wrócić do listy stron?'
        );

        // Przekieruj do listy stron
        if (confirmation) {
          window.location.href = '/pages';
        }
      }
    }, 300); // Krótkie opóźnienie, aby dać przeglądarce czas na zamknięcie
  };

  // Dodanie stylów animacji do globalnego stylu
  useEffect(() => {
    // Dodaj style animacji, które będą używane w dialogu i toast
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes scaleIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .animate-fadeIn {
        animation: fadeIn 0.2s ease-out forwards;
      }
      .animate-scaleIn {
        animation: scaleIn 0.2s ease-out forwards;
      }
      .animate-slideIn {
        animation: slideIn 0.3s ease-out forwards;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Funkcja pomocnicza do określania czy można edytować stronę
  const canEdit = () => {
    // W trybie podglądu nigdy nie można edytować
    if (isPreviewMode) return false;

    if (!pageData || !user) return false;

    // Wyświetl informacje diagnostyczne w konsoli
    console.log('User role check:', {
      role: user.role,
      userId: user.id,
      isAdmin: user.role?.toUpperCase() === 'ADMIN',
      isGod: user.role?.toUpperCase() === 'GOD',
      pageStatus: pageData.status
    });

    // Admini i GOD mogą zawsze edytować - porównanie niewrażliwe na wielkość liter
    if (user.role?.toUpperCase() === 'ADMIN' || user.role?.toUpperCase() === 'GOD') return true;

    // User może edytować tylko w statusie draft
    return user.role?.toUpperCase() === 'USER' && (pageData.status === 'draft' || editMode);
  };

  // Funkcja sprawdzająca czy są jakiekolwiek niezapisane zmiany
  const hasAnyChanges = () => {
    if (useContextMode) {
      return editModeContext.hasPendingChanges;
    } else {
      return Object.keys(localTextChanges).length > 0 || hasLocalColorChange;
    }
  };

  // Funkcja pomocnicza do określania możliwości zmiany statusu
  const getStatusChangeInfo = () => {
  if (!pageData || !user || isPreviewMode) {
    return { enabled: false, buttonText: '', newStatus: null };
  }

  const currentStatus = pageData.status || 'draft';
  const userRoleUpper = user.role?.toUpperCase() || '';
  const isAdmin = userRoleUpper === 'ADMIN' || userRoleUpper === 'GOD';
  const isUser = userRoleUpper === 'USER';

  // Dla administratorów i zwykłych użytkowników w trybie edycji
  if (isTextEditMode) {
    if (isAdmin) {
      // Admin w trybie edycji powinien nadal mieć możliwość publikacji
      if (currentStatus === 'draft') {
        return { enabled: true, buttonText: 'Publikuj', newStatus: 'active' };
      } else if (currentStatus === 'pending') {
        return { enabled: true, buttonText: 'Akceptuj', newStatus: 'active' };
      }
      // Nie pokazujemy przycisku "Edytuj" gdy admin jest już w trybie edycji
      else if (currentStatus === 'active') {
        return { enabled: false, buttonText: 'Tryb edycji', newStatus: null };
      }
    }
    else if (isUser) {
      // Użytkownik w trybie edycji powinien móc wysłać do akceptacji
      if (currentStatus === 'draft') {
        return { enabled: true, buttonText: 'Do akceptacji', newStatus: 'pending' };
      }
      // Dla innych statusów, gdy user jest w trybie edycji
      else {
        return { enabled: false, buttonText: 'W trybie edycji', newStatus: null };
      }
    }
  }

  // Standardowa logika dla przypadków, gdy nie jesteśmy w trybie edycji
      if (isAdmin) {
        if (currentStatus === 'draft') {
          return { enabled: true, buttonText: 'Publikuj', newStatus: 'active' };
        } else if (currentStatus === 'pending') {
          return { enabled: true, buttonText: 'Akceptuj', newStatus: 'active' };
        } else if (currentStatus === 'active') {
          return { enabled: true, buttonText: 'Edytuj', newStatus: 'draft' };
        }
      } else if (isUser) {
        if (currentStatus === 'draft') {
          return { enabled: true, buttonText: 'Do akceptacji', newStatus: 'pending' };
        } else if (currentStatus === 'pending') {
          return { enabled: false, buttonText: 'Oczekuje na akceptację', newStatus: null };
        } else if (currentStatus === 'active') {
          return { enabled: true, buttonText: 'Edytuj', newStatus: 'draft' };
        }
      }

      return { enabled: false, buttonText: 'Zmień status', newStatus: null };
    };

  // Obsługa zmiany kolorystyki - nie zapisuje od razu, tylko lokalnie
  const handleColorChange = (colorScheme: keyof typeof colorSchemes) => {
    // Nie pozwalaj na zmianę kolorystyki w trybie podglądu
    if (isPreviewMode) return;

    setCurrentColorScheme(colorScheme);

    // Jeśli korzystamy z kontekstu, użyj go do śledzenia zmian
    if (useContextMode) {
      editModeContext.handleColorChange(colorScheme);
    } else {
      // W przeciwnym razie śledź zmiany lokalnie
      setHasLocalColorChange(colorScheme !== originalColorScheme);
    }
  };

  // Funkcja zapisująca wszystkie zmiany (tekst + kolorystyka)
  const saveChanges = async () => {
    // Nie pozwalaj na zapisywanie w trybie podglądu
    if (isPreviewMode) return;

    if (!pageData?.id || !canEdit()) return;

    // Jeśli nie ma żadnych zmian, nie ma co zapisywać
    if (!hasAnyChanges()) return;

    setIsSaving(true);

    try {
      // Jeśli używamy kontekstu, wykorzystaj jego mechanizm zapisu
      if (useContextMode) {
        const credentials = {
          userId: user?.id,
          cognitoSub: user?.cognito_sub
        };

        await editModeContext.saveAllChanges(pageData.id, credentials);

        setToast({
          type: 'success',
          text: 'Zmiany zostały zapisane'
        });
      }
      // W przeciwnym razie zapisz ręcznie
      else {
        // Przygotuj dane do zapisania
        const changes: Record<string, any> = {
          ...localTextChanges
        };

        // Dodaj zmianę kolorystyki jeśli jest
        if (hasLocalColorChange) {
          changes.color = currentColorScheme;
        }

        const response = await fetch(`/api/pages/${pageData.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'X-User-Id': user?.id || '',
            'X-User-Cognito-Sub': user?.cognito_sub || ''
          },
          body: JSON.stringify(changes)
        });

        if (!response.ok) {
          throw new Error('Wystąpił błąd podczas zapisywania zmian');
        }

        // Aktualizuj lokalny stan strony
        const updatedPage = await response.json();
        setPageData(updatedPage);

        // Wyczyść śledzenie zmian lokalnych
        setLocalTextChanges({});
        setHasLocalColorChange(false);
        setOriginalColorScheme(currentColorScheme);

        setToast({
          type: 'success',
          text: 'Zmiany zostały zapisane'
        });
      }
    } catch (error) {
      console.error('Błąd podczas zapisywania zmian:', error);
      setToast({
        type: 'error',
        text: 'Nie udało się zapisać zmian'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Funkcja aktualizująca tekst lokalnie
  const handleTextUpdate = (fieldName: string, newValue: string) => {
    // Nie pozwalaj na aktualizację tekstu w trybie podglądu
    if (isPreviewMode) return;

    // Jeśli korzystamy z kontekstu, użyj go do obsługi zmian
    if (useContextMode) {
      editModeContext.handleTextChange(fieldName, newValue);
    } else {
      // W przeciwnym razie obsługuj zmiany lokalnie
      const originalValue = pageData?.[fieldName];

      // Jeśli wartość jest taka sama jak oryginalna, usuń ją z lokalnych zmian
      if (originalValue === newValue) {
        const updatedChanges = { ...localTextChanges };
        delete updatedChanges[fieldName];
        setLocalTextChanges(updatedChanges);
      } else {
        // W przeciwnym razie dodaj do lokalnych zmian
        setLocalTextChanges(prev => ({
          ...prev,
          [fieldName]: newValue
        }));
      }
    }
  };

  // Funkcja inicjująca zmianę statusu z potwierdzeniem
  const initiateStatusChange = () => {
    // Nie pozwalaj na zmianę statusu w trybie podglądu
    if (isPreviewMode) return;

    // Sprawdź czy są niezapisane zmiany
    if (hasAnyChanges()) {
      setConfirmDialogConfig({
        title: 'Niezapisane zmiany',
        message: 'Masz niezapisane zmiany. Zapisz je przed zmianą statusu strony.',
        confirmText: 'Zapisz zmiany',
        cancelText: 'Anuluj',
        onConfirm: saveChanges
      });
      setShowConfirmDialog(true);
      return;
    }

    const statusInfo = getStatusChangeInfo();
    if (!statusInfo.enabled || !statusInfo.newStatus) return;

    // Przygotowanie konfiguracji dialogu w zależności od aktualnego statusu i nowego statusu
    let dialogConfig = {
      title: 'Zmiana statusu',
      message: 'Czy na pewno chcesz zmienić status strony?',
      confirmText: 'Tak, zmień status',
      cancelText: 'Anuluj',
      onConfirm: () => executeStatusChange(statusInfo.newStatus!)
    };

    // Dostosowanie komunikatu dla konkretnych przypadków
    if (pageData?.status === 'draft' && user?.role?.toUpperCase() === 'USER' && statusInfo.newStatus === 'pending') {
      dialogConfig = {
        title: 'Wysyłanie do akceptacji',
        message: 'Czy przesłać stronę do akceptacji opiekuna?',
        confirmText: 'Tak, prześlij',
        cancelText: 'Anuluj',
        onConfirm: () => executeStatusChange('pending')
      };
    } else if (pageData?.status === 'pending' && (user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'GOD')) {
      dialogConfig = {
        title: 'Akceptacja strony',
        message: 'Czy chcesz zaakceptować i opublikować tę stronę?',
        confirmText: 'Tak, publikuj',
        cancelText: 'Anuluj',
        onConfirm: () => executeStatusChange('active')
      };
    } else if (pageData?.status === 'active') {
      const isAdminOrGod = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'GOD';

      if (isAdminOrGod) {
        // Dla ADMIN/GOD włączamy bezpośrednio tryb edycji bez zmiany statusu
        setIsTextEditMode(true);
        if (useContextMode) {
          editModeContext.setTextEditMode(true);
        }
        // Wyświetlamy komunikat o włączeniu trybu edycji
        setToast({
          type: 'success',
          text: 'Włączono tryb edycji bez zmiany statusu strony'
        });
        // Zamykamy dialog potwierdzenia (na wszelki wypadek)
        setShowConfirmDialog(false);
        // Przerywamy dalsze wykonanie funkcji
        return;
      } else {
        // Dla zwykłych użytkowników - standardowa zmiana statusu na draft
        dialogConfig = {
          title: 'Edycja strony',
          message: 'Zmiana statusu na "draft" umożliwi edycję strony. Kontynuować?',
          confirmText: 'Tak, edytuj',
          cancelText: 'Anuluj',
          onConfirm: () => executeStatusChange('draft')
        };
      }
    } else if (pageData?.status === 'draft' && (user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'GOD')) {
      dialogConfig = {
        title: 'Publikacja strony',
        message: 'Czy chcesz opublikować tę stronę?',
        confirmText: 'Tak, publikuj',
        cancelText: 'Anuluj',
        onConfirm: () => executeStatusChange('active')
      };
    }

    setConfirmDialogConfig(dialogConfig);
    setShowConfirmDialog(true);
    setNewStatus(statusInfo.newStatus);
  };

  // Funkcja wykonująca faktyczną zmianę statusu - rozszerzona o generowanie publicznego linku
  const executeStatusChange = async (status: string) => {
    // Nie pozwalaj na zmianę statusu w trybie podglądu
    if (isPreviewMode) return;

    if (!token || !pageData) return;

    setIsChangingStatus(true);

    try {
      // Jeśli zmieniamy status na "active", przygotuj dane do publikacji
      const updateData: Record<string, any> = { status };

      // Jeśli publikujemy stronę, generujemy publiczny URL
      if (status === 'active') {
        // Usuwamy 3 cyfry z końca tokenu
        const tokenWithoutDigits = token.replace(/\d{3}$/, '');

        // Poprawiona wersja slugowania tytułu - usuwamy myślniki i cyfry na końcu
        const processedTitle = pageData.x_amz_meta_title
          ? pageData.x_amz_meta_title.toLowerCase()
              // Najpierw usuwamy wszystkie znaki specjalne oprócz myślników i spacji
              .replace(/[^\w\s-]/gi, '')
              // Następnie usuwamy cyfry i myślniki na końcu tytułu
              .replace(/-*\d+(-*)$/, '')
              // Na koniec zamieniamy spacje i powtarzające się myślniki na pojedyncze myślniki
              .replace(/\s+/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-+|-+$/g, '') // Usuwamy myślniki z początku i końca
          : '';

        // Konstrukcja docelowego URL publikacji
        const pathUrl = `/p/${tokenWithoutDigits}${processedTitle ? `/${processedTitle}` : ''}`;
        const fullUrl = `${window.location.origin}${pathUrl}`;

        console.log(`Generowanie publicznego URL: oryginalny token=${token}, oczyszczony token=${tokenWithoutDigits}, przetworzony tytuł=${processedTitle}, pełny URL=${fullUrl}`);

        // Dodaj URL do danych aktualizacji
        updateData.url = fullUrl;
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-User-Id': user?.id || '',
        'X-User-Cognito-Sub': user?.cognito_sub || ''
      };

      const response = await fetch(`/api/pages/${pageData.id || token}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        throw new Error(`Wystąpił błąd podczas zmiany statusu na ${status}`);
      }

      // Pobierz zaktualizowane dane strony z odpowiedzi, aby mieć aktualny URL
      const updatedPage = await response.json();

      // Aktualizuj lokalny stan strony z danymi z serwera (lub użyj podstawowego fallbacku)
      setPageData(updatedPage || {
        ...pageData,
        status: status,
        url: updateData.url // Używamy lokalnie wygenerowanego URL jako fallbacku
      });

      let statusText = '';
      let additionalMessage = '';

      switch (status) {
        case 'pending':
          statusText = 'oczekujący na akceptację';
          break;
        case 'active':
          statusText = 'opublikowany';
          // Dodaj informację o dostępnym publicznym linku
          additionalMessage = updatedPage?.url
            ? ` Publiczny link: ${updatedPage.url}`
            : ' Strona jest dostępna pod publicznym linkiem.';
          break;
        case 'draft':
          statusText = 'wersja robocza';

          // Automatycznie włącz tryb edycji po zmianie na draft
          setIsTextEditMode(true);
          if (useContextMode) {
            editModeContext.setTextEditMode(true);
          }
          break;
        default:
          statusText = status;
      }

      // Pokazujemy toast z informacją o zmianie statusu i linkiem publicznym (jeśli opublikowano)
      setToast({
        type: 'success',
        text: `Status strony został zmieniony na: ${statusText}${additionalMessage}`
      });

      // Jeśli strona została właśnie opublikowana, pokaż dodatkowe info z linkiem
      if (status === 'active' && updatedPage?.url) {
        // Opcjonalnie: skopiuj link do schowka
        navigator.clipboard.writeText(updatedPage.url)
          .then(() => {
            setTimeout(() => {
              setToast({
                type: 'success',
                text: 'Link publiczny został skopiowany do schowka!'
              });
            }, 3500); // Pokaż drugie powiadomienie po krótkim opóźnieniu
          })
          .catch(() => {
            // Błąd kopiowania - ignorujemy, użytkownik nadal widzi link
          });
      }
    } catch (error) {
      console.error('Błąd podczas zmiany statusu:', error);
      setToast({
        type: 'error',
        text: 'Nie udało się zmienić statusu strony'
      });
    } finally {
      setIsChangingStatus(false);
      setShowConfirmDialog(false);
    }
  };

  // Funkcja do pobierania danych - wydzielona, aby można było ją ponownie użyć
  const fetchData = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError(null);

      // Sprawdzamy czy mamy dane użytkownika z kontekstu autoryzacji
      // W trybie podglądu nie wymagamy pełnej autoryzacji
      if (!isPreviewMode && (!user || !user.id)) {
        setLoading(false);
        return;
      }

      // Przygotowanie nagłówków z danymi użytkownika
      const headers: Record<string, string> = {
        'X-User-Id': user?.id || '',
        'X-User-Cognito-Sub': user?.cognito_sub || ''
      };

      // Dodajemy informację o trybie podglądu do nagłówków
      if (isPreviewMode) {
        headers['X-Preview-Mode'] = 'true';
      }

      console.log('Wywołanie API z trybem podglądu:', isPreviewMode, headers);

      const response = await fetch(`/api/pages/preview/${token}`, { headers });

      if (!response.ok) {
        let errorMsg = 'Wystąpił błąd podczas pobierania danych';
        if (response.status === 404) {
          errorMsg = 'Nie znaleziono strony o podanym tokenie';
        } else if (response.status === 401) {
          errorMsg = 'Brak uprawnień do wyświetlenia tej strony';
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();
      setPageData(data);
    } catch (error) {
      console.error('Błąd podczas pobierania danych:', error);
      setError((error instanceof Error) ? error.message : 'Wystąpił nieznany błąd');
    } finally {
      setLoading(false);
    }
  }, [token, user, isPreviewMode]);

  // Pobierz dane przy pierwszym renderowaniu
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Efekt, który ustawi kolorystykę po załadowaniu danych strony
  useEffect(() => {
    if (pageData && pageData.color) {
      // Sprawdź czy wartość kolorystyki jest prawidłowa
      const isValidColorScheme = Object.keys(colorSchemes).includes(pageData.color);

      if (isValidColorScheme) {
        setCurrentColorScheme(pageData.color as keyof typeof colorSchemes);
        setOriginalColorScheme(pageData.color as keyof typeof colorSchemes);
        console.log(`Wczytano kolorystykę z bazy danych: ${pageData.color}`);
      } else {
        console.warn(`Nieznana kolorystyka w bazie danych: ${pageData.color}, używam domyślnej`);
      }
    }
  }, [pageData]);

  // Automatycznie włącz tryb edycji gdy strona jest w trybie draft lub gdy przyszliśmy z przycisku "Edytuj" lub mamy uprawnienia administratora
  useEffect(() => {
    // Nie włączaj trybu edycji w trybie podglądu
    if (isPreviewMode) return;

    if (pageData && canEdit()) {
      const isAdminOrGod = user?.role?.toUpperCase() === 'ADMIN' || user?.role?.toUpperCase() === 'GOD';
      const shouldEnableEditMode = pageData.status === 'draft' || editMode || isAdminOrGod;

      if (shouldEnableEditMode) {
        setIsTextEditMode(true);
        if (useContextMode) {
          editModeContext.setTextEditMode(true);
        }

        console.log('Automatycznie włączono tryb edycji tekstu:', {
          isDraft: pageData.status === 'draft',
          isEditMode: editMode,
          isAdminOrGod: isAdminOrGod
        });
      }
    }
  }, [pageData, editMode, useContextMode, user, isPreviewMode, canEdit]);

  // Jeśli używamy kontekstu, zaktualizuj stan trybu edycji
  useEffect(() => {
    if (useContextMode) {
      // Synchronizuj stan lokalny ze stanem kontekstu
      editModeContext.setTextEditMode(isTextEditMode);
    }
  }, [isTextEditMode, useContextMode]);

  // Obsługa ponownej próby
  const handleRetry = () => {
    fetchData();
  };

  // Sprawdza czy dane strony zawierają wymagane elementy dla e-booka
  const validatePageData = (data: PageData | null) => {
    if (!data) return false;

    // Sprawdź, czy istnieją kluczowe pola wymagane do wyświetlenia strony
    const requiredFields = [
      'x_amz_meta_title',
      'pagecontent_hero_headline',
      'pagecontent_hero_subheadline',
      'pagecontent_hero_description'
    ];

    // Sprawdzamy czy przynajmniej 70% wymaganych pól jest dostępnych
    const validFieldsCount = requiredFields.filter(field => data[field]).length;
    const validationThreshold = Math.floor(requiredFields.length * 0.7);

    return validFieldsCount >= validationThreshold;
  };

  // Sprawdza czy dane dla strony video są poprawne
  const validateVideoPageData = (data: PageData | null) => {
    if (!data) return false;

    // Dla stron wideo wymagamy co najmniej URL wideo
    return !!data.video_embed_url;
  };

  // Przekształć dane strony do formatu kompatybilnego z DemoView
  const formatPageContent = (): PageContent | null => {
    // Jeśli dane nie są poprawne, zwróć null zamiast podstawiania wartości domyślnych
    if (!validatePageData(pageData)) {
      return null;
    }

    // Tylko jeśli dane są poprawne, zwróć sformatowaną strukturę
    return {
      s3_file_key: pageData?.s3_file_key ?? "",
      hero: {
        headline: pageData?.pagecontent_hero_headline ?? "",
        subheadline: pageData?.pagecontent_hero_subheadline ?? "",
        description: pageData?.pagecontent_hero_description ?? "",
        buttonText: "Pobierz bezpłatny e-book",
        stats: [
          { value: "10,000+", label: "czytelników" },
          { value: "4.9/5", label: "ocena" },
          { value: "100%", label: "satysfakcji" }
        ]
      },
      benefits: {
        title: pageData?.pagecontent_benefits_title ?? "Co zyskasz dzięki temu przewodnikowi?",
        items: [
          {
            title: pageData?.pagecontent_benefits_items_0_title ?? "",
            text: pageData?.pagecontent_benefits_items_0_text ?? ""
          },
          {
            title: pageData?.pagecontent_benefits_items_1_title ?? "",
            text: pageData?.pagecontent_benefits_items_1_text ?? ""
          },
          {
            title: pageData?.pagecontent_benefits_items_2_title ?? "",
            text: pageData?.pagecontent_benefits_items_2_text ?? ""
          },
          {
            title: pageData?.pagecontent_benefits_items_3_title ?? "",
            text: pageData?.pagecontent_benefits_items_3_text ?? ""
          }
        ]
      },
      testimonials: {
        title: pageData?.pagecontent_testimonials_title ?? "Opinie czytelników",
        items: [
          {
            avatar: "/avatar1.jpg",
            text: pageData?.pagecontent_testimonials_items_0_text ?? "",
            author: pageData?.pagecontent_testimonials_items_0_author ?? "",
            role: pageData?.pagecontent_testimonials_items_0_role ?? "",
            rating: 5
          },
          {
            avatar: "/avatar2.jpg",
            text: pageData?.pagecontent_testimonials_items_1_text ?? "",
            author: pageData?.pagecontent_testimonials_items_1_author ?? "",
            role: pageData?.pagecontent_testimonials_items_1_role ?? "",
            rating: 5
          },
          {
            avatar: "/avatar3.jpg",
            text: pageData?.pagecontent_testimonials_items_2_text ?? "",
            author: pageData?.pagecontent_testimonials_items_2_author ?? "",
            role: pageData?.pagecontent_testimonials_items_2_role ?? "",
            rating: 5
          }
        ]
      },
      content: {
        title: pageData?.pagecontent_content_title ?? "Co znajdziesz w środku?",
        chapters: [
          {
            number: "01",
            title: pageData?.pagecontent_content_chapters_0_title ?? "",
            description: pageData?.pagecontent_content_chapters_0_description ?? ""
          },
          {
            number: "02",
            title: pageData?.pagecontent_content_chapters_1_title ?? "",
            description: pageData?.pagecontent_content_chapters_1_description ?? ""
          },
          {
            number: "03",
            title: pageData?.pagecontent_content_chapters_2_title ?? "",
            description: pageData?.pagecontent_content_chapters_2_description ?? ""
          }
        ]
      },
      form: {
        title: pageData?.pagecontent_form_title ?? "Pobierz bezpłatny e-book już teraz",
        subtitle: pageData?.pagecontent_form_subtitle ?? "Uzupełnij poniższy formularz, aby otrzymać e-book",
        namePlaceholder: pageData?.pagecontent_form_namePlaceholder ?? "Twoje imię",
        emailPlaceholder: pageData?.pagecontent_form_emailPlaceholder ?? "Twój adres e-mail",
        phonePlaceholder: pageData?.pagecontent_form_phonePlaceholder ?? "Twój numer telefonu (opcjonalnie)",
        buttonText: pageData?.pagecontent_form_buttonText ?? "Wyślij mi e-book",
        privacyText: pageData?.pagecontent_form_privacyText ?? "Twoje dane są bezpieczne. Zapoznaj się z polityką prywatności."
      },
      guarantees: {
        items: [
          {
            text: pageData?.pagecontent_guarantees_items_0_text ?? "Sprawdzone badania naukowe"
          },
          {
            text: pageData?.pagecontent_guarantees_items_1_text ?? "Aktualizacja 2025"
          },
          {
            text: pageData?.pagecontent_guarantees_items_2_text ?? "Bezpieczne porady"
          }
        ]
      },
      faq: {
        title: pageData?.pagecontent_faq_title ?? "Najczęściej zadawane pytania",
        items: [
          {
            question: pageData?.pagecontent_faq_items_0_question ?? "",
            answer: pageData?.pagecontent_faq_items_0_answer ?? ""
          },
          {
            question: pageData?.pagecontent_faq_items_1_question ?? "",
            answer: pageData?.pagecontent_faq_items_1_answer ?? ""
          },
          {
            question: pageData?.pagecontent_faq_items_2_question ?? "",
            answer: pageData?.pagecontent_faq_items_2_answer ?? ""
          }
        ]
      }
    };
  };

  // Nowa funkcja formatująca dane dla komponentu DemoVideo - zaktualizowana wersja
  const formatVideoPageContent = (): VideoPageContent | null => {
    if (!pageData) return null;

    // Upewniamy się, że videoProvider jest albo "vimeo" albo "voomly"
    const videoProvider = pageData.video_provider === 'voomly' ? 'voomly' : 'vimeo';

    return {
      title: pageData.pagecontent_hero_headline || pageData.x_amz_meta_title || 'Strona sprzedażowa',
      description: pageData.pagecontent_hero_subheadline || '',
      videoEmbedUrl: pageData.video_embed_url || '',
      videoThumbnailUrl: pageData.video_thumbnail_url || '',
      videoProvider,
      ctaButtonText: pageData.pagecontent_form_buttonText || 'Kup suplementację'
    };
  };

  // Przygotuj zawartość komponentu z grafitowym tłem
  const renderContent = () => {
    // Wyświetl ekran ładowania
    if (loading) {
      return <LoadingState />;
    }

    // Wyświetl ekran błędu
    if (error) {
      return <ErrorState message={error} onRetry={handleRetry} />;
    }

    // Sprawdź, czy dane są poprawne
    if (!pageData) {
      return <ErrorState message="Nie otrzymano danych z serwera" onRetry={handleRetry} />;
    }

    // Określamy typ strony na podstawie danych
    const pageType = pageData.x_amz_meta_page_type || 'ebook';

    // Sprawdzenie poprawności danych zależnie od typu strony
    if (pageType === 'ebook' && !validatePageData(pageData)) {
      return <ErrorState message="Dane strony e-book są niekompletne lub uszkodzone. Proszę sprawdzić konfigurację strony." />;
    }

    if (pageType === 'sales' && !validateVideoPageData(pageData)) {
      return <ErrorState message="Dane strony sprzedażowej są niekompletne. Brak wymaganego URL wideo." />;
    }

    // Formatowanie danych zależnie od typu strony
    let formattedContent;
    if (pageType === 'ebook') {
      formattedContent = formatPageContent();
    } else {
      formattedContent = formatVideoPageContent();
    }

    if (!formattedContent) {
      return <ErrorState message="Nie udało się przetworzyć danych strony" />;
    }

    // Określ możliwość edycji i tekst przycisku statusu
    const statusInfo = getStatusChangeInfo();
    const canEditPage = canEdit();

    // Zwróć właściwą zawartość strony z grafitowym tłem
    return (
      <div className={containerClass}>
        {/* Dodanie paddingu na górze, aby widok nie był przykryty przez pasek informacyjny */}
        <div className="pt-12 pb-24">
          {pageType === 'ebook' ? (
            // Renderuj DemoView dla stron typu ebook
            <DemoView
              pageContent={formattedContent as PageContent}
              colorSchemeName={currentColorScheme}
              partnerName={user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : "Jan Kowalski"}
              pageId={pageData.id}
              pageData={pageData}
              isPreviewMode={isPreviewMode}
              isTextEditMode={isTextEditMode && canEditPage} // Dodane: przekazanie trybu edycji
              onTextUpdate={useContextMode ? undefined : handleTextUpdate} // Dodane: funkcja obsługi aktualizacji tekstu
            />
          ) : (
            // Renderuj DemoVideo dla stron typu sales
            <DemoVideo
              pageContent={formattedContent as VideoPageContent}
              colorSchemeName={currentColorScheme}
              partnerName={user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : "Jan Kowalski"}
              pageId={pageData.id}
              pageData={pageData}
              isPreviewMode={isPreviewMode}
              isTextEditMode={isTextEditMode && canEditPage} // Dodane: przekazanie trybu edycji
              onTextUpdate={useContextMode ? undefined : handleTextUpdate} // Dodane: funkcja obsługi aktualizacji tekstu
            />
          )}
        </div>

        {/* Panel administracyjny - umieszczony na dole strony - ukryty w trybie podglądu */}
        {!isPreviewMode && (
          <div className="fixed bottom-0 left-0 right-0 z-40 bg-white shadow-lg py-3 px-4 border-t border-gray-200">
            <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center gap-4">
                {/* Sekcja wyboru kolorystyki */}
                <div className="flex-grow flex flex-col items-center">
                  <p className="text-xs text-gray-600 mb-1 font-medium text-center">Wybierz kolorystykę:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {Object.entries(colorSchemes).map(([key, scheme]) => (
                      <ColorSchemeButton
                        key={key}
                        scheme={key}
                        currentScheme={currentColorScheme}
                        onClick={(scheme) => handleColorChange(scheme as keyof typeof colorSchemes)}
                        colorName={scheme.name}
                        color={scheme.accent}
                        disabled={!canEditPage}
                      />
                    ))}
                  </div>
                </div>

              {/* Przyciski akcji */}
              <div className="flex flex-wrap gap-2 sm:gap-3 justify-end">
                <Link
                  href="/pages"
                  className="flex items-center bg-gray-100 text-gray-700 px-4 py-2 rounded text-sm hover:bg-gray-200 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  Powrót
                </Link>

                <button
                  onClick={saveChanges}
                  disabled={isSaving || !canEditPage || !hasAnyChanges()}
                  className={`flex items-center ${
                    !canEditPage || !hasAnyChanges()
                      ? 'bg-blue-200 cursor-not-allowed'
                      : isSaving
                        ? 'bg-blue-300'
                        : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                  } text-white px-4 py-2 rounded text-sm transition-colors`}
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                      Zapisywanie...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-1" />
                      Zapisz
                      {hasAnyChanges() && (
                        <span className="ml-1 bg-white text-blue-600 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold">
                          {useContextMode ? editModeContext.getPendingChangesCount() : (Object.keys(localTextChanges).length + (hasLocalColorChange ? 1 : 0))}
                        </span>
                      )}
                    </>
                  )}
                </button>

                <button
                  onClick={initiateStatusChange}
                  disabled={isChangingStatus || !statusInfo.enabled}
                  className={`flex items-center ${
                    !statusInfo.enabled
                      ? 'bg-gray-300 cursor-not-allowed'
                      : isChangingStatus
                        ? 'bg-green-300'
                        : pageData.status === 'pending'
                          ? 'bg-yellow-500 hover:bg-yellow-600 cursor-pointer'
                          : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                  } text-white px-4 py-2 rounded text-sm transition-colors`}
                >
                  {isChangingStatus ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-1"></div>
                      Przetwarzanie...
                    </>
                  ) : (
                    <>{statusInfo.buttonText}</>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Toast notification */}
        {toast && (
          <ToastNotification
            type={toast.type}
            message={toast.text}
            onClose={() => setToast(null)}
          />
        )}

        {/* Baner podglądu - tylko w trybie podglądu */}
        {isPreviewMode && (
          <PreviewModeBanner
            onClose={closePreview}
            title={pageData.x_amz_meta_title || ""}
          />
        )}

        {/* Dialog potwierdzający */}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          title={confirmDialogConfig.title}
          message={confirmDialogConfig.message}
          confirmText={confirmDialogConfig.confirmText}
          cancelText={confirmDialogConfig.cancelText}
          onConfirm={confirmDialogConfig.onConfirm}
          onCancel={() => setShowConfirmDialog(false)}
        />
      </div>
    );
  };

  return renderContent();
};

// Główny komponent strony podglądu - owinięty w EditModeProvider
const PreviewPage = () => {
  const params = useParams();
  const token = Array.isArray(params.token) ? params.token[0] : params.token as string;
  const searchParams = useSearchParams();
  const isPreviewMode = searchParams.get('view_mode') === 'preview';
  const editMode = searchParams.get('mode') === 'edit'; // Sprawdź czy przyszliśmy z przycisku "Edytuj"

  // Sprawdź czy powinien być włączony tryb edycji automatycznie - nie włączaj w trybie podglądu
  const autoEnableEditMode = !isPreviewMode && editMode;

  // Obsługa powiadomień toast na poziomie kontekstu
  const [toast, setToast] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const handleToast = (message: {type: 'success' | 'error', text: string}) => {
    setToast(message);
  };

  return (
    // Użyj AuthGuard tylko jeśli nie jesteśmy w trybie podglądu
    isPreviewMode ? (
      <EditModeProvider
        initialValues={{}}
        autoEnableEditMode={autoEnableEditMode}
        onToast={handleToast}
      >
        <PreviewPageContent />
        {toast && (
          <ToastNotification
            type={toast.type}
            message={toast.text}
            onClose={() => setToast(null)}
          />
        )}
      </EditModeProvider>
    ) : (
      <AuthGuard>
        <EditModeProvider
          initialValues={{}}
          autoEnableEditMode={autoEnableEditMode}
          onToast={handleToast}
        >
          <PreviewPageContent />
          {toast && (
            <ToastNotification
              type={toast.type}
              message={toast.text}
              onClose={() => setToast(null)}
            />
          )}
        </EditModeProvider>
      </AuthGuard>
    )
  );
};

export default PreviewPage;