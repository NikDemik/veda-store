import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

function parseOrderId(value: string) {
    const orderId = Number(value);

    return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ orderId: string }> },
) {
    const session = await auth();

    if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId: rawOrderId } = await context.params;
    const orderId = parseOrderId(rawOrderId);

    if (!orderId) {
        return NextResponse.json({ error: 'Invalid order id' }, { status: 400 });
    }

    const order = await prisma.order.findFirst({
        where: {
            id: orderId,
            organizationId: session.user.organizationId,
        },
        select: { id: true },
    });

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    await prisma.order.delete({
        where: { id: order.id },
    });

    return NextResponse.json({ ok: true });
}
