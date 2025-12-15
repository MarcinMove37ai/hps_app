// src/components/ui/PDFCoverDisplay.tsx
"use client"

import React, { useState, useEffect } from 'react';
import { Hourglass, AlertCircle } from 'lucide-react';
import Image from 'next/image';

interface PDFCoverDisplayProps {
  pageId: string;
  className?: string;
  height?: string;
  width?: string;
}

interface PageData {
  s3_file_key: string;
  cover_page_index: number;
}

const PDFCoverDisplay: React.FC<PDFCoverDisplayProps> = ({
  pageId,
  className = '',
  height = '400px',
  width = '300px'
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState<number>(0);

  useEffect(() => {
    const fetchCoverImage = async () => {
      try {
        setLoading(true);
        setError(null);

        // Najpierw spróbujmy pobrać dane strony, aby sprawdzić URL
        try {
          const pageDataResponse = await fetch(`/api/pdf-cover/get-data?pageId=${pageId}`);

          if (pageDataResponse.ok) {
            const pageData: PageData = await pageDataResponse.json();

            // Jeśli s3_file_key to pełny publiczny URL (zaczyna się od https://)
            if (pageData.s3_file_key && pageData.s3_file_key.startsWith('https://')) {
              console.log(`Używam publicznego URL z bazy: ${pageData.s3_file_key}`);
              setImageUrl(pageData.s3_file_key);
              setLoading(false);
              return;
            }
          }
        } catch (err) {
          console.warn('Nie udało się pobrać danych strony, kontynuuję z domyślnym sposobem:', err);
          // Kontynuujemy, nawet jeśli ten krok się nie powiedzie
        }

        // Jeśli nie mamy publicznego URL, używamy standardowego API
        const timestamp = new Date().getTime();
        const response = await fetch(`/api/pdf-cover?pageId=${pageId}&t=${timestamp}`);

        if (!response.ok) {
          // Jeśli błąd to 404, oznacza to, że okładka nie jest jeszcze wybrana
          if (response.status === 404) {
            throw new Error('Ta strona nie ma jeszcze przypisanej okładki');
          }
          throw new Error(`Błąd HTTP: ${response.status}`);
        }

        // Sprawdź typ odpowiedzi
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('image/')) {
          // Jeśli odpowiedź nie jest obrazem, spróbuj ją odczytać jako JSON z błędem
          const errorData = await response.json();
          throw new Error(errorData.error || 'Nieznany błąd');
        }

        // Utwórz URL dla obrazu Blob
        const imageBlob = await response.blob();
        const url = URL.createObjectURL(imageBlob);
        setImageUrl(url);
      } catch (err) {
        console.error('Błąd podczas pobierania okładki:', err);
        setError((err as Error).message);

        // Jeśli wystąpił błąd i nie przekroczyliśmy 3 prób, spróbuj ponownie po 2 sekundach
        if (retryCount < 3) {
          setTimeout(() => {
            setRetryCount(prev => prev + 1);
          }, 2000);
        }
      } finally {
        setLoading(false);
      }
    };

    if (pageId) {
      fetchCoverImage();
    }

    // Cleanup funkcja - zwolnij URL po odmontowaniu komponentu
    return () => {
      if (imageUrl && imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [pageId, retryCount, imageUrl]);

  // Stan ładowania
  if (loading) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height, width }}
      >
        <Hourglass className="h-10 w-10 text-gray-400 mb-2 animate-pulse" />
        <p className="text-sm text-gray-500">Ładowanie okładki...</p>
      </div>
    );
  }

  // Stan błędu
  if (error) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gray-100 rounded-lg ${className}`}
        style={{ height, width }}
      >
        <AlertCircle className="h-10 w-10 text-amber-500 mb-2" />
        <p className="text-sm text-gray-600 text-center px-4">{error}</p>
        {retryCount < 3 && (
          <p className="text-xs text-gray-400 mt-2">Ponowna próba ({retryCount+1}/3)...</p>
        )}
      </div>
    );
  }

  // Wyświetlenie obrazu
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${className}`}
      style={{ height, width }}
    >
      {imageUrl ? (
        <Image
          src={imageUrl}
          className="w-full h-full object-contain"
          alt="Okładka PDF"
          width={parseInt(width) || 300}
          height={parseInt(height) || 400}
          unoptimized // Używamy unoptimized, ponieważ obrazy mogą być generowane dynamicznie
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <p className="text-sm text-gray-500">Brak okładki</p>
        </div>
      )}
    </div>
  );
};

export default PDFCoverDisplay;