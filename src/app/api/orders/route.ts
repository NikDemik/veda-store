import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { auth } from '@/auth';
import {
    createInvoiceNumber,
    generateAndStoreInvoicePdf,
    getInvoiceDueAt,
} from '@/lib/invoices';
import { notifyOrderCreated } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import type { DeliveryType, PaymentType } from '@/types/data';

export const runtime = 'nodejs';

type CreateOrderPayload = {
    organizationId: number;
    createdByUserId?: number | null;
    paymentType: PaymentType;
    deliveryType: DeliveryType;
    shippingAddressId?: number | null;
    comment?: string | null;
    shippingAddress?: {
        label?: string | null;
        fullAddress?: string;
        country?: string | null;
        region?: string | null;
        city?: string | null;
        street?: string | null;
        house?: string | null;
        building?: string | null;
        flat?: string | null;
        postalCode?: string | null;
    } | null;
    items: Array<{
        productId: number;
        quantity: number;
    }>;
};

const paymentTypes: PaymentType[] = ['BANK_TRANSFER', 'PREPAYMENT', 'POSTPAYMENT'];
const deliveryTypes: DeliveryType[] = ['PICKUP', 'TRANSPORT_COMPANY', 'CDEK'];

function isPositiveInt(value: unknown) {
    return Number.isInteger(value) && (value as number) > 0;
}

function createOrderNumber(latestOrder?: { id: number; number: string } | null) {
    const numberMatch = latestOrder?.number.match(/^(SO-\d{4}-)(\d+)$/);

    if (numberMatch) {
        const [, prefix, numericPart] = numberMatch;
        const nextNumber = Number.parseInt(numericPart, 10) + 1;

        return `${prefix}${nextNumber.toString().padStart(numericPart.length, '0')}`;
    }

    const nextNumber = (latestOrder?.id ?? 0) + 1;

    return `ORD-${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`;
}

function isNumberConflict(error: unknown) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2002') {
        return false;
    }

    const target = error.meta?.target;

    return Array.isArray(target) && target.includes('number');
}

