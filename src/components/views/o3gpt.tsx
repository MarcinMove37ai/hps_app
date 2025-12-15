"use client";

import React, { useState, useEffect, useRef } from 'react';
import MedicalChatbot from '../MedicalChatbot';
import ChatSidebar from '../ui/ChatSidebar';  // Importuj poprawiony ChatSidebar
import SearchControls from '../ui/SearchControls';
import { useIsMobile } from '@/hooks/useIsMobile';
import ChatTitleGenerator from '@/components/ui/ChatTitleGenerator';
import type { Source } from '@/types';

// Types from MedicalChatbot needed for state management
interface Message {
  type: 'user' | 'assistant';
  content: string;
  timestamp?: number;
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

// Unified configuration for both sidebars
// Using fixed height in pixels instead of percentage to ensure consistency
const SIDEBAR_CONFIG = {
  paddingTop: "80px",
  height: "calc(100vh - 300px)",  // Używanie calc() zamiast procentów dla spójności
  collapsedWidth: "4rem",
  expandedWidth: "16rem"
};

// Define the maximum width for the content area
const CONTENT_MAX_WIDTH = "1000px";

const O3gptView = () => {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // State controlling the visibility of the search panel
  const [isSearchControlsVisible, setIsSearchControlsVisible] = useState(false);

  // States for SearchControls
  const [searchType, setSearchType] = useState<'semantic' | 'statistical' | 'hybrid'>('semantic');
  const [topK, setTopK] = useState(20);
  const [queryMode, setQueryMode] = useState<'last' | 'all'>('all');
  const [alpha, setAlpha] = useState<number>(0.65);

  // MOVED from MedicalChatbot states for chat management
  const [messages, setMessages] = useState<Message[]>([]);
  // Usunięto nieużywaną zmienną inputValue
  const [currentChat, setCurrentChat] = useState<{
    id: number | null;
    title?: string;
    startTime: string;
    messages: Array<{
      type: 'user' | 'assistant';
      content: string;
    }>;
    sources: Source[];
    isInitialized: boolean;
  } | null>(null);

  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [pendingTitle, setPendingTitle] = useState<{
    chatId: number;
    firstMessage: string;
  } | null>(null);
  const [sources, setSources] = useState<Source[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  // DODANE: Debug widoczności i stanów komponentów
  useEffect(() => {
    console.log("O3gptView - Menu state:", isMenuOpen);
    console.log("O3gptView - Is mobile:", isMobile);
  }, [isMenuOpen, isMobile]);

  // Function to toggle search controls visibility
  const toggleSearchControls = () => {
    console.log("O3gptView - Toggling search controls visibility");
    setIsSearchControlsVisible(prev => !prev);
  };

  // Logging states for debugging
  useEffect(() => {
    console.log("O3gptView - isSearchControlsVisible:", isSearchControlsVisible);
    console.log("O3gptView - sidebarConfig:", SIDEBAR_CONFIG);
  }, [isSearchControlsVisible]);

  // Function handling creation of a new chat
  const handleNewChat = () => {
    console.log("Starting creation of a new chat");

    // Save current chat to history if it exists and has messages
    if (currentChat?.messages.length && currentChat.isInitialized) {
      const chatId = currentChat.id !== null ? currentChat.id : Date.now();
      console.log("Saving current chat to history:", currentChat);
      setChatHistory(prev => [{
        id: chatId,
        title: currentChat.title || 'Nowy czat',
        date: currentChat.startTime,
        messages: currentChat.messages,
        sources: currentChat.sources || []
      }, ...prev]);
    }

    // Temporarily clear currentChat to force view reset
    setCurrentChat(null);

    // Delay creation of new chat to ensure state reset
    setTimeout(() => {
      const newChatId = Date.now();
      console.log("Creating new chat with ID:", newChatId);

      setCurrentChat({
        id: newChatId,  // using specific ID instead of null
        startTime: new Date().toISOString(),
        messages: [],
        sources: [],
        isInitialized: false
      });

      // Resetting other states
      setMessages([]);
      setSources([]);
      setHasInteracted(false);
      setPendingTitle(null);

      console.log("New chat created");

      // Closing menu on mobile
      if (isMobile) {
        setIsMenuOpen(false);
      }
    }, 0);
  };

  // Function handling chat selection from history
  const handleSelectChat = (chatId: number) => {
    console.log("Selected chat from history:", chatId);
    const selectedChat = chatHistory.find(chat => chat.id === chatId);
    if (!selectedChat) {
      console.warn("Chat not found in history:", chatId);
      return;
    }

    // If currently active chat has messages, we save it in history
    if (currentChat?.messages.length && currentChat.messages.some(msg => msg.type === 'user')) {
      // Avoid duplication - remove selected chat from history before adding current
      console.log("Saving current chat to history before switching");
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

    // Set selected chat as active
    console.log("Setting selected chat as active:", selectedChat.id);
    setCurrentChat({
      id: selectedChat.id,
      title: selectedChat.title,
      startTime: selectedChat.date,
      messages: selectedChat.messages,
      sources: selectedChat.sources || [],
      isInitialized: true
    });

    // Update other states
    setMessages(selectedChat.messages.map(msg => ({
      type: msg.type,
      content: msg.content,
      timestamp: Date.now()
    })));
    setSources(selectedChat.sources || []);
    setHasInteracted(true);

    // Remove selected chat from history
    setChatHistory(prev => prev.filter(chat => chat.id !== selectedChat.id));

    // Close menu on mobile
    if (isMobile) {
      setIsMenuOpen(false);
    }
  };

  // Function handling chat deletion
  const handleDeleteChat = (chatId: number) => {
    console.log("Deleting chat:", chatId);
    // We can only delete a chat if it's initialized and has messages
    const isCurrentChat = currentChat?.id === chatId && currentChat.isInitialized;
    const chatToDelete = isCurrentChat ? currentChat : chatHistory.find(chat => chat.id === chatId);

    if (!chatToDelete || !chatToDelete.messages.length) {
      console.log("Cannot delete chat - no chat or messages");
      return;
    }

    // Find next chat to display
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

    // Update states
    if (isCurrentChat) {
      if (nextChat) {
        console.log("Switching to next chat:", nextChat.id);
        setCurrentChat(nextChat);
        setMessages(nextChat.messages.map(msg => ({
          type: msg.type,
          content: msg.content,
          timestamp: Date.now()
        })));
        setSources(nextChat.sources || []);
        setHasInteracted(true);
      } else {
        // If there's no next chat, create a new empty chat
        console.log("Creating new chat after deletion");
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

    // Update history regardless of whether it was the current chat
    setChatHistory(prev => prev.filter(chat => chat.id !== chatId));
    console.log("Chat deleted from history:", chatId);
  };

  // Function handling chat title generation
  const handleTitleGenerated = (chatId: number, title: string) => {
    console.log("Title generated:", title, "for chat ID:", chatId);

    setCurrentChat(prev => {
      if (!prev) {
        console.warn("handleTitleGenerated: currentChat is null!");
        return prev;
      }

      if (prev.id !== chatId) {
        console.warn(`handleTitleGenerated: ID mismatch - currentChat.id: ${prev.id}, chatId: ${chatId}`);
        return {
          ...prev,
          title: title
        };
      }

      console.log("Updating title for currentChat");
      return {
        ...prev,
        title: title
      };
    });

    // Update chat history
    setChatHistory(prev => {
      const updated = prev.map(chat =>
        chat.id === chatId
          ? { ...chat, title }
          : chat
      );
      console.log("Updated chat history:", updated);
      return updated;
    });

    setPendingTitle(null);
  };

  return (
    <div className="flex h-full w-full overflow-hidden relative" ref={containerRef}>
      {/* Chat title generator */}
      {pendingTitle && (
        <ChatTitleGenerator
          firstMessage={pendingTitle.firstMessage}
          chatId={pendingTitle.chatId}
          onTitleGenerated={handleTitleGenerated}
        />
      )}

      {/* *** POPRAWIONE: Pasek boczny jako overlay *** */}
      {/* Left part - chat sidebar */}
      <ChatSidebar
        isMobile={isMobile}
        isOpen={isMenuOpen}
        onNewChat={handleNewChat}
        onSelectChat={handleSelectChat}
        onDeleteChat={handleDeleteChat}
        currentChat={currentChat}
        chatHistory={chatHistory}
        paddingTop={SIDEBAR_CONFIG.paddingTop}
        height={SIDEBAR_CONFIG.height}
        collapsedWidth={SIDEBAR_CONFIG.collapsedWidth}
        expandedWidth={SIDEBAR_CONFIG.expandedWidth}
      />

      {/* Center part - chatbot with fixed width and center position */}
      <div
        className="w-full h-full flex justify-center"
        style={{
          transition: 'all 300ms ease'
        }}
      >
        <div className="h-full" style={{
          width: CONTENT_MAX_WIDTH,
          maxWidth: "100%"
        }}>
          <MedicalChatbot
            showSidebar={false}
            showSearchControls={false}  // Nie pokazuj wewnętrznego panelu SearchControls
            showSearchToggleButton={true}  // Nowa właściwość - pokaż przycisk przełączający
            searchType={searchType}
            setSearchType={setSearchType}
            topK={topK}
            setTopK={setTopK}
            queryMode={queryMode}
            setQueryMode={setQueryMode}
            alpha={alpha}
            setAlpha={setAlpha}
            searchControlsVisible={isSearchControlsVisible}
            setSearchControlsVisible={toggleSearchControls}  // Przekaż funkcję przełączającą
            // Pass chat management states to MedicalChatbot
            currentChat={currentChat}
            setCurrentChat={setCurrentChat}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            messages={messages}
            setMessages={setMessages}
            sources={sources}
            setSources={setSources}
            pendingTitle={pendingTitle}
            setPendingTitle={setPendingTitle}
            hasInteracted={hasInteracted}
            setHasInteracted={setHasInteracted}
            isLoading={isLoading}
            setIsLoading={setIsLoading}
            onTitleGenerated={handleTitleGenerated}
            onNewChat={handleNewChat}
            onSelectChat={handleSelectChat}
            onDeleteChat={handleDeleteChat}
          />
        </div>
      </div>

      {/* Right part - search controls */}
      {isSearchControlsVisible && (
        <div
          className="absolute right-0 top-0"
          style={{
            zIndex: 50,
            paddingTop: SIDEBAR_CONFIG.paddingTop,
            height: SIDEBAR_CONFIG.height,
            width: SIDEBAR_CONFIG.expandedWidth
          }}
        >
          <SearchControls
            searchType={searchType}
            setSearchType={setSearchType}
            topK={topK}
            setTopK={setTopK}
            queryMode={queryMode}
            setQueryMode={setQueryMode}
            alpha={alpha}
            setAlpha={setAlpha}
            width={SIDEBAR_CONFIG.expandedWidth}
          />
        </div>
      )}
    </div>
  );
};

export default O3gptView;