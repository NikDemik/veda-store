import { z } from 'zod';
import { prisma } from '@/lib/prisma';

function emptyStringToNull(value: unknown) {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function emptyStringToUndefined(value: unknown) {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
}

const nullablePositiveId = z.preprocess(
    emptyStringToNull,
    z.coerce.number().int().positive().nullable().optional(),
);
const nullableString = z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional());
const nullableDescription = z.preprocess(
    emptyStringToNull,
    z.string().trim().max(2000).nullable().optional(),
);
const nullableUrlString = z.preprocess(
    emptyStringToNull,
    z.string().trim().max(191).nullable().optional(),
);
const nullableDecimal = z.preprocess(
    emptyStringToNull,
    z.coerce.number().nonnegative().nullable().optional(),
);
const nullableInteger = z.preprocess(
    emptyStringToNull,
    z.coerce.number().int().nullable().optional(),
);
const nullableNonNegativeInteger = z.preprocess(
    emptyStringToNull,
    z.coerce.number().int().nonnegative().nullable().optional(),
);

const productSpecSchema = z.object({
    name: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    value: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    unit: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
});

const productAttributeValueSchema = z.object({
    attributeId: z.coerce.number().int().positive(),
    textValue: nullableString,
    numberValue: nullableDecimal,
    booleanValue: z.union([z.literal('true'), z.literal('false'), z.boolean()]).optional(),
});

const productPackageItemSchema = z.object({
    componentProductId: nullablePositiveId,
    itemName: nullableString,
    quantity: z.preprocess(emptyStringToUndefined, z.coerce.number().positive().default(1)),
    isIncluded: z.union([z.literal('on'), z.boolean()]).optional(),
    note: nullableString,
});

const productImageSchema = z.object({
    url: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    altText: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    sortOrder: z.preprocess(
        emptyStringToNull,
        z.coerce.number().int().nonnegative().nullable().optional(),
    ),
    isPrimary: z.union([z.literal('on'), z.boolean()]).optional(),
});

const productDocumentSchema = z.object({
    title: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    url: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    fileName: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    mimeType: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    size: z.preprocess(
        emptyStringToNull,
        z.coerce.number().int().nonnegative().nullable().optional(),
    ),
    storageKey: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    sortOrder: z.preprocess(
        emptyStringToNull,
        z.coerce.number().int().nonnegative().nullable().optional(),
    ),
});

