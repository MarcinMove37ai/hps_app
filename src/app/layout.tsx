// src/app/layout.tsx
import './globals.css'
import type { Metadata } from 'next'
import ClientAuthProvider from '../components/providers/ClientAuthProvider'
import Script from 'next/script'
import PixelInitializer from '../components/PixelInitializer'
import { Suspense } from 'react' // Dodaj ten import

export const metadata: Metadata = {
  title: 'Admin Dashboard',
  description: 'Panel administracyjny aplikacji',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-icon.png',
    shortcut: '/favicon.ico',
    other: [
      {
        rel: 'icon',
        url: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      }
    ],
  },
  manifest: '/manifest.json',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pl">
      <head>
        {/* Meta Pixel Code */}
        <Script id="facebook-pixel" strategy="afterInteractive">
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '964071138476681');
            fbq('track', 'PageView');
          `}
        </Script>
        <noscript>
          <img
            height="1"
            width="1"
            style={{ display: 'none' }}
            src="https://www.facebook.com/tr?id=964071138476681&ev=PageView&noscript=1"
          />
        </noscript>
        {/* End Meta Pixel Code */}
      </head>
      <body>
        <ClientAuthProvider>
          {/* Komponent do obsługi śledzenia zmian stron */}
          <PixelInitializer />
          <Suspense fallback={<div>Ładowanie...</div>}>
            {children}
          </Suspense>
        </ClientAuthProvider>
      </body>
    </html>
  )
}