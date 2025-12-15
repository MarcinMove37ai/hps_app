"use client"

import dynamic from 'next/dynamic';
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";

// Dynamiczny import z wyłączonym SSR
const StatisticsView = dynamic(() => import('@/components/views/statistics'), {
  ssr: false,
  loading: () => <div>Ładowanie...</div>
});

export default function StatisticsPage() {
  return (
    <RoleBasedGuard allowedRoles={['USER', 'ADMIN', 'GOD']}>
      <StatisticsView />
    </RoleBasedGuard>
  );
}