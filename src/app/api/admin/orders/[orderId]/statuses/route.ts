import { FulfillmentStatus, OrderStatus, PaymentStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const orderStatuses = Object.values(OrderStatus) as [OrderStatus, ...OrderStatus[]];
const paymentStatuses = Object.values(PaymentStatus) as [PaymentStatus, ...PaymentStatus[]];
const fulfillmentStatuses = Object.values(FulfillmentStatus) as [
    FulfillmentStatus,
    ...FulfillmentStatus[],
];

const orderStatusesSchema = z.object({
    orderStatus: z.enum(orderStatuses),
    paymentStatus: z.enum(paymentStatuses),
    fulfillmentStatus: z.enum(fulfillmentStatuses),
});

function parseOrderId(value: string) {
    const orderId = Number(value);

    return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ orderId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId: rawOrderId } = await context.params;
    const orderId = parseOrderId(rawOrderId);

    if (!orderId) {
        return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = orderStatusesSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные статусы заказа' },
            { status: 400 },
        );
    }

    try {
        const order = await prisma.$transaction(async (tx) => {
            const currentOrder = await tx.order.findUnique({
                where: { id: orderId },
                select: {
                    id: true,
                    orderStatus: true,
                    paymentStatus: true,
                    fulfillmentStatus: true,
                },
            });

            if (!currentOrder) return null;

            const updatedOrder = await tx.order.update({
                where: { id: currentOrder.id },
                data: parsed.data,
                select: {
                    id: true,
                    orderStatus: true,
                    paymentStatus: true,
                    fulfillmentStatus: true,
                },
            });

            if (currentOrder.orderStatus !== parsed.data.orderStatus) {
                await tx.orderStatusHistory.create({
                    data: {
                        orderId: currentOrder.id,
                        fromStatus: currentOrder.orderStatus,
                        toStatus: parsed.data.orderStatus,
                        changedByStaffUserId: staffUser.id,
                        comment: 'Статус заказа изменен в админке',
                    },
                });
            }

            return updatedOrder;
        });

        if (!order) {
            return NextResponse.json({ error: 'Заказ не найден.' }, { status: 404 });
        }

        return NextResponse.json({ order });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to update order statuses';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
