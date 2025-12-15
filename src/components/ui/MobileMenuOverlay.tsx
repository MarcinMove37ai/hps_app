import React, { useState } from 'react';
import { X, MessageSquarePlus, Trash2, Loader2 } from 'lucide-react';

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

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onSelectChat?: (chatId: number) => void;
  onDeleteChat?: (chatId: number) => void;
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
}

const MobileMenuOverlay: React.FC<MobileMenuProps> = ({
  isOpen,
  onClose,
  onNewChat,
  onSelectChat,
  onDeleteChat,
  isGenerating = false,
  currentChat = null,
  chatHistory = [],
}) => {
  const [deletingId, setDeletingId] = useState<number | null>(null);

  if (!isOpen) return null;

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

  const previousActiveChat = chatHistory[0];

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
      <div key={chat.id} className={tileClasses}>
        <div
          onClick={() => {
            if (canBeClicked && onSelectChat && chat.id !== null) {
              onSelectChat(chat.id);
              onClose();
            }
          }}
          className="flex items-center w-full"
        >
          {/* Text content */}
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

        </div>

        {/* Delete button */}
        <div className="absolute right-1 top-1/2 -translate-y-1/2">
          {canBeDeleted && (
            <button
              onClick={() => {
                if (onDeleteChat && chat.id !== null) {
                  console.log("Kliknięto usunięcie czatu:", chat.id);
                  setDeletingId(chat.id);
                  onDeleteChat(chat.id);
                  setDeletingId(null);
                }
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
    <div className="fixed inset-0 z-50 animate-in slide-in-from-top duration-300 p-4 bg-black/20 backdrop-blur-sm">
      <div className="h-full flex flex-col bg-white/50 backdrop-blur-sm shadow-lg rounded-2xl relative">
        {/* Header z X */}
        <div className="absolute top-4 right-4">
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100/50 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 p-4 pt-16 overflow-y-auto">
          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewChat();
              onClose();
            }}
            className="w-full p-3 bg-blue-900 text-white rounded-xl flex items-center justify-between hover:bg-blue-800 transition-colors group"
          >
            <span className="flex-1 text-left pl-2">Nowy chat</span>
            <MessageSquarePlus className="flex-shrink-0 w-5 h-5 ml-2" />
          </button>

          <div className="w-full h-px bg-gray-200 my-4" />

          {/* Historia chatów */}
          <div className="space-y-2">
            {currentChat && renderChatTile(currentChat, true)}
            {chatHistory?.map((chat) => renderChatTile(chat))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileMenuOverlay;