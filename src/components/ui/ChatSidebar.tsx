"use client";
import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Trash2, MessageCircle, Loader2, MessageSquarePlus } from 'lucide-react';

// Definiowanie typu dla źródeł zamiast any
interface Source {
  id: string | number;
  title?: string;
  url?: string;
  content?: string;
  // dodatkowe pola w zależności od struktury źródeł
}

interface ChatHistoryItem {
  id: number;
  title: string;
  date: string;
  messages: Array<{
    type: 'user' | 'assistant';
    content: string;
  }>;
  sources: Array<Source>;
}

interface ChatSidebarProps {
  onNewChat?: () => void;
  onSelectChat?: (chatId: number) => void;
  onDeleteChat?: (chatId: number) => void;
  isMobile?: boolean;
  isOpen?: boolean;
  isGenerating?: boolean;
  currentChat?: {
    id: number | null;
    title?: string;
    startTime: string;
    messages: Array<{
      type: 'user' | 'assistant';
      content: string;
    }>;
    isInitialized: boolean;
  } | null;
  chatHistory?: ChatHistoryItem[];
  paddingTop?: string;
  height?: string;
  collapsedWidth?: string;
  expandedWidth?: string;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isMobile = false,
  isOpen = false,
  isGenerating = false,
  currentChat = null,
  chatHistory = [],
  paddingTop = '85px',
  height = '72%',
  collapsedWidth = '4rem',
  expandedWidth = '26rem'
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    console.log("ChatSidebar - isHovered:", isHovered);
    console.log("ChatSidebar - isMobile:", isMobile);
    console.log("ChatSidebar - isOpen:", isOpen);
  }, [isHovered, isMobile, isOpen]);

  useEffect(() => {
    console.log("ChatSidebar render - paddingTop:", paddingTop, "height:", height);
    console.log("ChatSidebar render - currentChat:", currentChat);
    console.log("ChatSidebar render - chatHistory:", chatHistory);
  }, [currentChat, chatHistory, paddingTop, height]);

  const previousActiveChat = chatHistory[0];

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      date: date.toLocaleDateString('pl-PL'),
      time: date.toLocaleTimeString('pl-PL', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  const isSidebarExpanded = isMobile ? isOpen : isHovered;

  const handleMouseEnter = () => {
    if (!isMobile) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsHovered(true);
      console.log("MouseEnter detected, setting isHovered to true");
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      timeoutRef.current = setTimeout(() => {
        setIsHovered(false);
        console.log("MouseLeave detected with delay, setting isHovered to false");
      }, 100);
    }
  };

  const containerStyle = {
    paddingTop: paddingTop,
    height: height,
    position: 'absolute' as const,
    top: '0',
    left: '0',
    zIndex: 50,
    width: expandedWidth,
    transform: isMobile
      ? (isOpen ? 'translateX(0)' : 'translateX(-100%)')
      : (isSidebarExpanded ? 'translateX(0)' : `translateX(calc(-100% + ${collapsedWidth}))`),
    transition: 'transform 300ms ease',
    overflow: 'hidden'
  };

  const renderChatTile = (chat: {
    id: number | null;
    title?: string;
    date?: string;
    startTime?: string;
    messages: Array<{
      type: 'user' | 'assistant';
      content: string;
    }>;
    isInitialized?: boolean;
  }, isCurrent = false) => {
    const isDeleting = deletingId === chat.id;
    const dateTime = formatDateTime(chat.startTime || chat.date || new Date().toISOString());
    const hasUserMessages = chat.messages?.some(msg => msg.type === 'user') ?? false;

    const isFirstTile = isCurrent;
    const hasOtherActiveChats = chatHistory.some(historyChat =>
      historyChat.messages.some(msg => msg.type === 'user')
    );

    const shouldBeHighlighted = (
      (isCurrent && hasUserMessages) ||
      (!isCurrent && chat.id === previousActiveChat?.id && currentChat?.id === null)
    );

    const canBeClicked = !shouldBeHighlighted && !isFirstTile && hasUserMessages;

    const canBeDeleted = hasUserMessages && (
      (shouldBeHighlighted && !hasOtherActiveChats) ||
      (!shouldBeHighlighted && !isFirstTile)
    );

    if (!hasUserMessages && !isCurrent) {
      return null;
    }

    const tileClasses = `
      relative w-full p-3 rounded-xl border transition-all duration-200
      ${isDeleting ? 'translate-x-[-100%] opacity-0 h-0 p-0 my-0 border-0' : ''}
      ${shouldBeHighlighted
        ? 'bg-blue-50/70 border-blue-100'
        : 'bg-white border-gray-100'
      }
      ${canBeClicked
        ? 'hover:bg-gray-50/80 hover:border-gray-200 hover:shadow-sm'
        : ''
      }
      ${!isFirstTile && canBeClicked
        ? 'cursor-pointer'
        : canBeDeleted ? 'cursor-pointer' : 'cursor-default'
      }
    `;

    return (
      <div key={chat.id ?? `no-id-${Math.random()}`} className={tileClasses}>
        <div
          onClick={() => canBeClicked && chat.id !== null && onSelectChat?.(chat.id)}
          className="flex items-center w-full"
        >
          {/* Always render text content - will overflow in collapsed state */}
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center gap-2 min-w-0">
              {isGenerating && isCurrent ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500 flex-shrink-0" />
                  <span className="text-blue-900 truncate">Generowanie tytułu...</span>
                </>
              ) : (
                <span className={`text-sm font-medium truncate block ${
                  shouldBeHighlighted ? 'text-blue-900' : 'text-gray-800'
                }`}>
                  {chat.title || `Czat ${chat.id || 'nowy'}`}
                </span>
              )}
            </div>
            <div className={`text-xs mt-1 truncate ${
              shouldBeHighlighted ? 'text-blue-500/60' : 'text-gray-500'
            }`}>
              {dateTime.date} • {dateTime.time}
            </div>
          </div>

          {/* Only show MessageCircle when sidebar is collapsed */}
          {!isSidebarExpanded && (
            <MessageCircle
              className={`flex-shrink-0 w-4 h-4 ml-auto ${
                shouldBeHighlighted
                  ? 'text-blue-400'
                  : 'text-gray-400'
              }`}
            />
          )}
        </div>

        {/* Delete button - only show when sidebar is expanded */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          {isSidebarExpanded && canBeDeleted && (
            <button
              onClick={() => {
                console.log("Kliknięto usunięcie czatu:", chat.id);
                setDeletingId(chat.id);
                if (chat.id !== null && onDeleteChat) {
                  onDeleteChat(chat.id);
                }
                setDeletingId(null);
              }}
              className={`p-2 rounded-lg transition-colors group cursor-pointer ${
                shouldBeHighlighted
                  ? 'hover:bg-blue-100/80'
                  : 'hover:bg-red-50'
              }`}
            >
              <Trash2 className={`w-4 h-4 ${
                shouldBeHighlighted
                  ? 'text-blue-400 group-hover:text-blue-500'
                  : 'text-gray-400 group-hover:text-red-500'
              }`} />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="overflow-hidden transition-all duration-300"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={containerStyle}
    >
      <div
        style={{
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          borderTopRightRadius: '0.75rem',
          borderBottomRightRadius: '0.75rem',
          width: '100%',
          boxShadow: '0 4px 30px rgba(0, 0, 0, 0.1)'
        }}
      >
        <Card className="bg-white/85 backdrop-blur-md shadow-lg overflow-hidden h-full transition-all duration-300">
          <div className="p-4 flex flex-col gap-4 h-full overflow-hidden">
            <div className="flex-shrink-0">
              <button
                onClick={() => {
                  console.log("Kliknięto przycisk Nowy Czat");
                  if (onNewChat) {
                    onNewChat();
                  }
                }}
                className="w-full p-3 bg-blue-900 text-white rounded-xl flex items-center justify-between hover:bg-blue-800 transition-colors group cursor-pointer"
              >
                {/* Always render text, will overflow in collapsed state */}
                <span className="flex-1 text-left pl-2 overflow-hidden whitespace-nowrap">
                  Nowy chat
                </span>
                {/* Always keep icon visible on the right */}
                <MessageSquarePlus className="flex-shrink-0 w-5 h-5 ml-2 group-hover:rotate-12 transition-transform" />
              </button>
            </div>

            <div className="w-full h-px bg-gray-200 flex-shrink-0" />

            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-2">
                {currentChat && renderChatTile(currentChat, true)}
                {chatHistory?.map((chat) => renderChatTile(chat))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ChatSidebar;