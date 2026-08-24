import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AccountDashboard } from '@/components/account/account-dashboard';
import { prisma } from '@/lib/prisma';

export const orderStatusLabels = {
    NEW: 'Новый',
    IN_PROGRESS: 'В работе',
    CANCELLED: 'Отменен',
    COMPLETED: 'Завершен',
} as const;

export const paymentStatusLabels = {
    PENDING: 'Ожидает оплаты',
    PARTIAL: 'Частично оплачен',
    PAID: 'Оплачен',
    OVERDUE: 'Просрочен',
} as const;

export const fulfillmentStatusLabels = {
    ASSEMBLING: 'Комплектуется',
    SHIPPED: 'Отгружен',
    DELIVERED: 'Доставлен',
} as const;

export const documentStatusLabels = {
    REQUIRED: 'Требуются',
    GENERATED: 'Сформированы',
    SENT: 'Отправлены',
    SIGNED: 'Подписаны',
} as const;

export const paymentTypeLabels = {
    BANK_TRANSFER: 'Безналичный перевод',
    PREPAYMENT: 'Предоплата',
    POSTPAYMENT: 'Постоплата',
} as const;

export const deliveryTypeLabels = {
    PICKUP: 'Самовывоз',
    TRANSPORT_COMPANY: 'Доставка ТК',
    CDEK: 'СДЭК',
} as const;

function decimalToNumber(value: { toNumber(): number }) {
    return value.toNumber();
}

export default async function AccountPage() {
    const session = await auth();

    if (!session?.user?.id) {
        redirect('/auth/login?callbackUrl=%2Faccount');
    }

    const userId = Number(session.user.id);

    if (!Number.isInteger(userId)) {
        redirect('/auth/login?callbackUrl=%2Faccount');
    }

    const account = await prisma.user.findFirst({
        where: {
            id: userId,
            isActive: true,
            organization: {
                isActive: true,
            },
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
            role: true,
            createdAt: true,
            lastLoginAt: true,
            organization: {
                select: {
                    id: true,
                    fullName: true,
                    shortName: true,
                    type: true,
                    inn: true,
                    kpp: true,
                    phone: true,
                    email: true,
                    website: true,
                    defaultPaymentType: true,
                    deferredPaymentDays: true,
                    addresses: {
                        orderBy: [{ isPrimary: 'desc' }, { isLegal: 'desc' }, { createdAt: 'asc' }],
                        select: {
                            id: true,
                            label: true,
                            fullAddress: true,
                            country: true,
                            region: true,
                            city: true,
                            street: true,
                            house: true,
                            building: true,
                            flat: true,
                            postalCode: true,
                            isLegal: true,
                            isShipping: true,
                            isPrimary: true,
                        },
                    },
                    orders: {
                        orderBy: { createdAt: 'desc' },
                        take: 20,
                        select: {
                            id: true,
                            number: true,
                            orderStatus: true,
                            paymentStatus: true,
                            fulfillmentStatus: true,
                            documentStatus: true,
                            paymentType: true,
                            deliveryType: true,
                            subtotal: true,
                            discountTotal: true,
                            vatTotal: true,
                            grandTotal: true,
                            createdAt: true,
                            requestedDeliveryDate: true,
                            comment: true,
                            shippingAddress: {
                                select: {
                                    city: true,
                                    street: true,
                                    house: true,
                                },
                            },
                            items: {
                                orderBy: { createdAt: 'asc' },
                                select: {
                                    id: true,
                                    productSku: true,
                                    productName: true,
                                    quantity: true,
                                    unitPrice: true,
                                    vatRate: true,
                                    lineTotal: true,
                                },
                            },
                            documents: {
                                select: {
                                    id: true,
                                    type: true,
                                    number: true,
                                    fileUrl: true,
                                    issuedAt: true,
                                },
                            },
                            invoices: {
                                orderBy: { createdAt: 'desc' },
                                take: 1,
                                select: {
                                    id: true,
                                    number: true,
                                    fileUrl: true,
                                    issuedAt: true,
                                },
                            },
                        },
                    },
                },
            },
        },
    });

    if (!account) {
        redirect('/auth/login?callbackUrl=%2Faccount');
    }

    const serializedAccount = {
        ...account,
        organization: {
            ...account.organization,
            orders: account.organization.orders.map((order) => ({
                ...order,
                invoices: undefined,
                documents:
                    order.documents.some((document) => document.type === 'INVOICE') ||
                    !order.invoices[0]
                        ? order.documents
                        : [
                              ...order.documents,
                              {
                                  id: -order.invoices[0].id,
                                  type: 'INVOICE',
                                  number: order.invoices[0].number,
                                  fileUrl: order.invoices[0].fileUrl,
                                  issuedAt: order.invoices[0].issuedAt,
                              },
                          ],
                subtotal: decimalToNumber(order.subtotal),
                discountTotal: decimalToNumber(order.discountTotal),
                vatTotal: decimalToNumber(order.vatTotal),
                grandTotal: decimalToNumber(order.grandTotal),
                items: order.items.map((item) => ({
                    ...item,
                    unitPrice: decimalToNumber(item.unitPrice),
                    vatRate: decimalToNumber(item.vatRate),
                    lineTotal: decimalToNumber(item.lineTotal),
                })),
            })),
        },
    };

    return (
        <AccountDashboard
            account={serializedAccount}
            labels={{
                orderStatus: orderStatusLabels,
                paymentStatus: paymentStatusLabels,
                fulfillmentStatus: fulfillmentStatusLabels,
                documentStatus: documentStatusLabels,
                paymentType: paymentTypeLabels,
                deliveryType: deliveryTypeLabels,
            }}
        />
    );
}
