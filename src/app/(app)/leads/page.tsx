"use client"

import dynamic from 'next/dynamic';
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";

// Prosty komponent ładowania
function LoadingView() {
  return (
    <div className="flex justify-center items-center p-12">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
      <span className="ml-2 text-gray-600">Ładowanie danych...</span>
    </div>
  );
}

// Dynamiczny import z wyłączonym SSR
const LeadsView = dynamic(() => import('@/components/views/leads'), {
  ssr: false,
  loading: () => <LoadingView />
});

export default function LeadsPage() {
  return (
    <RoleBasedGuard allowedRoles={['USER', 'ADMIN', 'GOD']}>
      <LeadsView />
    </RoleBasedGuard>
  );
}