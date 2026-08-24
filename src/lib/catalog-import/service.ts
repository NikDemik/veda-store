import { createHash } from 'node:crypto';
import { z } from 'zod';
import { catalogImportConfig } from '@/config/catalogImport';
import { productSchema } from '@/lib/admin-product-form';
import { prisma } from '@/lib/prisma';
import type { CatalogImportErrorDto } from '@/types/catalog-import';
import { issue, parseCatalogWorkbook, type ParsedCatalogWorkbook } from './parse-xlsx';

const nullableText = z.preprocess(toNullableText, z.string().max(5000).nullable());
const shortNullableText = z.preprocess(toNullableText, z.string().max(191).nullable());
const nullableNumber = z.preprocess(toNullableNumber, z.number().nonnegative().nullable());
const nullableInteger = z.preprocess(toNullableNumber, z.number().int().nullable());
const booleanValue = z.preprocess(toBoolean, z.boolean());

const productRowSchema = z.object({
    sku: z.preprocess(toText, z.string().min(1).max(191)),
    article: shortNullableText,
    barcode: shortNullableText,
    name: z.preprocess(toText, z.string().min(1).max(191)),
    slug: z.preprocess(toText, z.string().min(1).max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)),
    description: nullableText,
    category_slug: z.preprocess(toText, z.string().min(1).max(191)),
    brand_slug: shortNullableText,
    series_slug: shortNullableText,
    product_type_code: z.preprocess(toText, z.string().min(1).max(191)),
    unit_code: z.preprocess(toText, z.string().min(1).max(191)),
    model: shortNullableText,
    seo_title: shortNullableText,
    meta_description: nullableText,
    status: z.preprocess(toText, z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED'])),
    availability: z.preprocess(toText, z.enum(['IN_STOCK', 'BACKORDER', 'OUT_OF_STOCK', 'DISCONTINUED'])),
    vat_rate: z.preprocess(toNumber, z.number().nonnegative()),
    price: z.preprocess(toNumber, z.number().nonnegative()),
    purchase_price: nullableNumber,
    price_old: nullableNumber,
    currency: z.preprocess(toText, z.string().length(3)),
    stock_qty: z.preprocess(toNumber, z.number().int().nonnegative()),
    min_order_qty: z.preprocess(toNumber, z.number().int().positive()),
    step_qty: z.preprocess(toNumber, z.number().int().positive()),
    popularity_weight: z.preprocess(toNumber, z.number().int().nonnegative()),
    lead_time_days: z.preprocess(toNullableNumber, z.number().int().nonnegative().nullable()),
    warranty_months: z.preprocess(toNullableNumber, z.number().int().nonnegative().nullable()),
    datasheet_url: shortNullableText,
    image_url: shortNullableText,
    weight_kg: nullableNumber,
    width_mm: nullableNumber,
    height_mm: nullableNumber,
    depth_mm: nullableNumber,
    voltage_v: shortNullableText,
    current_a: shortNullableText,
    power_w: shortNullableText,
    frequency_hz: shortNullableText,
    protection_class_ip: shortNullableText,
    operating_temp_from_c: nullableInteger,
    operating_temp_to_c: nullableInteger,
    is_sellable: booleanValue,
});

const specSchema = z.object({ sku: z.preprocess(toText, z.string().min(1).max(191)), name: z.preprocess(toText, z.string().min(1).max(191)), value: z.preprocess(toText, z.string().min(1).max(191)), unit: shortNullableText });
const imageSchema = z.object({ sku: z.preprocess(toText, z.string().min(1).max(191)), url: z.preprocess(toText, z.string().min(1).max(191)), alt_text: shortNullableText, is_primary: booleanValue, sort_order: z.preprocess(toNumber, z.number().int().nonnegative()) });
const documentSchema = z.object({ sku: z.preprocess(toText, z.string().min(1).max(191)), title: z.preprocess(toText, z.string().min(1).max(191)), url: z.preprocess(toText, z.string().min(1).max(191)), file_name: z.preprocess(toText, z.string().max(191)), mime_type: z.preprocess(toText, z.string().min(1).max(191)), size: z.preprocess(toNumber, z.number().int().nonnegative()), storage_key: z.preprocess(toText, z.string().max(191)), sort_order: z.preprocess(toNumber, z.number().int().nonnegative()) });

