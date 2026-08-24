import { NextResponse } from 'next/server';
import {
    getProductErrorResponse,
    getProductRelations,
    getProductWriteData,
    productSchema,
    resolveProductVariantGroupId,
    validateProductVariantValue,
    validateProductReferences,
} from '@/lib/admin-product-form';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = productSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные данные товара' },
            { status: 400 },
        );
    }

    const data = parsed.data;
    try {
        await validateProductReferences(data);
    } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Некорректные связи товара.' }, { status: 400 });
    }
    const {
        specs,
        attributeValues,
        packageItems,
        images,
        documents,
    } = getProductRelations(data);
    const primaryImageIndex = getPrimaryImageIndex(images);

    try {
        const variantGroupId = await resolveProductVariantGroupId(data);
        await validateProductVariantValue(data, variantGroupId);
        const product = await prisma.product.create({
            data: {
                ...getProductWriteData(data),
                variantGroupId,
                imageUrl: primaryImageIndex >= 0 ? (images[primaryImageIndex].url as string) : data.imageUrl,
                specs: specs.length
                    ? {
                          create: specs.map((spec) => ({
                              name: spec.name as string,
                              value: spec.value as string,
                              unit: spec.unit || null,
                          })),
                      }
                    : undefined,
                attributeValues: attributeValues.length
                    ? {
                          create: attributeValues.map((value) => ({
                              attributeId: value.attributeId,
                              textValue: value.textValue || null,
                              numberValue: value.numberValue ?? null,
                              booleanValue: value.booleanValue ?? null,
                          })),
                      }
                    : undefined,
                packageItems: packageItems.length
                    ? {
                          create: packageItems.map((item) => ({
                              componentProductId: item.componentProductId || null,
                              itemName: item.itemName,
                              quantity: item.quantity,
                              isIncluded: item.isIncluded === 'on' || item.isIncluded === true,
                              note: item.note || null,
                          })),
                      }
                    : undefined,
                images: images.length
                    ? {
                          create: images.map((image, index) => ({
                              url: image.url as string,
                              altText: image.altText || null,
                              sortOrder: image.sortOrder ?? index,
                              isPrimary: index === primaryImageIndex,
                          })),
                      }
                    : undefined,
                documents: documents.length
                    ? {
                          create: documents.map((document, index) => ({
                              title:
                                  document.title ||
                                  document.fileName ||
                                  `Документ ${index + 1}`,
                              url: document.url as string,
                              fileName: document.fileName || '',
                              mimeType: document.mimeType || 'application/pdf',
                              size: document.size ?? 0,
                              storageKey: document.storageKey || '',
                              sortOrder: document.sortOrder ?? index,
                          })),
                      }
                    : undefined,
            },
            select: {
                id: true,
                sku: true,
                name: true,
                slug: true,
            },
        });

        return NextResponse.json({ product }, { status: 201 });
    } catch (error) {
        const knownError = getProductErrorResponse(error);

        if (knownError) {
            return NextResponse.json({ error: knownError.error }, { status: knownError.status });
        }

        const message = error instanceof Error ? error.message : 'Failed to create product';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

function getPrimaryImageIndex(
    images: Array<{ isPrimary?: boolean | 'on'; url?: string | null }>,
) {
    if (!images.length) return -1;

    const checkedIndex = images.findIndex(
        (image) => image.isPrimary === true || image.isPrimary === 'on',
    );

    return checkedIndex >= 0 ? checkedIndex : 0;
}
