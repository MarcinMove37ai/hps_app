// hooks/useEbookCover.ts
import React, { useEffect } from 'react';
import { useState, useCallback } from 'react';

interface CoverStatus {
  prompt_ready: boolean;
  image_ready: boolean;
  complete: boolean;
}

interface EbookCoverData {
  ebook_id: number;
  title: string;
  subtitle?: string;
  has_cover_prompt: boolean;
  has_cover_image: boolean;
  cover_url?: string;
  cover_prompt?: string;
  cover_prompt_length: number;
  last_updated: string;
  cover_status: CoverStatus;
}

interface UseEbookCoverReturn {
  // Stan
  coverData: EbookCoverData | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;

  // Funkcje
  fetchCoverStatus: () => Promise<void>;
  generateCompleteFlow: (options?: { forceRegenerate?: boolean; generatePdf?: boolean }) => Promise<boolean>;
  downloadPdf: () => Promise<void>;
  resetError: () => void;
}

export const useEbookCover = (ebookId: number): UseEbookCoverReturn => {
  const [coverData, setCoverData] = useState<EbookCoverData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pobierz status okładki
  const fetchCoverStatus = useCallback(async () => {
    if (!ebookId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/ebooks/${ebookId}/generate-cover-complete`);

      if (!response.ok) {
        throw new Error('Nie udało się pobrać statusu okładki');
      }

      const data = await response.json();
      setCoverData(data);

    } catch (err: any) {
      setError(err.message);
      console.error('Błąd pobierania statusu okładki:', err);
    } finally {
      setIsLoading(false);
    }
  }, [ebookId]);

  // Wygeneruj kompletną okładkę
  const generateCompleteFlow = useCallback(async (options: { forceRegenerate?: boolean; generatePdf?: boolean } = {}) => {

    if (!ebookId) return false;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch(`/api/ebooks/${ebookId}/generate-cover-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forceRegenerate: options?.forceRegenerate || false,
          generatePdf: options?.generatePdf || false
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Błąd generowania okładki');
      }

      // Odśwież dane po sukcesie
      await fetchCoverStatus();

      return true;

    } catch (err: any) {
      setError(err.message);
      console.error('Błąd generowania okładki:', err);
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, [ebookId, fetchCoverStatus]);

  // Pobierz PDF
  const downloadPdf = useCallback(async () => {
    if (!ebookId) return;

    try {
      const response = await fetch(`/api/ebooks/${ebookId}/export-pdf`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Błąd eksportu PDF');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `ebook-${ebookId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

    } catch (err: any) {
      setError(err.message);
      console.error('Błąd pobierania PDF:', err);
    }
  }, [ebookId]);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  return {
    coverData,
    isLoading,
    isGenerating,
    error,
    fetchCoverStatus,
    generateCompleteFlow,
    downloadPdf,
    resetError
  };
};

// Przykład użycia w komponencie:
export const EbookCoverSection: React.FC<{ ebookId: number }> = ({ ebookId }) => {
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

  // Ładuj dane przy montowaniu
  React.useEffect(() => {
    fetchCoverStatus();
  }, [fetchCoverStatus]);

  if (isLoading) {
    return <div>Ładowanie statusu okładki...</div>;
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
          <button onClick={resetError} className="ml-2 underline">
            Zamknij
          </button>
        </div>
      )}

      {coverData && (
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Status okładki</h3>

          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className={`p-3 rounded ${coverData.cover_status.prompt_ready ? 'bg-green-100' : 'bg-gray-100'}`}>
              <div className="font-medium">Prompt</div>
              <div className="text-sm text-gray-600">
                {coverData.cover_status.prompt_ready ? 'Gotowy' : 'Brak'}
              </div>
            </div>

            <div className={`p-3 rounded ${coverData.cover_status.image_ready ? 'bg-green-100' : 'bg-gray-100'}`}>
              <div className="font-medium">Okładka</div>
              <div className="text-sm text-gray-600">
                {coverData.cover_status.image_ready ? 'Wygenerowana' : 'Brak'}
              </div>
            </div>

            <div className={`p-3 rounded ${coverData.cover_status.complete ? 'bg-green-100' : 'bg-gray-100'}`}>
              <div className="font-medium">Status</div>
              <div className="text-sm text-gray-600">
                {coverData.cover_status.complete ? 'Gotowe' : 'Niekompletne'}
              </div>
            </div>
          </div>

          {coverData.cover_url && (
            <div className="mb-4">
              <img
                src={coverData.cover_url}
                alt="Okładka ebooka"
                className="max-w-xs rounded-lg shadow-md"
              />
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={() => generateCompleteFlow()}
              disabled={isGenerating}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isGenerating ? 'Generowanie...' : 'Wygeneruj okładkę'}
            </button>

            <button
              onClick={() => generateCompleteFlow({ forceRegenerate: true })}
              disabled={isGenerating}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:opacity-50"
            >
              Regeneruj
            </button>

            <button
              onClick={downloadPdf}
              disabled={!coverData.cover_status.complete}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
            >
              Pobierz PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};