type ProductRow = z.infer<typeof productRowSchema> & { rowNumber: number };
type SpecRow = z.infer<typeof specSchema>;
type ImageRow = z.infer<typeof imageSchema>;
type DocumentRow = z.infer<typeof documentSchema>;
type ResolvedProduct = ProductRow & { categoryId: number; brandId: number | null; seriesId: number | null; productTypeId: number; unitMeasureId: number };

export type CatalogImportPlan = {
    products: ResolvedProduct[];
    specsBySku: Map<string, SpecRow[]>;
    imagesBySku: Map<string, ImageRow[]>;
    documentsBySku: Map<string, DocumentRow[]>;
    errors: CatalogImportErrorDto[];
    totalRows: number;
    createdCount: number;
    updatedCount: number;
    unchangedCount: number;
};

export function hashCatalogImportFile(buffer: Buffer) {
    return createHash('sha256').update(buffer).digest('hex');
}

export async function buildCatalogImportPlan(buffer: Buffer): Promise<CatalogImportPlan> {
    const parsed = await parseCatalogWorkbook(buffer);
    const errors = [...parsed.errors];
    const products = parseRows(parsed.workbook.Products, productRowSchema, 'Products', errors) as ProductRow[];
    const specs = parseRows(parsed.workbook.ProductSpecs, specSchema, 'ProductSpecs', errors) as Array<SpecRow & { rowNumber: number }>;
    const images = parseRows(parsed.workbook.Images, imageSchema, 'Images', errors) as Array<ImageRow & { rowNumber: number }>;
    const documents = parseRows(parsed.workbook.Documents, documentSchema, 'Documents', errors) as Array<DocumentRow & { rowNumber: number }>;

    validateDuplicateValues(products, errors);
    validateUrls(products, images, documents, errors);
    const fileSkus = new Set(products.map((row) => row.sku));
    const existingSkuRows = await prisma.product.findMany({ where: { sku: { in: [...new Set([...fileSkus, ...specs.map((r) => r.sku), ...images.map((r) => r.sku), ...documents.map((r) => r.sku)])] } }, select: { sku: true } });
    const validSkus = new Set([...fileSkus, ...existingSkuRows.map((row) => row.sku)]);
    for (const [sheet, rows] of [['ProductSpecs', specs], ['Images', images], ['Documents', documents]] as const) {
        for (const row of rows) if (!validSkus.has(row.sku)) errors.push(issue(sheet, row.rowNumber, row.sku, 'sku', row.sku, 'SKU не найден ни на листе Products, ни в базе данных.'));
    }
    validateChildDuplicates(specs, images, documents, errors);

    const [categories, brands, series, productTypes, unitMeasures, existingProducts] = await Promise.all([
        prisma.category.findMany({ select: { id: true, slug: true } }),
        prisma.brand.findMany({ select: { id: true, slug: true } }),
        prisma.series.findMany({ select: { id: true, slug: true } }),
        prisma.productType.findMany({ select: { id: true, code: true, isActive: true } }),
        prisma.unitMeasure.findMany({ select: { id: true, code: true, isActive: true } }),
        prisma.product.findMany({
            where: { OR: [{ sku: { in: products.map((row) => row.sku) } }, { article: { in: products.flatMap((row) => row.article ? [row.article] : []) } }, { barcode: { in: products.flatMap((row) => row.barcode ? [row.barcode] : []) } }, { slug: { in: products.map((row) => row.slug) } }] },
            include: { specs: true, images: true, documents: true },
        }),
    ]);
    const categoryMap = new Map(categories.map((row) => [row.slug, row.id]));
    const brandMap = new Map(brands.map((row) => [row.slug, row.id]));
    const seriesMap = new Map(series.map((row) => [row.slug, row.id]));
    const typeMap = new Map(productTypes.map((row) => [row.code, row]));
    const unitMap = new Map(unitMeasures.map((row) => [row.code, row]));
    const existingBySku = new Map(existingProducts.map((row) => [row.sku, row]));

    const resolved: ResolvedProduct[] = [];
    for (const row of products) {
        const categoryId = categoryMap.get(row.category_slug);
        const brandId = row.brand_slug ? brandMap.get(row.brand_slug) : null;
        const seriesId = row.series_slug ? seriesMap.get(row.series_slug) : null;
        const productType = typeMap.get(row.product_type_code);
        const unit = unitMap.get(row.unit_code);
        if (!categoryId) errors.push(issue('Products', row.rowNumber, row.sku, 'category_slug', row.category_slug, 'Категория не найдена.'));
        if (row.brand_slug && !brandId) errors.push(issue('Products', row.rowNumber, row.sku, 'brand_slug', row.brand_slug, 'Бренд не найден.'));
        if (row.series_slug && !seriesId) errors.push(issue('Products', row.rowNumber, row.sku, 'series_slug', row.series_slug, 'Серия не найдена.'));
        if (!productType || !productType.isActive) errors.push(issue('Products', row.rowNumber, row.sku, 'product_type_code', row.product_type_code, 'Тип товара не найден или отключён.'));
        if (!unit || !unit.isActive) errors.push(issue('Products', row.rowNumber, row.sku, 'unit_code', row.unit_code, 'Единица измерения не найдена или отключена.'));
        if (row.operating_temp_from_c != null && row.operating_temp_to_c != null && row.operating_temp_from_c > row.operating_temp_to_c) errors.push(issue('Products', row.rowNumber, row.sku, 'operating_temp_to_c', row.operating_temp_to_c, 'Верхняя температура должна быть не ниже нижней.'));
        if (!categoryId || !productType?.isActive || !unit?.isActive || (row.brand_slug && !brandId) || (row.series_slug && !seriesId)) continue;

        const domainCheck = productSchema.safeParse(toProductForm(row, { categoryId, brandId: brandId ?? null, seriesId: seriesId ?? null, productTypeId: productType.id, unitMeasureId: unit.id }));
        if (!domainCheck.success) for (const problem of domainCheck.error.issues) errors.push(issue('Products', row.rowNumber, row.sku, String(problem.path[0] ?? ''), null, problem.message));
        resolved.push({ ...row, categoryId, brandId: brandId ?? null, seriesId: seriesId ?? null, productTypeId: productType.id, unitMeasureId: unit.id });
    }

    for (const row of products) {
        const current = existingBySku.get(row.sku);
        for (const [field, value] of [['article', row.article], ['barcode', row.barcode], ['slug', row.slug]] as const) {
            if (!value) continue;
            const conflict = existingProducts.find((candidate) => candidate[field] === value && candidate.sku !== row.sku);
            if (conflict) errors.push(issue('Products', row.rowNumber, row.sku, field, value, `Значение уже используется товаром SKU ${conflict.sku}.`));
        }
        if (!current && existingProducts.some((candidate) => candidate.slug === row.slug)) errors.push(issue('Products', row.rowNumber, row.sku, 'slug', row.slug, 'Slug уже используется другим товаром.'));
    }

    const specsBySku = groupBySku(specs);
    const imagesBySku = groupBySku(images);
    const documentsBySku = groupBySku(documents);
    let createdCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    for (const row of resolved) {
        const current = existingBySku.get(row.sku);
        if (!current) createdCount += 1;
        else if (productChanged(current, row, specsBySku.get(row.sku), imagesBySku.get(row.sku), documentsBySku.get(row.sku))) updatedCount += 1;
        else unchangedCount += 1;
    }

    return { products: resolved, specsBySku, imagesBySku, documentsBySku, errors, totalRows: parsed.totalRows, createdCount, updatedCount, unchangedCount };
}

