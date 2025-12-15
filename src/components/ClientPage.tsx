// src/components/ClientPage.tsx
'use client'

import dynamic from 'next/dynamic';

const AdminLayout = dynamic(() => import('@/components/layout/AdminLayout'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-screen">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-600"></div>
      <span className="ml-2 text-gray-600">Ładowanie panelu administracyjnego...</span>
    </div>
  )
});

export default function ClientPage() {
  return (
    <AdminLayout>
      <div>
        <h1 className="text-2xl font-bold mb-4">Strona główna</h1>
        <p>Witaj w aplikacji. To jest przykładowa zawartość.</p>
      </div>
    </AdminLayout>
  );
}