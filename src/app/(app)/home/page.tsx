"use client"

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";

const HomeView = dynamic(() => import('@/components/views/home'), {
  ssr: false,
  loading: () => <div>Ładowanie...</div>
});

export default function HomePage() {
  return (
    <RoleBasedGuard allowedRoles={['ADMIN', 'GOD']}>
      <Suspense fallback={<div>Ładowanie...</div>}>
        <HomeView />
      </Suspense>
    </RoleBasedGuard>
  );
}