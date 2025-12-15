// src/app/(auth)/layout.tsx
import React from 'react';
import Image from 'next/image';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-6 sm:p-8 rounded-lg shadow">
        <div className="flex justify-center">
          <Image
            className="h-12 w-auto"
            src="/logo.png"
            alt="HealthProCRM Logo"
            width={120}
            height={48}
            priority
          />
        </div>
        {children}
      </div>
    </div>
  );
}