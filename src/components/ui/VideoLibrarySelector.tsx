// src/components/ui/VideoLibrarySelector.tsx
import React, { useState, useEffect } from 'react';
import { Search, Video, X, Clock, CheckCircle2, Globe, Lock } from 'lucide-react';
import PrivateVideoPasswordModal from './PrivateVideoPasswordModal';

// Interfejs dla obiektu wideo z biblioteki
interface VideoItem {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  creator: string;
  videoUrl: string;
  thumbnailUrl: string;
  createdAt: string;
  type: string;
  publicPage: boolean;
  videoPassword: string | null;
}

// Interfejs dla wybranego wideo i jego metadanych
export interface SelectedVideoData {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  originalCreator: string;
  videoUrl: string;
  thumbnailUrl: string;
  publicPage: boolean;
  videoPassword: string | null;
}

interface VideoLibrarySelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onVideoSelected: (videoData: SelectedVideoData) => void;
}

const VideoLibrarySelector: React.FC<VideoLibrarySelectorProps> = ({
  isOpen,
  onClose,
  onVideoSelected
}) => {
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<VideoItem | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [pendingPrivateVideo, setPendingPrivateVideo] = useState<VideoItem | null>(null);

  // Efekt pobierający dane o filmach przy pierwszym renderowaniu
  useEffect(() => {
    if (isOpen) {
      fetchVideos();
    }
  }, [isOpen]);

  // Funkcja pobierająca dane o filmach z API
  const fetchVideos = async (searchQuery = '') => {
    try {
      setIsLoading(true);
      setError(null);

      // Przygotuj parametry zapytania
      const params = new URLSearchParams();
      if (searchQuery) {
        params.append('search', searchQuery);
      }

      // Pobierz dane użytkownika z sessionStorage
      const storedUserData = sessionStorage.getItem('userData');
      if (!storedUserData) {
        throw new Error('Brak danych użytkownika w sesji');
      }

      const userData = JSON.parse(storedUserData);

      // Wywołaj API
      const response = await fetch(`/api/video-library?${params.toString()}`, {
        headers: {
          'X-User-Id': userData.id,
          'X-User-Role': userData.role,
          'X-User-Cognito-Sub': userData.cognito_sub,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas pobierania biblioteki wideo');
      }

      const data = await response.json();
      console.log("Pobrane dane biblioteki wideo:", data);
      setVideos(data.videos);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nieznany błąd');
      console.error('Błąd podczas pobierania biblioteki wideo:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Obsługa zmiany wartości wyszukiwania
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  // Obsługa przycisku wyszukiwania
  const handleSearch = () => {
    fetchVideos(searchTerm);
  };

  // Obsługa wciśnięcia klawisza Enter w polu wyszukiwania
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Obsługa wyboru wideo
  const handleSelectVideo = (video: VideoItem) => {
    setSelectedVideo(video);
  };

  // Obsługa zatwierdzenia wyboru wideo
  const handleConfirmSelection = () => {
    if (selectedVideo) {
      // Sprawdź, czy wideo jest prywatne
      if (isPrivate(selectedVideo)) {
        // Dla prywatnego wideo, otwórz modal weryfikacji hasła
        setPendingPrivateVideo(selectedVideo);
        setIsPasswordModalOpen(true);
      } else {
        // Dla publicznego wideo, kontynuuj jak wcześniej
        onVideoSelected({
          id: selectedVideo.id,
          title: selectedVideo.title || '',
          subtitle: selectedVideo.subtitle || '',
          description: selectedVideo.description || '',
          originalCreator: selectedVideo.creator || '',
          videoUrl: selectedVideo.videoUrl || '',
          thumbnailUrl: selectedVideo.thumbnailUrl || '',
          publicPage: selectedVideo.publicPage,
          videoPassword: selectedVideo.videoPassword
        });
        onClose();
      }
    }
  };

  // Obsługa poprawnej weryfikacji hasła
  const handlePasswordVerified = () => {
    if (pendingPrivateVideo) {
      onVideoSelected({
        id: pendingPrivateVideo.id,
        title: pendingPrivateVideo.title || '',
        subtitle: pendingPrivateVideo.subtitle || '',
        description: pendingPrivateVideo.description || '',
        originalCreator: pendingPrivateVideo.creator || '',
        videoUrl: pendingPrivateVideo.videoUrl || '',
        thumbnailUrl: pendingPrivateVideo.thumbnailUrl || '',
        publicPage: pendingPrivateVideo.publicPage,
        videoPassword: pendingPrivateVideo.videoPassword
      });
      onClose();
    }
  };

  // Formatowanie daty
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pl-PL');
  };

  // Funkcja sprawdzająca, czy wideo jest prywatne
  const isPrivate = (video: VideoItem) => {
    return !video.publicPage && video.videoPassword !== null && video.videoPassword !== '';
  };

  // Funkcja zwracająca typ dostępu do wideo (dla etykiety)
  const getAccessType = (video: VideoItem) => {
    if (video.publicPage) {
      return "Publiczne";
    } else if (isPrivate(video)) {
      return "Prywatne";
    }
    return "";
  };

  // Jeśli komponent nie jest otwarty, nie renderuj nic
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Przyciemnione tło */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm cursor-pointer" onClick={onClose} />

      {/* Modal weryfikacji hasła */}
      {pendingPrivateVideo && (
        <PrivateVideoPasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => {
            setIsPasswordModalOpen(false);
            setPendingPrivateVideo(null);
          }}
          onPasswordVerified={handlePasswordVerified}
          videoTitle={pendingPrivateVideo.title}
          videoPassword={pendingPrivateVideo.videoPassword || ''}
        />
      )}

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Biblioteka wideo</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>

        {/* Pasek wyszukiwania */}
        <div className="p-4 border-b border-gray-200 text-gray-700">
          <div className="flex gap-2">
            <div className="relative flex-grow">
              <input
                type="text"
                placeholder="Szukaj wideo..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
              />
              <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 cursor-pointer"
            >
              Szukaj
            </button>
          </div>
        </div>

        {/* Treść modalu */}
        <div className="flex flex-1 overflow-hidden">
          {/* Lista wideo */}
          <div className="w-2/3 overflow-y-auto p-4 border-r border-gray-200">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-md">
                <p>{error}</p>
              </div>
            ) : videos.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                Brak materiałów wideo w bibliotece
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videos.map((video) => (
                  <div
                    key={video.id}
                    className={`border rounded-lg overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                      selectedVideo?.id === video.id
                        ? 'border-sky-500 ring-2 ring-sky-300'
                        : 'border-gray-200'
                    }`}
                    onClick={() => handleSelectVideo(video)}
                  >
                    <div className="relative aspect-video bg-gray-100">
                      {video.thumbnailUrl ? (
                        <img
                          src={video.thumbnailUrl}
                          alt={video.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Zastąp obrazek placeholderem z ikoną wideo
                            const imgElement = e.currentTarget;
                            imgElement.style.display = 'none';
                            const parent = imgElement.parentNode as HTMLElement;
                            parent.classList.add('flex', 'items-center', 'justify-center');

                            // Dodaj ikonę wideo
                            const videoIcon = document.createElement('div');
                            videoIcon.innerHTML = `
                              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
                                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                                <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                              </svg>
                            `;
                            parent.appendChild(videoIcon);
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Video size={48} className="text-gray-400" />
                        </div>
                      )}
                      {selectedVideo?.id === video.id && (
                        <div className="absolute top-2 right-2">
                          <CheckCircle2 size={24} className="text-sky-500 bg-white rounded-full p-1" />
                        </div>
                      )}

                      {/* Oznaczenie dostępu - ikona */}
                      <div className={`absolute top-2 left-2 ${
                        video.publicPage ? 'bg-green-100 text-green-600' :
                        isPrivate(video) ? 'bg-amber-100 text-amber-600' : ''
                      } rounded-full p-1.5`}>
                        {video.publicPage ? (
                          <Globe size={16} />
                        ) : isPrivate(video) ? (
                          <Lock size={16} />
                        ) : null}
                      </div>
                    </div>
                    <div className="p-3">
                      <div className="flex justify-between items-start mb-1">
                        <h3 className="font-semibold text-gray-800 line-clamp-1">
                          {video.title}
                        </h3>
                        {/* Oznaczenie dostępu - tekst */}
                        {(video.publicPage || isPrivate(video)) && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            video.publicPage ? 'bg-green-100 text-green-600' :
                            'bg-amber-100 text-amber-600'
                          }`}>
                            {getAccessType(video)}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                        {video.subtitle}
                      </p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs text-gray-500">
                          {video.creator}
                        </span>
                        <span className="text-xs text-gray-400 flex items-center">
                          <Clock size={12} className="mr-1" />
                          {formatDate(video.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Panel podglądu */}
          <div className="w-1/3 p-4 overflow-y-auto bg-gray-50">
            {selectedVideo ? (
              <div>
                <h3 className="font-semibold text-lg text-gray-800 mb-2">
                  Podgląd wybranego wideo
                </h3>

                {/* Miniatura */}
                <div className="relative aspect-video bg-gray-100 rounded-md mb-4 overflow-hidden">
                  {selectedVideo.thumbnailUrl ? (
                    <img
                      src={selectedVideo.thumbnailUrl}
                      alt={selectedVideo.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentNode as HTMLElement;
                        parent.classList.add('flex', 'items-center', 'justify-center');

                        const placeholder = document.createElement('div');
                        placeholder.innerHTML = `
                          <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-gray-400">
                            <polygon points="23 7 16 12 23 17 23 7"></polygon>
                            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                          </svg>
                        `;
                        parent.appendChild(placeholder);
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Video size={64} className="text-gray-400" />
                    </div>
                  )}

                  {/* Oznaczenie dostępu w podglądzie */}
                  <div className={`absolute top-2 left-2 ${
                    selectedVideo.publicPage ? 'bg-green-100 text-green-600' :
                    isPrivate(selectedVideo) ? 'bg-amber-100 text-amber-600' : ''
                  } rounded-full p-2`}>
                    {selectedVideo.publicPage ? (
                      <Globe size={20} />
                    ) : isPrivate(selectedVideo) ? (
                      <Lock size={20} />
                    ) : null}
                  </div>
                </div>

                {/* Metadane */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Tytuł</h4>
                    <p className="text-gray-800">{selectedVideo.title}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Podtytuł</h4>
                    <p className="text-gray-800">{selectedVideo.subtitle || "-"}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Opis</h4>
                    <p className="text-gray-800 text-sm line-clamp-4">
                      {selectedVideo.description || "-"}
                    </p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Autor oryginalny</h4>
                    <p className="text-gray-800">{selectedVideo.creator}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Data utworzenia</h4>
                    <p className="text-gray-800">{formatDate(selectedVideo.createdAt)}</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Dostęp</h4>
                    <div className="flex items-center space-x-1 mt-1">
                      {selectedVideo.publicPage ? (
                        <>
                          <Globe size={16} className="text-green-600" />
                          <p className="text-gray-800">Publiczne</p>
                        </>
                      ) : isPrivate(selectedVideo) ? (
                        <>
                          <Lock size={16} className="text-amber-600" />
                          <p className="text-gray-800">Prywatne (wymagane hasło)</p>
                        </>
                      ) : (
                        <p className="text-gray-500">-</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Przycisk wyboru */}
                <button
                  onClick={handleConfirmSelection}
                  className="mt-6 w-full py-2 bg-sky-600 text-white rounded-md hover:bg-sky-700 cursor-pointer"
                >
                  Wybierz to wideo
                </button>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500">
                <Video size={64} className="mb-3 text-gray-300" />
                <p>Wybierz wideo z biblioteki</p>
                <p className="text-sm mt-2 text-gray-400">
                  Podgląd pojawi się tutaj
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoLibrarySelector;