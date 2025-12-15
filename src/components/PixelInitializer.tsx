// src/components/PixelInitializer.tsx
'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import useFacebookPixel from '../hooks/useFacebookPixel';
import { Suspense } from 'react';

// Komponent, który używa useSearchParams
function PixelTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { trackPageView } = useFacebookPixel();

  // Śledzenie zmian ścieżki
  useEffect(() => {
    // Wywołujemy trackPageView przy każdej zmianie strony
    trackPageView();
  }, [pathname, searchParams, trackPageView]);

  return null; // Ten komponent nie renderuje żadnych elementów UI
}

// Główny komponent, który opakowuje tracker w Suspense
const PixelInitializer = () => {
  return (
    <Suspense fallback={null}>
      <PixelTracker />
    </Suspense>
  );
};

export default PixelInitializer;