// src/components/views/statistics.tsx
"use client"

import React, { useState, useEffect, useCallback, ReactNode } from 'react';
import { BarChart3, TrendingUp, UserPlus, ArrowUp, ArrowDown, Loader2, AlertCircle, RefreshCw, Calendar, Clock } from 'lucide-react';

// Interfejsy dla danych statystycznych
interface PageStats {
  id: string;
  title: string;
  type: string;
  visits: number;
  leads: number;
  conversion: number;
  author: string; // Dodane pole dla autora
}

interface TypeStats {
  visits: number;
  leads: number;
  conversion: number;
}

interface DailyData {
  date: string;
  leads: number;
  newPages: number;
}

// Interface dla danych typów statystyk
interface TypeData {
  visits: number;
  leads: number;
  newPages: number;
}

// Interfejs dla dziennych statystyk
interface DayStats {
  date: string;
  visits: number;
  leads: number;
  newPages: number;
  byType: {
    ebook: TypeData;
    sales: TypeData;
  };
}

// Główna struktura danych statystycznych
interface StatisticsData {
  totalStats: TypeStats;
  ebookStats: TypeStats;
  salesStats: TypeStats;
  topPages: PageStats[];
  ebookChartData: DailyData[];
  salesChartData: DailyData[];
  todayStats: DayStats;
  yesterdayStats: DayStats;
}

// Interfejs dla danych użytkownika
interface UserProfile {
  id: string;
  role: string;
  cognito_sub?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  supervisor_code?: string;
}

// Pusty logger - brak debugowania
const ApiLogger = {
  request: () => {},
  response: () => {},
  error: () => {},
  debug: () => {}
};