export async function applyCatalogImportPlan(plan: CatalogImportPlan) {
    for (let offset = 0; offset < plan.products.length; offset += catalogImportConfig.batchSize) {
        const batch = plan.products.slice(offset, offset + catalogImportConfig.batchSize);
        await prisma.$transaction(async (tx) => {
            for (const row of batch) {
                const existing = await tx.product.findUnique({ where: { sku: row.sku }, select: { id: true } });
                const data = productData(row);
                const specs = plan.specsBySku.get(row.sku);
                const images = plan.imagesBySku.get(row.sku);
                const documents = plan.documentsBySku.get(row.sku);
                const primaryImage = images ? [...images].sort((a, b) => a.sort_order - b.sort_order).find((image) => image.is_primary) ?? [...images].sort((a, b) => a.sort_order - b.sort_order)[0] : undefined;
                if (existing) {
                    await tx.product.update({ where: { id: existing.id }, data: { ...data, imageUrl: images ? primaryImage?.url ?? null : data.imageUrl, specs: specs ? { deleteMany: {}, create: specs.map((spec) => ({ name: spec.name, value: spec.value, unit: spec.unit })) } : undefined, images: images ? { deleteMany: {}, create: images.map((image) => ({ url: image.url, altText: image.alt_text, isPrimary: image === primaryImage, sortOrder: image.sort_order })) } : undefined, documents: documents ? { deleteMany: {}, create: documents.map((document) => ({ title: document.title, url: document.url, fileName: document.file_name, mimeType: document.mime_type, size: document.size, storageKey: document.storage_key, sortOrder: document.sort_order })) } : undefined } });
                } else {
                    await tx.product.create({ data: { ...data, imageUrl: primaryImage?.url ?? data.imageUrl, specs: specs?.length ? { create: specs.map((spec) => ({ name: spec.name, value: spec.value, unit: spec.unit })) } : undefined, images: images?.length ? { create: images.map((image) => ({ url: image.url, altText: image.alt_text, isPrimary: image === primaryImage, sortOrder: image.sort_order })) } : undefined, documents: documents?.length ? { create: documents.map((document) => ({ title: document.title, url: document.url, fileName: document.file_name, mimeType: document.mime_type, size: document.size, storageKey: document.storage_key, sortOrder: document.sort_order })) } : undefined } });
                }
            }
        });
    }
}

