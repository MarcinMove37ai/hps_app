// src/app/p/[token]/[[...slug]]/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import PublicPageClient from './PublicPageClient';
import { pool } from '@/lib/db';

// Typy dla parametrów i props
interface PageParams {
  token: string;
  slug?: string[];
}

// Funkcja do pobierania danych strony z bazy danych
async function getPageData(tokenParam: string) {
  let client;

  try {
    client = await pool.connect();

    // Pobieramy wszystkie pola z tabeli pages
    const result = await client.query(
      `SELECT * FROM pages WHERE url LIKE $1 AND status = 'active'`,
      [`%/p/${tokenParam}%`]
    );

    if (result.rows.length === 0) {
      return null;
    }

    // Diagnostyczne logowanie
    console.log('DEBUG - Dane pobrane z bazy dla SEO:', {
      id: result.rows[0].id,
      url: result.rows[0].url,
      title: result.rows[0].x_amz_meta_title,
      headline: result.rows[0].pagecontent_hero_headline,
      subheadline: result.rows[0].pagecontent_hero_subheadline,
      description: result.rows[0].pagecontent_hero_description,
      s3_file_key: result.rows[0].s3_file_key,
      cover_page_index: result.rows[0].cover_page_index
    });

    return result.rows[0];
  } catch (error) {
    console.error('Błąd podczas pobierania publicznej strony:', error);
    return null;
  } finally {
    if (client) {
      client.release();
    }
  }
}

// Funkcja pomocnicza do sprawdzania poprawności URL
function ensureAbsoluteUrl(url: string | null | undefined): string {
  if (!url) return '/default-cover-sample.jpg';

  // Jeśli to już jest absolutny URL, zwracamy go bezpośrednio
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  // Jeśli to względny URL, dodajemy bazowy URL aplikacji
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://twoja-domena.pl';
  return `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`;
}

// Funkcja do generowania metadata dla strony
export async function generateMetadata(
  { params }: { params: Promise<PageParams> }
): Promise<Metadata> {
  try {
    // W Next.js 15.2, params są Promise i muszą być awaited
    const resolvedParams = await params;
    const tokenValue = resolvedParams?.token || '';

    // Pobranie danych strony
    const pageData = await getPageData(tokenValue);

    if (!pageData) {
      return {
        title: 'Strona nie znaleziona',
        description: 'Strona, której szukasz, nie istnieje lub nie jest dostępna.'
      };
    }

    // Nowy format tytułu: "HPS e-book | [headline]"
    const headline = pageData.pagecontent_hero_headline || 'Przewodnik zdrowotny (sample)';
    const formattedTitle = `HPS e-book | ${headline}`;

    // Użyj subheadline jako headline
    const subheadline = pageData.pagecontent_hero_subheadline || 'Wartościowe informacje dla Twojego zdrowia (sample)';

    // Opis
    const description = pageData.pagecontent_hero_description || 'Pobierz darmowy przewodnik zdrowotny i zyskaj cenne wskazówki dotyczące zdrowego stylu życia. (sample)';

    // Skróć opis, jeśli jest za długi
    const truncatedDescription = description.length > 160
      ? `${description.substring(0, 157)}...`
      : description;

    // Pobierz URL obrazu i upewnij się, że jest absolutny
    const imageUrl = ensureAbsoluteUrl(pageData.s3_file_key);

    // Diagnostyczne logowanie dla metadanych
    console.log('DEBUG - Metadane używane do SEO:', {
      title: formattedTitle,
      headline: subheadline,
      description: truncatedDescription,
      imageUrl,
      originalS3Key: pageData.s3_file_key
    });

    // Tworzenie metadanych z absolutnymi URL-ami i wszystkimi potrzebnymi danymi
    return {
      title: formattedTitle,
      description: truncatedDescription,
      openGraph: {
        title: formattedTitle,
        description: truncatedDescription,
        images: [{
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: headline
        }],
        type: 'website',
        siteName: 'Omega Zdrowie (sample)',
      },
      twitter: {
        card: 'summary_large_image',
        title: formattedTitle,
        description: truncatedDescription,
        images: [imageUrl],
        creator: '@OmegaZdrowie (sample)',
      },
      // Dodatkowe metadane
      applicationName: 'Omega Zdrowie',
      authors: [{ name: pageData.creator || 'Omega Zdrowie (sample)' }],
      keywords: ['zdrowie', 'ebook', 'przewodnik', 'omega-3'],
      robots: 'index, follow',
    };
  } catch (error) {
    console.error('Błąd podczas generowania metadanych:', error);
    return {
      title: 'Błąd strony',
      description: 'Wystąpił błąd podczas ładowania strony'
    };
  }
}

// Główny komponent strony
export default async function PublicPage({ params }: { params: Promise<PageParams> }) {
  try {
    // W Next.js 15.2, params są Promise i muszą być awaited
    const resolvedParams = await params;
    const tokenValue = resolvedParams?.token || '';

    // Pobranie danych strony
    const pageData = await getPageData(tokenValue);

    // Jeśli nie ma danych, zwróć 404
    if (!pageData) {
      notFound();
    }

    // Inkrementacja licznika odwiedzin
    if (pageData.id) {
      try {
        // Tworzenie absolutnego URL - kluczowa zmiana
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
          (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

        const apiUrl = new URL('/api/pages/visits', baseUrl).toString();

        console.log("Wywołanie API do licznika odwiedzin:", apiUrl);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ pageId: pageData.id }),
          cache: 'no-store' // Zapobiegamy cachowaniu
        });

        if (response.ok) {
          const data = await response.json();
          // Aktualizacja liczby odwiedzin w danych strony
          pageData.visitors = data.visitors;
          console.log(`Licznik odwiedzin dla strony ${pageData.id}: ${data.visitors}`);
        } else {
          console.error("Błąd API:", response.status, await response.text());
        }
      } catch (error) {
        console.error('Błąd podczas aktualizacji licznika odwiedzin:', error);
        // Nie przerywamy renderowania strony w przypadku błędu licznika
      }
    }

    // Nowy format tytułu dla Schema.org
    const headline = pageData.pagecontent_hero_headline || 'Przewodnik zdrowotny (sample)';
    const formattedTitle = `HPS e-book | ${headline}`;
    const subheadline = pageData.pagecontent_hero_subheadline || 'Wartościowe informacje dla Twojego zdrowia (sample)';

    // Dane Schema.org dla lepszego SEO z absolutnymi URL-ami
    const schemaData = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": subheadline, // Używamy subheadline jako headline
      "name": formattedTitle, // Dodajemy name z formatowanym tytułem
      "description": pageData.pagecontent_hero_description || 'Pobierz darmowy przewodnik zdrowotny (sample)',
      "image": ensureAbsoluteUrl(pageData.s3_file_key),
      // Dodatkowe pola, które poprawią SEO
      "datePublished": pageData.created_at || new Date().toISOString(),
      "dateModified": pageData.updated_at || new Date().toISOString(),
      "author": {
        "@type": "Person",
        "name": pageData.creator || "Omega Zdrowie (sample)"
      },
      "publisher": {
        "@type": "Organization",
        "name": "Omega Zdrowie (sample)",
        "logo": {
          "@type": "ImageObject",
          "url": ensureAbsoluteUrl("/logo.png")
        }
      }
    };

    return (
      <>
        {/* Dane Schema.org */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaData) }}
        />

        {/* Komponent kliencki - przekazujemy dane pobrane z bazy danych */}
        <PublicPageClient initialPageData={pageData} />
      </>
    );
  } catch (error) {
    console.error('Błąd podczas renderowania strony:', error);
    notFound();
  }
}