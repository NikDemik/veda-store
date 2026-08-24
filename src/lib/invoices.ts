import { Prisma } from '@prisma/client';
import { renderInvoicePdf, type InvoicePdfData } from '@/lib/invoice-pdf';
import { uploadObjectToStorage } from '@/lib/object-storage';
import { prisma } from '@/lib/prisma';

export function createInvoiceNumber(latestInvoice?: { id: number; number: string } | null) {
    const numberMatch = latestInvoice?.number.match(/^(INV-\d{4}-)(\d+)$/);

    if (numberMatch) {
        const [, prefix, numericPart] = numberMatch;
        const nextNumber = Number.parseInt(numericPart, 10) + 1;

        return `${prefix}${nextNumber.toString().padStart(numericPart.length, '0')}`;
    }

    const nextNumber = (latestInvoice?.id ?? 0) + 1;

    return `INV-${new Date().getFullYear()}-${nextNumber.toString().padStart(4, '0')}`;
}

export function getInvoiceDueAt(issuedAt: Date, deferredPaymentDays: number) {
    if (!Number.isInteger(deferredPaymentDays) || deferredPaymentDays <= 0) {
        return null;
    }

    const dueAt = new Date(issuedAt);
    dueAt.setDate(dueAt.getDate() + deferredPaymentDays);

    return dueAt;
}

export async function createInvoiceForOrder(orderId: number) {
    const existingInvoice = await prisma.invoice.findUnique({
        where: { orderId },
        select: { id: true },
    });

    if (existingInvoice) {
        return generateInvoiceIfNeeded(existingInvoice.id);
    }

    try {
        const invoice = await prisma.$transaction(
            async (tx) => {
                const order = await tx.order.findUnique({
                    where: { id: orderId },
                    select: {
                        id: true,
                        organizationId: true,
                        subtotal: true,
                        vatTotal: true,
                        grandTotal: true,
                        organization: { select: { deferredPaymentDays: true } },
                    },
                });

                if (!order) throw new Error('Заказ не найден.');

                const latestInvoice = await tx.invoice.findFirst({
                    orderBy: { id: 'desc' },
                    select: { id: true, number: true },
                });
                const issuedAt = new Date();

                return tx.invoice.create({
                    data: {
                        orderId: order.id,
                        organizationId: order.organizationId,
                        number: createInvoiceNumber(latestInvoice),
                        status: 'DRAFT',
                        subtotal: order.subtotal,
                        vatTotal: order.vatTotal,
                        grandTotal: order.grandTotal,
                        currency: 'RUB',
                        issuedAt,
                        dueAt: getInvoiceDueAt(
                            issuedAt,
                            order.organization.deferredPaymentDays,
                        ),
                    },
                    select: { id: true },
                });
            },
            { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
        );

        return generateInvoiceIfNeeded(invoice.id);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const invoice = await prisma.invoice.findUnique({
                where: { orderId },
                select: { id: true },
            });

            if (invoice) return generateInvoiceIfNeeded(invoice.id);
        }

        throw error;
    }
}

async function generateInvoiceIfNeeded(invoiceId: number) {
    const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        select: {
            id: true,
            number: true,
            status: true,
            fileUrl: true,
            storageKey: true,
        },
    });

    if (!invoice) throw new Error('Счет не найден.');
    if (invoice.storageKey) return invoice;

    return generateAndStoreInvoicePdf(invoice.id);
}

