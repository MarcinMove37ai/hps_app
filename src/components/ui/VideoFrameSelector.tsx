// src/components/ui/VideoFrameSelector.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Check, AlertCircle, Play, Pause, SkipForward, SkipBack, RefreshCw, Upload, ArrowLeftCircle } from 'lucide-react';

interface VideoFrameSelectorProps {
  videoUrl: string;
  pageId: string;
  s3Key: string;
  onComplete: (thumbnailUrl: string) => void;
  onCancel: () => void;
}

const VideoFrameSelector: React.FC<VideoFrameSelectorProps> = ({
  videoUrl,
  pageId,
  s3Key,
  onComplete,
  onCancel
}) => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isFileUploadMode, setIsFileUploadMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stany odtwarzacza wideo
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [isVideoError, setIsVideoError] = useState(false);
  const [generatedThumbnails, setGeneratedThumbnails] = useState<string[]>([]);
  const [isGeneratingThumbnails, setIsGeneratingThumbnails] = useState(false);

  // Full video URL
  const fullVideoUrl = videoUrl.startsWith('http')
    ? videoUrl
    : `https://ebooks-in.s3.eu-central-1.amazonaws.com/${videoUrl}`;

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // Video player state handling
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const handleMetadata = () => setDuration(video.duration);
    const handleCanPlay = () => setIsVideoLoaded(true);
    const handleError = () => {
      console.error("Video loading error:", video.error);
      setIsVideoError(true);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', handleMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', handleMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, []);

  // Toggle play/pause
  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Skip time forward/backward
  const skipTime = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += seconds;
    setCurrentTime(videoRef.current.currentTime);
  };

  // Capture current video frame
  const captureCurrentFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (!blob) return;

      const file = new File([blob], `thumbnail-${Date.now()}.png`, { type: 'image/png' });

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    }, 'image/png');
  };

  // Generate thumbnails on server
  const generateServerThumbnails = async () => {
    if (!pageId || !s3Key) {
      setError('Brak wymaganych danych do generowania miniatur');
      return;
    }

    try {
      setIsGeneratingThumbnails(true);
      setError(null);

      const response = await fetch('/api/generate-video-thumbnails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId, s3Key, count: 5 })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Błąd podczas generowania miniatur');
      }

      const data = await response.json();

      if (data.success && data.thumbnails && data.thumbnails.length > 0) {
        setGeneratedThumbnails(data.thumbnails);
      } else {
        throw new Error('Nie udało się wygenerować miniatur');
      }
    } catch (error) {
      console.error('Błąd generowania miniatur:', error);
      setError((error as Error).message || 'Nie udało się wygenerować miniatur');
    } finally {
      setIsGeneratingThumbnails(false);
    }
  };

  // Select server-generated thumbnail
  const selectServerThumbnail = async (thumbnailUrl: string) => {
    try {
      const response = await fetch(thumbnailUrl);
      if (!response.ok) {
        throw new Error('Nie udało się pobrać miniatury');
      }

      const blob = await response.blob();
      const filename = thumbnailUrl.split('/').pop() || `thumbnail-${Date.now()}.png`;
      const file = new File([blob], filename, { type: 'image/png' });

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
    } catch (error) {
      console.error('Błąd pobierania miniatury:', error);
      setError((error as Error).message || 'Nie udało się pobrać miniatury');
    }
  };

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      if (!file.type.startsWith('image/')) {
        setError('Proszę wybrać plik obrazu (JPG, PNG, GIF)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Maksymalny rozmiar pliku to 5MB');
        return;
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setIsFileUploadMode(false); // Switch back to preview mode
    }
  };

  // Handle drag and drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];

      if (!file.type.startsWith('image/')) {
        setError('Proszę wybrać plik obrazu (JPG, PNG, GIF)');
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Maksymalny rozmiar pliku to 5MB');
        return;
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError(null);
      setIsFileUploadMode(false); // Switch back to preview mode
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Save selected image
  const saveImage = async () => {
    if (!selectedImage) {
      setError('Proszę najpierw wybrać obraz');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);
      setUploadProgress(10);

      const formData = new FormData();
      formData.append('file', selectedImage);
      formData.append('pageId', pageId);
      formData.append('s3Key', s3Key);

      setUploadProgress(30);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000);

      try {
        setUploadProgress(50);

        const saveResponse = await fetch('/api/save-video-thumbnail', {
          method: 'POST',
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        setUploadProgress(80);

        const responseText = await saveResponse.text();
        let result;

        try {
          result = JSON.parse(responseText);
        } catch (parseError) {
          console.error('Błąd parsowania JSON:', parseError);
          throw new Error(`Nieprawidłowa odpowiedź: ${responseText.substring(0, 100)}...`);
        }

        if (!saveResponse.ok) {
          throw new Error(result.error || result.details || 'Błąd podczas zapisywania miniatury');
        }

        setUploadProgress(100);
        onComplete(result.thumbnailUrl);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        if ((fetchError as Error).name === 'AbortError') {
          throw new Error('Upłynął limit czasu żądania (30s). Spróbuj ponownie.');
        }
        throw fetchError;
      }
    } catch (error) {
      console.error('Błąd zapisywania miniatury:', error);
      setError((error as Error).message || 'Nie udało się zapisać wybranej miniatury.');
      setUploadProgress(0);
    } finally {
      setIsSaving(false);
    }
  };

  // Format time for video player
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Toggle between video and file upload modes
  const toggleFileUploadMode = () => {
    setIsFileUploadMode(!isFileUploadMode);
  };

  return (
    <div className="space-y-4">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden"></canvas>

      {/* Main video or preview area */}
      <div className="relative rounded-lg overflow-hidden bg-gray-100">
        {previewUrl ? (
          /* Preview of selected thumbnail */
          <div className="relative aspect-video flex justify-center items-center">
            <img
              src={previewUrl}
              alt="Thumbnail preview"
              className="max-h-full max-w-full object-contain"
            />
            <button
              onClick={() => {
                setSelectedImage(null);
                if (previewUrl) {
                  URL.revokeObjectURL(previewUrl);
                  setPreviewUrl(null);
                }
              }}
              className="absolute top-2 right-2 p-1 bg-gray-800 bg-opacity-60 text-white rounded-full hover:bg-opacity-80 cursor-pointer"
              title="Remove thumbnail"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        ) : isFileUploadMode ? (
          /* File upload area */
          <div
            className="border border-dashed rounded-md p-4 text-center cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors aspect-video flex flex-col justify-center"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFileUploadMode();
              }}
              className="absolute top-2 left-2 p-1.5 bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 cursor-pointer"
              title="Wróć do podglądu wideo"
            >
              <ArrowLeftCircle size={20} />
            </button>

            <div className="flex-grow flex flex-col items-center justify-center">
              <Upload size={32} className="mx-auto text-gray-400 mb-2" />
              <p className="text-sm text-gray-600">
                Kliknij, aby wybrać obraz lub przeciągnij i upuść plik
              </p>
              <p className="text-xs text-gray-500 mt-1">
                JPG, PNG, GIF (max 5MB)
              </p>

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                accept="image/*"
              />
            </div>
          </div>
        ) : (
          /* Video player */
          !isVideoError ? (
            <div className="relative aspect-video">
              <video
                ref={videoRef}
                src={fullVideoUrl}
                className="w-full h-full object-contain"
                controls={false}
                crossOrigin="anonymous"
              />

              {!isVideoLoaded ? (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-70">
                  <div className="text-white text-center">
                    <div className="animate-spin h-8 w-8 border-3 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                    <p className="text-sm">Ładowanie wideo...</p>
                  </div>
                </div>
              ) : null}

              {/* Add a prominent button to switch to file upload mode */}
              {isVideoLoaded && (
                <div className="absolute top-2 right-2 z-10">
                  <button
                    onClick={toggleFileUploadMode}
                    className="flex items-center bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-md shadow-sm text-sm cursor-pointer"
                    title="Użyj własnego obrazu jako miniatury"
                  >
                    <Upload size={16} className="mr-1.5" />
                    <span>Dodaj plik</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Video error message */
            <div className="aspect-video flex items-center justify-center p-4 bg-gray-100">
              <button
                onClick={toggleFileUploadMode}
                className="absolute top-2 right-2 p-1.5 bg-white bg-opacity-70 text-gray-800 rounded-full hover:bg-opacity-90 shadow-sm cursor-pointer"
                title="Użyj własnego obrazu jako miniatury"
              >
                <Upload size={20} />
              </button>

              <div className="text-center">
                <AlertCircle size={32} className="mx-auto text-amber-500 mb-2" />
                <p className="text-gray-700">Wideo nie może być odtworzone w przeglądarce</p>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2 mt-3">
                  <button
                    onClick={generateServerThumbnails}
                    disabled={isGeneratingThumbnails}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm py-1.5 px-3 rounded flex items-center cursor-pointer"
                  >
                    {isGeneratingThumbnails ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Generowanie...
                      </>
                    ) : (
                      <>
                        <RefreshCw size={16} className="mr-1.5" />
                        Wygeneruj automatyczne miniatury
                      </>
                    )}
                  </button>

                  <button
                    onClick={toggleFileUploadMode}
                    className="bg-green-600 hover:bg-green-700 text-white text-sm py-1.5 px-3 rounded flex items-center cursor-pointer"
                  >
                    <Upload size={16} className="mr-1.5" />
                    Dodaj własny plik
                  </button>
                </div>
              </div>
            </div>
          )
        )}
      </div>

      {/* Video controls (only shown when video is loaded and no preview is selected and not in file upload mode) */}
      {isVideoLoaded && !previewUrl && !isFileUploadMode && (
        <div className="space-y-2">
          {/* Time slider */}
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600">{formatTime(currentTime)}</span>
            <input
              type="range"
              min={0}
              max={duration || 100}
              value={currentTime}
              onChange={(e) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = Number(e.target.value);
                  setCurrentTime(Number(e.target.value));
                }
              }}
              className="flex-grow h-1.5 bg-gray-300 rounded-full appearance-none cursor-pointer"
            />
            <span className="text-xs text-gray-600">{formatTime(duration)}</span>
          </div>

          {/* Player controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => skipTime(-5)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 cursor-pointer"
                title="Cofnij 5 sekund"
              >
                <SkipBack size={18} />
              </button>

              <button
                onClick={togglePlay}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 cursor-pointer"
                title={isPlaying ? "Pauza" : "Odtwórz"}
              >
                {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
              </button>

              <button
                onClick={() => skipTime(5)}
                className="p-1.5 rounded-full hover:bg-gray-200 text-gray-700 cursor-pointer"
                title="Przewiń 5 sekund"
              >
                <SkipForward size={18} />
              </button>
            </div>

            <button
              onClick={captureCurrentFrame}
              className="text-sm bg-green-600 hover:bg-green-700 text-white py-1 px-3 rounded-md flex items-center cursor-pointer"
            >
              <Camera size={16} className="mr-1.5" />
              Użyj tej klatki
            </button>
          </div>
        </div>
      )}

      {/* Generated thumbnails grid */}
      {generatedThumbnails.length > 0 && (
        <div className="grid grid-cols-5 gap-2 mt-3">
          {generatedThumbnails.map((url, index) => (
            <div
              key={index}
              className={`cursor-pointer overflow-hidden rounded transition-all ${
                previewUrl === url ? 'ring-2 ring-blue-500' : 'hover:ring-2 hover:ring-blue-200'
              }`}
              onClick={() => selectServerThumbnail(url)}
            >
              <div className="aspect-video">
                <img
                  src={url}
                  alt={`Thumbnail ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="text-sm text-red-600 p-2 bg-red-50 rounded-md border border-red-100">
          {error}
        </div>
      )}

      {/* Upload progress bar */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <div className="h-1 w-full bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300 bg-blue-500"
            style={{ width: `${uploadProgress}%` }}
          ></div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex justify-end space-x-2 mt-3">
        {selectedImage && (
          <button
            onClick={() => {
              setSelectedImage(null);
              if (previewUrl) {
                URL.revokeObjectURL(previewUrl);
                setPreviewUrl(null);
              }
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 text-sm cursor-pointer"
            disabled={isSaving}
            type="button"
          >
            Cofnij
          </button>
        )}

        {selectedImage && (
          <button
            onClick={saveImage}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded-md text-white flex items-center text-sm cursor-pointer"
            disabled={isSaving}
            type="button"
          >
            {isSaving ? (
              <>
                <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full mr-1.5"></div>
                Zapisywanie...
              </>
            ) : (
              <>
                <Check size={16} className="mr-1.5" />
                Zapisz
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default VideoFrameSelector;