// components/EbookCoverManager.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useEbookCover } from '@/hooks/useEbookCover';

interface EbookCoverManagerProps {
  ebookId: number;
  onCoverGenerated?: (coverUrl: string) => void;
}

export const EbookCoverManager: React.FC<EbookCoverManagerProps> = ({
  ebookId,
  onCoverGenerated
}) => {
  const {
    coverData,
    isLoading,
    isGenerating,
    error,
    fetchCoverStatus,
    generateCompleteFlow,
    downloadPdf,
    resetError
  } = useEbookCover(ebookId);

  const [showPrompt, setShowPrompt] = useState(false);

  // Ładuj dane przy montowaniu
  useEffect(() => {
    if (ebookId) {
      fetchCoverStatus();
    }
  }, [ebookId, fetchCoverStatus]);

  // Callback gdy okładka zostanie wygenerowana
  useEffect(() => {
    if (coverData?.cover_url && onCoverGenerated) {
      onCoverGenerated(coverData.cover_url);
    }
  }, [coverData?.cover_url, onCoverGenerated]);

  const handleGenerateCover = async (forceRegenerate = false) => {
    const success = await generateCompleteFlow({
      forceRegenerate,
      generatePdf: false
    });
    if (success) {
      console.log('✅ Okładka wygenerowana pomyślnie');
    }
  };

  const handleGenerateWithPdf = async () => {
    const success = await generateCompleteFlow({
      forceRegenerate: false,
      generatePdf: true
    });
    if (success) {
      console.log('✅ Okładka i PDF wygenerowane pomyślnie');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Ładowanie statusu okładki...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Komunikaty błędów */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <div className="flex justify-between items-center">
            <span>{error}</span>
            <button
              onClick={resetError}
              className="text-red-500 hover:text-red-700 font-medium"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {coverData && (
        <>
          {/* Status okładki */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              🎨 Status okładki
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className={`p-4 rounded-lg border-2 ${
                coverData.cover_status.prompt_ready
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="font-medium text-gray-900">
                  {coverData.cover_status.prompt_ready ? '✅' : '⏸️'} Prompt
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {coverData.cover_status.prompt_ready
                    ? `Gotowy (${coverData.cover_prompt_length} znaków)`
                    : 'Nie wygenerowany'
                  }
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                coverData.cover_status.image_ready
                  ? 'bg-green-50 border-green-200'
                  : 'bg-gray-50 border-gray-200'
              }`}>
                <div className="font-medium text-gray-900">
                  {coverData.cover_status.image_ready ? '✅' : '⏸️'} Okładka
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {coverData.cover_status.image_ready ? 'Wygenerowana' : 'Nie wygenerowana'}
                </div>
              </div>

              <div className={`p-4 rounded-lg border-2 ${
                coverData.cover_status.complete
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="font-medium text-gray-900">
                  {coverData.cover_status.complete ? '🎯' : '⚠️'} Status
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {coverData.cover_status.complete ? 'Kompletne' : 'W trakcie'}
                </div>
              </div>
            </div>

            {/* Podgląd okładki */}
            {coverData.cover_url && (
              <div className="mb-6">
                <h4 className="font-medium text-gray-900 mb-3">Podgląd okładki:</h4>
                <div className="flex justify-center">
                  <img
                    src={coverData.cover_url}
                    alt="Okładka ebooka"
                    className="max-w-xs rounded-lg shadow-lg border border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              </div>
            )}

            {/* Prompt okładki */}
            {coverData.cover_prompt && (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">Prompt okładki:</h4>
                  <button
                    onClick={() => setShowPrompt(!showPrompt)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    {showPrompt ? 'Ukryj' : 'Pokaż'}
                  </button>
                </div>
                {showPrompt && (
                  <div className="bg-gray-50 p-4 rounded-lg border">
                    <p className="text-sm text-gray-700 font-mono leading-relaxed">
                      {coverData.cover_prompt}
                    </p>
                    <div className="mt-2 text-xs text-gray-500">
                      Długość: {coverData.cover_prompt_length} znaków
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Akcje */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => handleGenerateCover(false)}
                disabled={isGenerating}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generowanie...
                  </>
                ) : (
                  <>
                    🎨 Wygeneruj okładkę
                  </>
                )}
              </button>

              <button
                onClick={() => handleGenerateCover(true)}
                disabled={isGenerating}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄 Regeneruj okładkę
              </button>

              <button
                onClick={handleGenerateWithPdf}
                disabled={isGenerating}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                📚 Okładka + PDF
              </button>

              <button
                onClick={downloadPdf}
                disabled={!coverData.cover_status.complete || isGenerating}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                📥 Pobierz PDF
              </button>

              <button
                onClick={fetchCoverStatus}
                disabled={isGenerating}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔄 Odśwież status
              </button>
            </div>

            {/* Informacje dodatkowe */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Ostatnia aktualizacja: {new Date(coverData.last_updated).toLocaleString('pl-PL')}
              </p>
            </div>
          </div>

          {/* Instrukcje */}
          {!coverData.cover_status.complete && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Jak wygenerować okładkę:</h4>
              <ol className="text-sm text-blue-800 space-y-1">
                <li>1. Kliknij "Wygeneruj okładkę" aby stworzyć prompt i obraz</li>
                <li>2. Poczekaj na zakończenie procesu (może potrwać 1-2 minuty)</li>
                <li>3. Sprawdź podgląd okładki</li>
                <li>4. Pobierz PDF z okładką lub zregeneruj jeśli potrzeba</li>
              </ol>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default EbookCoverManager;