function deriveAddressParts(fullAddress: string, address?: CreateOrderPayload['shippingAddress']) {
    const normalizedFullAddress = fullAddress.trim();
    const rawParts = normalizedFullAddress
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    const city = address?.city?.trim() || rawParts[0] || normalizedFullAddress;
    const street = address?.street?.trim() || rawParts[1] || normalizedFullAddress;

    return { city, street };
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
        return NextResponse.json({ error: 'Неавторизованный' }, { status: 401 });
    }

    let payload: CreateOrderPayload;

    try {
        payload = (await request.json()) as CreateOrderPayload;
    } catch {
        return NextResponse.json({ error: 'Недопустимый JSON-файл' }, { status: 400 });
    }

    if (!paymentTypes.includes(payload?.paymentType)) {
        return NextResponse.json({ error: 'Недопустимый тип оплаты' }, { status: 400 });
    }

    if (!deliveryTypes.includes(payload?.deliveryType)) {
        return NextResponse.json({ error: 'Недопустимый тип доставки' }, { status: 400 });
    }

    if (!Array.isArray(payload?.items) || payload.items.length === 0) {
        return NextResponse.json({ error: 'Недопустимый тип доставки' }, { status: 400 });
    }

    for (const item of payload.items) {
        if (!isPositiveInt(item.productId) || !isPositiveInt(item.quantity)) {
            return NextResponse.json({ error: 'Недопустимый тип оплаты' }, { status: 400 });
        }
    }

    const organizationId = session.user.organizationId;
    const createdByUserId = Number(session.user.id);

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true, deferredPaymentDays: true },
    });

    if (!organization) {
        return NextResponse.json({ error: 'Организация не найдена' }, { status: 404 });
    }

    const productIds = payload.items.map((item) => item.productId);
    const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
        select: {
            id: true,
            sku: true,
            name: true,
            price: true,
            priceOnRequest: true,
            status: true,
            isSellable: true,
            vatRate: true,
            availability: true,
        },
    });

    if (products.length !== productIds.length) {
        return NextResponse.json(
            { error: 'Один или несколько продуктов не найдены' },
            { status: 404 },
        );
    }

    const quantityByProduct = new Map(payload.items.map((item) => [item.productId, item.quantity]));

    if (products.some((product) => product.priceOnRequest || product.status !== 'ACTIVE' || !product.isSellable)) {
        return NextResponse.json(
            { error: 'Один или несколько товаров недоступны для заказа или требуют уточнения цены.' },
            { status: 400 },
        );
    }

    const discountTotal = new Prisma.Decimal(0);
    let subtotal = new Prisma.Decimal(0);
    let vatTotal = new Prisma.Decimal(0);

    const orderItems = products.map((product) => {
        const quantity = quantityByProduct.get(product.id) ?? 1;
        const unitPrice = new Prisma.Decimal(product.price);
        const lineTotal = unitPrice.mul(quantity);
        const lineVat = lineTotal.div(122).mul(new Prisma.Decimal(product.vatRate));

        subtotal = subtotal.add(lineTotal);
        vatTotal = vatTotal.add(lineVat);

        return {
            productId: product.id,
            productSku: product.sku,
            productName: product.name,
            quantity,
            unitPrice,
            vatRate: new Prisma.Decimal(product.vatRate),
            lineTotal,
            availabilityAtOrder: product.availability,
            requiresConfirmation: product.availability === 'BACKORDER',
        };
    });

    const requiresConfirmation = products.some(
        (product) => product.availability === 'BACKORDER',
    );

    const grandTotal = subtotal.sub(discountTotal);

    for (let attempt = 1; attempt <= 3; attempt += 1) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                let shippingAddressId: number | null = null;

                if (payload.deliveryType !== 'PICKUP') {
                    if (payload.shippingAddressId) {
                        const existingAddress = await tx.address.findFirst({
                            where: {
                                id: payload.shippingAddressId,
                                organizationId,
                                OR: [{ isShipping: true }, { isLegal: true }],
                            },
                            select: { id: true },
                        });

                        if (!existingAddress) {
                            throw new Error('Адрес доставки не найден');
                        }

                        shippingAddressId = existingAddress.id;
                    } else {
                        if (!payload.shippingAddress) {
                            throw new Error('Для этого типа доставки требуется адрес доставки');
                        }

                        const { fullAddress } = payload.shippingAddress;

                        if (!fullAddress?.trim()) {
                            throw new Error('Недопустимый адрес доставки');
                        }

                        const normalizedFullAddress = fullAddress.trim();
                        const { city, street } = deriveAddressParts(
                            normalizedFullAddress,
                            payload.shippingAddress,
                        );

                        const address = await tx.address.create({
                            data: {
                                organizationId,
                                label: payload.shippingAddress.label ?? null,
                                fullAddress: normalizedFullAddress,
                                country: payload.shippingAddress.country ?? 'RU',
                                region: payload.shippingAddress.region ?? null,
                                city,
                                street,
                                house: payload.shippingAddress.house ?? null,
                                building: payload.shippingAddress.building ?? null,
                                flat: payload.shippingAddress.flat ?? null,
                                postalCode: payload.shippingAddress.postalCode ?? null,
                                isLegal: false,
                                isShipping: true,
                                isPrimary: false,
                            },
                            select: { id: true },
                        });

                        shippingAddressId = address.id;
                    }
                }

                const [latestOrder, latestInvoice] = await Promise.all([
                    tx.order.findFirst({
                        orderBy: { id: 'desc' },
                        select: {
                            id: true,
                            number: true,
                        },
                    }),
                    tx.invoice.findFirst({
                        orderBy: { id: 'desc' },
                        select: {
                            id: true,
                            number: true,
                        },
                    }),
                ]);
                const orderNumber = createOrderNumber(latestOrder);
                const issuedAt = new Date();
                const dueAt = getInvoiceDueAt(issuedAt, organization.deferredPaymentDays);

                const order = await tx.order.create({
                    data: {
                        organizationId,
                        createdByUserId: Number.isInteger(createdByUserId) ? createdByUserId : null,
                        shippingAddressId,
                        number: orderNumber,
                        orderStatus: 'NEW',
                        paymentStatus: 'PENDING',
                        fulfillmentStatus: 'ASSEMBLING',
                        documentStatus: 'REQUIRED',
                        paymentType: payload.paymentType,
                        deliveryType: payload.deliveryType,
                        comment: payload.comment ?? null,
                        deliveryContactName: session.user.name ?? '',
                        deliveryContactPhone: '',
                        subtotal,
                        discountTotal,
                        vatTotal,
                        grandTotal,
                        items: {
                            createMany: {
                                data: orderItems,
                            },
                        },
                    },
                    select: {
                        id: true,
                        number: true,
                        orderStatus: true,
                        paymentStatus: true,
                        fulfillmentStatus: true,
                        documentStatus: true,
                        grandTotal: true,
                        subtotal: true,
                        vatTotal: true,
                    },
                });

                const invoice = requiresConfirmation
                    ? null
                    : await tx.invoice.create({
                          data: {
                              orderId: order.id,
                              organizationId,
                              number: createInvoiceNumber(latestInvoice),
                              status: 'DRAFT',
                              subtotal,
                              vatTotal,
                              grandTotal,
                              currency: 'RUB',
                              issuedAt,
                              dueAt,
                          },
                          select: {
                              id: true,
                              number: true,
                              status: true,
                          },
                      });

                return { order, invoice };
            });

            if (!result.invoice) {
                await notifyOrderCreated(result.order.id);

                return NextResponse.json(
                    {
                        order: result.order,
                        invoice: null,
                        requiresConfirmation: true,
                    },
                    { status: 201 },
                );
            }

            try {
                const invoice = await generateAndStoreInvoicePdf(result.invoice.id);
                await notifyOrderCreated(result.order.id);

                return NextResponse.json(
                    {
                        order: result.order,
                        invoice,
                    },
                    { status: 201 },
                );
            } catch (error) {
                const invoiceError =
                    error instanceof Error ? error.message : 'Не удалось сформировать PDF счета';
                await notifyOrderCreated(result.order.id);

                return NextResponse.json(
                    {
                        order: result.order,
                        invoice: result.invoice,
                        invoiceError,
                    },
                    { status: 201 },
                );
            }
        } catch (error) {
            if (attempt < 3 && isNumberConflict(error)) {
                continue;
            }
            const message = error instanceof Error ? error.message : 'Не удалось создать заказ';
            return NextResponse.json({ error: message }, { status: 400 });
        }
    }
}
