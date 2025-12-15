"use client"

import dynamic from 'next/dynamic';
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";
import { Suspense } from 'react'; // Dodaj ten import

// Dynamiczny import z wyłączonym SSR
const EbookGenerator = dynamic(() => import('@/components/views/EbookGenerator'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center p-12">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
      <span className="ml-2 text-gray-600">Ładowanie generatora e-booków...</span>
    </div>
  )
});

// Wyodrębniony komponent zawartości
function EbookContent() {
  return (
    <RoleBasedGuard allowedRoles={['ADMIN', 'USER', 'GOD']}>
      <EbookGenerator />
    </RoleBasedGuard>
  );
}

// Uwaga: usunięto export metadata, ponieważ nie działa z "use client"
export default function EbookPage() {
  return (
    <Suspense fallback={
      <div className="flex justify-center items-center p-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
        <span className="ml-2 text-gray-600">Ładowanie generatora e-booków...</span>
      </div>
    }>
      <EbookContent />
    </Suspense>
  );
}