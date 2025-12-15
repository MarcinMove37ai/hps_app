// @ts-nocheck
// src/components/views/demoVideo.tsx
"use client"

import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, X, Shield, AlertCircle, XCircle } from 'lucide-react';
import Image from 'next/image';
import { colorSchemes } from './demo'; // Reużycie schematów kolorystycznych
import EditableText from '@/components/ui/EditableText';
import { useEditMode } from '@/contexts/EditModeContext';

// Określenie pól, które mogą być edytowane (pochodzą z bazy danych)
const EDITABLE_FIELDS = [
  'pagecontent_hero_headline',
  'pagecontent_hero_subheadline',
  'pagecontent_hero_description',
  'pagecontent_benefits_items_0_title',
  'pagecontent_benefits_items_0_text',
  'pagecontent_benefits_items_1_title',
  'pagecontent_benefits_items_1_text',
  'pagecontent_benefits_items_2_title',
  'pagecontent_benefits_items_2_text',
  'pagecontent_testimonials_items_0_text',
  'pagecontent_testimonials_items_0_author',
  'pagecontent_testimonials_items_0_role',
  'pagecontent_testimonials_items_1_text',
  'pagecontent_testimonials_items_1_author',
  'pagecontent_testimonials_items_1_role',
  'pagecontent_testimonials_items_2_text',
  'pagecontent_testimonials_items_2_author',
  'pagecontent_testimonials_items_2_role',
  'pagecontent_content_chapters_0_title',
  'pagecontent_content_chapters_0_description',
  'pagecontent_content_chapters_1_title',
  'pagecontent_content_chapters_1_description',
  'pagecontent_content_chapters_2_title',
  'pagecontent_content_chapters_2_description',
  'pagecontent_form_title',
  'pagecontent_faq_items_0_question',
  'pagecontent_faq_items_0_answer',
  'pagecontent_faq_items_1_question',
  'pagecontent_faq_items_1_answer',
  'pagecontent_faq_items_2_question',
  'pagecontent_faq_items_2_answer'
];

// Interfejs dla propsów komponentu - zaktualizowany
interface DemoVideoProps {
  pageContent: {
    title: string;
    description?: string;
    videoEmbedUrl: string;
    videoThumbnailUrl?: string;
    videoProvider: 'vimeo' | 'voomly';
    ctaButtonText?: string;
  };
  colorSchemeName?: keyof typeof colorSchemes;
  partnerName?: string;
  pageId?: string;
  pageData?: any;
  isPreviewMode?: boolean;
  isTextEditMode?: boolean;
  onTextUpdate?: (fieldName: string, newValue: string) => void;
}

