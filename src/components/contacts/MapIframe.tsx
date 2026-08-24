'use client';

interface MapIframeProps {
    src: string;
    width?: string | number;
    height?: string | number;
}

export default function MapIframe({ src, width = '100%', height = '100%' }: MapIframeProps) {
    return (
        <iframe
            src={src}
            width={width}
            height={height}
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            title="Яндекс.Карта"
        />
    );
}
