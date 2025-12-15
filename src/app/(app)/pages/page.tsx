"use client"

import dynamic from 'next/dynamic';
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";

// Dynamiczny import z wyłączonym SSR
const PagesView = dynamic(() => import('@/components/views/pages'), {
  ssr: false,
  loading: () => <div>Ładowanie...</div>
});

export default function PagesListPage() {
  return (
    <RoleBasedGuard allowedRoles={['USER', 'ADMIN', 'GOD']}>
      <PagesView />
    </RoleBasedGuard>
  );
}