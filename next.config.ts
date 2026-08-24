import type { NextConfig } from 'next';

function getRemoteImagePatterns() {
    const patterns: NonNullable<NonNullable<NextConfig['images']>['remotePatterns']> = [
        {
            protocol: 'https',
            hostname: 'storage.yandexcloud.net',
        },
    ];

    const publicBaseUrl = process.env.YANDEX_STORAGE_PUBLIC_BASE_URL;

    if (publicBaseUrl) {
        try {
            const url = new URL(publicBaseUrl);

            if (url.protocol === 'https:' || url.protocol === 'http:') {
                patterns.push({
                    protocol: url.protocol.replace(':', '') as 'http' | 'https',
                    hostname: url.hostname,
                });
            }
        } catch {
            // Invalid optional config should not break the Next.js config load.
        }
    }

    return patterns;
}

const nextConfig: NextConfig = {
    reactCompiler: true,
    turbopack: {
        rules: {
            '*.svg': {
                loaders: ['@svgr/webpack'],
                as: '*.js',
            },
        },
    },

    webpack(config) {
        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: ['@svgr/webpack'],
        });

        return config;
    },

    allowedDevOrigins: ['192.168.10.231', '85.198.99.82'],

    images: {
        qualities: [25, 50, 75, 100],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'storage.yandexcloud.net',
                pathname: '/website-image-catalogs/**',
            },
            ...getRemoteImagePatterns(),
        ],
    },
};

export default nextConfig;
