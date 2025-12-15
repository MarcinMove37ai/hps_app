// src/components/ui/MockupSelector.tsx
"use client"

import React, { useState } from 'react';
import { CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Image from 'next/image';

interface MockupFile {
  key: string;
  url: string;
  lastModified?: Date;
}

interface MockupSelectorProps {
  mockupFiles: MockupFile[];
  pageId: string;
  s3Key: string;
  onComplete: (selectedUrl: string) => void;
  onCancel: () => void;
}

const MockupSelector: React.FC<MockupSelectorProps> = ({
  mockupFiles,
  pageId,
  s3Key,
  onComplete,
  onCancel
}) => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Zapisywanie wyboru okładki
  const handleSaveSelection = async () => {
    try {
      setSaving(true);
      setError(null);

      // Pobierz klucz wybranego mockupu
      const selectedMockupKey = mockupFiles[selectedIndex].key;

      // Generowanie publicznego URL do S3
      const bucketName = 'ebooks-in'; // W produkcji użyj process.env.S3_BUCKET_NAME
      const region = 'eu-central-1'; // W produkcji użyj process.env.AWS_REGION
      const publicUrl = `https://${bucketName}.s3.${region}.amazonaws.com/${selectedMockupKey}`;

      console.log(`Generowanie publicznego URL: ${publicUrl}`);

      // Wywołanie API do zapisania publicznego URL okładki w bazie danych
      const response = await fetch('/api/save-mockup-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pageId,
          coverUrl: publicUrl, // Przekazujemy publiczny URL do S3
          s3Key
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Błąd HTTP: ${response.status}`);
      }

      // Wywołaj callback po pomyślnym zapisaniu
      onComplete(publicUrl);
    } catch (err) {
      console.error('Błąd podczas zapisywania wyboru okładki:', err);
      setError((err as Error).message || 'Wystąpił błąd podczas zapisywania wyboru');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-3 bg-white rounded-lg max-h-[70vh] overflow-y-auto">
      {/* Zmodyfikowany opis - krótszy i bardziej zwięzły */}
      <p className="text-sm text-gray-600 mb-3">
        Wybierz okłądkę do wizualizacji ebooka na stronie.
      </p>

      {/* Przyciski nawigacji i wskaźnik wybranej okładki - bardziej kompaktowy */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <button
          onClick={() => setSelectedIndex(prev => Math.max(0, prev - 1))}
          disabled={selectedIndex === 0}
          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="h-5 w-5 text-gray-700" />
        </button>

        <div className="px-2 py-1 bg-gray-100 rounded-full text-gray-700">
          <span className="text-xs font-medium">
            {selectedIndex + 1} / {mockupFiles.length}
          </span>
        </div>

        <button
          onClick={() => setSelectedIndex(prev => Math.min(mockupFiles.length - 1, prev + 1))}
          disabled={selectedIndex === mockupFiles.length - 1}
          className="p-1 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="h-5 w-5 text-gray-700" />
        </button>
      </div>

      {/* Wyświetlanie okładek - zmniejszona wysokość */}
      <div className="flex justify-center mb-4">
        <div className="relative border rounded-lg shadow-md p-1 bg-white">
          {mockupFiles.map((mockup, index) => (
            <div
              key={index}
              className={`transition-opacity duration-300 absolute inset-0 flex justify-center items-center ${
                index === selectedIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            >
              <Image
                src={mockup.url}
                alt={`Okładka ${index + 1}`}
                width={240}
                height={320}
                className="max-h-[320px] max-w-full object-contain"
                unoptimized
              />
            </div>
          ))}
          {/* Zmniejszony pusty div */}
          <div className="h-[320px] w-[240px] invisible"></div>
        </div>
      </div>

      {/* Miniatury wszystkich okładek na dole - mniejsze */}
      <div className="flex justify-center gap-1 mb-4 overflow-x-auto py-1">
        {mockupFiles.map((mockup, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className={`relative border p-1 rounded-md transition-all ${
              index === selectedIndex
                ? 'border-sky-500 shadow-md bg-sky-50'
                : 'border-gray-200 hover:border-gray-400'
            }`}
          >
            <Image
              src={mockup.url}
              alt={`Miniatura okładki ${index + 1}`}
              width={36}
              height={48}
              className="h-12 w-9 object-cover"
              unoptimized
            />
            {index === selectedIndex && (
              <div className="absolute -top-1 -right-1 bg-sky-500 text-white rounded-full p-0.5">
                <CheckCircle2 className="h-2 w-2" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Błędy */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-md flex items-center text-red-600">
          <X size={14} className="mr-1 flex-shrink-0" />
          <span className="text-xs">{error}</span>
        </div>
      )}

      {/* Przyciski akcji */}
      <div className="flex justify-between mt-3">
        <button
          onClick={onCancel}
          type="button"
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
        >
          Bez okładki
        </button>
        <button
          onClick={handleSaveSelection}
          disabled={saving}
          className="flex items-center px-3 py-1.5 bg-sky-600 hover:bg-sky-700 rounded-md text-sm text-white disabled:bg-sky-400"
        >
          {saving ? (
            <>
              <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1"></div>
              <span>Zapisywanie...</span>
            </>
          ) : (
            <span>Wybierz tę okładkę</span>
          )}
        </button>
      </div>
    </div>
  );
};

export default MockupSelector;