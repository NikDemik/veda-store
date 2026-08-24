import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
export type StorageUploadKind = 'product-image' | 'category-image' | 'catalog-pdf' | 'invoice-pdf';

type StorageConfig = {
    bucket: string;
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    publicBaseUrl: string;
    forcePathStyle: boolean;
};

type UploadOptions = {
    kind: StorageUploadKind;
    fileName: string;
    contentType: string;
    body: Buffer;
    productImagePath?: ProductImageStoragePath;
    categoryImagePath?: CategoryImageStoragePath;
    catalogDocumentPath?: CatalogDocumentStoragePath;
    invoicePath?: InvoiceStoragePath;
};

type PresignedUploadOptions = Omit<UploadOptions, 'body'>;

type PresignedDownloadOptions = {
    kind: StorageUploadKind;
    key: string;
    fileName?: string;
    contentType?: string;
    download?: boolean;
};

export type ProductImageStoragePath = {
    brandSlug: string;
    seriesSlug: string;
    productSlug: string;
    sequence: number;
};

export type CategoryImageStoragePath = {
    categorySlug: string;
};

export type CatalogDocumentStoragePath = {
    brandSlug: string;
    seriesSlug: string;
};

export type InvoiceStoragePath = {
    orderNumber: string;
    invoiceNumber: string;
};

const defaultEndpoint = 'https://storage.yandexcloud.net';
const maxImageSize = 8 * 1024 * 1024;
const maxPdfSize = 30 * 1024 * 1024;

const allowedImageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedPdfTypes = new Set(['application/pdf']);

let storageClient: S3Client | null = null;
let storageConfig: StorageConfig | null = null;
let invoiceStorageClient: S3Client | null = null;
let invoiceStorageConfig: StorageConfig | null = null;

export function getObjectStorageConfig() {
    if (storageConfig) return storageConfig;

    const bucket = process.env.YANDEX_STORAGE_BUCKET?.trim();
    const accessKeyId = process.env.YANDEX_STORAGE_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.YANDEX_STORAGE_SECRET_ACCESS_KEY?.trim();
    const endpoint = process.env.YANDEX_STORAGE_ENDPOINT?.trim() || defaultEndpoint;
    const region = process.env.YANDEX_STORAGE_REGION?.trim() || 'ru-central1';
    const publicBaseUrl =
        process.env.YANDEX_STORAGE_PUBLIC_BASE_URL?.trim() ||
        `${endpoint.replace(/\/+$/, '')}/${bucket || ''}`;
    const forcePathStyle = process.env.YANDEX_STORAGE_FORCE_PATH_STYLE === 'true';

    if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error(
            'Yandex Object Storage не настроен. Укажите YANDEX_STORAGE_BUCKET, YANDEX_STORAGE_ACCESS_KEY_ID и YANDEX_STORAGE_SECRET_ACCESS_KEY.',
        );
    }

    storageConfig = {
        bucket,
        endpoint,
        region,
        accessKeyId,
        secretAccessKey,
        publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
        forcePathStyle,
    };

    return storageConfig;
}

export function getInvoiceObjectStorageConfig() {
    if (invoiceStorageConfig) return invoiceStorageConfig;

    const bucket = process.env.YANDEX_INVOICE_STORAGE_BUCKET?.trim();
    const accessKeyId =
        process.env.YANDEX_INVOICE_STORAGE_ACCESS_KEY_ID?.trim() ||
        process.env.YANDEX_STORAGE_ACCESS_KEY_ID?.trim();
    const secretAccessKey =
        process.env.YANDEX_INVOICE_STORAGE_SECRET_ACCESS_KEY?.trim() ||
        process.env.YANDEX_STORAGE_SECRET_ACCESS_KEY?.trim();
    const endpoint =
        process.env.YANDEX_INVOICE_STORAGE_ENDPOINT?.trim() ||
        process.env.YANDEX_STORAGE_ENDPOINT?.trim() ||
        defaultEndpoint;
    const region =
        process.env.YANDEX_INVOICE_STORAGE_REGION?.trim() ||
        process.env.YANDEX_STORAGE_REGION?.trim() ||
        'ru-central1';
    const publicBaseUrl =
        process.env.YANDEX_INVOICE_STORAGE_PUBLIC_BASE_URL?.trim() ||
        `${endpoint.replace(/\/+$/, '')}/${bucket || ''}`;
    const forcePathStyle =
        process.env.YANDEX_INVOICE_STORAGE_FORCE_PATH_STYLE?.trim() === 'true' ||
        (!process.env.YANDEX_INVOICE_STORAGE_FORCE_PATH_STYLE &&
            process.env.YANDEX_STORAGE_FORCE_PATH_STYLE === 'true');

    if (!bucket || !accessKeyId || !secretAccessKey) {
        throw new Error(
            'Yandex Object Storage для счетов не настроен. Укажите YANDEX_INVOICE_STORAGE_BUCKET, YANDEX_INVOICE_STORAGE_ACCESS_KEY_ID и YANDEX_INVOICE_STORAGE_SECRET_ACCESS_KEY.',
        );
    }

    invoiceStorageConfig = {
        bucket,
        endpoint,
        region,
        accessKeyId,
        secretAccessKey,
        publicBaseUrl: publicBaseUrl.replace(/\/+$/, ''),
        forcePathStyle,
    };

    return invoiceStorageConfig;
}

