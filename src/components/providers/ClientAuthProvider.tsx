'use client';

import React from 'react';
import { AuthProvider } from '../../contexts/AuthContext';

/**
 * Komponent kliencki opakowujący AuthProvider
 * Niezbędny do prawidłowej integracji z React Server Components w Next.js
 */
const ClientAuthProvider = ({ children }: { children: React.ReactNode }) => {
  return <AuthProvider>{children}</AuthProvider>;
};

export default ClientAuthProvider;