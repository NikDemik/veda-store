// VideoPlayer.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';

interface VideoPlayerProps {
    src: string;
    poster?: string;
    className?: string;
    width?: string | number;
    height?: string | number;
    autoGeneratePoster?: boolean;
    posterTime?: number; // Время в секундах для захвата кадра
    onPlay?: () => void;
    onPause?: () => void;
    onEnded?: () => void;
    onError?: (error: Error) => void;
    aspectRatio?: string; // например: '16:9', '4:3', '1:1'
    objectFit?: 'contain' | 'cover' | 'fill';
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({
    src,
    poster,
    className = '',
    width = '100%',
    height = 'auto',
    autoGeneratePoster = true,
    posterTime = 1,
    onPlay,
    onPause,
    onEnded,
    onError,
    aspectRatio = '16:9',
    objectFit = 'contain',
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [generatedPoster, setGeneratedPoster] = useState<string>('');
    const [showControls, setShowControls] = useState(true);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const progressRef = useRef<HTMLDivElement>(null);

    // Генерация превью из видео
    const generatePoster = useCallback(
        async (videoElement: HTMLVideoElement): Promise<string> => {
            return new Promise((resolve) => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (!ctx) {
                    resolve('');
                    return;
                }

                const handleSeeked = () => {
                    // Устанавливаем размеры canvas
                    canvas.width = videoElement.videoWidth || 1280;
                    canvas.height = videoElement.videoHeight || 720;

                    // Рисуем кадр на canvas
                    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

                    // Конвертируем в JPEG с качеством 0.8
                    const posterData = canvas.toDataURL('image/jpeg', 0.8);

                    videoElement.removeEventListener('seeked', handleSeeked);
                    resolve(posterData);
                };

                videoElement.addEventListener('seeked', handleSeeked);

                // Перемещаемся на указанную секунду
                const safeTime = Math.min(posterTime, videoElement.duration || 0);
                videoElement.currentTime = safeTime;

                // Если видео уже загружено, событие может не сработать
                if (videoElement.readyState >= 2) {
                    handleSeeked();
                }
            });
        },
        [posterTime],
    );

    // Учитываем видео, которое могло загрузиться из кеша до запуска эффектов.
    useEffect(() => {
        const video = videoRef.current;

        if (video && video.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
            setIsLoading(false);
        }
    }, [src]);

    const handleLoadedMetadata = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;

        setDuration(video.duration);
        setIsLoading(false);

        // Если не передан постер и включена автогенерация
        if (!poster && autoGeneratePoster) {
            try {
                const generated = await generatePoster(video);
                setGeneratedPoster(generated);
            } catch (error) {
                console.error('Error generating poster:', error);
            }
        }
    }, [poster, autoGeneratePoster, generatePoster]);

    const handleVideoError = useCallback(() => {
        const video = videoRef.current;
        const error = new Error(video?.error?.message || 'Video loading error');

        setIsLoading(false);
        onError?.(error);
    }, [onError]);

    // Управление воспроизведением
    const togglePlay = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
            onPause?.();
        } else {
            video.play().catch((error) => {
                console.error('Error playing video:', error);
                onError?.(new Error('Failed to play video'));
            });
            onPlay?.();
        }
        setIsPlaying(!isPlaying);
    }, [isPlaying, onPlay, onPause, onError]);

    // Перемотка
    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        const video = videoRef.current;
        const progressBar = progressRef.current;
        if (!video || !progressBar) return;

        const rect = progressBar.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const width = rect.width;
        const percentage = Math.max(0, Math.min(1, x / width));

        video.currentTime = percentage * video.duration;
        setProgress(percentage);
    };

    // Обновление прогресса
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            const progressValue = video.currentTime / video.duration;
            setProgress(progressValue);
        };

        const handleEnded = () => {
            setIsPlaying(false);
            setProgress(1);
            onEnded?.();
        };

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('ended', handleEnded);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('ended', handleEnded);
        };
    }, [onEnded]);

    // Управление громкостью
    const toggleMute = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        if (isMuted) {
            video.volume = volume;
            setIsMuted(false);
        } else {
            video.volume = 0;
            setIsMuted(true);
        }
    }, [isMuted, volume]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const video = videoRef.current;
        if (!video) return;

        const newVolume = parseFloat(e.target.value);
        video.volume = newVolume;
        setVolume(newVolume);
        if (newVolume > 0) {
            setIsMuted(false);
        }
    }, []);

    // Форматирование времени
    const formatTime = (seconds: number): string => {
        if (!seconds || isNaN(seconds)) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    };

    // Обработка клавиш
    useEffect(() => {
        const handleKeyPress = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement) return;

            switch (e.code) {
                case 'Space':
                    e.preventDefault();
                    togglePlay();
                    break;
                case 'ArrowRight':
                    if (videoRef.current) {
                        videoRef.current.currentTime = Math.min(
                            videoRef.current.currentTime + 5,
                            videoRef.current.duration,
                        );
                    }
                    break;
                case 'ArrowLeft':
                    if (videoRef.current) {
                        videoRef.current.currentTime = Math.max(
                            videoRef.current.currentTime - 5,
                            0,
                        );
                    }
                    break;
                case 'KeyM':
                    toggleMute();
                    break;
            }
        };

        document.addEventListener('keydown', handleKeyPress);
        return () => document.removeEventListener('keydown', handleKeyPress);
    }, [togglePlay, toggleMute]);

    // Определение постера
    const finalPoster = poster || generatedPoster || undefined;

    // Получаем соотношение сторон для CSS
    const getAspectRatio = () => {
        const [w, h] = aspectRatio.split(':').map(Number);
        return `${(h / w) * 100}%`;
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full rounded-xl overflow-hidden bg-black ${className}`}
            style={{ width, height: height === 'auto' ? 'auto' : height }}
        >
            {/* Контейнер для сохранения пропорций */}
            <div
                className="relative w-full"
                style={{
                    paddingBottom: height === 'auto' ? getAspectRatio() : '0',
                    height: height !== 'auto' ? height : 'auto',
                }}
            >
                {/* Видео элемент с правильным позиционированием */}
                <video
                    ref={videoRef}
                    className={`absolute inset-0 w-full h-full`}
                    style={{
                        objectFit: objectFit,
                    }}
                    poster={finalPoster}
                    onClick={togglePlay}
                    onLoadedMetadata={handleLoadedMetadata}
                    onCanPlay={() => setIsLoading(false)}
                    onPlaying={() => setIsLoading(false)}
                    onWaiting={() => setIsLoading(true)}
                    onStalled={() => setIsLoading(true)}
                    onError={handleVideoError}
                    playsInline
                    preload="metadata"
                >
                    <source src={src} type="video/mp4" />
                    <p className="text-white text-center p-4">
                        Ваш браузер не поддерживает воспроизведение видео.
                    </p>
                </video>

                {/* Индикатор загрузки */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
                        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}

                {/* Центральная кнопка Play */}
                {!isPlaying && !isLoading && (
                    <button
                        onClick={togglePlay}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2
              w-20 h-20 bg-white/95 rounded-full flex items-center justify-center
              transition-all duration-300 hover:scale-110 hover:bg-white
              shadow-2xl group z-20"
                        aria-label="Play video"
                    >
                        <svg
                            className="w-10 h-10 text-blue-600 ml-1 transition-transform group-hover:scale-105"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path d="M8 5v14l11-7z" />
                        </svg>
                    </button>
                )}

                {/* Элементы управления */}
                {(showControls || !isPlaying) && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pt-8 transition-opacity duration-300 z-20">
                        {/* Прогресс-бар */}
                        <div
                            ref={progressRef}
                            className="relative w-full h-1.5 bg-white/30 rounded-full cursor-pointer mb-3
                hover:h-2 transition-all duration-200"
                            onClick={handleProgressClick}
                        >
                            <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-150"
                                style={{ width: `${progress * 100}%` }}
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full 
                  shadow-lg opacity-0 hover:opacity-100 transition-opacity"
                                style={{ left: `calc(${progress * 100}% - 6px)` }}
                            />
                        </div>

                        {/* Нижняя панель управления */}
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={togglePlay}
                                    className="text-white hover:text-blue-400 transition-colors p-1"
                                    aria-label={isPlaying ? 'Pause' : 'Play'}
                                >
                                    {isPlaying ? (
                                        <svg
                                            className="w-6 h-6"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="w-6 h-6"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M8 5v14l11-7z" />
                                        </svg>
                                    )}
                                </button>

                                <span className="text-white text-sm font-mono">
                                    {formatTime(videoRef.current?.currentTime || 0)} /{' '}
                                    {formatTime(duration)}
                                </span>
                            </div>

                            <div className="flex items-center gap-3">
                                <button
                                    onClick={toggleMute}
                                    className="text-white hover:text-blue-400 transition-colors p-1"
                                    aria-label={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted || volume === 0 ? (
                                        <svg
                                            className="w-5 h-5"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                                        </svg>
                                    ) : (
                                        <svg
                                            className="w-5 h-5"
                                            fill="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                                        </svg>
                                    )}
                                </button>

                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={isMuted ? 0 : volume}
                                    onChange={handleVolumeChange}
                                    className="w-20 accent-blue-500 cursor-pointer"
                                    aria-label="Volume"
                                />

                                <button
                                    onClick={() => {
                                        const video = videoRef.current;
                                        if (!video) return;
                                        if (document.fullscreenElement) {
                                            document.exitFullscreen();
                                        } else {
                                            video.requestFullscreen().catch(() => {});
                                        }
                                    }}
                                    className="text-white hover:text-blue-400 transition-colors p-1"
                                    aria-label="Fullscreen"
                                >
                                    <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {!isPlaying && (
                    <div
                        className="absolute bottom-20 left-1/2 transform -translate-x-1/2 
            bg-black/60 text-white text-xs px-3 py-1.5 rounded-full
            opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20"
                    >
                        Нажмите пробел для воспроизведения
                    </div>
                )}
            </div>
        </div>
    );
};

export default VideoPlayer;
