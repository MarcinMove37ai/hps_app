import React from 'react';
import { X } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useIsMobile } from '@/hooks/useIsMobile';

interface StudyData {
  PMID: string;
  journal: string;
  publication_date?: string;
  country?: string;
  domain_primary: string;
  domain_secondary?: string;
  population?: string;
  title: string;
  abstract?: string;
  measured_outcomes?: string | string[];
  observed_outcomes?: string | string[];
  url?: string;
}

interface StudyCardProps {
  study: StudyData;
  onClose: () => void;
}

const StudyCard: React.FC<StudyCardProps> = ({ study, onClose }) => {
  const isMobile = useIsMobile();

  // Helper function to process outcomes
  const processOutcomes = (outcomes: string | string[] | undefined) => {
    if (!outcomes || outcomes === 'NO DATA' || outcomes === 'no_data') return [];

    const outcomesArray = typeof outcomes === 'string'
      ? outcomes.split(';').map(item => item.trim())
      : outcomes;

    return outcomesArray
      .filter(item => item && item !== 'NO DATA' && item !== 'no_data')
      .map(outcome => {
        const parts = outcome.split('|').map(part => part.trim());
        if (parts.length === 3) {
          return {
            main: parts[0] !== 'no_data' ? parts[0] : '',
            sub: parts[1] !== 'no_data' ? parts[1] : '',
            note: parts[2] !== 'no_data' ? parts[2] : ''
          };
        }
        return { main: outcome, sub: '', note: '' };
      });
  };

  const measuredOutcomes = processOutcomes(study.measured_outcomes);
  const observedOutcomes = processOutcomes(study.observed_outcomes);

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className={`bg-white rounded-lg w-full ${
        isMobile
          ? 'h-full'
          : 'max-w-4xl h-[90vh] max-h-[90vh]'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header with close button - fixed height */}
          <div className="flex justify-end p-4 flex-shrink-0 border-b border-gray-100">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Zamknij"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* Scrollable content - takes remaining space */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Study metadata grid */}
                <div className={`grid gap-4 mb-8 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <span className="text-sm text-black w-32">PMID:</span>
                      <span className="text-blue-900 font-bold">{study.PMID}</span>
                    </div>
                    {study.publication_date && (
                      <div className="flex items-center">
                        <span className="text-sm text-black w-32">Data publikacji:</span>
                        <span className="text-blue-900 font-bold">{study.publication_date}</span>
                      </div>
                    )}
                    <div className="flex items-center">
                      <span className="text-sm text-black w-32">Czasopismo:</span>
                      <span className="text-blue-900 font-bold">{study.journal}</span>
                    </div>
                    {study.country && (
                      <div className="flex items-center">
                        <span className="text-sm text-black w-32">Kraj publikacji:</span>
                        <span className="text-blue-900 font-bold">{study.country}</span>
                      </div>
                    )}
                  </div>

                  <div className="border border-black rounded-lg p-3 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-2xl text-blue-900 font-bold capitalize">
                        {study.domain_primary}
                      </div>
                      {study.domain_secondary && (
                        <div className="text-sm text-gray-600 capitalize">
                          {study.domain_secondary}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Study title */}
                <div className="mb-6">
                  <h2 className="text-sm italic text-blue-900 border-b border-blue-900 pb-1 mb-2">
                    Tytuł badania:
                  </h2>
                  {study.url ? (
                    <a
                      href={study.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg text-black font-bold hover:text-blue-900 hover:underline transition-colors"
                    >
                      {study.title}
                    </a>
                  ) : (
                    <p className="text-lg text-black font-bold">
                      {study.title}
                    </p>
                  )}
                </div>

                {/* Abstract */}
                {study.abstract && (
                  <div className="mb-6">
                    <h2 className="text-sm italic text-blue-900 border-b border-blue-900 pb-1 mb-2">
                      Podsumowanie:
                    </h2>
                    <p className="text-base text-black leading-relaxed">
                      {study.abstract}
                    </p>
                  </div>
                )}

                {/* Outcomes sections */}
                {measuredOutcomes.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm italic text-blue-900 border-b border-blue-900 pb-1 mb-2">
                      Mierzone wyniki:
                    </h2>
                    <ul className="list-disc pl-5 space-y-1">
                      {measuredOutcomes.map((outcome, index) => (
                        <li key={index} className="text-base text-black">
                          {outcome.main}
                          {outcome.sub && <span> - {outcome.sub}</span>}
                          {outcome.note && <span className="text-gray-600 italic"> ({outcome.note})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {observedOutcomes.length > 0 && (
                  <div className="mb-6">
                    <h2 className="text-sm italic text-blue-900 border-b border-blue-900 pb-1 mb-2">
                      Zaobserwowane wyniki:
                    </h2>
                    <ul className="list-disc pl-5 space-y-1">
                      {observedOutcomes.map((outcome, index) => (
                        <li key={index} className="text-base text-black">
                          {outcome.main}
                          {outcome.sub && <span> - {outcome.sub}</span>}
                          {outcome.note && <span className="text-gray-600 italic"> ({outcome.note})</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Footer disclaimer */}
                <div className="text-sm text-black border border-black rounded-lg p-3 mt-8 text-center">
                  Powyższe informacje powstały w wyniku tłumaczenia i przetwarzania danych przez duży model językowy i może zawierać błędy.
                  Aby wyświetlić oryginalną treść badania kliknij{' '}
                  {study.url ? (
                    <a
                      href={study.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-900 hover:underline"
                    >
                      link
                    </a>
                  ) : (
                    <span className="text-red-700">link</span>
                  )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudyCard;