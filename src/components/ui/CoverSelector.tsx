// src/components/ui/CoverSelector.tsx
"use client"

import React, { useState, useEffect } from 'react';
import { Hourglass, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface CoverSelectorProps {
  s3Key: string;
  pageId: string;
  onComplete: (selectedPage: number) => void;
  onCancel: () => void;
}

const CoverSelector: React.FC<CoverSelectorProps> = ({
  s3Key,
  pageId,
  onComplete,
  onCancel
}) => {
  const [thumbnails, setThumbnails] = useState<string[]>([]);
  const [selectedPage, setSelectedPage] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);

  // Pobieranie miniatur z API
  useEffect(() => {
    const fetchThumbnails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/pdf-thumbnails?s3Key=${encodeURIComponent(s3Key)}`);

        if (!response.ok) {
          throw new Error(`Błąd HTTP: ${response.status}`);
        }

        const data = await response.json();

        if (data.error) {
          throw new Error(data.error);
        }

        setThumbnails(data.thumbnails);

        // Domyślnie wybieramy pierwszą stronę
        setSelectedPage(0);
      } catch (err) {
        console.error('Błąd podczas pobierania miniatur:', err);
        setError((err as Error).message || 'Wystąpił błąd podczas ładowania podglądu PDF');
      } finally {
        setLoading(false);
      }
    };

    if (s3Key && pageId) {
      fetchThumbnails();
    }
  }, [s3Key, pageId]);

  // Zapisywanie wyboru okładki
  const handleSaveSelection = async () => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch('/api/pdf-thumbnails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          selectedPage,
          s3Key
        }),
      });

      if (!response.ok) {
        throw new Error(`Błąd HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      // Wywołaj callback po pomyślnym zapisaniu
      onComplete(selectedPage);
    } catch (err) {
      console.error('Błąd podczas zapisywania wyboru okładki:', err);
      setError((err as Error).message || 'Wystąpił błąd podczas zapisywania wyboru');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Hourglass className="h-12 w-12 text-sky-500 animate-pulse mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Generowanie podglądu stron...</h3>
        <p className="text-sm text-gray-500 mt-2">To może potrwać kilka chwil</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 rounded-lg">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <X className="h-6 w-6 text-red-500" />
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-red-800">Wystąpił błąd</h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-4">
              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                Wróć
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-lg">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Wybierz okładkę dla e-booka</h2>
      <p className="text-sm text-gray-600 mb-6">
        Wybierz stronę z PDF-a, która będzie służyć jako okładka na stronie landing page.
      </p>

      {/* Przyciski nawigacji i wskaźnik wybranej strony */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button
          onClick={() => setSelectedPage(prev => Math.max(0, prev - 1))}
          disabled={selectedPage === 0}
          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-6 w-6 text-gray-700" />
        </button>

        <div className="px-3 py-1 bg-gray-100 rounded-full">
          <span className="text-sm font-medium">
            Strona {selectedPage + 1} z {thumbnails.length}
          </span>
        </div>

        <button
          onClick={() => setSelectedPage(prev => Math.min(thumbnails.length - 1, prev + 1))}
          disabled={selectedPage === thumbnails.length - 1}
          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-6 w-6 text-gray-700" />
        </button>
      </div>

      {/* Wyświetlanie miniatur stron */}
      <div className="flex justify-center mb-8">
        <div className="relative border rounded-lg shadow-md p-1 bg-white">
          {thumbnails.map((thumbnail, index) => (
            <div
              key={index}
              className={`transition-opacity duration-300 absolute inset-0 flex justify-center items-center ${
                index === selectedPage ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              {thumbnail ? (
                <Image
                  src={thumbnail}
                  alt={`Strona ${index + 1}`}
                  width={300}
                  height={400}
                  className="max-h-[400px] max-w-full object-contain"
                  unoptimized // Używamy unoptimized, ponieważ miniatury mogą być generowane dynamicznie
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] w-[300px] bg-gray-100">
                  <p className="text-gray-500">Brak podglądu dla strony {index + 1}</p>
                </div>
              )}
            </div>
          ))}
          {/* Pusty div o stałej wysokości, aby kontener zachował wymiary */}
          <div className="h-[400px] w-[300px] invisible"></div>
        </div>
      </div>

      {/* Miniatury wszystkich stron na dole */}
      <div className="flex justify-center gap-2 mb-6 overflow-x-auto py-2">
        {thumbnails.map((thumbnail, index) => (
          <button
            key={index}
            onClick={() => setSelectedPage(index)}
            className={`relative border p-1 rounded-md transition-all ${
              index === selectedPage
                ? 'border-sky-500 shadow-md bg-sky-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            {thumbnail ? (
              <Image
                src={thumbnail}
                alt={`Miniatura strony ${index + 1}`}
                width={48}
                height={64}
                className="h-16 w-12 object-cover"
                unoptimized // Używamy unoptimized, ponieważ miniatury mogą być generowane dynamicznie
              />
            ) : (
              <div className="h-16 w-12 bg-gray-100 flex items-center justify-center">
                <span className="text-xs text-gray-500">{index + 1}</span>
              </div>
            )}
            {index === selectedPage && (
              <div className="absolute -top-2 -right-2 bg-sky-500 text-white rounded-full p-1">
                <CheckCircle2 className="h-3 w-3" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Przyciski akcji */}
      <div className="flex justify-between mt-6">
        <button
          onClick={onCancel}
          type="button"
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Wróć
        </button>
        <button
          onClick={handleSaveSelection}
          disabled={saving || loading}
          className="flex items-center px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-md text-white disabled:bg-sky-400"
        >
          {saving ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              <span>Zapisywanie...</span>
            </>
          ) : (
            <span>Potwierdź wybór okładki</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default CoverSelector;