export const productSchema = z.object({
    categoryId: z.coerce.number().int().positive('Категория обязательна'),
    brandId: nullablePositiveId,
    seriesId: nullablePositiveId,
    productTypeId: z.coerce.number().int().positive('Тип товара обязателен'),
    variantGroupId: nullablePositiveId,
    newVariantGroupName: nullableString,
    newVariantGroupCode: z.preprocess(
        emptyStringToNull,
        z.string().trim().max(191).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Код группы вариантов должен содержать латиницу, цифры и дефисы').nullable().optional(),
    ),
    newVariantGroupAttributeId: nullablePositiveId,
    isSellable: z.union([z.literal('on'), z.boolean()]).optional().default(true),
    sku: z.string().trim().min(1, 'SKU обязателен').max(191),
    article: z.preprocess(emptyStringToNull, z.string().trim().max(191).nullable().optional()),
    model: nullableString,
    barcode: nullableString,
    name: z.string().trim().min(1, 'Название товара обязательно').max(191),
    slug: z
        .string()
        .trim()
        .min(1, 'Slug товара обязателен')
        .max(191)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug должен содержать латиницу, цифры и дефисы'),
    description: nullableDescription,
    seoTitle: nullableString,
    metaDescription: z.preprocess(
        emptyStringToNull,
        z.string().trim().max(5000).nullable().optional(),
    ),
    status: z.enum(['DRAFT', 'ACTIVE', 'ARCHIVED']).default('ACTIVE'),
    availability: z
        .enum(['IN_STOCK', 'BACKORDER', 'OUT_OF_STOCK', 'DISCONTINUED'])
        .default('IN_STOCK'),
    price: z.coerce.number().nonnegative('Цена не может быть отрицательной'),
    purchasePrice: nullableDecimal,
    priceOld: nullableDecimal,
    currency: z.string().trim().min(1).max(3).default('RUB'),
    unitMeasureId: z.coerce.number().int().positive('Единица измерения обязательна'),
    vatRate: z.preprocess(emptyStringToUndefined, z.coerce.number().nonnegative().default(22)),
    stockQty: z.preprocess(emptyStringToUndefined, z.coerce.number().int().nonnegative().default(0)),
    minOrderQty: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().default(1)),
    stepQty: z.preprocess(emptyStringToUndefined, z.coerce.number().int().positive().default(1)),
    popularityWeight: z.preprocess(
        emptyStringToUndefined,
        z.coerce.number().int().nonnegative().default(0),
    ),
    leadTimeDays: nullableNonNegativeInteger,
    datasheetUrl: nullableUrlString,
    imageUrl: nullableUrlString,
    weightKg: nullableDecimal,
    widthMm: nullableDecimal,
    heightMm: nullableDecimal,
    depthMm: nullableDecimal,
    voltageV: nullableString,
    currentA: nullableString,
    powerW: nullableString,
    frequencyHz: nullableString,
    protectionClassIp: nullableString,
    operatingTempFromC: nullableInteger,
    operatingTempToC: nullableInteger,
    specs: z.array(productSpecSchema).optional().default([]),
    attributeValues: z.array(productAttributeValueSchema).optional().default([]),
    packageItems: z.array(productPackageItemSchema).optional().default([]),
    images: z.array(productImageSchema).optional().default([]),
    documents: z.array(productDocumentSchema).optional().default([]),
}).superRefine((data, context) => {
    const newVariantFields = [
        data.newVariantGroupName,
        data.newVariantGroupCode,
        data.newVariantGroupAttributeId,
    ];
    if (!data.variantGroupId && newVariantFields.some(Boolean) && !newVariantFields.every(Boolean)) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['newVariantGroupName'],
            message: 'Для новой группы вариантов заполните название, код и основной параметр.',
        });
    }
    if (data.seriesId && !data.productTypeId) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ['productTypeId'], message: 'Для товара серии необходимо выбрать тип.' });
    }
});

export type ParsedProductForm = z.infer<typeof productSchema>;

export async function validateProductReferences(data: ParsedProductForm) {
    if (data.productTypeId) {
        const productType = await prisma.productType.findFirst({ where: { id: data.productTypeId, isActive: true }, select: { id: true } });
        if (!productType) throw new Error('Выбранный тип товара не найден или отключён.');
    }
    if (data.variantGroupId) {
        const variantGroup = await prisma.productVariantGroup.findUnique({
            where: { id: data.variantGroupId },
            select: { id: true },
        });
        if (!variantGroup) throw new Error('Выбранная группа вариантов не найдена.');
    }
    if (!data.variantGroupId && data.newVariantGroupAttributeId) {
        const attribute = await prisma.attributeDefinition.findUnique({
            where: { id: data.newVariantGroupAttributeId },
            select: { id: true },
        });
        if (!attribute) throw new Error('Основной параметр группы вариантов не найден.');
    }
}

export function getProductRelations(data: ParsedProductForm) {
    return {
        specs: data.specs.filter((spec) => spec.name && spec.value),
        attributeValues: data.attributeValues
            .map((value) => ({
                ...value,
                booleanValue:
                    value.booleanValue === 'true'
                        ? true
                        : value.booleanValue === 'false'
                          ? false
                          : value.booleanValue,
            }))
            .filter(
                (value) =>
                    value.textValue !== null && value.textValue !== undefined ||
                    value.numberValue !== null && value.numberValue !== undefined ||
                    value.booleanValue !== undefined,
            ),
        packageItems: data.packageItems
            .filter((item) => item.itemName)
            .map((item) => ({ ...item, itemName: item.itemName as string })),
        images: data.images.filter((image) => image.url),
        documents: data.documents.filter((document) => document.url),
    };
}