// Komponent wykresu statystyk
const StatisticsChart: React.FC<{
  title: string;
  chartData: DailyData[];
  leadColor: string;
  pageColor: string;
  leadCount: number;
  newPagesCount: number;
  dateRange: string; // Dodane: zakres dat
}> = ({
  title,
  chartData,
  leadColor,
  pageColor,
  leadCount,
  newPagesCount,
  dateRange, // Dodane: zakres dat
}) => {
  if (!chartData || chartData.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
        <h3 className="text-md font-medium text-gray-800 mb-4">{title}</h3>
        <div className="mt-4 h-40 bg-white rounded-md flex flex-col items-center justify-center">
          <AlertCircle size={20} className="text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">Brak danych do wyświetlenia</p>
        </div>
      </div>
    );
  }

  // Dynamicznie określ, ile dni wyświetlić na podstawie wybranego zakresu
  let daysToDisplay;
  switch (dateRange) {
    case '14days':
      daysToDisplay = 14;
      break;
    case '30days':
      daysToDisplay = 30;
      break;
    case 'all':
      daysToDisplay = chartData.length; // Wszystkie dostępne dane
      break;
    case '7days':
    default:
      daysToDisplay = 7;
      break;
  }

  // Wyświetl dane na podstawie wybranego zakresu, ale ogranicz do dostępnych danych
  const displayData = chartData.slice(-Math.min(daysToDisplay, chartData.length));

  // Wymiary wykresu
  const width = 600;
  const height = 140;
  const padding = { left: 40, right: 40, top: 25, bottom: 30 };

  // Obszar rysowania
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

    // Oblicz maksymalne wartości dla skalowania
    const maxLeads = Math.max(...displayData.map(d => d.leads), 1);
    const maxNewPages = Math.max(...displayData.map(d => d.newPages), 1);

    // Użyj wspólnej maksymalnej wartości dla obu serii, aby zapobiec nakładaniu się punktów
    const rawMaxValue = Math.max(maxLeads, maxNewPages);

    // Zaokrąglij maxValue w górę do najbliższej "ładnej" liczby
    // Zawsze używaj co najmniej 2 jako maxValue, aby uniknąć zbyt płaskiego wykresu
    let maxValue;
    if (rawMaxValue <= 1) {
      maxValue = 2;  // Minimum 2 dla lepszej czytelności
    } else if (rawMaxValue <= 3) {
      maxValue = Math.ceil(rawMaxValue);  // Zaokrąglij w górę do całkowitej liczby
    } else if (rawMaxValue <= 10) {
      maxValue = Math.ceil(rawMaxValue / 2) * 2;  // Zaokrąglij w górę do najbliższej parzystej
    } else {
      maxValue = Math.ceil(rawMaxValue / 5) * 5;  // Zaokrąglij w górę do najbliższej wielokrotności 5
    }

  // Formatuj daty dla etykiet osi X
  const dateLabels = displayData.map(day => {
    const date = new Date(day.date);
    return `${date.getDate().toString().padStart(2, '0')}.${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  });

  // Odstępy na osi X - dynamiczne w zależności od liczby dni
  const xStep = chartWidth / (displayData.length - 1 > 0 ? displayData.length - 1 : 1);

  // Generuj punkty dla linii z użyciem wspólnego skalowania
  // Używamy konkretnego typu dla dataKey - tylko pola liczbowe (leads lub newPages)
  const generateDataPoints = (dataArray: DailyData[], dataKey: 'leads' | 'newPages') => {
    return displayData.map((day, i) => ({
      x: padding.left + i * xStep,
      y: padding.top + chartHeight - (day[dataKey] / maxValue) * chartHeight,
      value: day[dataKey]
    }));
  };

  const leadsPoints = generateDataPoints(displayData, 'leads');
  const pagesPoints = generateDataPoints(displayData, 'newPages');

  // Generuj gładką ścieżkę dla linii
  const getLinePath = (points: {x: number, y: number}[]) => {
    if (points.length < 2) return '';

    const path = [`M ${points[0].x},${points[0].y}`];

    for (let i = 1; i < points.length; i++) {
      const prev = points[i-1];
      const curr = points[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;

      path.push(`C ${cp1x},${prev.y} ${cp2x},${curr.y} ${curr.x},${curr.y}`);
    }

    return path.join(' ');
  };

  // Generuj ścieżki dla każdej linii
  const leadsPath = getLinePath(leadsPoints);
  const pagesPath = getLinePath(pagesPoints);

  // Pobierz dane z bieżącego i poprzedniego dnia dla legendy
  const lastDay = displayData[displayData.length - 1];

  // Generuj poziome linie siatki (dopasowane do skali osi Y)
  const generateGridLines = () => {
    let gridPoints = [];

    // Generujemy punkty na podstawie maksymalnej wartości (bez 0)
    if (maxValue <= 2) {
      // Dla małych wartości (0-2) pokazujemy linię na 1
      gridPoints = [1];
    } else if (maxValue <= 4) {
      // Dla wartości 3-4 pokazujemy linie na 1, 2, 3
      gridPoints = [1, 2, 3];
    } else if (maxValue <= 10) {
      // Dla wartości 5-10 pokazujemy linie co 2 (bez 0)
      for (let i = 2; i < maxValue; i += 2) {
        gridPoints.push(i);
      }
    } else {
      // Dla większych wartości pokazujemy linie co 5 (bez 0)
      for (let i = 5; i < maxValue; i += 5) {
        gridPoints.push(i);
      }
    }

    return gridPoints.map(value => {
      const ratio = value / maxValue;
      return padding.top + chartHeight - (ratio * chartHeight);
    });
  };

  const yGridLines = generateGridLines();

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
      <h3 className="text-md font-medium text-gray-800 mb-4">
        {title}
        <span className="text-xs text-gray-500 ml-2">
          ({displayData.length} dni)
        </span>
      </h3>

      {/* Podsumowanie metryk */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500 mb-1">Leady</p>
          <div className="flex items-baseline">
            <p className="text-3xl font-semibold" style={{color: leadColor}}>{leadCount}</p>
          </div>
        </div>
        <div>
          <p className="text-sm text-gray-500 mb-1">Strony</p>
          <div className="flex items-baseline">
            <p className="text-3xl font-semibold" style={{color: pageColor}}>{newPagesCount}</p>
          </div>
        </div>
      </div>

      {/* Wykres */}
      <div className="relative h-40 mt-2 overflow-hidden">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
          {/* Linie siatki tła */}
          {yGridLines.map((y, i) => (
            <line
              key={`grid-${i}`}
              x1={padding.left - 5}
              y1={y}
              x2={width - padding.right}
              y2={y}
              stroke="#f0f0f0"
              strokeWidth="1"
            />
          ))}

          {/* Linia bazowa osi X */}
          <line
            x1={padding.left - 5}
            y1={padding.top + chartHeight}
            x2={width - padding.right}
            y2={padding.top + chartHeight}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* Linia osi Y */}
          <line
            x1={padding.left}
            y1={padding.top}
            y2={padding.top + chartHeight + 5}
            x2={padding.left}
            stroke="#e5e7eb"
            strokeWidth="1"
          />

          {/* Obszar pod linią leadów (z wypełnieniem gradientowym) */}
          <defs>
            <linearGradient id={`${leadColor.replace('#', '')}-gradient`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={leadColor} stopOpacity="0.2" />
              <stop offset="100%" stopColor={leadColor} stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <path
            d={`${leadsPath} L ${leadsPoints[leadsPoints.length - 1].x},${padding.top + chartHeight} L ${leadsPoints[0].x},${padding.top + chartHeight} Z`}
            fill={`url(#${leadColor.replace('#', '')}-gradient)`}
          />

          {/* Linia trendu leadów */}
          <path
            d={leadsPath}
            fill="none"
            stroke={leadColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Linia trendu nowych stron */}
          <path
            d={pagesPath}
            fill="none"
            stroke={pageColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="4,3"
          />

          {/* Punkty danych dla leadów z efektem najazdu */}
          {leadsPoints.map((point, i) => (
            <g key={`lead-point-${i}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="4"
                fill="white"
                stroke={leadColor}
                strokeWidth="2"
              />
              {i === leadsPoints.length - 1 && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="6"
                  fill="white"
                  stroke={leadColor}
                  strokeWidth="2.5"
                />
              )}
            </g>
          ))}

          {/* Punkty danych dla nowych stron */}
          {pagesPoints.map((point, i) => (
            <g key={`page-point-${i}`}>
              <circle
                cx={point.x}
                cy={point.y}
                r="3.5"
                fill="white"
                stroke={pageColor}
                strokeWidth="2"
              />
              {i === pagesPoints.length - 1 && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="5.5"
                  fill="white"
                  stroke={pageColor}
                  strokeWidth="2.5"
                />
              )}
            </g>
          ))}

          {/* Etykiety dat na osi X - optymalizacja dla większej liczby dni */}
          {displayData.length > 14
            ? // Dla większej liczby dni pokazujemy tylko niektóre etykiety, aby nie nakładały się
              dateLabels.map((label, i) =>
                (i % Math.ceil(displayData.length / 10) === 0 || i === dateLabels.length - 1) ? (
                  <text
                    key={`date-${i}`}
                    x={padding.left + i * xStep}
                    y={height - 8}
                    textAnchor="middle"
                    fill="#9CA3AF"
                    fontSize="11"
                    fontFamily="'Inter', sans-serif"
                  >
                    {label}
                  </text>
                ) : null
              )
            : // Dla mniejszej liczby dni pokazujemy wszystkie etykiety
              dateLabels.map((label, i) => (
                <text
                  key={`date-${i}`}
                  x={padding.left + i * xStep}
                  y={height - 8}
                  textAnchor="middle"
                  fill="#9CA3AF"
                  fontSize="11"
                  fontFamily="'Inter', sans-serif"
                >
                  {label}
                </text>
              ))
          }

        {/* Tooltips wartości dla najnowszych punktów danych */}
          <g transform={`translate(${leadsPoints[leadsPoints.length - 1].x}, ${leadsPoints[leadsPoints.length - 1].y - 15})`}>
            <rect
              x="-15"
              y="-12"
              width="30"
              height="14"
              rx="2"
              fill={leadColor}
            />
            <text
              x="0"
              y="-2"
              textAnchor="middle"
              fill="white"
              fontSize="9"
              fontFamily="'Inter', sans-serif"
              fontWeight="bold"
            >
              {leadsPoints[leadsPoints.length - 1].value}
            </text>
          </g>

          <g transform={`translate(${pagesPoints[pagesPoints.length - 1].x}, ${pagesPoints[pagesPoints.length - 1].y - 15})`}>
            <rect
              x="-15"
              y="-12"
              width="30"
              height="14"
              rx="2"
              fill={pageColor}
            />
            <text
              x="0"
              y="-2"
              textAnchor="middle"
              fill="white"
              fontSize="9"
              fontFamily="'Inter', sans-serif"
              fontWeight="bold"
            >
              {pagesPoints[pagesPoints.length - 1].value}
            </text>
          </g>

          {/* Skala wykresu - oznaczenia wartości na osi Y */}
          {(() => {
            // Określenie punktów na osi Y
            let yAxisPoints = [];

            // Generujemy punkty na podstawie maksymalnej wartości
            if (maxValue <= 2) {
              // Dla małych wartości (0-2) pokazujemy 0, 1, 2
              yAxisPoints = [0, 1, 2];
            } else if (maxValue <= 4) {
              // Dla wartości 3-4 pokazujemy 0, 1, 2, 3, 4
              yAxisPoints = [...Array(maxValue + 1).keys()];
            } else if (maxValue <= 10) {
              // Dla wartości 5-10 pokazujemy 0, 2, 4, ..., maxValue
              for (let i = 0; i <= maxValue; i += 2) {
                yAxisPoints.push(i);
              }
            } else {
              // Dla większych wartości pokazujemy wielokrotności 5
              for (let i = 0; i <= maxValue; i += 5) {
                yAxisPoints.push(i);
              }
            }

            // Dodajemy zawsze 0 jeśli go nie ma
            if (!yAxisPoints.includes(0)) {
              yAxisPoints.unshift(0);
            }

            // Dodajemy zawsze maxValue jeśli go nie ma
            if (!yAxisPoints.includes(maxValue)) {
              yAxisPoints.push(maxValue);
            }

            // Sortujemy punkty rosnąco
            yAxisPoints.sort((a, b) => a - b);

            // Generowanie znaczników osi
            return yAxisPoints.map(value => {
              const ratio = value / maxValue;
              const yPos = padding.top + chartHeight - (ratio * chartHeight);

              return (
                <g key={`scale-${value}`}>
                  <line
                    x1={padding.left - 5}
                    y1={yPos}
                    x2={padding.left}
                    y2={yPos}
                    stroke="#9CA3AF"
                    strokeWidth="1"
                  />
                  <text
                    x={padding.left - 8}
                    y={yPos + 3}
                    textAnchor="end"
                    fill="#9CA3AF"
                    fontSize="9"
                  >
                    {value}
                  </text>
                </g>
              );
            });
          })()}
        </svg>
      </div>

      {/* Ulepszona legenda - przeniesiona poza obszar wykresu */}
      <div className="flex justify-center mt-2 mb-1">
        <div className="flex items-center bg-white px-3 py-1.5 rounded-md border border-gray-200 shadow-sm">
          <div className="flex items-center mr-3">
            <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: leadColor}}></div>
            <span className="text-xs font-medium" style={{color: leadColor}}>
              Leady ({lastDay.leads})
            </span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full mr-1" style={{backgroundColor: pageColor}}></div>
            <span className="text-xs font-medium" style={{color: pageColor}}>
              Strony ({lastDay.newPages})
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

const StatisticsView = () => {
  // Zmienne stanu
  const [dateRange, setDateRange] = useState('7days');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statsData, setStatsData] = useState<StatisticsData | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [requestDetails, setRequestDetails] = useState<{
    url: string;
    headers: Record<string, string>;
    params: string;
  } | null>(null);

  // Pobieranie danych statystycznych
  const fetchStats = useCallback(async () => {
    if (!userData) return;

    setIsLoading(true);
    setError(null);

    try {
      // Przygotuj parametry zapytania na podstawie wybranego zakresu dat
      const params = new URLSearchParams();
      params.append('range', dateRange);

      // Tworzymy URL zapytania
      const url = `/api/statistics?${params.toString()}`;

      // Przygotuj nagłówki
      const headers = {
        'X-User-Id': userData.id,
        'X-User-Role': userData.role,
        'X-User-Cognito-Sub': userData.cognito_sub || '',
        'Content-Type': 'application/json'
      };

      // Zapisz szczegóły zapytania do wyświetlenia
      setRequestDetails({
        url,
        headers,
        params: params.toString()
      });

      // Wykonaj zapytanie
      const response = await fetch(url, {
        headers
      });

      // Pobierz dane JSON z odpowiedzi
      const jsonData = await response.json();

      if (!response.ok) {
        throw new Error(jsonData.error || `Błąd ${response.status}: ${response.statusText}`);
      }

      // Sprawdź poprawność danych
      if (!jsonData || !jsonData.totalStats) {
        throw new Error('API zwróciło nieprawidłowy format danych');
      }

      // Poprawiamy dane, dodając dzisiejszą datę jeśli jej brakuje
      const fixedData = ensureTodayDateInCharts(jsonData);

      // Walidacja danych
      validateStatisticsData(fixedData);

      setStatsData(fixedData);
    } catch (err) {
      // Obsługa błędu bez logowania do konsoli
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      setError(`Błąd podczas pobierania statystyk: ${errorMessage}`);
    } finally {
      setIsLoading(false);
    }
  }, [userData, dateRange]);

  // Funkcja zapewniająca, że dzisiejsza data jest uwzględniona w danych wykresów
  const ensureTodayDateInCharts = (data: any) => {
    // Kopiujemy dane, aby nie modyfikować oryginału
    const updatedData = { ...data };

    if (!updatedData.ebookChartData || !updatedData.salesChartData) {
      return updatedData;
    }

    // Uzyskaj dzisiejszą datę w formacie YYYY-MM-DD
    const today = new Date();
    const formattedToday = today.toISOString().split('T')[0]; // Format YYYY-MM-DD

    // Sprawdź, czy ostatnia data w ebookChartData to dzisiejsza data
    const lastEbookDate = updatedData.ebookChartData.length > 0
      ? updatedData.ebookChartData[updatedData.ebookChartData.length - 1].date
      : null;

    // Sprawdź, czy ostatnia data w salesChartData to dzisiejsza data
    const lastSalesDate = updatedData.salesChartData.length > 0
      ? updatedData.salesChartData[updatedData.salesChartData.length - 1].date
      : null;

    // Jeśli dzisiejsza data nie jest ostatnią datą w wykresie ebook, dodaj ją
    if (lastEbookDate !== formattedToday) {
      // Pobierz dane z todayStats dla ebook
      const todayEbookLeads = updatedData.todayStats.byType.ebook.leads || 0;
      const todayEbookNewPages = updatedData.todayStats.byType.ebook.newPages || 0;

      // Dodaj dzisiejsze dane do wykresu ebook
      updatedData.ebookChartData.push({
        date: formattedToday,
        leads: todayEbookLeads,
        newPages: todayEbookNewPages
      });
    }

    // Jeśli dzisiejsza data nie jest ostatnią datą w wykresie sales, dodaj ją
    if (lastSalesDate !== formattedToday) {
      // Pobierz dane z todayStats dla sales
      const todaySalesLeads = updatedData.todayStats.byType.sales.leads || 0;
      const todaySalesNewPages = updatedData.todayStats.byType.sales.newPages || 0;

      // Dodaj dzisiejsze dane do wykresu sales
      updatedData.salesChartData.push({
        date: formattedToday,
        leads: todaySalesLeads,
        newPages: todaySalesNewPages
      });
    }

    return updatedData;
  };

  // Funkcja do walidacji danych statystycznych (sprawdzanie niespójności)
  const validateStatisticsData = (data: any) => {
    try {
      // Walidacja danych bez debugowania
      const totalLeads = data.totalStats.leads;
      const totalEbookLeads = data.ebookStats.leads;
      const totalSalesLeads = data.salesStats.leads;

      // Sprawdź spójność między danymi dziennymi a sumami
      const todayEbookLeads = data.todayStats.byType.ebook.leads;
      const todaySalesLeads = data.todayStats.byType.sales.leads;
      const todayTotalLeads = data.todayStats.leads;

      // Sprawdź czy dzisiejsza data jest obecna w danych wykresu
      if (data.ebookChartData && data.ebookChartData.length > 0) {
        const lastDay = data.ebookChartData[data.ebookChartData.length - 1];
        const today = new Date();
        const formattedToday = today.toISOString().split('T')[0];
      }
    } catch (error) {
      // Obsługa błędów bez logowania do konsoli
    }
  };

  // Pobierz dane użytkownika z sessionStorage przy pierwszym renderowaniu
  useEffect(() => {
    try {
      const storedUserData = sessionStorage.getItem('userData');

      if (storedUserData) {
        const parsedUserData = JSON.parse(storedUserData);

        setUserData({
          id: parsedUserData.id || 'unknown',
          role: parsedUserData.role,
          cognito_sub: parsedUserData.cognito_sub || '',
          first_name: parsedUserData.first_name,
          last_name: parsedUserData.last_name,
          name: `${parsedUserData.first_name || ''} ${parsedUserData.last_name || ''}`.trim(),
          supervisor_code: parsedUserData.supervisor_code
        });
      } else {
        setError('Brak danych użytkownika w sesji');
      }
    } catch (err) {
      setError('Błąd podczas pobierania danych użytkownika');
    }
  }, []);

  // Pobierz statystyki gdy dane użytkownika są dostępne lub zmieni się zakres dat
  useEffect(() => {
    if (userData) {
      fetchStats();
    }
  }, [userData, dateRange, fetchStats]);

  // Bezpieczne pobieranie wartości z danych statystycznych
  const safeValue = (value: any) => parseInt(value) || 0;

  // Jeśli wciąż ładujemy dane użytkownika, pokaż loader
  if (!userData && isLoading) {
    return (
      <div className="flex justify-center items-center p-12">
        <Loader2 size={32} className="animate-spin text-orange-600" />
        <span className="ml-2 text-gray-600">Ładowanie danych użytkownika...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="p-4">
        <div className="flex justify-between items-center pb-3 mb-5 border-b border-gray-200">
          <div className="flex items-center">
            <p className="text-gray-700 text-lg">Statystyki</p>
          </div>
          <div className="flex space-x-2">
            <select
              className="border border-gray-300 rounded-md text-sm p-2 text-gray-600"
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              disabled={isLoading}
            >
              <option value="7days">Ostatnie 7 dni</option>
              <option value="14days">Ostatnie 14 dni</option>
              <option value="30days">Ostatnie 30 dni</option>
              <option value="all">Cały okres</option>
            </select>
          </div>
        </div>

        {/* Wyświetlanie komunikatu o błędzie, jeśli wystąpił */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 mb-6 rounded-md flex items-start">
            <AlertCircle className="mr-2 mt-0.5" size={18} />
            <div className="flex-1">
              <p>{error}</p>
              <button
                onClick={fetchStats}
                disabled={isLoading}
                className="mt-2 flex items-center text-sm text-red-600 hover:text-red-800"
              >
                <RefreshCw size={14} className="mr-1" />
                Spróbuj ponownie
              </button>
            </div>
          </div>
        )}

        {/* Stan ładowania */}
        {isLoading ? (
          <div className="flex flex-col justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-3"></div>
            <p className="text-gray-500 text-sm">Pobieranie danych statystycznych...</p>
          </div>
        ) : statsData ? (
          <>
            {/* Karty podsumowujące */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
              {/* Wszystkie */}
              <div className="bg-orange-50 text-orange-700 rounded-xl shadow-sm p-4 border border-orange-100">
                <div className="flex items-center mb-2">
                  <BarChart3 size={18} className="text-orange-500 mr-2" />
                  <h3 className="font-medium text-orange-700">Wejścia</h3>
                </div>
                <p className="text-3xl font-semibold">{safeValue(statsData.totalStats.visits)}</p>
              </div>

              {/* Leady */}
              <div className="bg-violet-50 text-violet-700 rounded-xl shadow-sm p-4 border border-violet-100">
                <div className="flex items-center mb-2">
                  <UserPlus size={18} className="text-violet-500 mr-2" />
                  <h3 className="font-medium text-violet-700">Leady</h3>
                </div>
                <p className="text-3xl font-semibold">{safeValue(statsData.totalStats.leads)}</p>
              </div>

              {/* Konwersja */}
              <div className="bg-indigo-50 text-indigo-700 rounded-xl shadow-sm p-4 border border-indigo-100">
                <div className="flex items-center mb-2">
                  <TrendingUp size={18} className="text-indigo-500 mr-2" />
                  <h3 className="font-medium text-indigo-700">Konwersja</h3>
                </div>
                <p className="text-3xl font-semibold">{statsData.totalStats.conversion || 0}%</p>
              </div>

              {/* Dzisiaj */}
              <div className="bg-sky-50 text-sky-700 rounded-xl shadow-sm p-4 border border-sky-100">
                <div className="flex items-center mb-2">
                  <Calendar size={18} className="text-sky-500 mr-2" />
                  <h3 className="font-medium text-sky-700">Dziś</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-sky-50 p-2 rounded-lg border border-sky-200">
                    <p className="text-xl font-semibold text-green-600">
                      {safeValue(statsData.todayStats.newPages)}
                    </p>
                    <p className="text-green-600 text-xs">strony</p>
                  </div>
                  <div className="bg-sky-50 p-2 rounded-lg border border-sky-200">
                    <p className="text-xl font-semibold text-violet-600">
                      {safeValue(statsData.todayStats.leads)}
                    </p>
                    <p className="text-violet-600 text-xs">leady</p>
                  </div>
                </div>
              </div>

              {/* Wczoraj */}
              <div className="bg-gray-50 text-gray-700 rounded-xl shadow-sm p-4 border border-gray-100">
                <div className="flex items-center mb-2">
                  <Clock size={18} className="text-gray-500 mr-2" />
                  <h3 className="font-medium text-gray-700">Wczoraj</h3>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <p className="text-xl font-semibold text-green-600">
                      {safeValue(statsData.yesterdayStats.newPages)}
                    </p>
                    <p className="text-green-600 text-xs">strony</p>
                  </div>
                  <div className="bg-gray-50 p-2 rounded-lg border border-gray-200">
                    <p className="text-xl font-semibold text-violet-600">
                      {safeValue(statsData.yesterdayStats.leads)}
                    </p>
                    <p className="text-violet-600 text-xs">leady</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Wykresy statystyk - przekazujemy też dateRange */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Wykres dla e-booków */}
              <StatisticsChart
                title="Statystyki stron e-book"
                chartData={statsData.ebookChartData}
                leadColor="#8B5CF6" // Fioletowy dla leadów e-book
                pageColor="#10B981" // Zielony dla nowych stron
                leadCount={safeValue(statsData.ebookStats.leads)}
                newPagesCount={statsData.ebookChartData.reduce((sum, item) => sum + item.newPages, 0)}
                dateRange={dateRange} // Przekazujemy wybrany zakres dat
              />

              {/* Wykres dla stron sprzedażowych */}
              <StatisticsChart
                title="Statystyki stron sprzedażowych"
                chartData={statsData.salesChartData}
                leadColor="#D97706" // Pomarańczowy dla leadów sprzedażowych
                pageColor="#10B981" // Zielony dla nowych stron
                leadCount={safeValue(statsData.salesStats.leads)}
                newPagesCount={statsData.salesChartData.reduce((sum, item) => sum + item.newPages, 0)}
                dateRange={dateRange} // Przekazujemy wybrany zakres dat
              />
            </div>

            {/* Najlepsze strony */}
            <div className="grid grid-cols-1 gap-6">
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-5">
                <h3 className="text-md font-medium text-gray-800 mb-4">Najlepsze strony</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Strona
                        </th>
                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Autor
                        </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Wejścia
                        </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Leady
                        </th>
                        <th scope="col" className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Konwersja
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {statsData.topPages && statsData.topPages.length > 0 ? (
                        statsData.topPages.map((page) => (
                          <tr key={page.id} className="hover:bg-gray-50">
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center">
                                <div>
                                  <div className="text-sm font-medium text-gray-900">{page.title}</div>
                                  <span className={`text-xs px-2 py-1 rounded-full
                                    ${page.type === 'ebook'
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : 'bg-purple-100 text-purple-800'}`}>
                                    {page.type}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-700">{page.author}</div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-blue-600 font-medium">{safeValue(page.visits)}</div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className="text-sm text-purple-600 font-medium">{safeValue(page.leads)}</div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-center">
                              <div className={`text-sm font-medium ${
                                page.conversion > 15 ? 'text-green-600' :
                                page.conversion > 10 ? 'text-blue-600' : 'text-gray-900'
                              }`}>
                                {page.conversion || 0}%
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="px-3 py-4 text-center text-gray-500">
                            Brak danych o najlepszych stronach.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <AlertCircle size={32} className="text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Brak danych statystycznych</p>
            <p className="text-gray-400 text-sm mt-2">Spróbuj innego zakresu dat lub odśwież stronę</p>
            <button
              onClick={fetchStats}
              className="mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md flex items-center text-sm"
            >
              <RefreshCw size={14} className="mr-2" />
              Odśwież dane
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatisticsView;