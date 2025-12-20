// src/app/not-found.tsx
import Link from 'next/link';
import Image from 'next/image';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/logo.png"
            alt="HealthProCRM Logo"
            width={150}
            height={60}
            priority
            className="h-16 w-auto"
          />
        </div>

        {/* 404 Header */}
        <div className="mb-8">
          <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
          <h2 className="text-2xl font-semibold text-gray-700 mb-2">
            Strona nie została znaleziona
          </h2>
          <p className="text-gray-500">
            Przepraszamy, ale strona której szukasz nie istnieje lub została przeniesiona.
          </p>
        </div>

        {/* Akcje */}
        <div className="space-y-4">
          <Link
            href="/home"
            className="block w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Wróć do strony głównej
          </Link>

          <Link
            href="/o3gpt"
            className="block w-full px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Przejdź do Omega3gpt
          </Link>
        </div>

        {/* Dodatkowa pomoc */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            Potrzebujesz pomocy?{' '}
            <Link href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Zaloguj się
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}