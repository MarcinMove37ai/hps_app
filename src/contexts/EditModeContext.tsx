// src/contexts/EditModeContext.tsx
import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

// Rozszerzony interfejs dla kontekstu trybu edycji
interface EditModeContextType {
  isTextEditMode: boolean;                            // Czy tryb edycji tekstu jest aktywny
  pendingChanges: Record<string, string>;            // Zbiór oczekujących zmian tekstu
  pendingColorChange: string | null;                 // Oczekująca zmiana kolorystyki
  setTextEditMode: (isActive: boolean) => void;      // Przełączanie trybu edycji
  handleTextChange: (field: string, value: string) => void; // Obsługa zmiany tekstu
  handleColorChange: (color: string) => void;        // Obsługa zmiany kolorystyki
  hasPendingChanges: boolean;                        // Czy są jakieś oczekujące zmiany (tekst lub kolor)
  clearPendingChanges: () => void;                   // Czyszczenie wszystkich oczekujących zmian
  getPendingChangesCount: () => number;              // Ilość oczekujących zmian (tekst + kolor)
  getOriginalValue: (field: string) => string | undefined; // Pobieranie oryginalnej wartości pola
  getOriginalColor: () => string | undefined;        // Pobieranie oryginalnej kolorystyki
  saveAllChanges: (pageId: string, userCredentials?: {userId?: string, cognitoSub?: string}) => Promise<boolean>; // Zapisywanie wszystkich zmian
  isSaving: boolean;                                 // Czy trwa zapisywanie zmian
  saveError: string | null;                          // Błąd podczas zapisywania, jeśli wystąpił
  isFieldChanged: (fieldName: string) => boolean;    // Sprawdza czy konkretne pole ma niezapisane zmiany
  getCurrentValue: (fieldName: string) => string | undefined; // Nowa funkcja - zwraca bieżącą wartość pola z uwzględnieniem pendingChanges
}

// Inicjalizacja kontekstu z wartościami domyślnymi
const EditModeContext = createContext<EditModeContextType>({
  isTextEditMode: false,
  pendingChanges: {},
  pendingColorChange: null,
  setTextEditMode: () => {},
  handleTextChange: () => {},
  handleColorChange: () => {},
  hasPendingChanges: false,
  clearPendingChanges: () => {},
  getPendingChangesCount: () => 0,
  getOriginalValue: () => undefined,
  getOriginalColor: () => undefined,
  saveAllChanges: async () => false,
  isSaving: false,
  saveError: null,
  isFieldChanged: () => false,
  getCurrentValue: () => undefined
});

// Hook do użycia kontekstu edycji
export const useEditMode = () => useContext(EditModeContext);

interface EditModeProviderProps {
  children: ReactNode;
  initialValues?: Record<string, string>; // Początkowe wartości pól
  initialColor?: string;                  // Początkowa kolorystyka
  autoEnableEditMode?: boolean;           // Czy automatycznie włączyć tryb edycji
  onToast?: (message: {type: 'success' | 'error', text: string}) => void; // Callback dla powiadomień
}

/**
 * Provider kontekstu trybu edycji
 */
