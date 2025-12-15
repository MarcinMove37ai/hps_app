"use client"

import dynamic from 'next/dynamic';
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";

// Dynamiczny import z wyłączonym SSR
const PartnersView = dynamic(() => import('@/components/views/partners'), {
  ssr: false,
  loading: () => <div>Ładowanie...</div>
});

export default function PartnersPage() {
  return (
    <RoleBasedGuard allowedRoles={['ADMIN', 'GOD']}>
      <PartnersView />
    </RoleBasedGuard>
  );
}