export function getObjectStorageClient() {
    if (storageClient) return storageClient;

    const config = getObjectStorageConfig();

    storageClient = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });

    return storageClient;
}

export function getInvoiceObjectStorageClient() {
    if (invoiceStorageClient) return invoiceStorageClient;

    const config = getInvoiceObjectStorageConfig();

    invoiceStorageClient = new S3Client({
        region: config.region,
        endpoint: config.endpoint,
        forcePathStyle: config.forcePathStyle,
        credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
        },
    });

    return invoiceStorageClient;
}

export function validateStorageUpload(kind: StorageUploadKind, file: { type: string; size: number }) {
    if (kind === 'product-image' || kind === 'category-image') {
        if (!allowedImageTypes.has(file.type)) {
            return 'Загрузите изображение в формате JPEG, PNG, WebP или GIF.';
        }

        if (file.size > maxImageSize) {
            return 'Изображение товара должно быть не больше 8 МБ.';
        }
    }

    if (kind === 'catalog-pdf' || kind === 'invoice-pdf') {
        if (!allowedPdfTypes.has(file.type)) {
            return 'Загрузите PDF-файл.';
        }

        if (file.size > maxPdfSize) {
            return 'PDF-файл должен быть не больше 30 МБ.';
        }
    }

    if (file.size <= 0) {
        return 'Загруженный файл пустой.';
    }

    return null;
}

export async function uploadObjectToStorage({
    kind,
    fileName,
    contentType,
    body,
    productImagePath,
    categoryImagePath,
    catalogDocumentPath,
    invoicePath,
}: UploadOptions) {
    const config = kind === 'invoice-pdf' ? getInvoiceObjectStorageConfig() : getObjectStorageConfig();
    const client = kind === 'invoice-pdf' ? getInvoiceObjectStorageClient() : getObjectStorageClient();
    const key = await resolveStorageKey(
        client,
        config.bucket,
        kind,
        fileName,
        contentType,
        productImagePath,
        categoryImagePath,
        catalogDocumentPath,
        invoicePath,
    );

    await client.send(
        new PutObjectCommand({
            Bucket: config.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
            CacheControl: 'public, max-age=86400',
        }),
    );

    return {
        bucket: config.bucket,
        key,
        url: getPublicObjectUrl(config.publicBaseUrl, key),
    };
}

export async function createPresignedObjectUpload({
    kind,
    fileName,
    contentType,
    productImagePath,
    categoryImagePath,
    catalogDocumentPath,
    invoicePath,
}: PresignedUploadOptions) {
    const config = kind === 'invoice-pdf' ? getInvoiceObjectStorageConfig() : getObjectStorageConfig();
    const client = kind === 'invoice-pdf' ? getInvoiceObjectStorageClient() : getObjectStorageClient();
    const key = await resolveStorageKey(
        client,
        config.bucket,
        kind,
        fileName,
        contentType,
        productImagePath,
        categoryImagePath,
        catalogDocumentPath,
        invoicePath,
    );
    const cacheControl = 'public, max-age=86400';
    const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ContentType: contentType,
        CacheControl: cacheControl,
    });

    return {
        bucket: config.bucket,
        key,
        uploadUrl: await getSignedUrl(client, command, { expiresIn: 60 * 5 }),
        url: getPublicObjectUrl(config.publicBaseUrl, key),
        cacheControl,
    };
}

export async function createPresignedObjectDownload({
    kind,
    key,
    fileName,
    contentType,
    download,
}: PresignedDownloadOptions) {
    const config = kind === 'invoice-pdf' ? getInvoiceObjectStorageConfig() : getObjectStorageConfig();
    const client = kind === 'invoice-pdf' ? getInvoiceObjectStorageClient() : getObjectStorageClient();
    const command = new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ResponseContentType: contentType || 'application/pdf',
        ResponseContentDisposition: fileName
            ? `${download ? 'attachment' : 'inline'}; filename="${getSafeAsciiFileName(fileName)}"`
            : 'inline',
    });

    return getSignedUrl(client, command, { expiresIn: 60 * 5 });
}

function getPublicObjectUrl(publicBaseUrl: string, key: string) {
    return `${publicBaseUrl}/${encodeStorageKey(key)}`;
}

