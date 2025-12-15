// src/app/[category]/[token]/[[...slug]]/PublicPageClient.tsx
"use client"

import React from 'react';
import DemoView, { colorSchemes } from '@/components/views/demo';
import DemoVideo from '@/components/views/demoVideo'; // Import komponentu DemoVideo
import { AlertCircle } from 'lucide-react';

// Interfejs dla propsów komponentu
interface PublicPageClientProps {
  initialPageData: any;
}

// Interfejs dla zawartości stron typu e-book
interface EbookPageContent {
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
    items: Array<{ question: string; answer: string }>;
  };
}

// Interfejs dla zawartości stron sprzedażowych z wideo
interface VideoPageContent {
  title: string;
  description?: string;
  videoEmbedUrl: string;
  videoThumbnailUrl?: string;
  videoProvider: "vimeo" | "voomly";
  ctaButtonText?: string;
}

// Komponent stanu błędu
const ErrorView = ({ message }: { message: string }) => (
  <div className="min-h-screen bg-white flex items-center justify-center">
    <div className="text-center max-w-md p-6 bg-red-50 rounded-lg border border-red-200">
      <div className="flex justify-center mb-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
      </div>
      <h2 className="text-xl font-semibold text-red-800 mb-2">Wystąpił błąd</h2>
      <p className="text-red-700">{message}</p>
    </div>
  </div>
);

// Funkcja pomocnicza do formatowania danych strony do formatu kompatybilnego z DemoView
const formatPageContent = (pageData: any): EbookPageContent => {
  if (!pageData) throw new Error("Brak danych strony");

  return {
    s3_file_key: pageData.s3_file_key ?? "",
    hero: {
      headline: pageData.pagecontent_hero_headline ?? "",
      subheadline: pageData.pagecontent_hero_subheadline ?? "",
      description: pageData.pagecontent_hero_description ?? "",
      buttonText: "Pobierz bezpłatny e-book",
      stats: [
        { value: "10,000+", label: "czytelników" },
        { value: "4.9/5", label: "ocena" },
        { value: "100%", label: "satysfakcji" }
      ]
    },
    benefits: {
      title: "Co zyskasz dzięki temu przewodnikowi?",
      items: [
        {
          title: pageData.pagecontent_benefits_items_0_title ?? "",
          text: pageData.pagecontent_benefits_items_0_text ?? ""
        },
        {
          title: pageData.pagecontent_benefits_items_1_title ?? "",
          text: pageData.pagecontent_benefits_items_1_text ?? ""
        },
        {
          title: pageData.pagecontent_benefits_items_2_title ?? "",
          text: pageData.pagecontent_benefits_items_2_text ?? ""
        },
        {
          title: pageData.pagecontent_benefits_items_3_title ?? "",
          text: pageData.pagecontent_benefits_items_3_text ?? ""
        }
      ]
    },
    testimonials: {
      title: "Opinie czytelników",
      items: [
        {
          avatar: "/avatar1.jpg",
          text: pageData.pagecontent_testimonials_items_0_text ?? "",
          author: pageData.pagecontent_testimonials_items_0_author ?? "",
          role: pageData.pagecontent_testimonials_items_0_role ?? "",
          rating: 5
        },
        {
          avatar: "/avatar2.jpg",
          text: pageData.pagecontent_testimonials_items_1_text ?? "",
          author: pageData.pagecontent_testimonials_items_1_author ?? "",
          role: pageData.pagecontent_testimonials_items_1_role ?? "",
          rating: 5
        },
        {
          avatar: "/avatar3.jpg",
          text: pageData.pagecontent_testimonials_items_2_text ?? "",
          author: pageData.pagecontent_testimonials_items_2_author ?? "",
          role: pageData.pagecontent_testimonials_items_2_role ?? "",
          rating: 5
        }
      ]
    },
    content: {
      title: "Co znajdziesz w środku?",
      chapters: [
        {
          number: "01",
          title: pageData.pagecontent_content_chapters_0_title ?? "",
          description: pageData.pagecontent_content_chapters_0_description ?? ""
        },
        {
          number: "02",
          title: pageData.pagecontent_content_chapters_1_title ?? "",
          description: pageData.pagecontent_content_chapters_1_description ?? ""
        },
        {
          number: "03",
          title: pageData.pagecontent_content_chapters_2_title ?? "",
          description: pageData.pagecontent_content_chapters_2_description ?? ""
        }
      ]
    },
    form: {
      title: pageData.pagecontent_form_title ?? "Pobierz bezpłatny e-book już teraz",
      subtitle: "Uzupełnij poniższy formularz, aby otrzymać e-book",
      namePlaceholder: "Twoje imię",
      emailPlaceholder: "Twój adres e-mail",
      phonePlaceholder: "Twój numer telefonu (opcjonalnie)",
      buttonText: "Wyślij mi e-book",
      privacyText: "Twoje dane są bezpieczne. Zapoznaj się z polityką prywatności."
    },
    guarantees: {
      items: [
        {
          text: "Sprawdzone badania naukowe"
        },
        {
          text: "Aktualizacja 2025"
        },
        {
          text: "Bezpieczne porady"
        }
      ]
    },
    faq: {
      title: "Najczęściej zadawane pytania",
      items: [
        {
          question: pageData.pagecontent_faq_items_0_question ?? "",
          answer: pageData.pagecontent_faq_items_0_answer ?? ""
        },
        {
          question: pageData.pagecontent_faq_items_1_question ?? "",
          answer: pageData.pagecontent_faq_items_1_answer ?? ""
        },
        {
          question: pageData.pagecontent_faq_items_2_question ?? "",
          answer: pageData.pagecontent_faq_items_2_answer ?? ""
        }
      ]
    }
  };
};

