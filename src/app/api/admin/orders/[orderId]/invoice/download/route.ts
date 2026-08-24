import { NextResponse } from 'next/server';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { createPresignedObjectDownload } from '@/lib/object-storage';
import { prisma } from '@/lib/prisma';

const allowedRoles = new Set([
    'SUPERADMIN',
    'ADMIN',
    'SALES_MANAGER',
    'ACCOUNTANT',
    'PROCUREMENT',
    'VIEWER',
]);

function parseOrderId(value: string) {
    const orderId = Number(value);
    return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ orderId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!allowedRoles.has(staffUser.role)) {
        return NextResponse.json({ error: 'Недостаточно прав для скачивания счета.' }, { status: 403 });
    }

    const { orderId: rawOrderId } = await context.params;
    const orderId = parseOrderId(rawOrderId);

    if (!orderId) {
        return NextResponse.json({ error: 'Некорректный идентификатор заказа.' }, { status: 400 });
    }

    const invoice = await prisma.invoice.findUnique({
        where: { orderId },
        select: { storageKey: true, fileName: true, mimeType: true },
    });

    if (!invoice?.storageKey) {
        return NextResponse.json({ error: 'Счет не найден.' }, { status: 404 });
    }

    const downloadUrl = await createPresignedObjectDownload({
        kind: 'invoice-pdf',
        key: invoice.storageKey,
        fileName: invoice.fileName || 'invoice.pdf',
        contentType: invoice.mimeType || 'application/pdf',
    });

    return NextResponse.redirect(downloadUrl);
}
