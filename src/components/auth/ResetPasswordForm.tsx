// src/components/auth/ResetPasswordForm.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const ResetPasswordForm = () => {
  const [stage, setStage] = useState<'request' | 'confirm'>('request');
  const [username, setUsername] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const { resetPassword, confirmResetPassword, loading, error, isAuthenticated } = useAuth();
  const router = useRouter();

  // Sprawdzanie czy użytkownik jest zalogowany
  useEffect(() => {
    if (isAuthenticated) {
      console.log('Użytkownik zalogowany, przekierowanie na dashboard');
      router.replace('/dashboard');
    }
  }, [isAuthenticated, router]);

  // Nie renderuj formularza jeśli użytkownik jest zalogowany
  if (isAuthenticated) {
    return null;
  }

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await resetPassword(username)) {
      setStage('confirm');
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await confirmResetPassword(username, code, newPassword)) {
      router.push('/login?reset=success');
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-4">
        <hr className="mb-4 border-t border-gray-200" />
        <h2 className="text-2xl font-bold text-gray-900">
          {stage === 'request' ? 'Reset hasła' : 'Reset hasła'}
        </h2>
        <hr className="mt-4 border-t border-gray-200" />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded relative">
          {error}
        </div>
      )}

      {stage === 'request' ? (
        <form onSubmit={handleRequestReset} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Adres email
            </label>
            <div className="mt-1">
              <input
                id="username"
                type="email"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Wysyłanie...' : 'Wyślij kod resetujący'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleConfirmReset} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-gray-700">
              Kod weryfikacyjny
            </label>
            <div className="mt-1">
              <input
                id="code"
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              />
            </div>
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
              Nowe hasło
            </label>
            <div className="mt-1">
              <input
                id="newPassword"
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Przetwarzanie...' : 'Zresetuj hasło'}
          </button>
        </form>
      )}

      <div className="text-center mt-4">
        <div className="space-y-1">
          <p className="text-sm text-gray-600">
            <Link
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Powrót do logowania
            </Link>
          </p>
          <p className="text-sm text-gray-600">
            Nie masz jeszcze konta?{' '}
            <Link
              href="/register"
              className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
            >
              Zarejestruj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;