export async function generateAndStoreInvoicePdf(invoiceId: number) {
    const [invoice, companyProfile] = await Promise.all([
        prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: {
                organization: {
                    include: {
                        addresses: {
                            where: { isLegal: true },
                            orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                            take: 1,
                        },
                    },
                },
                order: {
                    include: {
                        items: {
                            orderBy: { id: 'asc' },
                        },
                    },
                },
            },
        }),
        prisma.companyProfile.findFirst({
            where: { isActive: true },
            orderBy: { createdAt: 'asc' },
            include: {
                bankAccounts: {
                    where: { isActive: true },
                    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
                    take: 1,
                },
            },
        }),
    ]);

    if (!invoice) {
        throw new Error('Счет не найден.');
    }

    if (!companyProfile) {
        throw new Error('Заполните активный профиль продавца в разделе администрирования "Настройки".');
    }

    const bankAccount = companyProfile.bankAccounts[0];

    if (!bankAccount) {
        throw new Error('Заполните активные платежные реквизиты продавца в разделе администрирования "Настройки".');
    }

    const invoiceData = toInvoicePdfData(invoice, companyProfile, bankAccount);
    const fileName = `invoice-${invoice.number}.pdf`;
    const pdfBuffer = await renderInvoicePdf(invoiceData);
    const uploaded = await uploadObjectToStorage({
        kind: 'invoice-pdf',
        fileName,
        contentType: 'application/pdf',
        body: pdfBuffer,
        invoicePath: {
            orderNumber: invoice.order.number,
            invoiceNumber: invoice.number,
        },
    });

    const updatedInvoice = await prisma.$transaction(async (tx) => {
        const nextInvoice = await tx.invoice.update({
            where: { id: invoice.id },
            data: {
                status: 'GENERATED',
                fileUrl: uploaded.url,
                fileName,
                mimeType: 'application/pdf',
                size: pdfBuffer.length,
                storageKey: uploaded.key,
            },
            select: {
                id: true,
                number: true,
                status: true,
                fileUrl: true,
                storageKey: true,
            },
        });

        await tx.orderDocument.create({
            data: {
                orderId: invoice.orderId,
                organizationId: invoice.organizationId,
                type: 'INVOICE',
                status: 'GENERATED',
                number: invoice.number,
                fileUrl: uploaded.url,
                fileName,
                mimeType: 'application/pdf',
                size: pdfBuffer.length,
                storageKey: uploaded.key,
                issuedAt: invoice.issuedAt,
                expiresAt: invoice.dueAt,
            },
        });

        await tx.order.update({
            where: { id: invoice.orderId },
            data: { documentStatus: 'GENERATED' },
        });

        return nextInvoice;
    });

    return updatedInvoice;
}

type InvoiceWithPdfRelations = Prisma.InvoiceGetPayload<{
    include: {
        organization: {
            include: {
                addresses: true;
            };
        };
        order: {
            include: {
                items: true;
            };
        };
    };
}>;

type CompanyProfileWithBankAccounts = Prisma.CompanyProfileGetPayload<{
    include: {
        bankAccounts: true;
    };
}>;

type CompanyBankAccountForPdf = CompanyProfileWithBankAccounts['bankAccounts'][number];

function toInvoicePdfData(
    invoice: InvoiceWithPdfRelations,
    companyProfile: CompanyProfileWithBankAccounts,
    bankAccount: CompanyBankAccountForPdf,
): InvoicePdfData {
    const legalAddress = invoice.organization.addresses[0]?.fullAddress ?? null;

    return {
        number: invoice.number,
        issuedAt: invoice.issuedAt ?? invoice.createdAt,
        dueAt: invoice.dueAt,
        orderNumber: invoice.order.number,
        seller: {
            fullName: companyProfile.fullName,
            shortName: companyProfile.shortName,
            inn: companyProfile.inn,
            kpp: companyProfile.kpp,
            ogrn: companyProfile.ogrn,
            legalAddress: companyProfile.legalAddress,
            actualAddress: companyProfile.actualAddress,
            postalAddress: companyProfile.postalAddress,
            email: companyProfile.email,
            phone: companyProfile.phone,
            website: companyProfile.website,
            directorName: companyProfile.directorName,
            accountantName: companyProfile.accountantName,
            basis: companyProfile.basis,
        },
        sellerBankAccount: {
            bankName: bankAccount.bankName,
            bankAddress: bankAccount.bankAddress,
            bik: bankAccount.bik,
            checkingAccount: bankAccount.checkingAccount,
            correspondentAccount: bankAccount.correspondentAccount,
            recipientName: bankAccount.recipientName,
        },
        buyer: {
            name: invoice.organization.shortName ?? invoice.organization.fullName,
            inn: invoice.organization.inn,
            kpp: invoice.organization.kpp,
            email: invoice.organization.email,
            phone: invoice.organization.phone,
            address: legalAddress,
        },
        items: invoice.order.items.map((item) => ({
            productSku: item.productSku,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice.toNumber(),
            vatRate: item.vatRate.toNumber(),
            lineTotal: item.lineTotal.toNumber(),
        })),
        subtotal: invoice.subtotal.toNumber(),
        vatTotal: invoice.vatTotal.toNumber(),
        grandTotal: invoice.grandTotal.toNumber(),
        currency: invoice.currency,
    };
}