// Nowy komponent formularza leadowego (paywall)
const LeadFormPaywall = ({
  onSubmit,
  isSubmitting,
  colorScheme,
  isPreviewMode,
  isTextEditMode,
  onTextUpdate,
  description,
  onDescriptionChange,
  onClose,
}: {
  onSubmit: (name: string, email: string, phone: string) => void;
  isSubmitting: boolean;
  colorScheme: any;
  isPreviewMode: boolean;
  isTextEditMode?: boolean;
  onTextUpdate?: (fieldName: string, newValue: string) => void;
  description: string;
  onDescriptionChange?: (newDescription: string) => void;
  onClose?: () => void;
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const formRef = useRef<HTMLDivElement>(null);

  // Sprawdź czy używamy kontekstu
  const editModeContext = useEditMode();
  const useContextMode = !!editModeContext;

  // Obsługa zmiany tekstu - wykorzystuje kontekst jeśli jest dostępny, w przeciwnym razie callback
  const handleTextChange = (field: string, value: string) => {
    // Nie pozwalaj na edycję w trybie podglądu bez trybu edycji
    if (isPreviewMode && !isTextEditMode) return;

    if (useContextMode) {
      editModeContext.handleTextChange(field, value);
    } else if (onTextUpdate) {
      onTextUpdate(field, value);
    }

    // Dodatkowo informujemy rodzica o zmianie opisu, jeśli to pole pagecontent_hero_description
    if (field === "pagecontent_hero_description" && onDescriptionChange) {
      onDescriptionChange(value);
    }
  };

  // Sprawdź czy pole jest edytowalne
  const isFieldEditable = (fieldName: string) => EDITABLE_FIELDS.includes(fieldName);

  // Określ czy formularz jest aktywny - TYLKO gdy nie jest to tryb edycji i nie jest to tryb podglądu
  // W trybie edycji zawsze blokujemy formularz
  const isFormActive = !isPreviewMode && !isTextEditMode;

  return (
    <div
      ref={formRef}
      className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 animate-fadeIn border border-gray-200"
    >
      <div className="flex justify-between items-center mb-4">
        {/* Tytuł formularza - zawsze "Wypełnij formularz" */}
        <h2 className="text-xl font-bold" style={{ color: colorScheme.text }}>
          Wypełnij formularz
        </h2>

        {/* Przycisk zamknięcia - widoczny TYLKO w trybie edycji lub podglądu */}
        {onClose && (isPreviewMode || isTextEditMode) && (
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            aria-label="Zamknij formularz"
          >
            <XCircle size={24} />
          </button>
        )}
      </div>

      {/* Linia podziału nad opisem */}
      <div className="w-full h-px bg-gray-200 my-4"></div>

      {/* Opis z pagecontent_hero_description */}
      {isFieldEditable("pagecontent_hero_description") && isTextEditMode ? (
        <EditableText
          fieldName="pagecontent_hero_description"
          value={description}
          tag="p"
          isEditMode={isTextEditMode}
          onChange={(field, value) => {
            // Bezpośrednie wywołanie funkcji przekazanej z zewnątrz
            if (onDescriptionChange) {
              console.log("Aktualizacja opisu w formularzu:", value);
              onDescriptionChange(value);
            }
            // Standardowa obsługa przez handleTextChange
            handleTextChange(field, value);
          }}
          className="text-gray-600 mb-3" // Zmniejszyłem bottom margin z mb-6 na mb-3
          style={{ color: colorScheme.text }}
          multiline={true}
        />
      ) : (
        <p className="text-gray-600 mb-3">
          {description}
        </p>
      )}

      {/* Linia podziału pod opisem */}
      <div className="w-full h-px bg-gray-200 mb-6 mt-3"></div>

      <form onSubmit={(e) => {
        e.preventDefault();
        // Tylko w aktywnym formularzu wywołaj onSubmit
        if (isFormActive) {
          onSubmit(name, email, phone);
        }
      }}>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Imię i nazwisko
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!isFormActive || isSubmitting}
              required
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${!isFormActive || isSubmitting ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
              style={{ "--tw-ring-color": colorScheme.accent } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isFormActive || isSubmitting}
              required
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${!isFormActive || isSubmitting ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
              style={{ "--tw-ring-color": colorScheme.accent } as React.CSSProperties}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Telefon (opcjonalnie)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!isFormActive || isSubmitting}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${!isFormActive || isSubmitting ? 'bg-gray-100 cursor-not-allowed opacity-70' : ''}`}
              style={{ "--tw-ring-color": colorScheme.accent } as React.CSSProperties}
            />
          </div>

          <button
            type="submit"
            disabled={!isFormActive || isSubmitting}
            className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${!isFormActive || isSubmitting ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
            style={{
              backgroundColor: colorScheme.accent,
              "--tw-ring-color": colorScheme.accent,
            } as React.CSSProperties}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Wysyłanie...
              </span>
            ) : !isFormActive ? (
              isTextEditMode ? 'Formularz zablokowany w trybie edycji' : 'Niedostępne w trybie podglądu'
            ) : (
              'Wyświetl zawartość'
            )}
          </button>

          {/* Informacja w trybie edycji */}
          {isTextEditMode && (
            <div className="text-blue-600 text-xs text-center mt-2 bg-blue-50 p-2 rounded-md border border-blue-200">
              <strong>Tryb edycji:</strong> Formularz jest zablokowany. Możesz edytować teksty, ale nie możesz wypełniać formularza. Użyj przycisku &quot;X&quot; w prawym górnym rogu, aby zamknąć formularz.
            </div>
          )}

          {/* Informacja o trybie podglądu */}
          {isPreviewMode && !isTextEditMode && (
            <div className="text-amber-600 text-xs text-center mt-2 bg-amber-50 p-2 rounded-md border border-amber-200">
              Formularz jest nieaktywny w trybie podglądu. Aby testować zbieranie leadów, otwórz opublikowaną wersję strony.
            </div>
          )}

          <div className="flex items-center mt-4 text-xs text-gray-500">
            <Shield size={16} className="mr-2" />
            Twoje dane są bezpieczne. Zapoznaj się z polityką prywatności.
          </div>
        </div>
      </form>
    </div>
  );
};

// Modal formularza kontaktowego (po kliknięciu "Kup suplementację")
const ContactFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
  colorScheme,
  isPreviewMode,
  leadId,
  isTextEditMode,
  onTextUpdate
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
  colorScheme: any;
  isPreviewMode: boolean;
  leadId: string | null;
  isTextEditMode?: boolean;
  onTextUpdate?: (fieldName: string, newValue: string) => void;
}) => {
  const modalRef = useRef<HTMLDivElement>(null);

  // Sprawdź czy używamy kontekstu
  const editModeContext = useEditMode();
  const useContextMode = !!editModeContext;

  // Obsługa zmiany tekstu - wykorzystuje kontekst jeśli jest dostępny, w przeciwnym razie callback
  const handleTextChange = (field: string, value: string) => {
    // Nie pozwalaj na edycję w trybie podglądu
    if (isPreviewMode && !isTextEditMode) return;

    if (useContextMode) {
      editModeContext.handleTextChange(field, value);
    } else if (onTextUpdate) {
      onTextUpdate(field, value);
    }
  };

  // Zamknij modal po kliknięciu poza nim
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Określ czy przycisk jest aktywny - TYLKO gdy nie jest to tryb edycji i nie jest to tryb podglądu
  // W trybie edycji zawsze blokujemy przycisk
  const isActionActive = !isPreviewMode && !isTextEditMode && !isSubmitting && leadId;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-md">
      <div
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 animate-fadeIn"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold" style={{ color: colorScheme.text }}>
            Doskonała decyzja!
          </h2>

          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        <div className="text-gray-600 mb-6">
          <div className="w-full h-px bg-gray-200 my-4"></div>
          <p>
            Dziękuję za zaufanie. Mam mnóstwo zapytań, ale dla Ciebie mam priorytetowy dostęp do produktów. Kliknij poniższy przycisk, aby przeskoczyć na początek kolejki!
          </p>
          <div className="w-full h-px bg-gray-200 my-4"></div>
        </div>

        <button
          onClick={() => {
            // Tylko w aktywnym trybie wywołaj onSubmit
            if (isActionActive) {
              onSubmit();
            }
          }}
          disabled={!isActionActive}
          className={`w-full py-3 px-4 rounded-md text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors ${!isActionActive ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{
            backgroundColor: colorScheme.accent,
            "--tw-ring-color": colorScheme.accent
          } as React.CSSProperties}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Wysyłanie...
            </span>
          ) : isTextEditMode ? (
            'Przycisk zablokowany w trybie edycji'
          ) : isPreviewMode ? (
            'Niedostępne w trybie podglądu'
          ) : !leadId ? (
            'Błąd pobierania danych - odśwież stronę'
          ) : (
            'Wskakuję na początek kolejki!'
          )}
        </button>

        {/* Informacja w trybie edycji */}
        {isTextEditMode && (
          <div className="text-blue-600 text-xs text-center mt-2 bg-blue-50 p-2 rounded-md border border-blue-200">
            <strong>Tryb edycji:</strong> Akcje są zablokowane. Użyj przycisku &quot;X&quot; w prawym górnym rogu, aby zamknąć to okno.
          </div>
        )}

        {/* Informacja o trybie podglądu */}
        {isPreviewMode && !isTextEditMode && (
          <div className="text-amber-600 text-xs text-center mt-2 bg-amber-50 p-2 rounded-md border border-amber-200">
            Funkcja jest nieaktywna w trybie podglądu. Aby testować zakupy, otwórz opublikowaną wersję strony.
          </div>
        )}
      </div>
    </div>
  );
};

