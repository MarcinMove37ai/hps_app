"use client";
import React, { useEffect, useCallback } from 'react';
import Anthropic from '@anthropic-ai/sdk';

interface ChatTitleGeneratorProps {
  firstMessage: string | null;  // Pierwsze pytanie w czacie
  chatId: number | null;        // ID czatu
  onTitleGenerated: (chatId: number, title: string) => void;  // Callback do aktualizacji tytułu
}

const ChatTitleGenerator: React.FC<ChatTitleGeneratorProps> = ({
  firstMessage,
  chatId,
  onTitleGenerated
}) => {
  // Usunięto nieużywaną zmienną isGenerating

  // Wykorzystanie useCallback, by uniknąć zbyt częstych regeneracji
  // przy zmianie onTitleGenerated
  const generateTitle = useCallback(async () => {
    if (!firstMessage || !chatId) return;

    try {
      const anthropic = new Anthropic({
        apiKey: process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY || '',
        dangerouslyAllowBrowser: true
      });

      const response = await anthropic.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 15,
        temperature: 0.7,
        system: "Jesteś pomocnikiem specjalizującym się w generowaniu krótkich, 1-2 wyrazowych nazw dla czatów na podstawie pierwszego pytania użytkownika.",
        messages: [
          {
            role: 'user',
            content: `Nazwij krótko (1-3 słów)schorzenie albo zagadnienie którego dotyczy pytanie, urzywaj języka polskiego bez słowa OMEGA i zdrowie, nie używaj znaków specjalnych i przestanokwych: "${firstMessage}".`
          }
        ]
      });

      // Sprawdzamy typ zawartości, ponieważ response.content może zawierać różne typy bloków
      let title: string;
      if (response.content && response.content.length > 0) {
        const contentBlock = response.content[0];
        if ('text' in contentBlock) {
          title = contentBlock.text.trim();
        } else {
          // Fallback jeśli blok nie zawiera tekstu (np. jest to ToolUseBlock)
          title = `Czat ${new Date().toLocaleTimeString('pl-PL')}`;
        }
      } else {
        title = `Czat ${new Date().toLocaleTimeString('pl-PL')}`;
      }

      console.log('Generated title:', title);
      onTitleGenerated(chatId, title);
    } catch (error) {
      console.error('Error generating chat title:', error);
      const fallbackTitle = `Czat ${new Date().toLocaleTimeString('pl-PL')}`;
      onTitleGenerated(chatId, fallbackTitle);
    }
  }, [firstMessage, chatId, onTitleGenerated]);

  useEffect(() => {
    if (!firstMessage || !chatId) return;

    const timeoutId = setTimeout(() => {
      console.log('Debounced title generation for message:', firstMessage);
      generateTitle();
    }, 300); // Debouncing na 300ms

    return () => clearTimeout(timeoutId); // Wyczyść timeout przy każdej zmianie
  }, [firstMessage, chatId, generateTitle]); // Dodane brakujące zależności

  // Komponent nie renderuje UI
  return null;
};

export default ChatTitleGenerator;