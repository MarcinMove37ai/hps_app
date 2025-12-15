// src/app/(auth)/restore/page.tsx
import { Metadata } from 'next';
import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata: Metadata = {
  title: 'Reset hasła | HealthProCRM',
  description: 'Zresetuj hasło do swojego konta w systemie HealthProCRM',
};

export default function RestorePage() {
  return <ResetPasswordForm />;
}