// Wiadomość sukcesu po wysłaniu formularza lub zakupie
const SuccessMessage = ({
  onClose,
  colorScheme,
  message,
  isBuyConfirmation = false,
  isPreviewMode = false,
  isTextEditMode = false
}: {
  onClose: () => void,
  colorScheme: any,
  message: string,
  isBuyConfirmation?: boolean,
  isPreviewMode?: boolean,
  isTextEditMode?: boolean
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/10 backdrop-blur-md">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 text-center animate-fadeIn">
        <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full" style={{ backgroundColor: `${colorScheme.secondary}30` }}>
          <CheckCircle size={32} style={{ color: colorScheme.accent }} />
        </div>

        <h2 className="text-xl font-bold mb-3" style={{ color: colorScheme.text }}>
          Dziękujemy!
        </h2>

        <p className="text-gray-600 mb-6">
          {message}
        </p>

        <button
          onClick={onClose}
          className="py-2 px-4 rounded-md text-white font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors cursor-pointer"
          style={{
            backgroundColor: colorScheme.accent,
            "--tw-ring-color": colorScheme.accent
          } as React.CSSProperties}
        >
          {isBuyConfirmation ? 'Wróć do wideo' : 'Zamknij'}
        </button>

        {isBuyConfirmation && (
          <p className="text-xs text-gray-500 mt-3">
            {isPreviewMode || isTextEditMode ?
              "Ta funkcja jest dostępna tylko w opublikowanej wersji strony." :
              "Kliknij przycisk, aby wrócić do oglądania wideo"}
          </p>
        )}

        {/* Informacja o trybie podglądu/edycji */}
        {(isPreviewMode || isTextEditMode) && isBuyConfirmation && (
          <div className={`text-xs text-center mt-2 p-2 rounded-md border ${isTextEditMode ? 'text-blue-600 bg-blue-50 border-blue-200' : 'text-amber-600 bg-amber-50 border-amber-200'}`}>
            {isTextEditMode ?
              "Funkcja jest zablokowana w trybie edycji." :
              "Funkcja jest nieaktywna w trybie podglądu. Aby testować pełną funkcjonalność, otwórz opublikowaną wersję strony."}
          </div>
        )}
      </div>
    </div>
  );
};

