import type { Metadata } from 'next';

export const siteName = 'Anneng';

export const defaultDescription =
    'B2B-каталог продукции Anneng: товары, технические характеристики, документация и оформление заказа.';

export function createPageMetadata(title: string, description = defaultDescription): Metadata {
    return {
        title,
        description,
        openGraph: {
            title,
            description,
            siteName,
            type: 'website',
            locale: 'ru_RU',
        },
    };
}

export function createProductMetadata(params: {
    title: string;
    description?: string | null;
    imageUrl?: string | null;
}): Metadata {
    const description = params.description?.trim() || defaultDescription;

    return {
        title: {
            absolute: params.title,
        },
        description,
        openGraph: {
            title: params.title,
            description,
            siteName,
            type: 'website',
            locale: 'ru_RU',
            images: params.imageUrl ? [{ url: params.imageUrl }] : undefined,
        },
    };
}
