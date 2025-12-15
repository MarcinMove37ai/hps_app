"use client";
import React from 'react';
import ReactMarkdown from 'react-markdown';

interface FormattedMessageProps {
  content: string;
  type: 'user' | 'assistant';
}

const FormattedMessage: React.FC<FormattedMessageProps> = ({ content, type }) => {
  if (type === 'user') {
    return <div className="text-gray-800">{content}</div>;
  }

  // Zamiana wszystkich wystąpień "omega-3" lub "Omega-3" na specjalnie sformatowany tekst
  const formattedContent = content.replace(
    /([Oo]mega-3)/g,
    '**$1**'
  );

  return (
    <ReactMarkdown
      className="prose prose-blue max-w-none"
      components={{
        // Akapity
        p: ({children}) => (
          <p className="mb-3 last:mb-0 text-gray-800">{children}</p>
        ),

        // Nagłówki
        h2: ({children}) => (
          <h2 className="text-blue-800">{children}</h2>
        ),

        // Listy
        ul: ({children}) => (
          <ul className="list-disc pl-6 mb-3 space-y-1">{children}</ul>
        ),
        ol: ({children}) => (
          <ol className="list-decimal pl-6 mb-3 space-y-1">{children}</ol>
        ),
        li: ({children}) => (
          <li className="text-gray-800">{children}</li>
        ),

        // Pogrubienie
        strong: ({children}) => {
          // Specjalne formatowanie dla Omega-3
          if (typeof children === 'string' && /[Oo]mega-3/.test(children)) {
            return (
              <strong className="font-semibold text-blue-900">
                {children.charAt(0).toUpperCase() + children.slice(1)}
              </strong>
            );
          }
          // Standardowe pogrubienie dla pozostałych elementów
          return (
            <strong className="font-semibold text-gray-800">{children}</strong>
          );
        },
      }}
    >
      {formattedContent}
    </ReactMarkdown>
  );
};

export default FormattedMessage;