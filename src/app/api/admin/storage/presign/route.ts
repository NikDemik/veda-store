import { NextResponse } from 'next/server';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import {
    type CategoryImageStoragePath,
    type CatalogDocumentStoragePath,
    createPresignedObjectUpload,
    type ProductImageStoragePath,
    type StorageUploadKind,
    validateStorageUpload,
} from '@/lib/object-storage';

export const runtime = 'nodejs';

const uploadKinds = new Set<StorageUploadKind>(['product-image', 'category-image', 'catalog-pdf']);

type PresignPayload = {
    kind?: string;
    fileName?: string;
    contentType?: string;
    size?: number;
    brandSlug?: string;
    seriesSlug?: string;
    productSlug?: string;
    categorySlug?: string;
    imageSequence?: number;
};

export async function POST(request: Request) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: PresignPayload;

    try {
        payload = (await request.json()) as PresignPayload;
    } catch {
        return NextResponse.json({ error: 'Некорректные JSON-данные запроса.' }, { status: 400 });
    }

    if (!payload.kind || !uploadKinds.has(payload.kind as StorageUploadKind)) {
        return NextResponse.json({ error: 'Некорректный тип загрузки.' }, { status: 400 });
    }

    if (!payload.fileName?.trim()) {
        return NextResponse.json({ error: 'Имя файла обязательно.' }, { status: 400 });
    }

    if (!payload.contentType?.trim()) {
        return NextResponse.json({ error: 'MIME-тип файла обязателен.' }, { status: 400 });
    }

    if (!Number.isFinite(payload.size) || Number(payload.size) <= 0) {
        return NextResponse.json({ error: 'Размер файла обязателен.' }, { status: 400 });
    }

    const uploadKind = payload.kind as StorageUploadKind;
    const validationError = validateStorageUpload(uploadKind, {
        type: payload.contentType,
        size: Number(payload.size),
    });

    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const productImagePath =
        uploadKind === 'product-image' ? getProductImagePath(payload) : undefined;
    const categoryImagePath =
        uploadKind === 'category-image' ? getCategoryImagePath(payload) : undefined;
    const catalogDocumentPath =
        uploadKind === 'catalog-pdf' ? getCatalogDocumentPath(payload) : undefined;

    if (productImagePath instanceof NextResponse) {
        return productImagePath;
    }

    if (catalogDocumentPath instanceof NextResponse) {
        return catalogDocumentPath;
    }

    if (categoryImagePath instanceof NextResponse) {
        return categoryImagePath;
    }

    try {
        const presigned = await createPresignedObjectUpload({
            kind: uploadKind,
            fileName: payload.fileName,
            contentType: payload.contentType,
            productImagePath,
            categoryImagePath,
            catalogDocumentPath,
        });

        return NextResponse.json({
            ...presigned,
            contentType: payload.contentType,
            size: payload.size,
        });
    } catch (error) {
        const message =
            error instanceof Error ? error.message : 'Не удалось подготовить ссылку загрузки.';

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

function getProductImagePath(payload: PresignPayload): ProductImageStoragePath | NextResponse {
    const brandSlug = getRequiredString(payload.brandSlug);
    const seriesSlug = getRequiredString(payload.seriesSlug);
    const productSlug = getRequiredString(payload.productSlug);
    const sequence = Number(payload.imageSequence);

    if (!brandSlug || !seriesSlug || !productSlug) {
        return NextResponse.json(
            { error: 'Для загрузки изображения укажите бренд, серию и slug товара.' },
            { status: 400 },
        );
    }

    if (!Number.isInteger(sequence) || sequence < 1) {
        return NextResponse.json(
            { error: 'Некорректный порядковый номер изображения.' },
            { status: 400 },
        );
    }

    return {
        brandSlug,
        seriesSlug,
        productSlug,
        sequence,
    };
}

function getCategoryImagePath(payload: PresignPayload): CategoryImageStoragePath | NextResponse {
    const categorySlug = getRequiredString(payload.categorySlug);

    if (!categorySlug) {
        return NextResponse.json(
            { error: 'Для загрузки изображения укажите slug категории.' },
            { status: 400 },
        );
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug)) {
        return NextResponse.json(
            { error: 'Slug категории должен содержать латиницу, цифры и дефисы.' },
            { status: 400 },
        );
    }

    return {
        categorySlug,
    };
}

function getCatalogDocumentPath(payload: PresignPayload): CatalogDocumentStoragePath | NextResponse {
    const brandSlug = getRequiredString(payload.brandSlug);
    const seriesSlug = getRequiredString(payload.seriesSlug);

    if (!brandSlug || !seriesSlug) {
        return NextResponse.json(
            { error: 'Для загрузки документа укажите бренд и серию товара.' },
            { status: 400 },
        );
    }

    return {
        brandSlug,
        seriesSlug,
    };
}

function getRequiredString(value: unknown) {
    return typeof value === 'string' ? value.trim() : '';
}
