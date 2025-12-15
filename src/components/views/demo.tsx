// src/components/views/demo.tsx
"use client"

import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen, CheckCircle, Shield, Award, Clock, Heart,
  Target, Star, Users, ChevronRight, ArrowRight, Download
} from 'lucide-react';
import Image from 'next/image';
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
  'pagecontent_benefits_items_3_title',
  'pagecontent_benefits_items_3_text',
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

// Zestawy kolorystyczne
export const colorSchemes = {
  harmonia: {
    name: "Harmonia i Zaufanie",
    main: "#C5E0DC", // Jasny niebieski - tło strony
    secondary: "#A8CABA", // Delikatna zieleń - elementy bazowe
    accent: "#FF9A8B", // Ciepły koralowy - przyciski CTA
    text: "#333333",
    subtext: "#666666",
    headingFont: "'Lato', sans-serif",
    bodyFont: "'Roboto', sans-serif"
  },
  witalnosc: {
    name: "Witalność i Energia",
    main: "#FFDAB9", // Delikatny brzoskwiniowy - tło
    secondary: "#F5E9D9", // Ciepły beż - elementy strukturalne
    accent: "#407076", // Głęboka zieleń - CTA
    text: "#333333",
    subtext: "#666666",
    headingFont: "'Montserrat', sans-serif",
    bodyFont: "'Open Sans', sans-serif"
  },
  profesjonalizm: {
    name: "Profesjonalizm i Spokój",
    main: "#F2F5F7", // Chłodny jasny szary - tło
    secondary: "#6BBAA7", // Morski turkus - elementy strukturalne
    accent: "#B19CD9", // Delikatny fiolet - przyciski
    text: "#333333",
    subtext: "#666666",
    headingFont: "'Raleway', sans-serif",
    bodyFont: "'Nunito', sans-serif"
  },
  harmoniaNat: {
    name: "Naturalna Harmonia",
    main: "#F8F4E3", // Kremowy beż - tło
    secondary: "#D8C3DF", // Miękka lawenda - elementy bazy
    accent: "#2E7D6E", // Głęboki szmaragdowy - akcenty i przyciski
    text: "#333333",
    subtext: "#666666",
    headingFont: "'Playfair Display', serif",
    bodyFont: "'Source Sans Pro', sans-serif"
  },
  pewnosc: {
    name: "Pewność i Optymizm",
    main: "#FFF9E6", // Bardzo jasny żółty - tło
    secondary: "#FFC6C7", // Delikatny koralowy - elementy strukturalne
    accent: "#1D3557", // Głęboki granatowy - CTA
    text: "#333333",
    subtext: "#666666",
    headingFont: "'Poppins', sans-serif",
    bodyFont: "'PT Sans', sans-serif"
  }
};

// Komponent gwiazdek ocen
const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          size={16}
          fill={i < rating ? "#FBBF24" : "none"}
          className={i < rating ? "text-amber-400" : "text-gray-300"}
        />
      ))}
    </div>
  );
};

// Animowany przycisk call-to-action
const AnimatedButton = ({
  href,
  children,
  accent,
  className = ""
}: {
  href: string,
  children: React.ReactNode,
  accent: string,
  className?: string
}) => {
  return (
    <a
      href={href}
      className={`
        inline-flex items-center justify-center rounded-full
        px-4 sm:px-6 py-3 sm:py-4 font-medium text-sm sm:text-base
        transition-all duration-300 ease-out
        hover:shadow-md hover:scale-105 hover:translate-y-[-2px]
        ${className}
      `}
      style={{
        backgroundColor: accent,
        color: '#FFFFFF'
      }}
    >
      <span className="mr-2 sm:mr-3">{children}</span>
      <ArrowRight className="text-white h-4 w-4 sm:h-5 sm:w-5" />
    </a>
  );
};