function buildStorageKey(
    kind: StorageUploadKind,
    fileName: string,
    contentType: string,
    productImagePath?: ProductImageStoragePath,
    categoryImagePath?: CategoryImageStoragePath,
    catalogDocumentPath?: CatalogDocumentStoragePath,
    invoicePath?: InvoiceStoragePath,
) {
    const extension = getSafeExtension(fileName, contentType);

    if (kind === 'product-image') {
        if (!productImagePath) {
            throw new Error(
                'Для загрузки изображения товара нужны brandSlug, seriesSlug, productSlug и imageSequence.',
            );
        }

        const brandSlug = getSafePathSegment(productImagePath.brandSlug, 'no-brand');
        const seriesSlug = getSafePathSegment(productImagePath.seriesSlug, 'no-series');
        const productSlug = getSafePathSegment(productImagePath.productSlug, 'product');
        const sequence =
            Number.isInteger(productImagePath.sequence) && productImagePath.sequence > 0
                ? productImagePath.sequence
                : 1;

        return `images/${brandSlug}/${seriesSlug}/${productSlug}-${sequence}${extension}`;
    }

    if (kind === 'category-image') {
        if (!categoryImagePath) {
            throw new Error('Category slug is required for category image upload.');
        }

        const categorySlug = getSafePathSegment(categoryImagePath.categorySlug, 'category');

        return `categories/${categorySlug}${extension}`;
    }

    if (kind === 'invoice-pdf') {
        if (!invoicePath) {
            throw new Error('Для загрузки счета нужны номер заказа и номер счета.');
        }

        const orderNumber = getSafePathSegment(invoicePath.orderNumber, 'order');
        const invoiceNumber = getSafePathSegment(invoicePath.invoiceNumber, 'invoice');

        return `invoices/${orderNumber}/${invoiceNumber}${extension || '.pdf'}`;
    }

    if (!catalogDocumentPath) {
        throw new Error(
            'Для загрузки документа товара нужны brandSlug и seriesSlug.',
        );
    }

    const brandSlug = getSafePathSegment(catalogDocumentPath.brandSlug, 'no-brand');
    const seriesSlug = getSafePathSegment(catalogDocumentPath.seriesSlug, 'no-series');
    const documentFileName = getSafeFileName(fileName, extension);

    return `catalogs/${brandSlug}/${seriesSlug}/${documentFileName}`;
}

async function resolveStorageKey(
    client: S3Client,
    bucket: string,
    kind: StorageUploadKind,
    fileName: string,
    contentType: string,
    productImagePath?: ProductImageStoragePath,
    categoryImagePath?: CategoryImageStoragePath,
    catalogDocumentPath?: CatalogDocumentStoragePath,
    invoicePath?: InvoiceStoragePath,
) {
    const key = buildStorageKey(
        kind,
        fileName,
        contentType,
        productImagePath,
        categoryImagePath,
        catalogDocumentPath,
        invoicePath,
    );

    if (kind !== 'category-image') {
        return key;
    }

    return resolveUniqueStorageKey(client, bucket, key);
}

async function resolveUniqueStorageKey(client: S3Client, bucket: string, key: string) {
    if (!(await objectExists(client, bucket, key))) {
        return key;
    }

    const extensionMatch = key.match(/(\.[a-z0-9]+)$/i);
    const extension = extensionMatch?.[1] ?? '';
    const baseKey = extension ? key.slice(0, -extension.length) : key;

    for (let index = 2; index < 1000; index += 1) {
        const candidateKey = `${baseKey}-${index}${extension}`;

        if (!(await objectExists(client, bucket, candidateKey))) {
            return candidateKey;
        }
    }

    throw new Error('Could not find a free category image file name.');
}

async function objectExists(client: S3Client, bucket: string, key: string) {
    try {
        await client.send(
            new HeadObjectCommand({
                Bucket: bucket,
                Key: key,
            }),
        );

        return true;
    } catch (error) {
        const storageError = error as {
            $metadata?: { httpStatusCode?: number };
            name?: string;
        };
        const statusCode = storageError.$metadata?.httpStatusCode;

        if (statusCode === 404 || storageError.name === 'NotFound') {
            return false;
        }

        throw error;
    }
}

function getSafeExtension(fileName: string, contentType: string) {
    const extension = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0];

    if (extension && /^[a-z0-9.]+$/.test(extension)) {
        return extension;
    }

    if (contentType === 'image/jpeg') return '.jpg';
    if (contentType === 'image/png') return '.png';
    if (contentType === 'image/webp') return '.webp';
    if (contentType === 'image/gif') return '.gif';
    if (contentType === 'application/pdf') return '.pdf';

    return '';
}

function encodeStorageKey(key: string) {
    return key.split('/').map(encodeURIComponent).join('/');
}

function getSafePathSegment(value: string, fallback: string) {
    const safeValue = value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');

    return safeValue || fallback;
}

function getSafeAsciiFileName(fileName: string) {
    const safeName = fileName
        .trim()
        .replace(/[^\w.-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 120);

    return safeName || 'invoice.pdf';
}

function getSafeFileName(fileName: string, fallbackExtension: string) {
    const normalizedFileName = fileName
        .trim()
        .replace(/[\\/:*?"<>|]+/g, '-')
        .replace(/\s+/g, ' ')
        .replace(/^\.+/, '')
        .slice(0, 180);

    if (normalizedFileName) {
        return normalizedFileName;
    }

    return `document${fallbackExtension || '.pdf'}`;
}
