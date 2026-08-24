import { NextResponse } from 'next/server';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import {
    type CategoryImageStoragePath,
    type CatalogDocumentStoragePath,
    type ProductImageStoragePath,
    type StorageUploadKind,
    uploadObjectToStorage,
    validateStorageUpload,
} from '@/lib/object-storage';

export const runtime = 'nodejs';

const uploadKinds = new Set<StorageUploadKind>(['product-image', 'category-image', 'catalog-pdf']);

export async function POST(request: Request) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let formData: FormData;

    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Некорректные multipart-данные формы.' }, { status: 400 });
    }

    const kind = formData.get('kind');
    const file = formData.get('file');

    if (typeof kind !== 'string' || !uploadKinds.has(kind as StorageUploadKind)) {
        return NextResponse.json({ error: 'Некорректный тип загрузки.' }, { status: 400 });
    }

    if (!(file instanceof File)) {
        return NextResponse.json({ error: 'Файл обязателен.' }, { status: 400 });
    }

    const uploadKind = kind as StorageUploadKind;
    const validationError = validateStorageUpload(uploadKind, file);

    if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const productImagePath = uploadKind === 'product-image' ? getProductImagePath(formData) : undefined;
    const categoryImagePath =
        uploadKind === 'category-image' ? getCategoryImagePath(formData) : undefined;
    const catalogDocumentPath =
        uploadKind === 'catalog-pdf' ? getCatalogDocumentPath(formData) : undefined;

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
        const body = Buffer.from(await file.arrayBuffer());
        const uploaded = await uploadObjectToStorage({
            kind: uploadKind,
            fileName: file.name,
            contentType: file.type,
            body,
            productImagePath,
            categoryImagePath,
            catalogDocumentPath,
        });

        return NextResponse.json({
            ...uploaded,
            contentType: file.type,
            size: file.size,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось загрузить файл.';

        return NextResponse.json({ error: message }, { status: 500 });
    }
}

function getProductImagePath(formData: FormData): ProductImageStoragePath | NextResponse {
    const brandSlug = getRequiredString(formData, 'brandSlug');
    const seriesSlug = getRequiredString(formData, 'seriesSlug');
    const productSlug = getRequiredString(formData, 'productSlug');
    const sequence = Number(formData.get('imageSequence'));

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

function getCategoryImagePath(formData: FormData): CategoryImageStoragePath | NextResponse {
    const categorySlug = getRequiredString(formData, 'categorySlug');

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

function getCatalogDocumentPath(formData: FormData): CatalogDocumentStoragePath | NextResponse {
    const brandSlug = getRequiredString(formData, 'brandSlug');
    const seriesSlug = getRequiredString(formData, 'seriesSlug');

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

function getRequiredString(formData: FormData, fieldName: string) {
    const value = formData.get(fieldName);

    return typeof value === 'string' ? value.trim() : '';
}