function parseRows<T extends z.ZodTypeAny>(rows: ParsedCatalogWorkbook[keyof ParsedCatalogWorkbook], schema: T, sheet: string, errors: CatalogImportErrorDto[]) {
    const result: Array<z.infer<T> & { rowNumber: number }> = [];
    for (const row of rows) {
        const parsed = schema.safeParse(row.values);
        const sku = String(row.values.sku ?? '').trim() || null;
        if (!parsed.success) {
            for (const problem of parsed.error.issues) errors.push(issue(sheet, row.rowNumber, sku, String(problem.path[0] ?? ''), row.values[String(problem.path[0] ?? '')], humanizeZodError(problem)));
        } else result.push({ ...parsed.data, rowNumber: row.rowNumber });
    }
    return result;
}

function validateDuplicateValues(products: ProductRow[], errors: CatalogImportErrorDto[]) {
    for (const field of ['sku', 'article', 'barcode', 'slug'] as const) {
        const seen = new Map<string, number>();
        for (const row of products) {
            const value = row[field];
            if (!value) continue;
            if (seen.has(value)) errors.push(issue('Products', row.rowNumber, row.sku, field, value, `Значение дублируется в строке ${seen.get(value)}.`));
            else seen.set(value, row.rowNumber);
        }
    }
}