export const EditModeProvider: React.FC<EditModeProviderProps> = ({
  children,
  initialValues = {},
  initialColor,
  autoEnableEditMode = false,
  onToast
}) => {
  // Domyślnie włącz tryb edycji jeśli autoEnableEditMode jest true
  const [isTextEditMode, setTextEditMode] = useState(autoEnableEditMode);
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [pendingColorChange, setPendingColorChange] = useState<string | null>(null);
  const [originalValues, setOriginalValues] = useState<Record<string, string>>(initialValues);
  const [originalColor, setOriginalColor] = useState<string | undefined>(initialColor);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Automatycznie włączamy tryb edycji jeśli właściwość autoEnableEditMode się zmieni
  useEffect(() => {
    if (autoEnableEditMode) {
      setTextEditMode(true);
    }
  }, [autoEnableEditMode]);

  // Aktualizujemy oryginalne wartości gdy zmieniają się ich źródła
  useEffect(() => {
    setOriginalValues(initialValues);
    setOriginalColor(initialColor);
  }, [initialValues, initialColor]);

  // Obsługa zmiany tekstu - aktualizuje pendingChanges
  const handleTextChange = useCallback((field: string, value: string) => {
    // Jeśli wartość jest taka sama jak oryginalna, usuń z oczekujących zmian
    if (originalValues[field] === value) {
      setPendingChanges(prev => {
        const updated = { ...prev };
        delete updated[field];
        return updated;
      });
    } else {
      // W przeciwnym razie dodaj do oczekujących zmian
      setPendingChanges(prev => ({
        ...prev,
        [field]: value
      }));
    }
  }, [originalValues]);

  // Obsługa zmiany kolorystyki
  const handleColorChange = useCallback((color: string) => {
    // Jeśli kolor jest taki sam jak oryginalny, anuluj oczekującą zmianę
    if (color === originalColor) {
      setPendingColorChange(null);
    } else {
      // W przeciwnym razie ustaw nowy oczekujący kolor
      setPendingColorChange(color);
    }
  }, [originalColor]);

  // Sprawdzenie czy są jakieś oczekujące zmiany (tekst lub kolor)
  const hasPendingChanges = Object.keys(pendingChanges).length > 0 || pendingColorChange !== null;

  // Czyszczenie wszystkich oczekujących zmian
  const clearPendingChanges = useCallback(() => {
    setPendingChanges({});
    setPendingColorChange(null);
  }, []);

  // Ilość oczekujących zmian (tekst + kolor)
  const getPendingChangesCount = useCallback(() => {
    return Object.keys(pendingChanges).length + (pendingColorChange !== null ? 1 : 0);
  }, [pendingChanges, pendingColorChange]);

  // Pobieranie oryginalnej wartości pola
  const getOriginalValue = useCallback((field: string) => {
    return originalValues[field];
  }, [originalValues]);

  // Pobieranie aktualnej wartości pola (oryginał + pendingChanges)
  const getCurrentValue = useCallback((field: string) => {
    // Jeśli pole ma oczekującą zmianę, zwróć ją
    if (pendingChanges.hasOwnProperty(field)) {
      return pendingChanges[field];
    }
    // W przeciwnym razie zwróć oryginalną wartość
    return originalValues[field];
  }, [pendingChanges, originalValues]);

  // Pobieranie oryginalnej kolorystyki
  const getOriginalColor = useCallback(() => {
    return originalColor;
  }, [originalColor]);

  // Sprawdzanie czy dane pole ma niezapisane zmiany
  const isFieldChanged = useCallback((fieldName: string) => {
    return pendingChanges.hasOwnProperty(fieldName);
  }, [pendingChanges]);

  // Aktualizacja oryginalnych wartości po zapisie
  const updateOriginalValues = useCallback((newTextValues: Record<string, string>, newColor?: string) => {
    if (Object.keys(newTextValues).length > 0) {
      setOriginalValues(prev => ({
        ...prev,
        ...newTextValues
      }));
    }

    if (newColor !== undefined) {
      setOriginalColor(newColor);
    }
  }, []);

  // Zapisywanie wszystkich zmian do bazy danych
  const saveAllChanges = useCallback(async (
    pageId: string,
    userCredentials?: {userId?: string, cognitoSub?: string}
  ): Promise<boolean> => {
    // Jeśli nie ma żadnych zmian, nie ma co zapisywać
    if (!hasPendingChanges) return true;

    setIsSaving(true);
    setSaveError(null);

    try {
      // Przygotowanie wszystkich zmian do wysłania (tekst + kolorystyka)
      const allChanges = {
        ...pendingChanges,
        ...(pendingColorChange !== null ? { color: pendingColorChange } : {})
      };

      // Nagłówki z danymi użytkownika, jeśli są dostępne
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (userCredentials) {
        if (userCredentials.userId) headers['X-User-Id'] = userCredentials.userId;
        if (userCredentials.cognitoSub) headers['X-User-Cognito-Sub'] = userCredentials.cognitoSub;
      }

      const response = await fetch(`/api/pages/${pageId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(allChanges)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Wystąpił błąd podczas zapisywania zmian');
      }

      // Aktualizacja oryginalnych wartości po pomyślnym zapisie
      updateOriginalValues(pendingChanges, pendingColorChange || undefined);

      // Wyczyść oczekujące zmiany
      clearPendingChanges();

      // Powiadomienie o sukcesie
      if (onToast) {
        onToast({
          type: 'success',
          text: 'Zmiany zostały zapisane'
        });
      }

      return true;
    } catch (error) {
      console.error('Błąd podczas zapisywania zmian:', error);

      const errorMessage = error instanceof Error ? error.message : 'Nieznany błąd';
      setSaveError(errorMessage);

      // Powiadomienie o błędzie
      if (onToast) {
        onToast({
          type: 'error',
          text: `Nie udało się zapisać zmian: ${errorMessage}`
        });
      }

      return false;
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, pendingColorChange, hasPendingChanges, clearPendingChanges, updateOriginalValues, onToast]);

  // Wartość kontekstu
  const contextValue: EditModeContextType = {
    isTextEditMode,
    pendingChanges,
    pendingColorChange,
    setTextEditMode,
    handleTextChange,
    handleColorChange,
    hasPendingChanges,
    clearPendingChanges,
    getPendingChangesCount,
    getOriginalValue,
    getOriginalColor,
    saveAllChanges,
    isSaving,
    saveError,
    isFieldChanged,
    getCurrentValue
  };

  return (
    <EditModeContext.Provider value={contextValue}>
      {children}
    </EditModeContext.Provider>
  );
};

export default EditModeProvider;