import { redirect } from 'next/navigation';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { ADMIN_LOGIN_PATH } from '@/lib/admin-routes';
import { prisma } from '@/lib/prisma';

const orderStatusLabels = {
    NEW: 'Новый',
    IN_PROGRESS: 'В работе',
    CANCELLED: 'Отменен',
    COMPLETED: 'Завершен',
} as const;

const leadStatusLabels = {
    NEW: 'Новая',
    IN_PROGRESS: 'В работе',
    COMPLETED: 'Завершена',
} as const;

const paymentStatusLabels = {
    PENDING: 'Ожидает',
    PARTIAL: 'Частично',
    PAID: 'Оплачен',
    OVERDUE: 'Просрочен',
} as const;

const fulfillmentStatusLabels = {
    ASSEMBLING: 'Комплектуется',
    SHIPPED: 'Отгружен',
    DELIVERED: 'Доставлен',
} as const;

const documentStatusLabels = {
    REQUIRED: 'Требуются',
    GENERATED: 'Сформированы',
    SENT: 'Отправлены',
    SIGNED: 'Подписаны',
} as const;

function decimalToNumber(value: { toNumber(): number }) {
    return value.toNumber();
}

export default async function AdminPage() {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        redirect(ADMIN_LOGIN_PATH);
    }

    const [
        orders,
        contactLeads,
        organizations,
        products,
        categories,
        brands,
        series,
        unitMeasures,
        productTypes,
        variantGroups,
        attributeDefinitions,
        companyProfile,
        notificationSetting,
    ] = await Promise.all([
        prisma.order.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                number: true,
                orderStatus: true,
                paymentStatus: true,
                fulfillmentStatus: true,
                documentStatus: true,
                deliveryType: true,
                shippingCompany: true,
                trackingNumber: true,
                estimatedDeliveryAt: true,
                grandTotal: true,
                createdAt: true,
                organization: {
                    select: {
                        shortName: true,
                        fullName: true,
                        inn: true,
                    },
                },
                createdByUser: {
                    select: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                items: {
                    select: {
                        id: true,
                        productSku: true,
                        productName: true,
                        quantity: true,
                        availabilityAtOrder: true,
                        requiresConfirmation: true,
                    },
                },
                documents: {
                    select: { id: true },
                },
                invoices: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        number: true,
                        status: true,
                        storageKey: true,
                    },
                },
            },
        }),
        prisma.contactLead.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                message: true,
                source: true,
                consent: true,
                status: true,
                createdAt: true,
            },
        }),
        prisma.organization.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100,
            select: {
                id: true,
                fullName: true,
                shortName: true,
                type: true,
                inn: true,
                kpp: true,
                email: true,
                phone: true,
                website: true,
                isActive: true,
                deferredPaymentDays: true,
                createdAt: true,
                users: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        phone: true,
                        role: true,
                        isActive: true,
                    },
                },
                orders: {
                    select: {
                        id: true,
                        grandTotal: true,
                        orderStatus: true,
                        paymentStatus: true,
                    },
                },
                _count: {
                    select: {
                        addresses: true,
                        documents: true,
                    },
                },
            },
        }),
        prisma.product.findMany({
            orderBy: { createdAt: 'desc' },
            take: 200,
            select: {
                id: true,
                sku: true,
                article: true,
                model: true,
                barcode: true,
                name: true,
                slug: true,
                status: true,
                availability: true,
                productTypeId: true,
                variantGroupId: true,
                variantGroup: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        attributeId: true,
                    },
                },
                isSellable: true,
                productType: { select: { id: true, code: true, name: true } },
                unitMeasureId: true,
                unitMeasure: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                        shortName: true,
                    },
                },
                price: true,
                purchasePrice: true,
                priceOld: true,
                currency: true,
                vatRate: true,
                stockQty: true,
                minOrderQty: true,
                stepQty: true,
                popularityWeight: true,
                leadTimeDays: true,
                description: true,
                seoTitle: true,
                metaDescription: true,
                datasheetUrl: true,
                imageUrl: true,
                weightKg: true,
                widthMm: true,
                heightMm: true,
                depthMm: true,
                voltageV: true,
                currentA: true,
                powerW: true,
                frequencyHz: true,
                protectionClassIp: true,
                operatingTempFromC: true,
                operatingTempToC: true,
                createdAt: true,
                category: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                brand: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                series: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        images: true,
                        specs: true,
                        documents: true,
                    },
                },
                images: {
                    orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
                    select: {
                        id: true,
                        url: true,
                        altText: true,
                        isPrimary: true,
                        sortOrder: true,
                    },
                },
                specs: {
                    orderBy: { id: 'asc' },
                    select: {
                        id: true,
                        name: true,
                        value: true,
                        unit: true,
                    },
                },
                attributeValues: {
                    orderBy: { attributeId: 'asc' },
                    select: {
                        id: true,
                        attributeId: true,
                        textValue: true,
                        numberValue: true,
                        booleanValue: true,
                    },
                },
                packageItems: {
                    orderBy: { componentProductId: 'asc' },
                    select: {
                        id: true,
                        componentProductId: true,
                        itemName: true,
                        quantity: true,
                        isIncluded: true,
                        note: true,
                    },
                },
                documents: {
                    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                    select: {
                        id: true,
                        title: true,
                        url: true,
                        fileName: true,
                        mimeType: true,
                        size: true,
                        storageKey: true,
                        sortOrder: true,
                    },
                },
            },
        }),
        prisma.category.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                parentId: true,
                name: true,
                slug: true,
                description: true,
                imageUrl: true,
                parent: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                _count: {
                    select: {
                        children: true,
                        products: true,
                    },
                },
            },
        }),
        prisma.brand.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                country: true,
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        }),
        prisma.series.findMany({
            orderBy: { name: 'asc' },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        }),
        prisma.unitMeasure.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            select: {
                id: true,
                name: true,
                code: true,
                shortName: true,
                isActive: true,
                sortOrder: true,
                _count: {
                    select: {
                        products: true,
                    },
                },
            },
        }),
        prisma.productType.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: { _count: { select: { products: true } } },
        }),
        prisma.productVariantGroup.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            include: {
                attribute: { select: { id: true, name: true, unit: true } },
                _count: { select: { products: true } },
            },
        }),
        prisma.attributeDefinition.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        }),
        prisma.companyProfile.findFirst({
            orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
            select: {
                id: true,
                fullName: true,
                shortName: true,
                inn: true,
                kpp: true,
                ogrn: true,
                legalAddress: true,
                actualAddress: true,
                postalAddress: true,
                email: true,
                phone: true,
                website: true,
                directorName: true,
                accountantName: true,
                basis: true,
                isActive: true,
                createdAt: true,
                bankAccounts: {
                    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
                    select: {
                        id: true,
                        companyProfileId: true,
                        bankName: true,
                        bankAddress: true,
                        bik: true,
                        checkingAccount: true,
                        correspondentAccount: true,
                        recipientName: true,
                        isDefault: true,
                        isActive: true,
                        createdAt: true,
                    },
                },
            },
        }),
        prisma.notificationSetting.findFirst({
            orderBy: { createdAt: 'asc' },
            select: {
                id: true,
                isActive: true,
                notifyLeadCreated: true,
                notifyOrderCreated: true,
                salesEmailEnabled: true,
                customerEmailEnabled: true,
                telegramEnabled: true,
                salesEmail: true,
                smtpHost: true,
                smtpPort: true,
                smtpSecure: true,
                smtpUser: true,
                smtpPassword: true,
                smtpFromEmail: true,
                smtpFromName: true,
                telegramBotToken: true,
                telegramChatId: true,
            },
        }),
    ]);

    const serializedOrders = orders.map((order) => ({
        ...order,
        grandTotal: decimalToNumber(order.grandTotal),
    }));
    const serializedOrganizations = organizations.map((organization) => ({
        ...organization,
        orders: organization.orders.map((order) => ({
            ...order,
            grandTotal: decimalToNumber(order.grandTotal),
        })),
    }));
    const serializedProducts = products.map((product) => ({
        ...product,
        price: decimalToNumber(product.price),
        purchasePrice: product.purchasePrice ? decimalToNumber(product.purchasePrice) : null,
        priceOld: product.priceOld ? decimalToNumber(product.priceOld) : null,
        vatRate: decimalToNumber(product.vatRate),
        weightKg: product.weightKg ? decimalToNumber(product.weightKg) : null,
        widthMm: product.widthMm ? decimalToNumber(product.widthMm) : null,
        heightMm: product.heightMm ? decimalToNumber(product.heightMm) : null,
        depthMm: product.depthMm ? decimalToNumber(product.depthMm) : null,
        attributeValues: product.attributeValues.map((value) => ({
            ...value,
            numberValue: value.numberValue ? decimalToNumber(value.numberValue) : null,
        })),
        packageItems: product.packageItems.map((item) => ({
            ...item,
            quantity: decimalToNumber(item.quantity),
        })),
    }));

    return (
        <AdminDashboard
            orders={serializedOrders}
            contactLeads={contactLeads}
            organizations={serializedOrganizations}
            products={serializedProducts}
            categories={categories}
            brands={brands}
            series={series}
            unitMeasures={unitMeasures}
            productTypes={productTypes}
            variantGroups={variantGroups}
            attributeDefinitions={attributeDefinitions}
            companyProfile={companyProfile}
            notificationSetting={notificationSetting}
            labels={{
                orderStatus: orderStatusLabels,
                leadStatus: leadStatusLabels,
                paymentStatus: paymentStatusLabels,
                fulfillmentStatus: fulfillmentStatusLabels,
                documentStatus: documentStatusLabels,
            }}
        />
    );
}
