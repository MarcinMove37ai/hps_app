"use client"

import React from 'react';
import { Lock } from 'lucide-react';

const BlockedUserMessage: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full p-4">
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md w-full shadow-sm">
        <div className="flex items-center mb-4">
          <Lock className="h-6 w-6 text-red-600 mr-3" />
          <h2 className="text-xl font-semibold text-red-700 text-center">Konto zablokowane</h2>
        </div>

        <p className="text-gray-700 mb-3">
          Twoje konto zostało zablokowane przez administratora systemu.
          Nie masz obecnie dostępu do funkcji aplikacji.
        </p>

        <hr className="border-gray-200 my-4" />

        <p className="text-sm text-gray-500 text-center">
          Możesz się wylogować klikając przycisk w prawym górnym rogu ekranu.
        </p>
      </div>
    </div>
  );
};

export default BlockedUserMessage;