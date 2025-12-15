'use client';

import ChatTitleGenerator from '@/components/ui/ChatTitleGenerator';
import MobileNavigation from '@/components/ui/MobileNavigation';
import MobileMenuOverlay from '@/components/ui/MobileMenuOverlay';
import { useIsMobile } from '@/hooks/useIsMobile';
// Usunięte nieużywane importy: MessageCircle, MessageSquarePlus, CustomTooltip
import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import SearchControls from '@/components/ui/SearchControls';
import StudyCard from '@/components/ui/StudyCard';
import type { Source, StudyData } from '@/types';

// Usunięta lokalna definicja StudyData
import FormattedMessage from '@/components/ui/FormattedMessage';
import ChatSidebar from '@/components/ui/ChatSidebar';

interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp?: number;
  role?: string;
  originalMessage?: string;
}

interface ChatHistoryItem {
  id: number;
  title: string;
  date: string;
  messages: Array<{
    type: 'user' | 'assistant';
    content: string;
  }>;
  sources: Source[];
}

interface CurrentChatType {
  id: number | null;
  title?: string;
  startTime: string;
  messages: Array<{
    type: 'user' | 'assistant';
    content: string;
  }>;
  sources: Source[];
  isInitialized: boolean;
}

interface PendingTitleType {
  chatId: number;
  firstMessage: string;
}

interface MedicalChatbotProps {
  // Podstawowe propsy dla wyglądu i funkcjonalności
  showSidebar?: boolean;
  showSearchControls?: boolean;
  showSearchToggleButton?: boolean; // Nowa właściwość kontrolująca widoczność przycisku
  searchType?: 'semantic' | 'statistical' | 'hybrid';
  setSearchType?: (type: 'semantic' | 'statistical' | 'hybrid') => void;
  topK?: number;
  setTopK?: (value: number) => void;
  queryMode?: 'last' | 'all';
  setQueryMode?: (mode: 'last' | 'all') => void;
  alpha?: number;
  setAlpha?: (value: number) => void;
  searchControlsVisible?: boolean;
  setSearchControlsVisible?: (visible: boolean) => void; // Funkcja do przełączania panelu z zewnątrz

  // Propsy do zewnętrznego zarządzania stanem czatu
  currentChat?: CurrentChatType | null;
  setCurrentChat?: (chat: CurrentChatType | null) => void;
  chatHistory?: ChatHistoryItem[];
  setChatHistory?: (history: ChatHistoryItem[]) => void;
  messages?: Message[];
  setMessages?: (messages: Message[]) => void;
  pendingTitle?: PendingTitleType | null;
  setPendingTitle?: (title: PendingTitleType | null) => void;
  sources?: Source[];
  setSources?: (sources: Source[]) => void;
  hasInteracted?: boolean;
  setHasInteracted?: (value: boolean) => void;
  isLoading?: boolean;
  setIsLoading?: (value: boolean) => void;

  // Funktory do zarządzania czatem
  onNewChat?: () => void;
  onSelectChat?: (chatId: number) => void;
  onDeleteChat?: (chatId: number) => void;
  onTitleGenerated?: (chatId: number, title: string) => void;
}

// Typ Source jest już zaimportowany z @/types, więc nie potrzebujemy dodatkowego interfejsu

// Rozszerzamy typ funkcji aktualizacji stanu aby TypeScript nie zgłaszał błędów z funkcjami callback
type SetCurrentChatFunction = ((value: CurrentChatType | null) => void) &
  ((updater: (prev: CurrentChatType | null) => CurrentChatType | null) => void);
type SetChatHistoryFunction = ((value: ChatHistoryItem[]) => void) &
  ((updater: (prev: ChatHistoryItem[]) => ChatHistoryItem[]) => void);
type SetMessagesFunction = ((value: Message[]) => void) &
  ((updater: (prev: Message[]) => Message[]) => void);