// Komponent własnego odtwarzacza wideo z ograniczonymi kontrolkami
const CustomVideoPlayer = ({ videoUrl, title, onLoaded }: { videoUrl: string, title: string, onLoaded?: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  // Funkcja do próby autoodtwarzania z dźwiękiem
  useEffect(() => {
    const attemptAutoplay = async () => {
      if (videoRef.current) {
        try {
          // Próba odtwarzania z dźwiękiem
          await videoRef.current.play();
          setIsPlaying(true);
          console.log("Autoodtwarzanie z dźwiękiem uruchomione");
        } catch (error) {
          console.log("Nie można autoodtworzyć z dźwiękiem, próbuję wyciszone...");

          // Jeśli odtwarzanie z dźwiękiem się nie powiodło, próbujemy wyciszone
          if (videoRef.current) {
            videoRef.current.muted = true;
            setIsMuted(true);

            try {
              await videoRef.current.play();
              setIsPlaying(true);
              console.log("Autoodtwarzanie wyciszone uruchomione");
            } catch (innerError) {
              console.log("Nie można autoodtworzyć nawet wyciszonego wideo");
              setIsPlaying(false);
            }
          }
        }
      }
    };

    attemptAutoplay();
  }, []);

  // Powiadom rodzica, że wideo zostało załadowane
  const handleVideoLoaded = () => {
    if (onLoaded) {
      onLoaded();
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) {
        videoRef.current.play();
        setIsPlaying(true);
      } else {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (videoRef.current) {
      videoRef.current.volume = Number(e.target.value);

      // Jeśli głośność jest większa niż 0 i wideo jest wyciszone, włączamy dźwięk
      if (Number(e.target.value) > 0 && videoRef.current.muted) {
        videoRef.current.muted = false;
        setIsMuted(false);
      }
    }
  };

  // Blokujemy menu kontekstowe, które pozwala na pobieranie
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full cursor-pointer"
        src={videoUrl}
        title={title}
        onClick={togglePlay}
        onContextMenu={handleContextMenu}
        onLoadedData={handleVideoLoaded}
        playsInline
        disablePictureInPicture
        controlsList="nodownload noplaybackrate"
        autoPlay
        preload="auto"
      >
        Twoja przeglądarka nie obsługuje odtwarzania wideo.
      </video>

      {/* Wiadomość informująca o wyciszeniu */}
      {isMuted && isPlaying && (
        <div
          className="absolute top-0 left-0 right-0 bg-black/70 py-2 px-4 text-white text-center cursor-pointer"
          onClick={toggleMute}
        >
          Kliknij tutaj, aby włączyć dźwięk
        </div>
      )}

      {/* Custom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 flex items-center">
        {/* Play/Pause button */}
        <button
          onClick={togglePlay}
          className="text-white mr-4 focus:outline-none cursor-pointer"
          aria-label={isPlaying ? "Pauza" : "Odtwórz"}
        >
          {isPlaying ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Mute/Unmute button */}
        <button
          onClick={toggleMute}
          className="text-white mr-2 focus:outline-none cursor-pointer"
          aria-label={isMuted ? "Włącz dźwięk" : "Wycisz"}
        >
          {isMuted ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
            </svg>
          )}
        </button>

        {/* Volume control */}
        <div className="flex items-center">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            defaultValue="1"
            onChange={handleVolumeChange}
            className="w-24 accent-white"
          />
        </div>
      </div>
    </div>
  );
};

// Funkcja pomocnicza do formatowania danych do strony video
const formatVideoPageContent = (pageData: any) => {
  if (!pageData) return {
    title: 'Strona sprzedażowa',
    videoEmbedUrl: '',
    videoProvider: 'vimeo' as 'vimeo' | 'voomly',
    ctaButtonText: 'Uzyskaj dostęp do produktów'
  };

  // Upewniamy się, że videoProvider jest albo "vimeo" albo "voomly"
  const videoProvider = pageData.video_provider === 'voomly' ? 'voomly' : 'vimeo';

  return {
    title: pageData.pagecontent_hero_headline || pageData.x_amz_meta_title || 'Strona sprzedażowa',
    description: pageData.pagecontent_hero_subheadline || '',
    videoEmbedUrl: pageData.video_embed_url || '',
    videoThumbnailUrl: pageData.video_thumbnail_url || '',
    videoProvider,
    ctaButtonText: pageData.pagecontent_form_title || 'Wypełnij formularz' // Używamy pagecontent_form_title do tekstu przycisku
  };
};