function validateUrls(products: ProductRow[], images: Array<ImageRow & { rowNumber: number }>, documents: Array<DocumentRow & { rowNumber: number }>, errors: CatalogImportErrorDto[]) {
    for (const row of products) for (const field of ['datasheet_url', 'image_url'] as const) if (row[field] && !isValidUrl(row[field])) errors.push(issue('Products', row.rowNumber, row.sku, field, row[field], 'Некорректный URL.'));
    for (const row of images) if (!isValidUrl(row.url)) errors.push(issue('Images', row.rowNumber, row.sku, 'url', row.url, 'Некорректный URL.'));
    for (const row of documents) if (!isValidUrl(row.url)) errors.push(issue('Documents', row.rowNumber, row.sku, 'url', row.url, 'Некорректный URL.'));
}

function validateChildDuplicates(specs: Array<SpecRow & { rowNumber: number }>, images: Array<ImageRow & { rowNumber: number }>, documents: Array<DocumentRow & { rowNumber: number }>, errors: CatalogImportErrorDto[]) {
    checkDuplicates(specs, (row) => `${row.sku}\0${row.name}`, 'ProductSpecs', errors, 'Повторяющаяся характеристика товара.');
    checkDuplicates(images, (row) => `${row.sku}\0${row.url}`, 'Images', errors, 'Повторяющееся изображение товара.');
    checkDuplicates(documents, (row) => `${row.sku}\0${row.storage_key || row.url}`, 'Documents', errors, 'Повторяющийся документ товара.');
    for (const [sku, rows] of groupBySku(images)) if (rows.filter((row) => row.is_primary).length > 1) for (const row of rows.filter((image) => image.is_primary)) errors.push(issue('Images', row.rowNumber, sku, 'is_primary', true, 'Для SKU указано больше одного основного изображения.'));
}

function checkDuplicates<T extends { rowNumber: number; sku: string }>(rows: T[], key: (row: T) => string, sheet: string, errors: CatalogImportErrorDto[], message: string) {
    const seen = new Set<string>();
    for (const row of rows) { const value = key(row); if (seen.has(value)) errors.push(issue(sheet, row.rowNumber, row.sku, null, null, message)); else seen.add(value); }
}

function groupBySku<T extends { sku: string }>(rows: T[]) { const result = new Map<string, T[]>(); for (const row of rows) result.set(row.sku, [...(result.get(row.sku) ?? []), row]); return result; }

function productData(row: ResolvedProduct) {
    return { categoryId: row.categoryId, brandId: row.brandId, seriesId: row.seriesId, productTypeId: row.productTypeId, unitMeasureId: row.unitMeasureId, sku: row.sku, article: row.article, barcode: row.barcode, name: row.name, slug: row.slug, description: row.description, model: row.model, seoTitle: row.seo_title, metaDescription: row.meta_description, status: row.status, availability: row.availability, vatRate: row.vat_rate, price: row.price, purchasePrice: row.purchase_price, priceOld: row.price_old, currency: row.currency.toUpperCase(), stockQty: row.stock_qty, minOrderQty: row.min_order_qty, stepQty: row.step_qty, popularityWeight: row.popularity_weight, leadTimeDays: row.lead_time_days, warrantyMonths: row.warranty_months, datasheetUrl: row.datasheet_url, imageUrl: row.image_url, weightKg: row.weight_kg, widthMm: row.width_mm, heightMm: row.height_mm, depthMm: row.depth_mm, voltageV: row.voltage_v, currentA: row.current_a, powerW: row.power_w, frequencyHz: row.frequency_hz, protectionClassIp: row.protection_class_ip, operatingTempFromC: row.operating_temp_from_c, operatingTempToC: row.operating_temp_to_c, isSellable: row.is_sellable };
}

