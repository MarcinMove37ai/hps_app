// src/app/(auth)/login/page.tsx
import { Metadata } from 'next';
import { Suspense } from 'react';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Logowanie | HealthProCRM',
  description: 'Zaloguj się do systemu HealthProCRM',
};

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Ładowanie...</div>}>
      <LoginForm />
    </Suspense>
  );
}