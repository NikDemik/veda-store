export type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
export type FulfillmentStatus = 'ASSEMBLING' | 'SHIPPED' | 'DELIVERED';
export type OrderDocumentStatus = 'REQUIRED' | 'GENERATED' | 'SENT' | 'SIGNED';
export type LeadStatus = 'NEW' | 'IN_PROGRESS' | 'COMPLETED';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type AvailabilityStatus = 'IN_STOCK' | 'BACKORDER' | 'OUT_OF_STOCK' | 'DISCONTINUED';
export type AttributeType = 'TEXT' | 'NUMBER' | 'BOOLEAN';

export type AdminTab =
    | 'orders'
    | 'contact-leads'
    | 'organizations'
    | 'products-list'
    | 'product-form'
    | 'brands'
    | 'categories'
    | 'series'
    | 'product-types'
    | 'unit-measures'
    | 'settings';

export type AdminOrder = {
    id: number;
    number: string;
    orderStatus: OrderStatus;
    paymentStatus: PaymentStatus;
    fulfillmentStatus: FulfillmentStatus;
    documentStatus: OrderDocumentStatus;
    deliveryType: string;
    shippingCompany: string;
    trackingNumber: string;
    estimatedDeliveryAt: Date | string | null;
    grandTotal: number;
    createdAt: Date | string;
    organization: {
        shortName: string | null;
        fullName: string;
        inn: string;
    };
    createdByUser: {
        firstName: string;
        lastName: string;
        email: string;
    } | null;
    items: Array<{
        id: number;
        productSku: string;
        productName: string;
        quantity: number;
        availabilityAtOrder: AvailabilityStatus;
        requiresConfirmation: boolean;
    }>;
    documents: Array<{ id: number }>;
    invoices: Array<{
        id: number;
        number: string;
        status: string;
        storageKey: string;
    }>;
};

export type AdminContactLead = {
    id: number;
    name: string;
    phone: string;
    email: string;
    message: string | null;
    source: string;
    consent: boolean;
    status: LeadStatus;
    createdAt: Date | string;
};

export type AdminOrganization = {
    id: number;
    fullName: string;
    shortName: string | null;
    type: string;
    inn: string;
    kpp: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    isActive: boolean;
    deferredPaymentDays: number;
    createdAt: Date | string;
    users: Array<{
        id: number;
        firstName: string;
        lastName: string;
        email: string;
        phone: string | null;
        role: string;
        isActive: boolean;
    }>;
    orders: Array<{
        id: number;
        grandTotal: number;
        orderStatus: OrderStatus;
        paymentStatus: PaymentStatus;
    }>;
    _count: {
        addresses: number;
        documents: number;
    };
};

export type AdminProduct = {
    id: number;
    sku: string;
    article: string | null;
    model: string | null;
    barcode: string | null;
    name: string;
    slug: string;
    status: ProductStatus;
    availability: AvailabilityStatus;
    productTypeId: number | null;
    variantGroupId: number | null;
    variantGroup: {
        id: number;
        name: string;
        code: string;
        attributeId: number;
    } | null;
    isSellable: boolean;
    productType: { id: number; code: string; name: string } | null;
    unitMeasureId: number;
    unitMeasure: {
        id: number;
        name: string;
        code: string;
        shortName: string;
    };
    price: number;
    purchasePrice: number | null;
    priceOld: number | null;
    currency: string;
    vatRate: number;
    stockQty: number;
    minOrderQty: number;
    stepQty: number;
    popularityWeight: number;
    leadTimeDays: number | null;
    description: string | null;
    seoTitle: string | null;
    metaDescription: string | null;
    datasheetUrl: string | null;
    imageUrl: string | null;
    weightKg: number | null;
    widthMm: number | null;
    heightMm: number | null;
    depthMm: number | null;
    voltageV: string | null;
    currentA: string | null;
    powerW: string | null;
    frequencyHz: string | null;
    protectionClassIp: string | null;
    operatingTempFromC: number | null;
    operatingTempToC: number | null;
    createdAt: Date | string;
    category: {
        id: number;
        name: string;
    };
    brand: {
        id: number;
        name: string;
    } | null;
    series: {
        id: number;
        name: string;
    } | null;
    _count: {
        images: number;
        specs: number;
        documents: number;
    };
    images: Array<{
        id: number;
        url: string;
        altText: string | null;
        isPrimary: boolean;
        sortOrder: number;
    }>;
    specs: Array<{
        id: number;
        name: string;
        value: string;
        unit: string | null;
    }>;
    attributeValues: Array<{
        id: number;
        attributeId: number;
        textValue: string | null;
        numberValue: number | null;
        booleanValue: boolean | null;
    }>;
    packageItems: Array<{
        id: number;
        componentProductId: number | null;
        itemName: string;
        quantity: number;
        isIncluded: boolean;
        note: string | null;
    }>;
    documents: Array<{
        id: number;
        title: string;
        url: string;
        fileName: string;
        mimeType: string;
        size: number;
        storageKey: string;
        sortOrder: number;
    }>;
};

