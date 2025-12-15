// src/app/page.tsx
import { Suspense } from 'react';
import ClientPage from '@/components/ClientPage';

export default function Page() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <ClientPage />
    </Suspense>
  );
}