// src/components/ui/PrivateVideoPasswordModal.tsx
import React, { useState } from 'react';
import { X, Lock, AlertCircle, Eye } from 'lucide-react';

interface PrivateVideoPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordVerified: () => void;
  videoTitle: string;
  videoPassword: string;
}

const PrivateVideoPasswordModal: React.FC<PrivateVideoPasswordModalProps> = ({
  isOpen,
  onClose,
  onPasswordVerified,
  videoTitle,
  videoPassword
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!password.trim()) {
      setError('Proszę wprowadzić hasło dostępu');
      return;
    }

    // Prosta weryfikacja po stronie klienta
    if (password.trim() === videoPassword.trim()) {
      onPasswordVerified();
      resetModal();
    } else {
      setError('Nieprawidłowe hasło. Spróbuj ponownie.');
    }
  };

  const resetModal = () => {
    setPassword('');
    setError(null);
    setShowPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer"
        onClick={resetModal}
      />

      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6 mx-4">
        <button
          onClick={resetModal}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
        >
          <X size={24} />
        </button>

        <div className="text-center mb-4">
          <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800">Materiał chroniony hasłem</h2>
          <p className="text-gray-600 mt-2 mb-1">
            Ten materiał wideo jest prywatny i wymaga hasła dostępu.
          </p>
          <p className="text-amber-600 font-semibold">{videoTitle}</p>
        </div>

        <form onSubmit={handlePasswordSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Wprowadź hasło dostępu
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-600"
                placeholder="Hasło dostępu"
                autoFocus
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
                onClick={() => setShowPassword(!showPassword)}
              >
                <Eye size={20} />
              </button>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md flex items-center text-red-600">
              <AlertCircle size={16} className="mr-2 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={resetModal}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Anuluj
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-md text-white"
            >
              Uzyskaj dostęp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PrivateVideoPasswordModal;