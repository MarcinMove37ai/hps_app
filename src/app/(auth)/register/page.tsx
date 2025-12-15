// src/app/(auth)/register/page.tsx
import { Metadata } from 'next';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Rejestracja | HealthProCRM',
  description: 'Zarejestruj nowe konto w systemie HealthProCRM',
};

export default function RegisterPage() {
  return <RegisterForm />;
}