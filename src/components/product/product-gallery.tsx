'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Maximize2, X } from 'lucide-react';
import { getSafeImageUrl } from '@/lib/imageUrl';
import { cn } from '@/lib/utils';

type ProductGalleryImage = {
    id: number | string;
    url: string | null;
    altText: string | null;
};

type ProductGalleryProps = {
    images: ProductGalleryImage[];
    productName: string;
};

export function ProductGallery({ images, productName }: ProductGalleryProps) {
    const galleryImages = images.length
        ? images
        : [
              {
                  id: 'placeholder',
                  url: null,
                  altText: productName,
              },
          ];
    const [activeImageId, setActiveImageId] = useState(galleryImages[0].id);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);
    const activeImage = galleryImages.find((image) => image.id === activeImageId) ?? galleryImages[0];
    const showThumbnails = galleryImages.length > 1;

    useEffect(() => {
        if (!isPreviewOpen) return;

        const previousOverflow = document.body.style.overflow;
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setIsPreviewOpen(false);
        };

        document.body.style.overflow = 'hidden';
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPreviewOpen]);

    return (
        <div className="flex items-start gap-4">
            {showThumbnails && (
                <div className="flex w-16 shrink-0 flex-col gap-3">
                    {galleryImages.map((image) => {
                        const isActive = image.id === activeImage.id;

                        return (
                            <button
                                key={image.id}
                                type="button"
                                className={cn(
                                    'relative aspect-square w-16 overflow-hidden rounded-lg border bg-gray-100 transition',
                                    isActive
                                        ? 'border-accent ring-1 ring-accent'
                                        : 'border-transparent hover:border-dark-grey',
                                )}
                                onClick={() => setActiveImageId(image.id)}
                                aria-label={`Show product image ${image.altText ?? productName}`}
                                aria-pressed={isActive}
                            >
                                <Image
                                    src={getSafeImageUrl(image.url)}
                                    alt={image.altText ?? productName}
                                    fill
                                    sizes="64px"
                                    className="object-contain object-center"
                                />
                            </button>
                        );
                    })}
                </div>
            )}

            <button
                type="button"
                className="group relative aspect-square min-w-0 max-w-120 flex-1 cursor-zoom-in overflow-hidden rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                onClick={() => setIsPreviewOpen(true)}
                aria-label="Открыть увеличенное изображение товара"
            >
                <Image
                    src={getSafeImageUrl(activeImage.url)}
                    alt={activeImage.altText ?? productName}
                    fill
                    sizes="(max-width: 768px) calc(100vw - 108px), (max-width: 1200px) 42vw, 520px"
                    className="object-contain object-center p-4"
                    priority
                />
                <span className="absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full bg-white/90 text-black opacity-0 shadow-sm transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                    <Maximize2 className="size-5" aria-hidden="true" />
                </span>
            </button>

            {isPreviewOpen && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-6"
                    role="dialog"
                    aria-modal="true"
                    aria-label={`Увеличенное изображение товара ${productName}`}
                    onClick={() => setIsPreviewOpen(false)}
                >
                    <div
                        className="relative aspect-square w-[min(720px,calc(100vw-24px),calc(100vh-24px))] overflow-hidden rounded-2xl bg-white shadow-2xl lg:w-[min(1200px,calc(100vw-48px),calc(100vh-48px))]"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <Image
                            src={getSafeImageUrl(activeImage.url)}
                            alt={activeImage.altText ?? productName}
                            fill
                            sizes="(min-width: 1024px) 1200px, 720px"
                            className="object-contain object-center p-4 sm:p-6"
                        />
                        <button
                            type="button"
                            className="absolute top-3 right-3 flex size-11 items-center justify-center rounded-full bg-white/90 text-black shadow-md transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                            onClick={() => setIsPreviewOpen(false)}
                            aria-label="Закрыть увеличенное изображение"
                            autoFocus
                        >
                            <X className="size-6" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
