// src/components/ui/CategorySelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, Check, X, ChevronDown, ChevronUp } from 'lucide-react';

// Interfejs dla danych kategorii
export interface CategoryData {
  id: number;
  category: string;
  short_desc: string;
}

interface CategorySelectorProps {
  value?: CategoryData | null;
  onChange: (category: CategoryData | null) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  placeholder = "Wybierz kategorię",
  className = "",
  required = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [filteredCategories, setFilteredCategories] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Pobierz dane kategorii z API
  useEffect(() => {
    const fetchCategories = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        // Dodaj nagłówki z danymi użytkownika, jeśli są dostępne w localStorage/sessionStorage
        const userData = JSON.parse(localStorage.getItem('userData') || sessionStorage.getItem('userData') || '{}');
        if (userData.id) headers['X-User-Id'] = userData.id.toString();
        if (userData.role) headers['X-User-Role'] = userData.role;
        if (userData.cognito_sub) headers['X-User-Cognito-Sub'] = userData.cognito_sub;

        const response = await fetch('/api/categories', {
          headers
        });

        if (!response.ok) {
          throw new Error(`Błąd ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        setCategories(data);
        setFilteredCategories(data);
      } catch (err) {
        console.error('Błąd podczas pobierania kategorii:', err);
        setError('Nie udało się pobrać listy kategorii. Spróbuj ponownie później.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCategories();
  }, []);

  // Filtruj kategorie na podstawie wyszukiwanej frazy
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredCategories(categories);
      return;
    }

    const lowercasedSearch = searchTerm.toLowerCase();

    const filtered = categories.filter(cat =>
      cat.category.toLowerCase().includes(lowercasedSearch) ||
      cat.short_desc.toLowerCase().includes(lowercasedSearch)
    );

    setFilteredCategories(filtered);
  }, [searchTerm, categories]);

  // Obsługa kliknięcia poza selektorem (zamknięcie dropdownu)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fokus na polu wyszukiwania po otwarciu dropdownu
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
      setFilteredCategories(categories);
    }
  };

  const handleCategorySelect = (category: CategoryData) => {
    onChange(category);
    setIsOpen(false);
  };

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  const getDisplayValue = () => {
    if (!value) return placeholder;
    return `${value.category} - ${value.short_desc}`;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Główny przycisk selektora */}
      <div
        className={`flex items-center justify-between w-full px-3 py-2 border ${
          required && !value ? 'border-red-300' : 'border-gray-300'
        } rounded-md bg-white cursor-pointer hover:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-500`}
        onClick={toggleDropdown}
      >
        <div className={`flex-1 truncate ${value ? 'text-gray-700' : 'text-gray-500'}`}>
          {getDisplayValue()}
        </div>
        <div className="flex items-center">
          {value && (
            <button
              onClick={clearSelection}
              className="p-1 mr-1 hover:bg-gray-100 rounded-full"
              title="Wyczyść wybór"
              type="button"
            >
              <X size={16} className="text-gray-500" />
            </button>
          )}
          {isOpen ? (
            <ChevronUp size={18} className="text-gray-500" />
          ) : (
            <ChevronDown size={18} className="text-gray-500" />
          )}
        </div>
      </div>

      {/* Dropdown z wyszukiwaniem i listą */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
          {/* Pole wyszukiwania - zmieniony kolor tekstu na ciemniejszy */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Szukaj kategorii..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-sky-500 text-gray-900" // Zmieniono kolor na text-gray-900 (ciemniejszy)
              />
            </div>
          </div>

          {/* Lista kategorii */}
          <div className="max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-3 text-center text-gray-500">
                <div className="animate-spin h-5 w-5 border-2 border-sky-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                Ładowanie kategorii...
              </div>
            ) : error ? (
              <div className="p-3 text-center text-red-500">
                {error}
              </div>
            ) : filteredCategories.length === 0 ? (
              <div className="p-3 text-center text-gray-500">
                Nie znaleziono kategorii pasujących do "{searchTerm}"
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div
                  key={category.id}
                  className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                    value?.id === category.id ? 'bg-sky-50' : ''
                  }`}
                  onClick={() => handleCategorySelect(category)}
                >
                  <div className="flex-1">
                    {/* Zmieniony kolor głównej nazwy kategorii na ciemniejszy */}
                    <div className="font-medium text-gray-900">{category.category}</div>
                    <div className="text-sm text-gray-500">{category.short_desc}</div>
                  </div>
                  {value?.id === category.id && (
                    <Check size={16} className="text-sky-500 ml-2" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;