function toProductForm(row: ProductRow, refs: { categoryId: number; brandId: number | null; seriesId: number | null; productTypeId: number; unitMeasureId: number }) { return { ...refs, sku: row.sku, article: row.article, barcode: row.barcode, name: row.name, slug: row.slug, description: row.description, model: row.model, seoTitle: row.seo_title, metaDescription: row.meta_description, status: row.status, availability: row.availability, vatRate: row.vat_rate, price: row.price, purchasePrice: row.purchase_price, priceOld: row.price_old, currency: row.currency, stockQty: row.stock_qty, minOrderQty: row.min_order_qty, stepQty: row.step_qty, popularityWeight: row.popularity_weight, leadTimeDays: row.lead_time_days, datasheetUrl: row.datasheet_url, imageUrl: row.image_url, weightKg: row.weight_kg, widthMm: row.width_mm, heightMm: row.height_mm, depthMm: row.depth_mm, voltageV: row.voltage_v, currentA: row.current_a, powerW: row.power_w, frequencyHz: row.frequency_hz, protectionClassIp: row.protection_class_ip, operatingTempFromC: row.operating_temp_from_c, operatingTempToC: row.operating_temp_to_c, isSellable: row.is_sellable, specs: [], images: [], documents: [] }; }

function productChanged(current: Record<string, unknown> & { specs: unknown[]; images: unknown[]; documents: unknown[] }, row: ResolvedProduct, specs?: SpecRow[], images?: ImageRow[], documents?: DocumentRow[]) {
    const desired = productData(row) as Record<string, unknown>;
    if (images) {
        const orderedImages = [...images].sort((a, b) => a.sort_order - b.sort_order);
        desired.imageUrl = (orderedImages.find((image) => image.is_primary) ?? orderedImages[0])?.url ?? null;
    }
    for (const [key, value] of Object.entries(desired)) if (normalize(current[key]) !== normalize(value)) return true;
    if (specs && stable(specs.map((s) => [s.name, s.value, s.unit])) !== stable(current.specs.map((s) => { const v = s as { name: string; value: string; unit: string | null }; return [v.name, v.value, v.unit]; }))) return true;
    if (images) {
        const ordered = [...images].sort((a, b) => a.sort_order - b.sort_order);
        const primary = ordered.find((image) => image.is_primary) ?? ordered[0];
        if (stable(images.map((i) => [i.url, i.alt_text, i === primary, i.sort_order])) !== stable(current.images.map((i) => { const v = i as { url: string; altText: string | null; isPrimary: boolean; sortOrder: number }; return [v.url, v.altText, v.isPrimary, v.sortOrder]; }))) return true;
    }
    if (documents && stable(documents.map((d) => [d.title, d.url, d.file_name, d.mime_type, d.size, d.storage_key, d.sort_order])) !== stable(current.documents.map((d) => { const v = d as { title: string; url: string; fileName: string; mimeType: string; size: number; storageKey: string; sortOrder: number }; return [v.title, v.url, v.fileName, v.mimeType, v.size, v.storageKey, v.sortOrder]; }))) return true;
    return false;
}

function stable(value: unknown[]) { return JSON.stringify([...value].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))); }
function normalize(value: unknown) { if (value === null || value === undefined) return null; if (typeof value === 'number') return String(value); if (typeof value === 'object' && value && 'toString' in value) return String(value); return value; }
function isValidUrl(value: string) { if (value.startsWith('/')) return true; try { const url = new URL(value); return url.protocol === 'http:' || url.protocol === 'https:'; } catch { return false; } }
function toText(value: unknown) { return value == null ? '' : String(value).trim(); }
function toNullableText(value: unknown) { const result = toText(value); return result || null; }
function toNumber(value: unknown) { if (typeof value === 'number') return value; return Number(String(value ?? '').trim().replace(',', '.')); }
function toNullableNumber(value: unknown) { if (value === null || value === undefined || String(value).trim() === '') return null; return toNumber(value); }
function toBoolean(value: unknown) { if (typeof value === 'boolean') return value; if (typeof value === 'number') return value === 1; const text = String(value ?? '').trim().toLowerCase(); if (['true', '1', 'yes', 'да'].includes(text)) return true; if (['false', '0', 'no', 'нет'].includes(text)) return false; return value; }
function humanizeZodError(problem: z.ZodIssue) { if (problem.code === 'invalid_type') return 'Некорректный тип или пустое обязательное значение.'; if (problem.code === 'invalid_enum_value') return 'Недопустимое значение.'; return problem.message; }
