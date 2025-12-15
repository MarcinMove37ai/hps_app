// src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Lista ścieżek publicznych, które nie wymagają autoryzacji
const publicPaths = ['/login', '/register', '/restore'];

export async function middleware(request: NextRequest) {
  // Pobieranie i normalizacja ścieżki
  const { pathname } = request.nextUrl;
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname || '/';

  // Obsługa głównej ścieżki - przekierowanie do /login
  if (normalizedPath === '' || normalizedPath === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Sprawdzanie ścieżek publicznych - zawsze dostępne
  if (publicPaths.some(publicPath => normalizedPath === publicPath || normalizedPath.startsWith(`${publicPath}/`))) {
    return NextResponse.next();
  }

  // Dla chronionych ścieżek nie wykonujemy żadnej weryfikacji w middleware
  // Pełna autoryzacja będzie obsługiwana przez AuthGuard na stronie klienta
  // To upraszcza logikę i pozwala uniknąć duplikacji kodu uwierzytelniania
  return NextResponse.next();
}

// Matcher obejmujący tylko ścieżki publiczne i główną ścieżkę
export const config = {
  matcher: [
    '/',
    '/login',
    '/login/:path*',
    '/register',
    '/register/:path*',
    '/restore',
    '/restore/:path*',
  ],
};