// Usunięty nieużywany interface ChatResponse i zmienna exampleRecords

const MedicalChatbot: React.FC<MedicalChatbotProps> = ({
  // Podstawowe propsy
  showSidebar = true,
  showSearchControls = true,
  showSearchToggleButton = true, // Domyślnie pokaż przycisk
  searchType: propSearchType,
  setSearchType: propSetSearchType,
  topK: propTopK,
  setTopK: propSetTopK,
  queryMode: propQueryMode,
  setQueryMode: propSetQueryMode,
  alpha: propAlpha,
  setAlpha: propSetAlpha,
  searchControlsVisible = false,
  setSearchControlsVisible,

  // Propsy do zewnętrznego zarządzania stanem
  currentChat: externalCurrentChat,
  setCurrentChat: externalSetCurrentChat,
  chatHistory: externalChatHistory,
  setChatHistory: externalSetChatHistory,
  messages: externalMessages,
  setMessages: externalSetMessages,
  pendingTitle: externalPendingTitle,
  setPendingTitle: externalSetPendingTitle,
  sources: externalSources,
  setSources: externalSetSources,
  hasInteracted: externalHasInteracted,
  setHasInteracted: externalSetHasInteracted,
  isLoading: externalIsLoading,
  setIsLoading: externalSetIsLoading,

  // Funkcje zarządzania czatem z zewnątrz
  onNewChat: externalOnNewChat,
  onSelectChat: externalOnSelectChat,
  onDeleteChat: externalOnDeleteChat,
  onTitleGenerated: externalOnTitleGenerated
}) => {
  // Sprawdzenie, czy stan jest zarządzany zewnętrznie
  const isExternallyManaged = !!externalSetCurrentChat && !!externalSetChatHistory;
  console.log("MedicalChatbot - stan zarządzany zewnętrznie:", isExternallyManaged);

  // Lokalne stany (używane tylko, gdy stan nie jest zarządzany zewnętrznie)
  // Usunięte lub zastąpione podkreślnikiem nieużywane zmienne
  const isMobile = useIsMobile();
  const [menuOpen, setMenuOpen] = useState(false);
  const [_messages, _setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [_currentChat, _setCurrentChat] = useState<CurrentChatType | null>(null);
  const [_chatHistory, _setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [_pendingTitle, _setPendingTitle] = useState<PendingTitleType | null>(null);
  const [_isLoading, _setIsLoading] = useState(false);
  const [_sources, _setSources] = useState<Source[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<Source | null>(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);
  const [_hasInteracted, _setHasInteracted] = useState(false);
  const [isSearchControlsVisible, setIsSearchControlsVisible] = useState(searchControlsVisible);

    const ensureValidStudy = (source: Source): StudyData => {
      return {
        ...source,
        PMID: source.PMID || 'N/A',
        title: source.title || 'Brak tytułu',
        journal: source.journal || 'Brak informacji o czasopiśmie',
        domain_primary: source.domain_primary || 'Brak kategorii'
      };
    };

  // Refs dla elementów DOM
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Use props if provided, otherwise use local state
  const [searchTypeLocal, setSearchTypeLocal] = useState<'semantic' | 'statistical' | 'hybrid'>('semantic');
  const [topKLocal, setTopKLocal] = useState(20);
  const [queryModeLocal, setQueryModeLocal] = useState<'last' | 'all'>('all');
  const [alphaLocal, setAlphaLocal] = useState<number>(1);

  // Gettery dla stanów - używają zewnętrznych lub lokalnych
  const messages = externalMessages || _messages;
  const setMessages = (externalSetMessages || _setMessages) as SetMessagesFunction;
  const currentChat = externalCurrentChat || _currentChat;
  const setCurrentChat = (externalSetCurrentChat || _setCurrentChat) as SetCurrentChatFunction;
  const chatHistory = externalChatHistory || _chatHistory;
  const setChatHistory = (externalSetChatHistory || _setChatHistory) as SetChatHistoryFunction;
  const pendingTitle = externalPendingTitle || _pendingTitle;
  const setPendingTitle = externalSetPendingTitle || _setPendingTitle;
  const isLoading = externalIsLoading || _isLoading;
  const setIsLoading = externalSetIsLoading || _setIsLoading;
  const sources = externalSources || _sources;
  const setSources = externalSetSources || _setSources;
  const hasInteracted = externalHasInteracted || _hasInteracted;
  const setHasInteracted = externalSetHasInteracted || _setHasInteracted;

  // Get the actual values to use, prioritizing props
  const searchType = propSearchType !== undefined ? propSearchType : searchTypeLocal;
  const topK = propTopK !== undefined ? propTopK : topKLocal;
  const queryMode = propQueryMode !== undefined ? propQueryMode : queryModeLocal;
  const alpha = propAlpha !== undefined ? propAlpha : alphaLocal;

  // Handle setting values, forwarding to props handler if provided
  const handleSetSearchType = (value: 'semantic' | 'statistical' | 'hybrid') => {
    if (propSetSearchType) propSetSearchType(value);
    else setSearchTypeLocal(value);
  };

  const handleSetTopK = (value: number) => {
    if (propSetTopK) propSetTopK(value);
    else setTopKLocal(value);
  };

  const handleSetQueryMode = (value: 'last' | 'all') => {
    if (propSetQueryMode) propSetQueryMode(value);
    else setQueryModeLocal(value);
  };

  const handleSetAlpha = (value: number) => {
    if (propSetAlpha) propSetAlpha(value);
    else setAlphaLocal(value);
  };

  // Funkcja przełączająca widoczność panelu SearchControls
  const toggleSearchControls = () => {
    console.log("MedicalChatbot - Toggling search controls visibility");
    if (setSearchControlsVisible) {
      // Użyj zewnętrznej funkcji jeśli dostępna
      setSearchControlsVisible(!searchControlsVisible);
    } else {
      // W przeciwnym razie użyj lokalnego stanu
      setIsSearchControlsVisible(!isSearchControlsVisible);
    }
  };

  // Synchronizacja z props dla widoczności SearchControls
  useEffect(() => {
    if (searchControlsVisible !== undefined) {
      setIsSearchControlsVisible(searchControlsVisible);
    }
  }, [searchControlsVisible]);

  // Debugowanie stanu komponentu
  useEffect(() => {
    console.log("MedicalChatbot - Current chat:", currentChat);
    console.log("MedicalChatbot - Chat history:", chatHistory);
  }, [currentChat, chatHistory]);

  const handleTitleGenerated = (chatId: number, title: string) => {
    console.log("MedicalChatbot - Wygenerowano tytuł:", title, "dla czatu ID:", chatId);

    // Użyj zewnętrznej funkcji jeśli dostępna
    if (externalOnTitleGenerated) {
      externalOnTitleGenerated(chatId, title);
      return;
    }

    setCurrentChat(prev => {
      if (!prev) {
        console.warn("handleTitleGenerated: currentChat jest null!");
        return prev;
      }

      if (prev.id !== chatId) {
        console.warn(`handleTitleGenerated: Niezgodność ID - currentChat.id: ${prev.id}, chatId: ${chatId}`);
        return {
          ...prev,
          title: title
        };
      }

      console.log("Aktualizacja tytułu dla currentChat");
      return {
        ...prev,
        title: title
      };
    });

    // Aktualizacja historii czatów
    setChatHistory(prev => {
      const updated = prev.map(chat =>
        chat.id === chatId
          ? { ...chat, title }
          : chat
      );
      console.log("Zaktualizowana historia czatów:", updated);
      return updated;
    });

    setPendingTitle(null);
  };

  const handleNewChat = () => {
    console.log("MedicalChatbot - Rozpoczęcie tworzenia nowego czatu");

    // Użyj zewnętrznej funkcji jeśli dostępna
    if (externalOnNewChat) {
      externalOnNewChat();
      return;
    }

    // Zapisz aktualny czat do historii, jeśli istnieje i ma wiadomości
    if (currentChat?.messages.length && currentChat.isInitialized) {
      const chatId = currentChat.id !== null ? currentChat.id : Date.now();
      console.log("Zapisywanie aktualnego czatu do historii:", currentChat);
      setChatHistory(prev => [{
        id: chatId,
        title: currentChat.title || 'Nowy czat',
        date: currentChat.startTime,
        messages: currentChat.messages,
        sources: currentChat.sources || []
      }, ...prev]);
    }

    // Tymczasowo wyczyść currentChat aby wymusić reset widoku
    setCurrentChat(null);

    // Opóźnij utworzenie nowego czatu, aby zapewnić reset stanu
    setTimeout(() => {
      const newChatId = Date.now();
      console.log("Tworzenie nowego czatu z ID:", newChatId);

      setCurrentChat({
        id: newChatId,  // używamy konkretnego ID zamiast null
        startTime: new Date().toISOString(),
        messages: [],
        sources: [],
        isInitialized: false
      });

      // Resetowanie pozostałych stanów
      setMessages([]);
      setSources([]);
      setInputValue('');
      setHasInteracted(false);
      setPendingTitle(null);

      console.log("Nowy czat utworzony");
    }, 0);
  };

  const handleDeleteChat = (chatId: number) => {
    console.log("MedicalChatbot - Usuwanie czatu:", chatId);

    // Użyj zewnętrznej funkcji jeśli dostępna
    if (externalOnDeleteChat) {
      externalOnDeleteChat(chatId);
      return;
    }

    // Możemy usunąć czat tylko jeśli jest zainicjowany i ma wiadomości
    const isCurrentChat = currentChat?.id === chatId && currentChat.isInitialized;
    const chatToDelete = isCurrentChat ? currentChat : chatHistory.find(chat => chat.id === chatId);

    if (!chatToDelete || !chatToDelete.messages.length) {
      console.log("Nie można usunąć czatu - brak czatu lub wiadomości");
      return;
    }

    // Znajdź następny czat do wyświetlenia
    let nextChat: typeof currentChat = null;
    if (isCurrentChat) {
      const remainingChats = chatHistory.filter(chat => chat.id !== chatId);
      const nextChatFromHistory = remainingChats[0];

      if (nextChatFromHistory) {
        nextChat = {
          id: nextChatFromHistory.id,
          title: nextChatFromHistory.title,
          startTime: nextChatFromHistory.date,
          messages: nextChatFromHistory.messages,
          sources: nextChatFromHistory.sources || [],
          isInitialized: true
        };
      }
    }

    // Aktualizuj stany
    if (isCurrentChat) {
      if (nextChat) {
        console.log("Przełączanie na następny czat:", nextChat.id);
        setCurrentChat(nextChat);
        setMessages(nextChat.messages.map(msg => ({
          type: msg.type,
          role: msg.type,
          content: msg.content,
          timestamp: Date.now()
        })));
        setSources(nextChat.sources || []);
        setHasInteracted(true);
      } else {
        // Jeśli nie ma następnego czatu, stwórz nowy, pusty czat
        console.log("Tworzenie nowego czatu po usunięciu");
        const newChatId = Date.now();
        setCurrentChat({
          id: newChatId,
          startTime: new Date().toISOString(),
          messages: [],
          sources: [],
          isInitialized: false
        });
        setMessages([]);
        setSources([]);
        setHasInteracted(false);
      }
    }

    // Aktualizujemy historię niezależnie od tego, czy to był bieżący czat
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    console.log("Czat usunięty z historii:", chatId);
  };

  // Usunięte nieużywane funkcje updateChatTitle i createNewChatSession

  interface TableColumn {
    key: string;
    label: string;
    width: string;
    format: (value: string | number | undefined, index: number) => string | number;
    showOnMobile: boolean;
  }

  const columns: TableColumn[] = [
    {
      key: 'index',
      label: 'Lp.',
      width: isMobile ? '40px' : '60px',
      format: (_: string | number | undefined, index: number) => (index + 1),
      showOnMobile: true
    },
    {
      key: 'PMID',
      label: 'PMID',
      width: '100px',
      format: (value: string | number | undefined) => value?.toString() || 'N/A',
      showOnMobile: false
    },
    {
      key: 'domain_primary',
      label: 'Dziedzina',
      width: '120px',
      format: (value: string | number | undefined) => value?.toString() || 'N/A',
      showOnMobile: false
    },
    {
      key: 'title',
      label: 'Tytuł',
      width: isMobile ? 'calc(100% - 40px)' : '400px',
      format: (value: string | number | undefined) => value?.toString() || 'N/A',
      showOnMobile: true
    },
  ];

  useEffect(() => {
    const scrollArea = scrollAreaRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollArea) return;

    // Obserwator zmian w zawartości
    const resizeObserver = new ResizeObserver(() => {
      // Kod checkScrollability usunięty, ponieważ zmienna showBanner nie jest używana
    });

    resizeObserver.observe(scrollArea);

    // Obsługa scrollowania
    const handleScroll = () => {
      // Kod checkScrollability usunięty, ponieważ zmienna showBanner nie jest używana
    };

    scrollArea.addEventListener('scroll', handleScroll);

    // Automatyczne przewijanie tylko po zmianie messages
    if (messages.length > 0) {
      scrollArea.scrollTop = scrollArea.scrollHeight;
    }

    return () => {
      scrollArea.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [messages]); // Efekt reaguje na zmiany messages

  useEffect(() => {
    console.log('Is mobile:', isMobile);
  }, [isMobile]);

  const prepareConversationHistory = (messages: Message[]) => {
    return messages.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content,
      type: msg.type
    }));
  };

  const handleSelectChat = (chatId: number) => {
    console.log("MedicalChatbot - Wybrano czat z historii:", chatId);

    // Użyj zewnętrznej funkcji jeśli dostępna
    if (externalOnSelectChat) {
      externalOnSelectChat(chatId);
      return;
    }

    const selectedChat = chatHistory.find(chat => chat.id === chatId);
    if (!selectedChat) {
      console.warn("Nie znaleziono czatu w historii:", chatId);
      return;
    }

    // Jeśli obecnie aktywny czat ma wiadomości, zachowujemy go w historii
    if (currentChat?.messages.length && currentChat.messages.some(msg => msg.type === 'user')) {
      // Unikamy duplikacji - usuwamy wybrany czat z historii przed dodaniem aktualnego
      console.log("Zapisywanie aktualnego czatu do historii przed przełączeniem");
      setChatHistory(prev => [
        {
          id: currentChat.id !== null ? currentChat.id : Date.now(),
          title: currentChat.title || `Czat ${prev.length + 1}`,
          date: currentChat.startTime,
          messages: currentChat.messages,
          sources: currentChat.sources || []
        },
        ...prev.filter(chat => chat.id !== selectedChat.id)
      ]);
    }

    // Ustawiamy wybrany czat jako aktywny
    console.log("Ustawianie wybranego czatu jako aktywny:", selectedChat.id);
    setCurrentChat({
      id: selectedChat.id,
      title: selectedChat.title,
      startTime: selectedChat.date,
      messages: selectedChat.messages,
      sources: selectedChat.sources || [],
      isInitialized: true
    });

    // Aktualizujemy pozostałe stany
    setMessages(selectedChat.messages.map(msg => ({
      type: msg.type,
      role: msg.type,
      content: msg.content,
      timestamp: Date.now()
    })));
    setSources(selectedChat.sources || []);
    setHasInteracted(true);

    // Usuwamy wybrany czat z historii
    setChatHistory(prev => prev.filter(chat => chat.id !== selectedChat.id));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Inicjalizacja nowego czatu przy pierwszym pytaniu
    if (!currentChat?.isInitialized) {
      const newChatId = Date.now();
      console.log("Inicjalizacja nowego czatu przy pierwszym pytaniu, ID:", newChatId);

      const newChat = {
        id: newChatId,
        startTime: new Date().toISOString(),
        messages: [],
        sources: [],
        isInitialized: true
      };
      setCurrentChat(newChat);
      setPendingTitle({
        chatId: newChatId,
        firstMessage: inputValue.trim()
      });
    }

    const chatId = currentChat?.id || Date.now();
    setIsLoading(true);
    setHasInteracted(true);

    const newMessage = {
      type: 'user' as const,
      role: 'user' as const,
      content: inputValue.trim(),
      originalMessage: inputValue.trim(),
      timestamp: Date.now()
    };

    // Aktualizuj wiadomości w stanie
    setMessages(prev => [...prev, newMessage]);
    setCurrentChat(prev => prev ? {
      ...prev,
      id: prev.id || chatId,  // Używamy istniejącego ID lub nowego
      isInitialized: true,
      messages: [...prev.messages, {
        type: 'user',
        content: inputValue.trim()
      }]
    } : {
      id: chatId,
      startTime: new Date().toISOString(),
      messages: [{
        type: 'user',
        content: inputValue.trim()
      }],
      sources: [],
      isInitialized: true
    });

    setInputValue('');

    try {
      const requestBody = {
        message: inputValue.trim(),
        conversationHistory: prepareConversationHistory(messages),
        searchParams: {
          search_type: searchType,
          query_mode: queryMode,
          top_k: topK,
          alpha: searchType === 'hybrid' ? alpha : undefined
        }
      };

      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || '';
      console.log('Sending request to:', `${baseUrl}/api/chat`);
      console.log('Request body:', requestBody);

      const response = await fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      let errorMessage = 'Wystąpił błąd podczas przetwarzania zapytania.';

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Server response:', {
          status: response.status,
          statusText: response.statusText,
          error: errorData
        });

        errorMessage = errorData.error || `Błąd serwera (${response.status})`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Server response data:', data);

      if (data.error) {
        throw new Error(data.error);
      }

      // Aktualizuj źródła i wiadomości tylko jeśli otrzymano poprawną odpowiedź
      setSources(data.sources || []);
      setMessages(prev => [...prev, {
        type: 'assistant',
        role: 'assistant',
        content: data.response,
        timestamp: Date.now()
      }]);

      setCurrentChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, {
          type: 'assistant',
          content: data.response
        }],
        sources: data.sources || prev.sources
      } : null);

    } catch (error) {
      console.error('Error in handleSendMessage:', error);

      // Dodaj wiadomość o błędzie do czatu
      const errorResponse = {
        type: 'assistant' as const,
        role: 'assistant' as const,
        content: error instanceof Error ? error.message : 'Wystąpił nieoczekiwany błąd.',
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, errorResponse]);
      setCurrentChat(prev => prev ? {
        ...prev,
        messages: [...prev.messages, {
          type: 'assistant',
          content: errorResponse.content
        }]
      } : null);

    } finally {
      setIsLoading(false);
    }
  };

  // Funkcja zapewniająca bezpieczne przekazanie props do komponentów zewnętrznych
  // aby uniknąć konfliktów typów w ChatSidebar i MobileMenuOverlay
  const makeSafeProps = <T,>(obj: T): T => {
    return obj;
  };

  return (
    <div className="h-screen bg-white flex flex-col">
      {!isExternallyManaged && pendingTitle && (
        <ChatTitleGenerator
          firstMessage={pendingTitle.firstMessage}
          chatId={pendingTitle.chatId}
          onTitleGenerated={handleTitleGenerated}
        />
      )}

      {/* ZMIANA: Renderujemy ChatSidebar tylko jeśli stan jest zarządzany lokalnie */}
      {showSidebar && !isExternallyManaged && (
        <ChatSidebar
          onNewChat={handleNewChat}
          onSelectChat={handleSelectChat}
          onDeleteChat={handleDeleteChat}
          isMobile={isMobile}
          currentChat={makeSafeProps(currentChat)}
          chatHistory={makeSafeProps(chatHistory)}
        />
      )}

      <div className="flex h-full">
        {/* Główna część aplikacji */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Nagłówek */}
          {isMobile ? (
            <MobileNavigation
              onToggleSidebar={() => setMenuOpen(!menuOpen)}
            />
          ) : (
            <div className="bg-white px-6 border-b border-gray-100 py-4 sticky top-0 z-50">
              <div className="flex justify-between items-center">
                <div
                  className="relative group cursor-pointer"
                  onClick={() => window.location.reload()}
                  onMouseEnter={(e) => {
                    const div = e.currentTarget.querySelector('div');
                    if (div) div.style.width = '105%';
                  }}
                  onMouseLeave={(e) => {
                    const div = e.currentTarget.querySelector('div');
                    if (div) div.style.width = '150%';
                  }}
                >
                  <h1 className="text-xl text-gray-800 tracking-wide">
                    <span className="font-bold">omega3</span>
                    <span className="font-light">gpt.pl</span>
                  </h1>
                  <div className="h-px bg-gray-200 mt-2 transition-all duration-300"
                    style={{ width: '150%' }}>
                  </div>
                </div>

                {/* Przycisk przełączający panel opcji - widoczny zależnie od showSearchToggleButton */}
                {!isMobile && showSearchToggleButton && (
                  <button
                    onClick={toggleSearchControls}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
                    aria-label="Ustawienia wyszukiwania"
                  >
                    <Settings className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Treść czatu */}
          <div className="flex-1 overflow-hidden" ref={scrollAreaRef}>
            <ScrollArea className="h-full">
              <div className="px-6">
                <div className={`p-2 md:p-4 ${messages.length > 0 ? 'bg-gray-50 rounded-xl' : ''}`}>
                  {messages.map((message, index) => (
                    <div
                      key={index}
                      className={`mb-4 p-3 rounded-xl w-[98%] ${
                        message.type === 'user'
                          ? 'ml-auto bg-blue-50'
                          : 'bg-white border border-gray-200 shadow-sm'
                      } ${isMobile ? 'mx-auto' : 'max-w-[80%]'}`}
                    >
                      <FormattedMessage
                        content={message.content}
                        type={message.type}
                      />
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex items-center space-x-2 text-sm text-gray-500">
                      <div className="animate-bounce">●</div>
                      <div className="animate-bounce delay-100">●</div>
                      <div className="animate-bounce delay-200">●</div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </ScrollArea>
          </div>

          {/* Stopka z inputem */}
          <footer className="w-full px-6 border-t border-gray-200">
            <div className="flex gap-3 my-6">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage(e)}
                placeholder="Zadaj lub doprecyzuj pytanie..."
                className="flex-1 p-4 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 bg-gray-50 shadow-sm text-gray-900"
              />
              <button
                onClick={handleSendMessage}
                className={`${
                  isMobile ? 'p-5' : 'px-8 py-4'
                } bg-blue-900 text-white rounded-xl hover:bg-blue-800 shadow-sm flex items-center justify-center cursor-pointer`}
              >
                <Send className="w-4 h-4" />
                {!isMobile && <span className="ml-2">Wyślij</span>}
              </button>
            </div>

            <div className="flex items-center gap-4 mb-4">
              <button
                onClick={() => setIsTableExpanded(!isTableExpanded)}
                className="bg-blue-900 hover:bg-blue-800 text-white rounded-lg w-8 h-8 flex items-center justify-center transition-colors border-2 border-blue-900 hover:border-blue-800 cursor-pointer"
              >
                {isTableExpanded ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M6 9L12 15L18 9"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <path d="M18 15L12 9L6 15"/>
                  </svg>
                )}
              </button>
              <h2 className="text-sm text-gray-400">
                {hasInteracted ? (sources.length > 0 ? 'Badania kliniczne użyte do udzielenia odpowiedzi' : 'Zadaj lub doprecyzuj pytanie aby zaktualizować listę badań') : 'Lista badań'}
              </h2>
            </div>

            <div className={`${isTableExpanded ? 'h-[420px]' : 'h-32'} rounded-xl shadow-lg bg-white transition-all duration-300`}>
              <div className="w-full h-full relative">
                <div className="sticky top-0 bg-gray-50 z-[5]">
                  <table className="w-full table-fixed">
                    <thead>
                      <tr>
                        {columns
                          .filter(column => !isMobile || column.showOnMobile)
                          .map((column) => (
                            <th
                              key={column.key}
                              style={{ width: column.width }}
                              className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                            >
                              {column.label}
                            </th>
                          ))}
                        {!isMobile && (
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                            Link
                          </th>
                        )}
                      </tr>
                    </thead>
                  </table>
                </div>
                <ScrollArea className="h-[calc(100%-36px)]">
                  <table className="w-full table-fixed">
                    <tbody className="divide-y divide-gray-200">
                      {sources.map((result, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          {columns
                            .filter(column => !isMobile || column.showOnMobile)
                            .map((column) => (
                              <td
                                key={`${index}-${column.key}`}
                                style={{ width: column.width }}
                                className={`px-4 py-2 text-sm text-gray-900 ${column.key === 'title' ? '' : 'truncate'}`}
                                onClick={column.key === 'title' ? () => setSelectedStudy(result) : undefined}
                              >
                                {column.key === 'title' ? (
                                  <span className="block truncate text-blue-600 hover:text-blue-900 cursor-pointer">
                                    {column.format(result[column.key] as string, index)}
                                  </span>
                                ) : (
                                  column.format(result[column.key] as string, index)
                                )}
                              </td>
                            ))}
                          {!isMobile && (
                            <td className="px-4 py-2 text-sm w-20">
                              <button
                                onClick={() => setSelectedStudy(result)}
                                className="text-blue-600 hover:text-blue-900 cursor-pointer"
                              >
                                Pokaż
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </ScrollArea>
              </div>
            </div>
          </footer>
        </div>

        {/* Prawy panel z opcjami wyszukiwania - tylko gdy jest widoczny i showSearchControls=true */}
        {isSearchControlsVisible && !isMobile && showSearchControls && (
          <div className="h-full sticky top-0">
            <SearchControls
              searchType={searchType}
              setSearchType={handleSetSearchType}
              topK={topK}
              setTopK={handleSetTopK}
              queryMode={queryMode}
              setQueryMode={handleSetQueryMode}
              alpha={alpha}
              setAlpha={handleSetAlpha}
            />
          </div>
        )}
      </div>

        {/* Mobile Menu - niezależnie od sposobu zarządzania stanem */}
        {isMobile && (
          <MobileMenuOverlay
            isOpen={menuOpen}
            onClose={() => setMenuOpen(false)}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
            isGenerating={pendingTitle !== null}
            currentChat={makeSafeProps(currentChat)}
            chatHistory={makeSafeProps(chatHistory)}
          />
        )}

      {/* Okno szczegółów badania */}
      {selectedStudy && (
        <StudyCard
          study={ensureValidStudy(selectedStudy)}
          onClose={() => setSelectedStudy(null)}
        />
      )}
    </div>
  );
};

export default MedicalChatbot;