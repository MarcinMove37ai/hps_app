"use client"

import { Suspense } from "react"; // Dodaj import
import dynamic from 'next/dynamic';
import RoleBasedGuard from "@/components/auth/RoleBasedGuard";

// Zachowujemy dynamiczny import
const O3GPTView = dynamic(() => import('../../../components/views/o3gpt'), {
  ssr: false,
  loading: () => null // Bez ekranu ładowania
});

export default function O3GPTPage() {
  return (
    <RoleBasedGuard
      allowedRoles={['USER', 'ADMIN', 'GOD']}
      requireActiveStatus={false} // Kluczowe: pozwala użytkownikom pending na dostęp
    >
      <Suspense fallback={<div>Ładowanie...</div>}>
        <O3GPTView />
      </Suspense>
    </RoleBasedGuard>
  );
}