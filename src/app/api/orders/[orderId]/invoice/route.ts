import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { generateAndStoreInvoicePdf } from '@/lib/invoices';
import { createPresignedObjectDownload } from '@/lib/object-storage';
import { prisma } from '@/lib/prisma';

function parseOrderId(value: string) {
    const orderId = Number(value);

    return Number.isInteger(orderId) && orderId > 0 ? orderId : null;
}

export async function GET(
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
        select: {
            id: true,
            documents: {
                where: { type: 'INVOICE' },
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                    storageKey: true,
                    fileName: true,
                    mimeType: true,
                },
            },
            invoices: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                    id: true,
                    storageKey: true,
                    fileName: true,
                    mimeType: true,
                },
            },
        },
    });

    if (!order) {
        return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    let invoiceFile = order.documents[0]?.storageKey
        ? order.documents[0]
        : order.invoices[0]?.storageKey
          ? order.invoices[0]
          : null;

    if (!invoiceFile && order.invoices[0]) {
        const generatedInvoice = await generateAndStoreInvoicePdf(order.invoices[0].id);
        invoiceFile = {
            storageKey: generatedInvoice.storageKey,
            fileName: `invoice-${generatedInvoice.number}.pdf`,
            mimeType: 'application/pdf',
        };
    }

    if (!invoiceFile?.storageKey) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    const downloadUrl = await createPresignedObjectDownload({
        kind: 'invoice-pdf',
        key: invoiceFile.storageKey,
        fileName: invoiceFile.fileName || 'invoice.pdf',
        contentType: invoiceFile.mimeType || 'application/pdf',
    });

    return NextResponse.redirect(downloadUrl);
}