export function getProductWriteData(data: ParsedProductForm) {
    return {
        categoryId: data.categoryId,
        brandId: data.brandId || null,
        seriesId: data.seriesId || null,
        productTypeId: data.productTypeId,
        variantGroupId: data.variantGroupId || null,
        isSellable: data.isSellable === 'on' || data.isSellable === true,
        sku: data.sku,
        article: data.article || null,
        model: data.model || null,
        barcode: data.barcode || null,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
        seoTitle: data.seoTitle || null,
        metaDescription: data.metaDescription || null,
        status: data.status,
        availability: data.availability,
        price: data.price,
        purchasePrice: data.purchasePrice || null,
        priceOld: data.priceOld || null,
        currency: data.currency.toUpperCase(),
        unitMeasureId: data.unitMeasureId,
        vatRate: data.vatRate,
        stockQty: data.stockQty,
        minOrderQty: data.minOrderQty,
        stepQty: data.stepQty,
        popularityWeight: data.popularityWeight,
        leadTimeDays: data.leadTimeDays || null,
        datasheetUrl: data.datasheetUrl || null,
        imageUrl: data.imageUrl || null,
        weightKg: data.weightKg || null,
        widthMm: data.widthMm || null,
        heightMm: data.heightMm || null,
        depthMm: data.depthMm || null,
        voltageV: data.voltageV || null,
        currentA: data.currentA || null,
        powerW: data.powerW || null,
        frequencyHz: data.frequencyHz || null,
        protectionClassIp: data.protectionClassIp || null,
        operatingTempFromC: data.operatingTempFromC,
        operatingTempToC: data.operatingTempToC,
    };
}

export async function resolveProductVariantGroupId(data: ParsedProductForm) {
    if (data.variantGroupId) return data.variantGroupId;

    if (
        !data.newVariantGroupName ||
        !data.newVariantGroupCode ||
        !data.newVariantGroupAttributeId
    ) {
        return null;
    }

    const existingGroup = await prisma.productVariantGroup.findUnique({
        where: { code: data.newVariantGroupCode },
        select: { id: true, name: true, attributeId: true },
    });

    if (existingGroup) {
        if (
            existingGroup.name !== data.newVariantGroupName ||
            existingGroup.attributeId !== data.newVariantGroupAttributeId
        ) {
            throw new Error('Группа вариантов с таким кодом уже существует с другими настройками.');
        }
        return existingGroup.id;
    }

    const group = await prisma.productVariantGroup.create({
        data: {
            name: data.newVariantGroupName,
            code: data.newVariantGroupCode,
            attributeId: data.newVariantGroupAttributeId,
        },
        select: { id: true },
    });

    return group.id;
}

export async function validateProductVariantValue(
    data: ParsedProductForm,
    variantGroupId: number | null,
    excludedProductId?: number,
) {
    if (!variantGroupId) return;

    const group = await prisma.productVariantGroup.findUnique({
        where: { id: variantGroupId },
        select: { attributeId: true, attribute: { select: { name: true } } },
    });
    if (!group) throw new Error('Группа вариантов не найдена.');

    const selectedValue = data.attributeValues.find(
        (value) => value.attributeId === group.attributeId,
    );
    const booleanValue =
        selectedValue?.booleanValue === 'true'
            ? true
            : selectedValue?.booleanValue === 'false'
              ? false
              : selectedValue?.booleanValue;
    const hasValue =
        selectedValue &&
        (selectedValue.textValue != null ||
            selectedValue.numberValue != null ||
            selectedValue.booleanValue !== undefined);
    if (!selectedValue || !hasValue) {
        throw new Error(`Заполните основной параметр группы вариантов: «${group.attribute.name}».`);
    }

    const duplicate = await prisma.product.findFirst({
        where: {
            variantGroupId,
            id: excludedProductId ? { not: excludedProductId } : undefined,
            attributeValues: {
                some: {
                    attributeId: group.attributeId,
                    textValue: selectedValue.textValue ?? null,
                    numberValue: selectedValue.numberValue ?? null,
                    booleanValue: booleanValue ?? null,
                },
            },
        },
        select: { name: true },
    });
    if (duplicate) {
        throw new Error(
            `В группе уже есть товар «${duplicate.name}» с таким значением основного параметра.`,
        );
    }
}

export function getProductErrorResponse(error: unknown) {
    if (typeof error === 'object' && error && 'code' in error) {
        const code = (error as { code?: string }).code;

        if (code === 'P2002') {
            return {
                error: 'Товар с таким SKU, артикулом или slug уже существует.',
                status: 409,
            };
        }

        if (code === 'P2003') {
            return {
                error: 'Категория, бренд или серия не найдены.',
                status: 400,
            };
        }

        if (code === 'P2000') {
            return {
                error: 'Одно из текстовых полей слишком длинное для сохранения.',
                status: 400,
            };
        }
    }

    return null;
}
