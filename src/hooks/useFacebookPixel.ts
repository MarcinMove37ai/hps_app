// src/hooks/useFacebookPixel.ts
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

// Interfejs dla danych użytkownika
interface UserData {
  email?: string;
  phone?: string;
  firstName?: string;
  lastName?: string;
  externalId?: string;
}

// Interfejs dla danych niestandardowych zdarzenia
interface CustomData {
  [key: string]: any;
}

const useFacebookPixel = () => {
  const router = useRouter();

  // Inicjalizacja pixela w przeglądarce
  useEffect(() => {
    // Nic nie robimy podczas SSR
    if (typeof window === 'undefined') return;

    // Sprawdzenie czy fbq jest już zdefiniowane
    if (!window.fbq) {
      window.fbq = function() {
        window.fbq.callMethod ?
        window.fbq.callMethod.apply(window.fbq, arguments) :
        window.fbq.queue.push(arguments);
      };
      window._fbq = window._fbq || window.fbq;
      window.fbq.push = window.fbq;
      window.fbq.loaded = true;
      window.fbq.version = '2.0';
      window.fbq.queue = [];
    }

    // Wywołanie PageView przy pierwszym załadowaniu
    trackPageView();

    // Śledzenie zmian strony
    const handleRouteChange = () => {
      trackPageView();
    };

    // Listener dla Next.js App Router
    // Uwaga: możesz potrzebować dodatkowej logiki śledzenia zmiany stron
    // ponieważ App Router działa inaczej niż Pages Router

    return () => {
      // Usunięcie listenera przy odmontowaniu
    };
  }, []);

  // Funkcja do śledzenia PageView
  const trackPageView = () => {
    if (typeof window !== 'undefined' && window.fbq) {
      window.fbq('track', 'PageView');

      // Również wysyłamy zdarzenie przez Conversions API
      sendServerEvent('PageView');
    }
  };

  // Funkcja do śledzenia zdarzeń
  const trackEvent = (eventName: string, customData?: CustomData, userData?: UserData) => {
    if (typeof window !== 'undefined' && window.fbq) {
      // Śledzenie przez Pixel
      window.fbq('track', eventName, customData);

      // Śledzenie przez Conversions API
      sendServerEvent(eventName, customData, userData);
    }
  };

  // Funkcja do wysyłania zdarzeń przez Conversions API
  const sendServerEvent = async (
    eventName: string,
    customData?: CustomData,
    userData?: UserData
  ) => {
    try {
      // Pobieramy identyfikatory z cookies
      const fbp = Cookies.get('_fbp');
      const fbc = Cookies.get('_fbc');

      const response = await fetch('/api/facebook-conversions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event_name: eventName,
          user_data: {
            client_user_agent: navigator.userAgent,
            fbp,
            fbc,
            // Pozostałe dane użytkownika powinny być zahaszowane przed przesłaniem
            ...(userData || {}),
          },
          custom_data: customData,
          event_source_url: window.location.href,
        }),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error sending server event:', error);
    }
  };

  return {
    trackPageView,
    trackEvent,
  };
};

// Deklaracja typów dla window
declare global {
  interface Window {
    fbq: any;
    _fbq: any;
  }
}

export default useFacebookPixel;