// Panel FAQ
const FaqItem = ({
  question,
  answer,
  isTextEditMode,
  onTextUpdate,
  questionFieldName,
  answerFieldName
}: {
  question: string,
  answer: string,
  isTextEditMode?: boolean,
  onTextUpdate?: (fieldName: string, newValue: string) => void,
  questionFieldName: string,
  answerFieldName: string
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Sprawdź czy używamy kontekstu
  const editModeContext = useEditMode();
  const useContextMode = !!editModeContext;

  // Obsługa zmiany tekstu - wykorzystuje kontekst jeśli jest dostępny, w przeciwnym razie callback
  const handleTextChange = (field: string, value: string) => {
    if (useContextMode) {
      editModeContext.handleTextChange(field, value);
    } else if (onTextUpdate) {
      onTextUpdate(field, value);
    }
  };

  // Sprawdź czy pola są edytowalne (czy znajdują się na liście)
  const isQuestionEditable = EDITABLE_FIELDS.includes(questionFieldName);
  const isAnswerEditable = EDITABLE_FIELDS.includes(answerFieldName);

  return (
    <div className="border-b border-gray-200">
      <button
        className="flex w-full items-center justify-between py-3 sm:py-4 text-left transition-colors hover:text-purple-500"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-base sm:text-lg font-medium pr-2">
          {isQuestionEditable ? (
            <EditableText
              fieldName={questionFieldName}
              value={question}
              tag="span"
              isEditMode={isTextEditMode || false}
              onChange={handleTextChange}
            />
          ) : (
            question
          )}
        </h3>
        <ChevronRight
          className={`h-5 w-5 flex-shrink-0 transform transition-transform duration-300 ${isOpen ? 'rotate-90 text-purple-500' : ''}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-60 pb-4' : 'max-h-0'}`}
      >
        <p className="text-sm sm:text-base text-gray-600">
          {isAnswerEditable ? (
            <EditableText
              fieldName={answerFieldName}
              value={answer}
              tag="span"
              isEditMode={isTextEditMode || false}
              onChange={handleTextChange}
              multiline={true}
            />
          ) : (
            answer
          )}
        </p>
      </div>
    </div>
  );
};

// Definicja interfejsu dla pageContent
interface PageContentStat {
  value: string;
  label: string;
}

interface PageContentBenefitItem {
  icon?: React.ElementType;
  title: string;
  text: string;
}

interface PageContentTestimonialItem {
  avatar: string;
  text: string;
  author: string;
  role: string;
  rating: number;
}

interface PageContentChapter {
  number: string;
  title: string;
  description: string;
}

interface PageContentGuaranteeItem {
  icon?: React.ElementType;
  text: string;
}

interface PageContentFaqItem {
  question: string;
  answer: string;
}

interface PageContent {
  s3_file_key?: string;
  hero: {
    headline: string;
    subheadline: string;
    description: string;
    buttonText: string;
    stats: PageContentStat[];
  };
  benefits: {
    title: string;
    items: PageContentBenefitItem[];
  };
  testimonials: {
    title: string;
    items: PageContentTestimonialItem[];
  };
  content: {
    title: string;
    chapters: PageContentChapter[];
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
    items: PageContentGuaranteeItem[];
  };
  faq: {
    title: string;
    items: PageContentFaqItem[];
  };
}

// Rozszerzony interfejs dla DemoView z propami do edycji
interface DemoViewProps {
  pageContent: PageContent;
  colorSchemeName?: keyof typeof colorSchemes;
  partnerName?: string;
  visitors?: number;
  pageId?: string;
  pageData?: any;
  isPreviewMode?: boolean;
  isTextEditMode?: boolean; // Czy tryb edycji tekstu jest aktywny
  onTextUpdate?: (fieldName: string, newValue: string) => void; // Funkcja do aktualizacji tekstu
}

// Główny komponent strony
const DemoView: React.FC<DemoViewProps> = ({
  pageContent,
  colorSchemeName = 'harmonia',
  partnerName = 'Jan Kowalski',
  visitors = 0,
  pageId,
  pageData,
  isPreviewMode = false,
  isTextEditMode = false,
  onTextUpdate
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Stany do obsługi pobierania ebooka
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadStarted, setDownloadStarted] = useState(false);

  // Sprawdź czy używamy kontekstu
  const editModeContext = useEditMode();
  const useContextMode = !!editModeContext;

  // Obsługa zmiany tekstu - wykorzystuje kontekst jeśli jest dostępny, w przeciwnym razie callback
  const handleTextChange = (field: string, value: string) => {
    if (useContextMode) {
      editModeContext.handleTextChange(field, value);
    } else if (onTextUpdate) {
      onTextUpdate(field, value);
    }
  };

  // Używamy przekazanego schematu kolorystycznego
  const colors = colorSchemes[colorSchemeName];

  // Przygotowanie rozszerzonych statystyk z uwzględnieniem liczby odwiedzin
  const statsWithVisitors = [
    ...pageContent.hero.stats,
    //...(visitors > 0 ? [{ value: visitors.toString(), label: "odwiedzin" }] : [])
  ];

  // Do animowania elementów podczas przewijania
  const [elements, setElements] = useState<Record<string, boolean>>({});
  const observers = useRef<Record<string, IntersectionObserver>>({});

  // Inicjalizacja obserwatorów dla animacji przewijania
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    const observerCallback = (entries: IntersectionObserverEntry[], observer: IntersectionObserver) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.target.id) {
          setElements(prev => ({
            ...prev,
            [entry.target.id]: true
          }));
          observer.unobserve(entry.target);
        }
      });
    };

    // Zmieniono 'form' na 'signup', aby dopasować do id sekcji formularza
    const sectionIds = [
      'hero', 'benefits', 'content', 'testimonials',
      'signup', 'faq'
    ];

    // Kopiujemy referencję do obserwatorów na potrzeby funkcji cleanup
    const currentObservers: Record<string, IntersectionObserver> = {};

    sectionIds.forEach(id => {
      const element = document.getElementById(id);
      if (element) {
        const observer = new IntersectionObserver(observerCallback, options);
        observer.observe(element);
        currentObservers[id] = observer;
        observers.current[id] = observer;
      }
    });

    return () => {
      // Używamy skopiowanych obserwatorów zamiast observers.current
      Object.values(currentObservers).forEach(observer => {
        observer.disconnect();
      });
    };
  }, []);

  // Funkcja do pobierania ebooka
  const handleDownloadEbook = async () => {
    if (isPreviewMode) {
      return; // Nie wykonuj akcji w trybie podglądu
    }

    if (!pageId || !pageContent.s3_file_key) {
      setDownloadError("Brak informacji potrzebnych do pobrania ebooka");
      return;
    }

    try {
      setIsDownloading(true);
      setDownloadError(null);

      // Wywołanie API do pobrania ebooka
      const response = await fetch(`/api/download-ebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId: pageId,
          s3Key: pageContent.s3_file_key,
          email: email // wysyłamy email użytkownika do logowania pobrań
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Wystąpił problem podczas pobierania ebooka');
      }

      // Pobierz url do pobierania
      const data = await response.json();

      if (data.downloadUrl) {
        // Inicjujemy pobieranie pliku w przeglądarce
        window.location.href = data.downloadUrl;

        // Oznaczamy, że pobieranie się rozpoczęło
        setDownloadStarted(true);
      } else {
        throw new Error('Nie otrzymano adresu URL do pobrania');
      }

    } catch (error) {
      console.error('Błąd podczas pobierania ebooka:', error);
      setDownloadError(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setIsDownloading(false);
    }
  };

  // Zmodyfikowana funkcja handleSubmit z integracją API
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isPreviewMode) {
      return; // Nie rób nic w trybie podglądu
    }

    if (!pageId) {
      setSubmitError('Brak identyfikatora strony. Nie można zapisać danych.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Przygotowanie danych do wysłania
      const leadData = {
        pageId: pageId,
        leadName: name,
        leadEmail: email,
        leadPhone: phone || undefined
      };

      // Wywołanie API
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Wystąpił problem podczas zapisywania danych');
      }

      // Sukces - pokazujemy komunikat podziękowania
      setSubmitted(true);
      setDownloadStarted(false);

    } catch (error) {
      console.error('Błąd podczas wysyłania formularza:', error);
      setSubmitError(error instanceof Error ? error.message : 'Nieznany błąd');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white font-sans text-gray-800 overflow-hidden">
      {/* Górny pasek (header) */}
      <header className="fixed top-0 left-0 w-full h-16 bg-white shadow-md z-50 flex items-center justify-between px-4 sm:px-6 md:px-10 lg:px-16 xl:px-88">
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

      {/* Hero Section */}
      <section
        id="hero"
        className={`relative pt-8 sm:pt-4 pb-12 sm:pb-20 overflow-x-hidden transition-all duration-700 ease-out
          ${elements.hero ? 'opacity-100' : 'opacity-0 translate-y-10'}`}
      >
        <div className="container mx-auto px-4 sm:px-8 max-w-6xl">
          <div className="flex flex-col lg:flex-row items-center relative z-10 gap-6 sm:gap-8 lg:gap-12 xl:gap-16">
            {/* Left column with text */}
            <div className="lg:w-1/2 mb-8 lg:mb-0 w-full">
              <EditableText
                fieldName="pagecontent_hero_headline"
                value={pageContent.hero.headline}
                tag="h1"
                isEditMode={isTextEditMode || false}
                onChange={handleTextChange}
                className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 leading-tight text-left break-words"
                style={{
                  color: colors.text,
                  fontFamily: colors.headingFont
                }}
              />
              <EditableText
                fieldName="pagecontent_hero_subheadline"
                value={pageContent.hero.subheadline}
                tag="h2"
                isEditMode={isTextEditMode || false}
                onChange={handleTextChange}
                className="text-lg sm:text-xl lg:text-2xl font-medium mb-3 sm:mb-4 text-left break-words"
                style={{
                  color: colors.subtext,
                  fontFamily: colors.headingFont
                }}
              />
              <div className="w-3/4 sm:w-120 h-0.25 mb-4 sm:mb-6 rounded-full ml-0 mr-auto" style={{ backgroundColor: colors.secondary }}></div>
              <EditableText
                fieldName="pagecontent_hero_description"
                value={pageContent.hero.description}
                tag="p"
                isEditMode={isTextEditMode || false}
                onChange={handleTextChange}
                className="text-sm sm:text-base lg:text-lg mb-6 sm:mb-8 text-gray-700 max-w-full text-left break-words"
                multiline={true}
              />
              <div className="w-2/3 sm:w-100 h-0.25 mb-4 sm:mb-6 rounded-full ml-0 mr-auto" style={{ backgroundColor: colors.secondary }}></div>

              {/* Mobile mockup - pokazywane tylko na małych ekranach */}
              <div className="block lg:hidden w-full mb-6 sm:mb-8">
                <div className="mx-auto max-w-xs">
                  <Image
                    src={pageContent.s3_file_key || "/mockup.png"}
                    alt="E-book Mockup"
                    className="w-full h-auto"
                    width={300}
                    height={400}
                    unoptimized
                  />
                </div>
              </div>

              {/* Stats - używamy statsWithVisitors zamiast pageContent.hero.stats */}
              <div className="flex flex-wrap gap-4 sm:gap-8 mb-6 sm:mb-8 justify-center lg:justify-start">
                {statsWithVisitors.map((stat, index) => (
                  <div key={index} className="flex items-center">
                    <div className="mr-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: colors.accent }}></div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm sm:text-base">{stat.value}</p>
                      <p className="text-xs text-gray-600">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Call to action button - Wyśrodkowany na mobile, wyrównany do lewej na większych ekranach */}
              <div className="text-center lg:text-left">
                <AnimatedButton href="#signup" accent={colors.accent}>
                  {pageContent.hero.buttonText}
                </AnimatedButton>
              </div>
            </div>

            {/* Right column with e-book mockup - tylko dla większych ekranów */}
            <div className="lg:w-1/2 hidden lg:flex justify-start lg:justify-center items-center pl-4 lg:pl-30 xl:pl-30">
              <div className="w-64 md:w-80 lg:w-96 xl:w-[30rem] transform lg:translate-x-4 xl:translate-x-8">
                <Image
                  src={pageContent.s3_file_key || "/mockup.png"}
                  alt="E-book Mockup"
                  className="w-full h-auto"
                  width={576}
                  height={768}
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Guarantees banner */}
      <section className="py-3 sm:py-4 border-y border-gray-200" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 sm:gap-8 items-center">
            {pageContent.guarantees.items.map((item, index) => (
              <div key={index} className="flex items-center">
                <div className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center mr-2 sm:mr-3 border"
                  style={{
                    backgroundColor: `${colors.secondary}30`,
                    borderColor: colors.secondary
                  }}>
                  {item.icon ? <item.icon className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: colors.accent }} /> : <Award className="w-3 h-3 sm:w-4 sm:h-4" style={{ color: colors.accent }} />}
                </div>
                <span className="text-gray-700 text-xs sm:text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section
        id="benefits"
        className={`py-12 sm:py-20 transition-all duration-700 ease-out
          ${elements.benefits ? 'opacity-100' : 'opacity-0 translate-y-10'}`}
      >
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4" style={{ fontFamily: colors.headingFont }}>
              {pageContent.benefits.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 max-w-7xl mx-auto">
            {pageContent.benefits.items.map((item, index) => (
              <div key={index} className="group bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mb-4 sm:mb-5 border transition-colors" style={{
                  backgroundColor: `${colors.secondary}30`,
                  borderColor: colors.secondary
                }}>
                  {item.icon ? <item.icon className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.accent }} /> :
                  index === 0 ? <Heart className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.accent }} /> :
                  index === 1 ? <Target className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.accent }} /> :
                  index === 2 ? <Clock className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.accent }} /> :
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.accent }} />}
                </div>
                {EDITABLE_FIELDS.includes(`pagecontent_benefits_items_${index}_title`) ? (
                  <EditableText
                    fieldName={`pagecontent_benefits_items_${index}_title`}
                    value={item.title}
                    tag="h3"
                    isEditMode={isTextEditMode || false}
                    onChange={handleTextChange}
                    className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3 transition-colors"
                    style={{
                      fontFamily: colors.headingFont,
                      color: colors.text
                    }}
                  />
                ) : (
                  <h3
                    className="text-lg sm:text-xl font-bold text-gray-800 mb-2 sm:mb-3 transition-colors"
                    style={{
                      fontFamily: colors.headingFont,
                      color: colors.text
                    }}
                  >
                    {item.title}
                  </h3>
                )}

                {EDITABLE_FIELDS.includes(`pagecontent_benefits_items_${index}_text`) ? (
                  <EditableText
                    fieldName={`pagecontent_benefits_items_${index}_text`}
                    value={item.text}
                    tag="p"
                    isEditMode={isTextEditMode || false}
                    onChange={handleTextChange}
                    className="text-sm sm:text-base text-gray-700"
                    multiline={true}
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-700">
                    {item.text}
                  </p>
                )}
                {/* Kolorowy pasek na dole */}
                <div className="w-10 h-1 mt-3 sm:mt-4 rounded-full" style={{ backgroundColor: colors.accent }}></div>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-12 text-center">
            <a
              href="#signup"
              className="inline-flex items-center justify-center px-5 sm:px-6 py-2 sm:py-3 rounded-full bg-white font-medium text-sm sm:text-base border transition-all hover:shadow-sm"
              style={{
                color: colors.accent,
                borderColor: colors.secondary
              }}
            >
              Dowiedz się więcej
            </a>
          </div>
        </div>
      </section>

      {/* Content Preview Section */}
      <section
        id="content"
        className={`py-12 sm:py-20 transition-all duration-700 ease-out
          ${elements.content ? 'opacity-100' : 'opacity-0 translate-y-10'}`}
        style={{ backgroundColor: "#FFFFFF" }}
      >
        {/* Cienka linia podziału przed tytułem sekcji */}
        <div className="flex justify-center mb-8">
          <div className="w-120 sm:w-220 h-0.25 rounded-full" style={{ backgroundColor: colors.secondary }}></div>
        </div>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4"
              style={{ fontFamily: colors.headingFont }}
            >
              {pageContent.content.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-7xl mx-auto">
            {pageContent.content.chapters.map((chapter, index) => (
              <div key={index} className="bg-white p-6 sm:p-8 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 relative overflow-hidden group">
                {/* Chapter number - Now more visible */}
                <div className="absolute -top-2 -left-2 w-12 h-12 sm:w-16 sm:h-16 rounded-full group-hover:scale-125 transition-transform duration-500" style={{ backgroundColor: `${colors.secondary}50` }}></div>
                <div className="font-bold text-4xl sm:text-5xl mb-4 sm:mb-6" style={{
                  color: colors.accent,
                  fontFamily: colors.headingFont
                }}>{chapter.number}</div>

                {EDITABLE_FIELDS.includes(`pagecontent_content_chapters_${index}_title`) ? (
                  <EditableText
                    fieldName={`pagecontent_content_chapters_${index}_title`}
                    value={chapter.title}
                    tag="h3"
                    isEditMode={isTextEditMode || false}
                    onChange={handleTextChange}
                    className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 transition-colors"
                    style={{
                      color: colors.text,
                      fontFamily: colors.headingFont
                    }}
                  />
                ) : (
                  <h3
                    className="text-lg sm:text-xl font-bold mb-2 sm:mb-3 transition-colors"
                    style={{
                      color: colors.text,
                      fontFamily: colors.headingFont
                    }}
                  >
                    {chapter.title}
                  </h3>
                )}

                {EDITABLE_FIELDS.includes(`pagecontent_content_chapters_${index}_description`) ? (
                  <EditableText
                    fieldName={`pagecontent_content_chapters_${index}_description`}
                    value={chapter.description}
                    tag="p"
                    isEditMode={isTextEditMode || false}
                    onChange={handleTextChange}
                    className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4"
                    multiline={true}
                  />
                ) : (
                  <p className="text-sm sm:text-base text-gray-700 mb-3 sm:mb-4">
                    {chapter.description}
                  </p>
                )}
                <div className="w-8 sm:w-10 h-1 rounded-full" style={{ backgroundColor: colors.accent }}></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section
        id="testimonials"
        className={`py-12 sm:py-20 transition-all duration-700 ease-out
          ${elements.testimonials ? 'opacity-100' : 'opacity-0 translate-y-10'}`}
      >
        {/* Cienka linia podziału przed tytułem sekcji */}
        <div className="flex justify-center mb-8">
          <div className="w-120 sm:w-220 h-0.25 rounded-full" style={{ backgroundColor: colors.secondary }}></div>
        </div>
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12">
            <h2
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-800 mb-4"
              style={{ fontFamily: colors.headingFont }}
            >
              {pageContent.testimonials.title}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 max-w-6xl mx-auto">
            {pageContent.testimonials.items.map((item, index) => (
              <div key={index} className="bg-white p-4 sm:p-6 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 border border-gray-200 group">
                {/* Testimonial card */}
                <div className="flex items-center mb-3 sm:mb-4">
                  {/* Avatar */}
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center mr-3 sm:mr-4 overflow-hidden border" style={{
                    backgroundColor: `${colors.secondary}30`,
                    borderColor: colors.secondary
                  }}>
                    <Users className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: colors.accent }} />
                  </div>
                  <div>
                    {EDITABLE_FIELDS.includes(`pagecontent_testimonials_items_${index}_author`) ? (
                      <EditableText
                        fieldName={`pagecontent_testimonials_items_${index}_author`}
                        value={item.author}
                        tag="p"
                        isEditMode={isTextEditMode || false}
                        onChange={handleTextChange}
                        className="font-semibold text-gray-800 text-sm sm:text-base"
                      />
                    ) : (
                      <p className="font-semibold text-gray-800 text-sm sm:text-base">{item.author}</p>
                    )}

                    {EDITABLE_FIELDS.includes(`pagecontent_testimonials_items_${index}_role`) ? (
                      <EditableText
                        fieldName={`pagecontent_testimonials_items_${index}_role`}
                        value={item.role}
                        tag="p"
                        isEditMode={isTextEditMode || false}
                        onChange={handleTextChange}
                        className="text-xs text-gray-600"
                      />
                    ) : (
                      <p className="text-xs text-gray-600">{item.role}</p>
                    )}
                  </div>
                </div>
                <StarRating rating={item.rating} />
                <p className="text-xs sm:text-sm md:text-base text-gray-700 mt-3 sm:mt-4 italic group-hover:text-gray-800 transition-colors">
                  &quot;
                  {EDITABLE_FIELDS.includes(`pagecontent_testimonials_items_${index}_text`) ? (
                    <EditableText
                      fieldName={`pagecontent_testimonials_items_${index}_text`}
                      value={item.text}
                      tag="span"
                      isEditMode={isTextEditMode || false}
                      onChange={handleTextChange}
                    />
                  ) : (
                    item.text
                  )}
                  &quot;
                </p>
              </div>
            ))}
          </div>

          <div className="mt-8 sm:mt-12 text-center">
            <div className="inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-50 rounded-full text-xs sm:text-sm text-gray-700 border border-gray-200">
              <Users className="w-4 h-4 sm:w-5 sm:h-5 mr-1.5 sm:mr-2" style={{ color: colors.accent }} />
              Ponad 10 000 zadowolonych czytelników
            </div>
          </div>
        </div>
      </section>

      {/* Form Section - Ulepszony i wyraźnie widoczny formularz */}
      <section
        id="signup"
        className={`py-10 sm:py-16 transition-all duration-700 ease-out
          ${elements.signup ? 'opacity-100' : 'opacity-0 translate-y-10'}`}
      >
        {/* Pasek z tytułem - zwracający uwagę */}
        <div className="py-4 sm:py-6 mb-6 sm:mb-10 border-y border-gray-200" style={{ backgroundColor: colors.accent }}>
          <div className="container mx-auto px-4 text-center">
            {EDITABLE_FIELDS.includes("pagecontent_form_title") ? (
              <EditableText
                fieldName="pagecontent_form_title"
                value={pageContent.form.title}
                tag="h2"
                isEditMode={isTextEditMode || false}
                onChange={handleTextChange}
                className="text-xl sm:text-2xl md:text-3xl font-bold text-white"
                style={{ fontFamily: colors.headingFont }}
              />
            ) : (
              <h2
                className="text-xl sm:text-2xl md:text-3xl font-bold text-white"
                style={{ fontFamily: colors.headingFont }}
              >
                {pageContent.form.title}
              </h2>
            )}
            {isPreviewMode && <span className="ml-2 text-white opacity-75 text-base">(Tryb podglądu)</span>}
          </div>
        </div>

        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto bg-white p-6 sm:p-8 md:p-10 rounded-2xl shadow-lg border-2 relative" style={{ borderColor: colors.secondary }}>
            {/* Plakietka "BEZPŁATNIE" */}
            <div className="absolute -top-4 sm:-top-5 right-4 sm:right-10 text-white py-1 sm:py-2 px-4 sm:px-6 rounded-full font-bold text-xs sm:text-sm shadow-md transform rotate-2" style={{ backgroundColor: colors.accent }}>
              BEZPŁATNIE
            </div>

            {!submitted ? (
              <div className="grid grid-cols-1 md:grid-cols-5 gap-6 sm:gap-8">
                <div className="md:col-span-2">
                  <div className="h-full flex flex-col justify-center">
                    <div className="flex items-center mb-3 sm:mb-4">
                      <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center mr-2 sm:mr-3 border" style={{
                        backgroundColor: `${colors.secondary}30`,
                        borderColor: colors.secondary
                      }}>
                        <BookOpen className="w-4 h-4 sm:w-6 sm:h-6" style={{ color: colors.accent }} />
                      </div>
                      <h3
                        className="text-lg sm:text-xl font-bold text-gray-800"
                        style={{ fontFamily: colors.headingFont }}
                      >
                        Wypełnij formularz
                      </h3>
                    </div>

                    <p className="text-sm sm:text-base text-gray-700 mb-4 sm:mb-6">
                      Wypełnij poniższy formularz, a wyślemy Ci bezpłatnego e-booka prosto na Twoją skrzynkę e-mail.
                    </p>

                    {/* Trust badges - ukryte na mobilnych ekranach, pokazane od MD w górę */}
                    <div className="mt-auto hidden md:block">
                      <p className="text-xs text-gray-700 mb-2 sm:mb-3 font-medium uppercase tracking-wider">
                        Gwarantujemy:
                      </p>
                      <div className="space-y-2">
                        <div className="flex items-center text-xs text-gray-700 bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border border-gray-200">
                          <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" style={{ color: colors.accent }} />
                          Bezpieczne dane
                        </div>
                        <div className="flex items-center text-xs text-gray-700 bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border border-gray-200">
                          <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" style={{ color: colors.accent }} />
                          Bez spamu
                        </div>
                        <div className="flex items-center text-xs text-gray-700 bg-gray-50 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full border border-gray-200">
                          <BookOpen className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" style={{ color: colors.accent }} />
                          PDF wysokiej jakości
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-3">
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                    {/* Imię */}
                    <div>
                      <label htmlFor="name" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Imię
                      </label>
                      <input
                        id="name"
                        type="text"
                        placeholder={pageContent.form.namePlaceholder}
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        disabled={isPreviewMode || isSubmitting}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all ${isPreviewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        style={{
                          borderColor: colors.secondary,
                          "--tw-ring-color": colors.accent
                        } as React.CSSProperties}
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label htmlFor="email" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        E-mail
                      </label>
                      <input
                        id="email"
                        type="email"
                        placeholder={pageContent.form.emailPlaceholder}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isPreviewMode || isSubmitting}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all ${isPreviewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        style={{
                          borderColor: colors.secondary,
                          "--tw-ring-color": colors.accent
                        } as React.CSSProperties}
                      />
                    </div>

                    {/* Telefon (opcjonalnie) */}
                    <div>
                      <label htmlFor="phone" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                        Telefon (opcjonalnie)
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        placeholder={pageContent.form.phonePlaceholder}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isPreviewMode || isSubmitting}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 transition-all ${isPreviewMode ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                        style={{
                          borderColor: colors.secondary,
                          "--tw-ring-color": colors.accent
                        } as React.CSSProperties}
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isPreviewMode || isSubmitting}
                      className={`w-full text-white font-bold py-3 sm:py-4 px-4 sm:px-6 text-sm sm:text-base rounded-lg shadow-md hover:shadow-lg transition-all transform hover:scale-[1.02] ${(isPreviewMode || isSubmitting) ? 'opacity-60 cursor-not-allowed' : ''}`}
                      style={{ backgroundColor: colors.accent }}
                    >
                      {isSubmitting ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></span>
                          Wysyłanie...
                        </>
                      ) : isPreviewMode ? (
                        'Niedostępne w trybie podglądu'
                      ) : (
                        pageContent.form.buttonText
                      )}
                    </button>

                    {/* Wyświetl błąd, jeśli wystąpił */}
                    {submitError && (
                      <div className="text-red-600 text-sm text-center mt-2">
                        {submitError}
                      </div>
                    )}

                    {/* Informacja o trybie podglądu */}
                    {isPreviewMode && (
                      <div className="text-amber-600 text-xs text-center mt-2 bg-amber-50 p-2 rounded-md border border-amber-200">
                        Formularz jest nieaktywny w trybie podglądu. Aby testować zbieranie leadów, otwórz opublikowaną wersję strony.
                      </div>
                    )}

                    <p className="text-xs text-center text-gray-600 mt-3 sm:mt-4">
                      {pageContent.form.privacyText}
                    </p>
                  </form>

                  {/* Trust badges na telefonach - widoczne tylko na małych ekranach */}
                  <div className="mt-6 block md:hidden">
                    <p className="text-xs text-gray-700 mb-2 font-medium uppercase tracking-wider">
                      Gwarantujemy:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center text-xs text-gray-700 bg-gray-50 px-2 py-1.5 rounded-full border border-gray-200">
                        <Shield className="w-3 h-3 mr-1.5" style={{ color: colors.accent }} />
                        Bezpieczne dane
                      </div>
                      <div className="flex items-center text-xs text-gray-700 bg-gray-50 px-2 py-1.5 rounded-full border border-gray-200">
                        <CheckCircle className="w-3 h-3 mr-1.5" style={{ color: colors.accent }} />
                        Bez spamu
                      </div>
                      <div className="flex items-center text-xs text-gray-700 bg-gray-50 px-2 py-1.5 rounded-full border border-gray-200">
                        <BookOpen className="w-3 h-3 mr-1.5" style={{ color: colors.accent }} />
                        PDF wysokiej jakości
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6 border" style={{
                  backgroundColor: `${colors.secondary}30`,
                  borderColor: colors.secondary
                }}>
                  <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10" style={{ color: colors.accent }} />
                </div>
                <h2
                  className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-5"
                  style={{
                    color: colors.accent,
                    fontFamily: colors.headingFont
                  }}
                >
                  Dziękujemy!
                </h2>

                {!downloadStarted ? (
                  <>
                    <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8 max-w-md mx-auto">
                      E-book jest gotowy do pobrania. Kliknij poniższy przycisk, aby go pobrać na swoje urządzenie.
                    </p>

                    {/* Przycisk do pobierania - pokazywany tylko przed rozpoczęciem pobierania */}
                    <button
                      onClick={handleDownloadEbook}
                      disabled={isDownloading || isPreviewMode}
                      className={`inline-flex items-center justify-center px-6 py-3 rounded-lg font-semibold text-white shadow-md transition-all ${
                        isDownloading ? 'bg-gray-400 cursor-wait' :
                        isPreviewMode ? 'bg-gray-400 cursor-not-allowed' :
                        'hover:shadow-lg hover:scale-105'
                      }`}
                      style={!isDownloading && !isPreviewMode ? { backgroundColor: colors.accent } : {}}
                    >
                      {isDownloading ? (
                        <>
                          <span className="inline-block w-5 h-5 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Pobieranie...
                        </>
                      ) : isPreviewMode ? (
                        'Niedostępne w trybie podglądu'
                      ) : (
                        <>
                          <Download className="w-5 h-5 mr-2" />
                          Pobierz swój ebook
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  // Po rozpoczęciu pobierania pokazujemy komunikat pożegnalny
                  <p className="text-base sm:text-lg text-gray-700 mb-4 sm:mb-5 max-w-md mx-auto animate-fadeIn">
                    Miłej lektury, do zobaczenia :)
                  </p>
                )}

                {/* Wyświetl błąd pobierania, jeśli wystąpił */}
                {downloadError && (
                  <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm mx-auto max-w-md">
                    <p>{downloadError}</p>
                    <p className="mt-2 text-xs">
                      Jeśli problem będzie się powtarzał, skontaktuj się z nami.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className={`py-12 sm:py-20 transition-all duration-700 ease-out
          ${elements.faq ? 'opacity-100' : 'opacity-0 translate-y-10'}`}
      >
        <div className="container mx-auto px-4 max-w-4xl">
          <h2
            className="text-2xl sm:text-3xl font-bold text-center text-gray-800 mb-8 sm:mb-12"
            style={{ fontFamily: colors.headingFont }}
          >
            {pageContent.faq.title}
          </h2>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            {pageContent.faq.items.map((item, index) => (
              <FaqItem
                key={index}
                question={item.question}
                answer={item.answer}
                isTextEditMode={isTextEditMode}
                onTextUpdate={onTextUpdate}
                questionFieldName={`pagecontent_faq_items_${index}_question`}
                answerFieldName={`pagecontent_faq_items_${index}_answer`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 sm:py-8 border-t border-gray-200" style={{ backgroundColor: "#FFFFFF" }}>
        <div className="container mx-auto px-4 text-center">
          <p className="text-xs sm:text-sm text-gray-600 mb-2">
            © 2025 Omega Zdrowie. Wszelkie prawa zastrzeżone.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-0 sm:space-x-4">
            <a href="#" className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Polityka prywatności
            </a>
            <a href="#" className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Regulamin
            </a>
            <a href="#" className="text-xs sm:text-sm text-gray-600 hover:text-gray-800 transition-colors">
              Kontakt
            </a>
          </div>
        </div>
      </footer>

      {/* Dodaj styl animacji dla płynnego pojawiania się elementów */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default DemoView;