// src/components/ui/VideoPasswordModal.tsx
import React, { useState } from 'react';
import { X, Lock, Shield, AlertCircle, Globe, Eye, CheckCircle } from 'lucide-react';

interface VideoPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onVerifySuccess: (isPublic: boolean, videoPassword?: string) => void;
}

const VideoPasswordModal: React.FC<VideoPasswordModalProps> = ({
  isOpen,
  onClose,
  onVerifySuccess
}) => {
  // Stany dla różnych etapów weryfikacji
  const [step, setStep] = useState<'creator_password' | 'access_type' | 'video_password'>('creator_password');
  const [creatorPassword, setCreatorPassword] = useState('');
  const [videoPassword, setVideoPassword] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreatorPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!creatorPassword.trim()) {
      setError('Proszę wprowadzić hasło');
      return;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const response = await fetch('/api/verify-video-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: creatorPassword }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Hasło zweryfikowane poprawnie, przechodzimy do wyboru dostępu
        setStep('access_type');
      } else {
        setError(data.error || 'Nieprawidłowe hasło. Spróbuj ponownie.');
      }
    } catch (err) {
      setError('Wystąpił błąd podczas weryfikacji hasła');
      console.error('Błąd weryfikacji hasła:', err);
    } finally {
      setIsVerifying(false);
    }
  };

  const handlePublicAccess = () => {
    // Użytkownik wybrał dostęp publiczny
    onVerifySuccess(true);
    onClose();
  };

  const handlePrivateAccess = () => {
    // Użytkownik wybrał dostęp prywatny, przechodzimy do ustawienia hasła
    setStep('video_password');
  };

  const handleVideoPasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoPassword.trim()) {
      setError('Proszę wprowadzić hasło dostępu do wideo');
      return;
    }

    // Przekazujemy informacje o prywatnym dostępie i haśle
    onVerifySuccess(false, videoPassword);
    onClose();
  };

  const resetModal = () => {
    // Resetowanie stanu modalu przy zamknięciu
    setStep('creator_password');
    setCreatorPassword('');
    setVideoPassword('');
    setError(null);
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

        {step === 'creator_password' && (
          <>
            <div className="text-center mb-4">
              <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Lock size={32} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Wymagane hasło</h2>
              <p className="text-gray-600 mt-2">
                Przesyłanie własnych materiałów wideo wymaga weryfikacji hasła Twórcy Wideo
              </p>
            </div>

            <form onSubmit={handleCreatorPasswordSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasło Twórcy
                </label>
                <input
                  type="password"
                  value={creatorPassword}
                  onChange={(e) => setCreatorPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-500"
                  placeholder="Wprowadź hasło"
                  autoFocus
                />
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
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 rounded-md text-white"
                  disabled={isVerifying}
                >
                  {isVerifying ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block"></div>
                      Weryfikacja...
                    </>
                  ) : (
                    'Zweryfikuj'
                  )}
                </button>
              </div>
            </form>
          </>
        )}

        {step === 'access_type' && (
          <>
            <div className="text-center mb-6">
              <div className="bg-indigo-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Shield size={32} className="text-indigo-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Kontrola dostępu</h2>
              <p className="text-gray-600 mt-2">
                Czy wideo ma być dostępne dla WSZYSTKICH użytkowników platformy?
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <button
                onClick={handlePublicAccess}
                className="py-4 px-3 border border-green-200 bg-green-50 hover:bg-green-100 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <Globe size={32} className="text-green-600 mb-2" />
                <span className="font-medium text-green-700">Tak, dla wszystkich</span>
                <span className="text-xs text-green-600 mt-1 text-center">Dostępne publicznie dla każdego użytkownika</span>
              </button>

              <button
                onClick={handlePrivateAccess}
                className="py-4 px-3 border border-amber-200 bg-amber-50 hover:bg-amber-100 rounded-lg flex flex-col items-center justify-center transition-colors"
              >
                <Lock size={32} className="text-amber-600 mb-2" />
                <span className="font-medium text-amber-700">Nie, tylko wybrani</span>
                <span className="text-xs text-amber-600 mt-1 text-center">Wymagane hasło dostępu do wideo</span>
              </button>
            </div>

            {error && (
              <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-md flex items-center text-red-600">
                <AlertCircle size={16} className="mr-2 flex-shrink-0" />
                <span className="text-sm">{error}</span>
              </div>
            )}
          </>
        )}

        {step === 'video_password' && (
          <>
            <div className="text-center mb-4">
              <div className="bg-amber-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                <Eye size={32} className="text-amber-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-800">Hasło dostępu</h2>
              <p className="text-gray-600 mt-2">
                Podaj hasło dostępu do wideo, abyś mógł przekazać dostęp wybranemu użytkownikowi.
                Hasło będzie widoczne w Twoim panelu Strony.
              </p>
            </div>

            <form onSubmit={handleVideoPasswordSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Hasło do wideo
                </label>
                <input
                  type="text" // Pole tekstowe bez maskowania znaków
                  value={videoPassword}
                  onChange={(e) => setVideoPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 text-gray-600"
                  placeholder="Wprowadź hasło dostępu do wideo"
                  autoFocus
                />
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
                  onClick={() => setStep('access_type')} // Powrót do wyboru typu dostępu
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Wstecz
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded-md text-white"
                >
                  Zatwierdź i kontynuuj
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
};

export default VideoPasswordModal;