// Główny komponent DemoVideo
const DemoVideo: React.FC<DemoVideoProps> = ({
  pageContent,
  colorSchemeName = 'harmonia',
  partnerName = 'Jan Kowalski',
  pageId,
  pageData,
  isPreviewMode = false,
  isTextEditMode = false,
  onTextUpdate
}) => {
  // Stany komponentu
  const [showContent, setShowContent] = useState(false); // Czy pokazać zawartość (po wypełnieniu formularza)
  const [showFormInEditMode, setShowFormInEditMode] = useState(true); // Czy pokazać formularz w trybie edycji
  const [isLeadFormSubmitting, setIsLeadFormSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isBuySuccess, setIsBuySuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [videoLoaded, setVideoLoaded] = useState(false);
  // Dodajemy nowy stan, aby śledzić czy zakup został już dokonany
  const [purchaseCompleted, setPurchaseCompleted] = useState(false);

  // Dodajemy stan dla opisu, aby go synchronizować między formularzem a głównym widokiem
  const [currentDescription, setCurrentDescription] = useState<string>(
    pageData?.pagecontent_hero_description ||
    "Opis wideo - to pole można edytować. Zawiera istotne informacje na temat prezentowanego produktu i jego właściwości."
  );

  // Sprawdź czy używamy kontekstu
  const editModeContext = useEditMode();
  const useContextMode = !!editModeContext;

  // Funkcja do pobierania świeżych danych po edycji
  const refreshPageData = async () => {
    if (!pageId) return;

    try {
      // Pobieramy aktualne dane strony z API
      const response = await fetch(`/api/pages/${pageId}?t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });

      if (!response.ok) {
        console.error('Błąd podczas odświeżania danych strony:', await response.text());
        return;
      }

      const refreshedData = await response.json();
      console.log('Odświeżone dane strony:', refreshedData);

      // Aktualizujemy opis jeśli istnieje
      if (refreshedData && refreshedData.pagecontent_hero_description) {
        console.log('Aktualizacja opisu z odświeżonych danych:', refreshedData.pagecontent_hero_description);
        setCurrentDescription(refreshedData.pagecontent_hero_description);
      }

    } catch (error) {
      console.error('Błąd podczas odświeżania danych:', error);
    }
  };

  // Obsługa zmiany tekstu - wykorzystuje kontekst jeśli jest dostępny, w przeciwnym razie callback
  // Zaktualizowana, aby obsługiwać synchronizację opisu
  const handleTextChange = (field: string, value: string) => {
    // Nie pozwalaj na edycję w trybie podglądu bez trybu edycji
    if (isPreviewMode && !isTextEditMode) return;

    // Jeśli zmieniamy opis, aktualizujemy też lokalny stan - ZAWSZE aktualizujemy lokalny stan
    if (field === "pagecontent_hero_description") {
      console.log("Aktualizacja opisu w głównym komponencie:", value);
      setCurrentDescription(value);
    }

    if (useContextMode) {
      editModeContext.handleTextChange(field, value);
    } else if (onTextUpdate) {
      onTextUpdate(field, value);
    }
  };

  // Używamy przekazanego schematu kolorystycznego
  const colors = colorSchemes[colorSchemeName];

  // Sprawdź czy pole jest edytowalne
  const isFieldEditable = (fieldName: string) => EDITABLE_FIELDS.includes(fieldName);

  // Efekt do synchronizacji opisu z danymi strony
  useEffect(() => {
    // Aktualizujemy lokalny stan opisu, gdy pageData się zmieni
    if (pageData?.pagecontent_hero_description) {
      console.log("Aktualizacja opisu z pageData:", pageData.pagecontent_hero_description);
      setCurrentDescription(pageData.pagecontent_hero_description);
    }
  }, [pageData?.pagecontent_hero_description]);

  // Dodatkowy efekt monitorujący zmiany w opisie
  useEffect(() => {
    console.log("Stan currentDescription został zaktualizowany:", currentDescription);
  }, [currentDescription]);

  useEffect(() => {
    // Logujemy wartość leadId dla debugowania
    if (leadId) {
      console.log('Lead ID aktualnie ustawione na:', leadId);
    }
  }, [leadId]);

  // Usuwamy automatyczne ukrywanie formularza w trybie edycji
  // Teraz formularz będzie widoczny również w trybie edycji

  // Dodajemy efekt animacji dla zawartości przy jej odkrywaniu
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      @keyframes fadeIn {
        from { opacity: 0; transform: scale(0.95); }
        to { opacity: 1; transform: scale(1); }
      }
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out forwards;
      }
      @keyframes blurIn {
        from { filter: blur(0px); }
        to { filter: blur(8px); }
      }
      .animate-blurIn {
        animation: blurIn 0.5s ease-out forwards;
      }
      @keyframes blurOut {
        from { filter: blur(8px); }
        to { filter: blur(0px); }
      }
      .animate-blurOut {
        animation: blurOut 0.5s ease-out forwards;
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Zaktualizowana funkcja obsługi zamknięcia komunikatu o zakupie - teraz tylko zamyka komunikat
  const handleReturnToVideo = () => {
    setIsBuySuccess(false);
  };

  // Obsługa wysłania formularza leadowego (paywall)
  const handleLeadFormSubmit = async (name: string, email: string, phone: string) => {
    // Nie wykonujemy w trybie podglądu lub edycji
    if (isPreviewMode || isTextEditMode) return;

    try {
      setIsLeadFormSubmitting(true);
      setError(null);

      // Przygotowanie danych do wysłania
      const leadData = {
        pageId: pageId,
        leadName: name,
        leadEmail: email,
        leadPhone: phone || undefined,
        leadType: 'sales',
        buy_now: false // Domyślnie false, zmieniamy na true po kliknięciu przycisku zakupu
      };

      console.log('Wysyłanie danych leada:', leadData);

      // Wywołanie API do zapisania leada
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      // Tutaj musimy dokładnie sprawdzić co zwraca Twoje API
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Błąd API:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Wystąpił problem podczas zapisywania danych');
        } catch (e) {
          throw new Error('Wystąpił problem podczas zapisywania danych');
        }
      }

      // Pobierz odpowiedź w formie tekstu, aby zobaczyć co dokładnie zwraca API
      const responseText = await response.text();
      console.log('Surowa odpowiedź API:', responseText);

      let responseData;
      try {
        // Próba parsowania jako JSON
        responseData = JSON.parse(responseText);
        console.log('Odpowiedź API (sparsowana):', responseData);
      } catch (e) {
        console.error('Nie można sparsować odpowiedzi jako JSON:', e);
        throw new Error('Nieprawidłowy format odpowiedzi z API');
      }

      // Próba znalezienia ID w różnych możliwych miejscach w odpowiedzi
      let leadId = null;
      if (responseData.id) {
        leadId = responseData.id;
      } else if (responseData.data && responseData.data.id) {
        leadId = responseData.data.id;
      } else if (responseData.leadId) {
        leadId = responseData.leadId;
      } else if (Array.isArray(responseData) && responseData.length > 0 && responseData[0].id) {
        leadId = responseData[0].id;
      }

      if (!leadId) {
        console.error('Nie znaleziono ID leada w odpowiedzi:', responseData);
        // Mimo braku ID, pozwalamy użytkownikowi zobaczyć treść
        setShowContent(true);
        // Ale ustawiamy informację o błędzie
        setError('Nie udało się pobrać ID leada. Funkcja zakupu może być niedostępna.');
        return;
      }

      // Zapisujemy ID leada do stanu
      console.log('Zapisany lead z ID:', leadId);
      setLeadId(leadId);

      // Pokazujemy odblokowaną zawartość
      setShowContent(true);

    } catch (error) {
      console.error('Błąd podczas wysyłania formularza:', error);
      setError(error instanceof Error ? error.message : 'Nieznany błąd');
      // Mimo błędu, pozwalamy użytkownikowi zobaczyć treść
      setShowContent(true);
    } finally {
      setIsLeadFormSubmitting(false);
    }
  };

  // Obsługa kliknięcia przycisku zakupu (aktualizacja lead z buy_now=true)
  const handleBuyNow = async () => {
    // Nie wykonujemy w trybie podglądu lub edycji
    if (isPreviewMode || isTextEditMode) return;

    if (!leadId) {
      console.error('Brak ID leada - nie można kontynuować');
      setError('Brak ID leada - nie można kontynuować zakupu');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      console.log('Aktualizacja leada z ID:', leadId);

      // Aktualizacja istniejącego leada (buy_now=true)
      // Dodajemy parametr timestamp, aby uniknąć cache'owania
      const response = await fetch(`/api/leads/${leadId}?t=${Date.now()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store'
        },
        body: JSON.stringify({ buy_now: true }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Błąd API podczas aktualizacji:', errorText);
        try {
          const errorJson = JSON.parse(errorText);
          throw new Error(errorJson.error || 'Wystąpił problem podczas aktualizacji danych');
        } catch (e) {
          throw new Error('Wystąpił problem podczas aktualizacji danych');
        }
      }

      // Pobierz odpowiedź w formie tekstu
      const responseText = await response.text();
      console.log('Surowa odpowiedź API (aktualizacja):', responseText);

      try {
        // Próba parsowania jako JSON (jeśli to możliwe)
        if (responseText) {
          const updatedData = JSON.parse(responseText);
          console.log('Lead zaktualizowany pomyślnie:', updatedData);
        }
      } catch (e) {
        console.warn('Nie można sparsować odpowiedzi jako JSON (ale to może być ok):', e);
      }

      // Sukces - zamknięcie modalu i pokazanie komunikatu
      setIsModalOpen(false);
      setIsBuySuccess(true);
      // Ustawiamy flagę, że zakup został dokonany
      setPurchaseCompleted(true);

    } catch (error) {
      console.error('Błąd podczas aktualizacji leada:', error);
      setError(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Zamknięcie formularza - teraz z odświeżaniem danych z bazy
  const handleCloseLeadForm = () => {
    console.log("Zamykanie formularza");
    setShowContent(true);

    // W trybie edycji dodatkowo ukrywamy formularz
    if (isTextEditMode) {
      setShowFormInEditMode(false);

      // Odświeżamy dane z bazy po zamknięciu formularza, aby mieć najnowszą wartość opisu
      refreshPageData();
    }
  };

  // Funkcja do ponownego pokazania formularza w trybie edycji
  const handleShowFormInEditMode = () => {
    setShowFormInEditMode(true);
  };

  // Określ czy przycisk CTA jest aktywny - tylko gdy nie jest to tryb podglądu ani edycji
  // ORAZ gdy zakup nie został jeszcze dokonany
  const isCTAActive = !isPreviewMode && !isTextEditMode && !purchaseCompleted;

  return (
    <div className="bg-white font-sans text-gray-800 min-h-screen">
      {/* Górny pasek (header) */}
      <header className="fixed top-0 left-0 w-full h-16 bg-white shadow-md z-20 flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-16 xl:px-88">
        <div className="flex items-center">
          <div className="h-8 md:h-12 w-auto">
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

        <div className="flex flex-col items-end justify-center">
          <span className="text-sm font-medium text-gray-700">
            {partnerName}
          </span>
          <div className="w-full h-px bg-gray-200 my-0.5"></div>
          <span className="text-xs text-gray-600">
            Premium Partner
          </span>
        </div>
      </header>

      {/* Główna zawartość - zawsze renderowana, ale z nakładką formularza jeśli showContent=false */}
      <div className={`relative ${(!showContent && !isTextEditMode) ? 'pointer-events-none filter blur-sm animate-blurIn' : 'animate-blurOut'}`}>
        <main className="pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          {/* Tytuł strony */}
          {isFieldEditable("pagecontent_hero_headline") ? (
            <EditableText
              fieldName="pagecontent_hero_headline"
              value={pageContent.title}
              tag="h1"
              isEditMode={isTextEditMode}
              onChange={handleTextChange}
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8"
              style={{
                color: colors.text,
                fontFamily: colors.headingFont
              }}
            />
          ) : (
            <h1
              className="text-2xl sm:text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8"
              style={{
                color: colors.text,
                fontFamily: colors.headingFont
              }}
            >
              {pageContent.title}
            </h1>
          )}

          {/* Opis (opcjonalny) */}
          {pageContent.description !== undefined && (
            <div className="mb-8 md:mb-10 max-w-3xl mx-auto">
              {isFieldEditable("pagecontent_hero_subheadline") ? (
                <EditableText
                  fieldName="pagecontent_hero_subheadline"
                  value={pageContent.description || ''}
                  tag="p"
                  isEditMode={isTextEditMode}
                  onChange={handleTextChange}
                  className="text-base sm:text-lg text-center text-gray-700"
                  style={{ fontFamily: colors.bodyFont }}
                  multiline={true}
                />
              ) : (
                <p
                  className="text-base sm:text-lg text-center text-gray-700"
                  style={{ fontFamily: colors.bodyFont }}
                >
                  {pageContent.description || ''}
                </p>
              )}
            </div>
          )}

          {/* Odtwarzacz wideo */}
          <div className="w-full aspect-video mb-4 md:mb-6 bg-gray-100 rounded-xl overflow-hidden shadow-lg">
            <CustomVideoPlayer
              videoUrl={pageContent.videoEmbedUrl}
              title={pageContent.title}
              onLoaded={() => setVideoLoaded(true)}
            />
          </div>

          {/* Dodanie pagecontent_hero_description między dwiema liniami podziału */}
          <div className="w-full h-px bg-gray-200 my-4"></div>
          {isFieldEditable("pagecontent_hero_description") ? (
            <EditableText
              key={`desc-${currentDescription}`} // Dodanie klucza, który wymusi ponowne renderowanie przy zmianie opisu
              fieldName="pagecontent_hero_description"
              value={currentDescription} // Używamy lokalnego stanu zamiast pageData
              tag="p"
              isEditMode={isTextEditMode}
              onChange={handleTextChange}
              className="text-base text-gray-700 my-6 max-w-3xl mx-auto"
              style={{ fontFamily: colors.bodyFont }}
              multiline={true}
            />
          ) : (
            <p
              className="text-base text-gray-700 my-6 max-w-3xl mx-auto"
              style={{ fontFamily: colors.bodyFont }}
            >
              {currentDescription} {/* Używamy lokalnego stanu zamiast pageData */}
            </p>
          )}
          <div className="w-full h-px bg-gray-200 my-4"></div>

          {/* Przycisk CTA - teraz z możliwością edycji tekstu */}
          <div className="flex justify-center mb-12 md:mb-6">
            {isFieldEditable("pagecontent_form_title") && isTextEditMode ? (
              <EditableText
                fieldName="pagecontent_form_title"
                value={pageData?.pagecontent_form_title || "Wypełnij formularz"}
                tag="div"
                isEditMode={isTextEditMode}
                onChange={handleTextChange}
                className="px-6 py-4 rounded-full text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all cursor-pointer"
                style={{
                  backgroundColor: colors.accent,
                  color: "white"
                }}
                onClick={() => setIsModalOpen(true)}
              />
            ) : (
              <button
                onClick={() => isCTAActive && setIsModalOpen(true)}
                disabled={!isCTAActive}
                className={`px-6 py-4 rounded-full text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all transform ${isCTAActive ? 'hover:scale-105 cursor-pointer' : 'opacity-70 cursor-not-allowed'}`}
                style={{ backgroundColor: colors.accent }}
              >
                {pageData?.pagecontent_form_title || "Wypełnij formularz"}
              </button>
            )}
          </div>

          {/* Informacja o trybie podglądu/edycji pod przyciskiem CTA lub o zakończonym zakupie */}
          {(isPreviewMode || isTextEditMode || purchaseCompleted) && (
            <div className={`text-xs text-center mt-2 mb-6 p-2 rounded-md border max-w-lg mx-auto ${
              isTextEditMode ? 'text-blue-600 bg-blue-50 border-blue-200' :
              purchaseCompleted ? 'text-green-600 bg-green-50 border-green-200' :
              'text-amber-600 bg-amber-50 border-amber-200'
            }`}>
              {isTextEditMode ?
                'Przycisk jest zablokowany w trybie edycji. Skoncentruj się na edycji treści, nie na akcjach.' :
                purchaseCompleted ?
                'Dziękuję za zaufanie,wkrótce się do Ciebie odezwę :)' :
                'Przycisk jest nieaktywny w trybie podglądu. Aby testować pełną funkcjonalność, otwórz opublikowaną wersję strony.'}
            </div>
          )}

          {/* Sekcja zaufania */}
          <div className="max-w-3xl mx-auto bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h2
              className="text-xl font-bold mb-4 text-center"
              style={{
                color: colors.text,
                fontFamily: colors.headingFont
              }}
            >
              Dlaczego warto nam zaufać?
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col items-center text-center p-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${colors.secondary}30` }}
                >
                  <Shield size={24} style={{ color: colors.accent }} />
                </div>
                <h3 className="font-semibold mb-1">Bezpieczeństwo</h3>
                <p className="text-sm text-gray-600">Wszystkie produkty są testowane klinicznie</p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${colors.secondary}30` }}
                >
                  <CheckCircle size={24} style={{ color: colors.accent }} />
                </div>
                <h3 className="font-semibold mb-1">Jakość</h3>
                <p className="text-sm text-gray-600">Surowce najwyższej jakości, sprawdzone składniki</p>
              </div>

              <div className="flex flex-col items-center text-center p-4">
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                  style={{ backgroundColor: `${colors.secondary}30` }}
                >
                  <AlertCircle size={24} style={{ color: colors.accent }} />
                </div>
                <h3 className="font-semibold mb-1">Wsparcie</h3>
                <p className="text-sm text-gray-600">Konsultacja i wsparcie specjalistów</p>
              </div>
            </div>
          </div>

          {/* Wyświetl błąd, jeśli wystąpił */}
          {error && (
            <div className="mt-4 max-w-md mx-auto p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
              <p>{error}</p>
            </div>
          )}
        </main>
      </div>

      {/* Stopka */}
      <footer className={`py-6 border-t border-gray-200 bg-gray-50 ${(!showContent && !isTextEditMode) ? 'pointer-events-none filter blur-sm animate-blurIn' : 'animate-blurOut'}`}>
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            © 2025 Omega Zdrowie. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-0 sm:space-x-4">
            <a href="#" className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
              Polityka prywatności
            </a>
            <a href="#" className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
              Regulamin
            </a>
            <a href="#" className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors cursor-pointer">
              Kontakt
            </a>
          </div>
        </div>
      </footer>

      {/* Formularz leadowy (paywall) - nakładka pokazywana gdy showContent=false lub w trybie edycji gdy showFormInEditMode=true */}
      {(!showContent || (isTextEditMode && showFormInEditMode)) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-white/30 backdrop-blur-md overflow-y-auto py-10">
          <LeadFormPaywall
            onSubmit={handleLeadFormSubmit}
            isSubmitting={isLeadFormSubmitting}
            colorScheme={colors}
            isPreviewMode={isPreviewMode}
            isTextEditMode={isTextEditMode}
            onTextUpdate={onTextUpdate}
            description={currentDescription}
            onDescriptionChange={(newValue) => {
              console.log("Wywołanie onDescriptionChange z formularza:", newValue);
              setCurrentDescription(newValue);
            }}
            onClose={handleCloseLeadForm}
          />
        </div>
      )}

      {/* Modal formularza potwierdzenia zakupu */}
      <ContactFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleBuyNow}
        isSubmitting={isSubmitting}
        colorScheme={colors}
        isPreviewMode={isPreviewMode}
        leadId={leadId}
        isTextEditMode={isTextEditMode}
        onTextUpdate={onTextUpdate}
      />

      {/* Wiadomość sukcesu po wypełnieniu formularza */}
      {isSuccess && (
        <SuccessMessage
          onClose={() => setIsSuccess(false)}
          colorScheme={colors}
          message="Dziękujemy za udostępnienie swoich danych kontaktowych. Teraz możesz obejrzeć materiał wideo."
          isPreviewMode={isPreviewMode}
          isTextEditMode={isTextEditMode}
        />
      )}

      {/* Wiadomość sukcesu po potwierdzeniu zakupu */}
      {isBuySuccess && (
        <SuccessMessage
          onClose={handleReturnToVideo}
          colorScheme={colors}
          message="Dziękujemy za zamówienie! Skontaktujemy się z Tobą wkrótce, aby omówić szczegóły suplementacji."
          isBuyConfirmation={true}
          isPreviewMode={isPreviewMode}
          isTextEditMode={isTextEditMode}
        />
      )}
    </div>
  );
};

export default DemoVideo;