// Nowa funkcja do formatowania danych dla stron sprzedażowych z wideo
const formatVideoPageContent = (pageData: any): VideoPageContent => {
  if (!pageData) throw new Error("Brak danych strony");

  // Upewniamy się, że videoProvider jest albo "vimeo" albo "voomly"
  const videoProvider = pageData.video_provider === 'voomly' ? 'voomly' : 'vimeo';

  return {
    title: pageData.pagecontent_hero_headline || pageData.x_amz_meta_title || 'Strona sprzedażowa',
    description: pageData.pagecontent_hero_subheadline || '',
    videoEmbedUrl: pageData.video_embed_url || '',
    videoThumbnailUrl: pageData.video_thumbnail_url || '',
    videoProvider,
    ctaButtonText: 'Kup suplementację'
  };
};

// Komponent strony publicznej po stronie klienta
const PublicPageClient = ({ initialPageData }: PublicPageClientProps) => {
  // Określ typ strony na podstawie danych
  const pageType = initialPageData.x_amz_meta_page_type || 'ebook';

  try {
    // Pobieranie imienia i nazwiska twórcy z danych strony z kolumn bazy danych
    const firstName = initialPageData.x_amz_meta_user_first_name || '';
    const lastName = initialPageData.x_amz_meta_user_last_name || '';
    const partnerName = (firstName && lastName)
      ? `${firstName} ${lastName}`
      : "Omega Zdrowie"; // Domyślna wartość, jeśli nie ma danych twórcy

    // Pobieranie kolorystyki z danych strony lub ustawienie domyślnej
    const colorSchemeName = (initialPageData.color && Object.keys(colorSchemes).includes(initialPageData.color))
      ? initialPageData.color
      : 'harmonia';

    // Liczba odwiedzin
    const visitors = initialPageData.visitors || 0;

    return (
      <div className="min-h-screen bg-white">
        {/* Dodanie paddingu na górze, aby widok nie był przykryty przez header - identycznie jak w wersji podglądu */}
        <div className="pt-12 pb-24">
          {pageType === 'ebook' ? (
            // Renderowanie komponentu DemoView dla stron typu e-book
            <DemoView
              pageContent={formatPageContent(initialPageData)}
              colorSchemeName={colorSchemeName}
              partnerName={partnerName}
              visitors={visitors}
              pageId={initialPageData.id}
              pageData={initialPageData}
              isPreviewMode={false}
            />
          ) : (
            // Renderowanie komponentu DemoVideo dla stron sprzedażowych
            <DemoVideo
              pageContent={formatVideoPageContent(initialPageData)}
              colorSchemeName={colorSchemeName}
              partnerName={partnerName}
              pageId={initialPageData.id}
              pageData={initialPageData}
              isPreviewMode={false}
            />
          )}
        </div>
      </div>
    );
  } catch (error) {
    console.error("Błąd przetwarzania strony:", error);
    return <ErrorView message={`Nie udało się przetworzyć strony: ${error instanceof Error ? error.message : 'Nieznany błąd'}`} />;
  }
};

export default PublicPageClient;