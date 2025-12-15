// src/components/ui/EditableText.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useEditMode } from '@/contexts/EditModeContext';

/**
 * Interfejs dla komponentu EditableText
 */
interface EditableTextProps {
  fieldName: string;         // Nazwa pola w bazie danych (pagecontent_hero_headline, itp.)
  value: string;             // Obecna wartość tekstu
  tag?: 'h1' | 'h2' | 'h3' | 'p' | 'div' | 'span'; // Element HTML
  isEditMode: boolean;       // Czy tryb edycji jest aktywny
  onChange?: (fieldName: string, newValue: string) => void; // Wywołane przy zmianie tekstu
  onSave?: (fieldName: string, newValue: string) => Promise<void>; // Wywołane przy zapisie lokalnym
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;      // Tekst zastępczy gdy value jest puste
  multiline?: boolean;       // Czy tekst może być wieloliniowy
  maxLength?: number;        // Maksymalna długość tekstu
}

/**
 * Komponent EditableText - pozwala na edycję tekstów bezpośrednio na stronie
 */
const EditableText: React.FC<EditableTextProps> = ({
  fieldName,
  value,
  tag = 'p',
  isEditMode,
  onChange,
  onSave,
  className = '',
  style = {},
  placeholder = 'Kliknij, aby edytować tekst',
  multiline = false,
  maxLength = 1000
}) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const originalValue = useRef(value);

  // Sprawdź czy mamy dostęp do kontekstu
  const editContext = useEditMode();
  const hasContext = !!editContext;

  // Sprawdź czy pole ma niezapisane zmiany
  const hasUnsavedChanges = hasContext && editContext.isFieldChanged(fieldName);

  // Aktualizuj stan, gdy zmienia się value z zewnątrz
  useEffect(() => {
    setText(value);
    originalValue.current = value;
  }, [value]);

  // Efekt ustawiający focus na polu edycji
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();

      // Ustawienie kursora na końcu tekstu
      if (inputRef.current instanceof HTMLInputElement || inputRef.current instanceof HTMLTextAreaElement) {
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }
  }, [editing]);

  // Funkcja zwracająca wartość, która powinna być wyświetlana
  const getDisplayValue = () => {
    // Jeśli pole ma niezapisane zmiany w kontekście, pobierz wartość z kontekstu
    if (hasContext && hasUnsavedChanges) {
      // Pobierz zmienioną wartość z kontekstu
      const pendingValue = editContext.pendingChanges[fieldName];
      return pendingValue !== undefined ? pendingValue : text;
    }

    // W przeciwnym razie użyj lokalnej wartości
    return text;
  };

  // Walidacja tekstu
  const validateText = (value: string): string | null => {
    if (maxLength && value.length > maxLength) {
      return `Tekst nie może być dłuższy niż ${maxLength} znaków`;
    }
    return null;
  };

  // Obsługa zmiany tekstu w polu edycji
  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newValue = e.target.value;
    setText(newValue);
    setError(validateText(newValue));
  };

  // Obsługa zakończenia edycji i zapisania zmian lokalnie
  const handleFinishEditing = () => {
    // Sprawdź czy tekst jest poprawny
    const validationError = validateText(text);
    if (validationError) {
      setError(validationError);
      return;
    }

    // Zakończ edycję tylko jeśli nie ma błędów
    setEditing(false);

    // Jeśli tekst nie został zmieniony, nie rób nic więcej
    if (text === originalValue.current) {
      return;
    }

    // Aktualizuj lokalne zmiany przez context jeśli jest dostępny
    if (hasContext) {
      editContext.handleTextChange(fieldName, text);
    }
    // W przeciwnym razie używaj standardowych callbacków
    else {
      // Wywołaj callback onSave dla lokalnej aktualizacji
      if (onSave) {
        onSave(fieldName, text).catch(err => {
          console.error('Błąd podczas zapisywania:', err);
          setError('Nie udało się zapisać zmian');
        });
      }
      // Wywołaj callback onChange jeśli nie ma onSave
      else if (onChange) {
        onChange(fieldName, text);
      }
    }
  };

  // Obsługa naciśnięcia klawisza w polu edycji
  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Enter zapisuje zmiany (chyba że to textarea i nie naciśnięto Shift+Enter)
    if (e.key === 'Enter' && (!multiline || e.shiftKey)) {
      e.preventDefault();
      handleFinishEditing();
    }

    // Escape anuluje edycję
    if (e.key === 'Escape') {
      setText(originalValue.current);
      setEditing(false);
    }
  };

  // Obsługa kliknięcia poza elementem - zapisuje zmiany lokalnie
  const handleBlur = () => {
    if (editing) {
      handleFinishEditing();
    }
  };

  // Obsługa kliknięcia w element - rozpoczyna edycję
  const handleClick = () => {
    if (isEditMode && !editing) {
      setEditing(true);
    }
  };

  // Renderowanie pola edycji
  const renderEditField = () => {
    const commonProps = {
      value: text,
      onChange: handleTextChange,
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      className: `w-full px-2 py-1 rounded border ${error ? 'border-red-500' : 'border-blue-400'} outline-none focus:ring-2 focus:ring-blue-300 ${className}`,
      style: {
        ...style,
        minHeight: '2rem',
        transition: 'all 0.2s ease'
      },
      placeholder,
      maxLength: maxLength + 10 // Pozwalamy na wpisanie więcej, aby pokazać błąd walidacji
    };

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          {...commonProps}
          rows={Math.min(5, Math.max(2, (text.match(/\n/g) || []).length + 1))}
        />
      );
    }

    return (
      <input
        type="text"
        ref={inputRef as React.RefObject<HTMLInputElement>}
        {...commonProps}
      />
    );
  };

  // Renderowanie wskaźnika edycji i zmiany
  const renderEditIndicator = () => {
    if (!isEditMode || editing) return null;

    return (
      <span
        className={`absolute right-0 top-0 text-xs bg-blue-500 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity`}
        style={{ fontSize: '0.65rem' }}
      >
        Edytuj
      </span>
    );
  };

  // Renderowanie elementu w trybie edycji (ale nie aktywnym)
  if (isEditMode && !editing) {
    const Tag = tag as keyof JSX.IntrinsicElements;
    const displayValue = getDisplayValue();

    // Dodajemy wskaźnik niezapisanych zmian jeśli potrzeba
    const unsavedChangeStyle = hasUnsavedChanges
      ? { borderLeft: '3px solid #f59e0b', paddingLeft: '0.5rem' }
      : {};

    return (
      <Tag
        className={`${className} relative group cursor-pointer hover:bg-blue-50 hover:ring-1 hover:ring-blue-200 px-1 py-0.5 rounded transition-all ${hasUnsavedChanges ? 'bg-amber-50' : ''}`}
        style={{ ...style, ...unsavedChangeStyle }}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {displayValue || <span className="text-gray-400 italic">{placeholder}</span>}
        {isHovered && renderEditIndicator()}

        {/* Wskaźnik niezapisanych zmian */}
        {hasUnsavedChanges && (
          <span
            className="absolute -right-1 -top-1 w-2 h-2 bg-amber-500 rounded-full"
            title="Niezapisane zmiany"
          />
        )}
      </Tag>
    );
  }

  // Renderowanie w trybie edycji aktywnej
  if (editing) {
    return (
      <div className="relative">
        {renderEditField()}

        {/* Komunikat błędu */}
        {error && (
          <div className="text-red-500 text-xs mt-1">
            {error}
          </div>
        )}
      </div>
    );
  }

  // Renderowanie w normalnym trybie (bez edycji)
  // Jeśli pole ma niezapisane zmiany, dodajemy wskaźnik
  const Tag = tag as keyof JSX.IntrinsicElements;
  const displayValue = getDisplayValue();

  // Style dla niezapisanych zmian w trybie normalnego wyświetlania
  const unsavedChangeStyle = hasUnsavedChanges
    ? { borderLeft: '3px solid #f59e0b', paddingLeft: '0.5rem' }
    : {};

  return (
    <Tag
      className={`${className} ${hasUnsavedChanges ? 'relative' : ''}`}
      style={{ ...style, ...unsavedChangeStyle }}
    >
      {displayValue || <span className="text-gray-400 italic">{placeholder}</span>}

      {/* Wskaźnik niezapisanych zmian - widoczny również w trybie normalnym */}
      {hasUnsavedChanges && (
        <span
          className="absolute -right-1 -top-1 w-2 h-2 bg-amber-500 rounded-full"
          title="Niezapisane zmiany"
        />
      )}
    </Tag>
  );
};

export default EditableText;