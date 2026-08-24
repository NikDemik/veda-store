import { NextResponse } from 'next/server';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { createInvoiceForOrder } from '@/lib/invoices';

const allowedRoles = new Set(['SUPERADMIN', 'ADMIN', 'SALES_MANAGER', 'ACCOUNTANT']);

function parseOrderId(value: string) {
    const orderId = Number(value);
    return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export async function POST(
    _request: Request,
    context: { params: Promise<{ orderId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!allowedRoles.has(staffUser.role)) {
        return NextResponse.json({ error: 'Недостаточно прав для формирования счета.' }, { status: 403 });
    }

    const { orderId: rawOrderId } = await context.params;
    const orderId = parseOrderId(rawOrderId);

    if (!orderId) {
        return NextResponse.json({ error: 'Некорректный идентификатор заказа.' }, { status: 400 });
    }

    try {
        const invoice = await createInvoiceForOrder(orderId);
        return NextResponse.json({ invoice });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Не удалось сформировать счет.';
        const status = message === 'Заказ не найден.' ? 404 : 400;
        return NextResponse.json({ error: message }, { status });
    }
}