export type AdminProductVariantGroup = {
    id: number;
    name: string;
    code: string;
    attributeId: number;
    attribute: {
        id: number;
        name: string;
        unit: string | null;
    };
    _count: { products: number };
};

export type AdminProductType = {
    id: number;
    code: string;
    name: string;
    isActive: boolean;
    sortOrder: number;
    _count: { products: number };
};

export type AdminAttributeDefinition = {
    id: number;
    code: string;
    name: string;
    dataType: AttributeType;
    unit: string | null;
    isFilterable: boolean;
    sortOrder: number;
};

export type AdminCategory = {
    id: number;
    parentId: number | null;
    name: string;
    slug: string;
    description: string | null;
    imageUrl: string | null;
    parent: {
        id: number;
        name: string;
    } | null;
    _count: {
        children: number;
        products: number;
    };
};

export type AdminBrand = {
    id: number;
    name: string;
    slug: string;
    country: string | null;
    _count: {
        products: number;
    };
};

export type AdminSeries = {
    id: number;
    name: string;
    slug: string;
    description: string | null;
    _count: {
        products: number;
    };
};

export type AdminUnitMeasure = {
    id: number;
    name: string;
    code: string;
    shortName: string;
    isActive: boolean;
    sortOrder: number;
    _count: {
        products: number;
    };
};

export type AdminCompanyBankAccount = {
    id: number;
    companyProfileId: number;
    bankName: string;
    bankAddress: string | null;
    bik: string;
    checkingAccount: string;
    correspondentAccount: string;
    recipientName: string | null;
    isDefault: boolean;
    isActive: boolean;
    createdAt: Date | string;
};

export type AdminCompanyProfile = {
    id: number;
    fullName: string;
    shortName: string | null;
    inn: string;
    kpp: string | null;
    ogrn: string | null;
    legalAddress: string;
    actualAddress: string | null;
    postalAddress: string | null;
    email: string | null;
    phone: string | null;
    website: string | null;
    directorName: string | null;
    accountantName: string | null;
    basis: string | null;
    isActive: boolean;
    createdAt: Date | string;
    bankAccounts: AdminCompanyBankAccount[];
};

export type AdminNotificationSetting = {
    id: number;
    isActive: boolean;
    notifyLeadCreated: boolean;
    notifyOrderCreated: boolean;
    salesEmailEnabled: boolean;
    customerEmailEnabled: boolean;
    telegramEnabled: boolean;
    salesEmail: string | null;
    smtpHost: string | null;
    smtpPort: number;
    smtpSecure: boolean;
    smtpUser: string | null;
    smtpPassword: string | null;
    smtpFromEmail: string | null;
    smtpFromName: string | null;
    telegramBotToken: string | null;
    telegramChatId: string | null;
};

export type AdminDashboardLabels = {
    orderStatus: Record<OrderStatus, string>;
    leadStatus: Record<LeadStatus, string>;
    paymentStatus: Record<PaymentStatus, string>;
    fulfillmentStatus: Record<FulfillmentStatus, string>;
    documentStatus: Record<OrderDocumentStatus, string>;
};

export type AdminDashboardProps = {
    orders: AdminOrder[];
    contactLeads: AdminContactLead[];
    organizations: AdminOrganization[];
    products: AdminProduct[];
    categories: AdminCategory[];
    brands: AdminBrand[];
    series: AdminSeries[];
    unitMeasures: AdminUnitMeasure[];
    productTypes: AdminProductType[];
    variantGroups: AdminProductVariantGroup[];
    attributeDefinitions: AdminAttributeDefinition[];
    companyProfile: AdminCompanyProfile | null;
    notificationSetting: AdminNotificationSetting | null;
    labels: AdminDashboardLabels;
};
