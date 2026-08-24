export type ContactData = {
    company: string;
    address: string;
    phone: string;
    phone2: string;
    email: string;
    workingHours: string;
    mapEmbedUrl: string;
};

export type MenuItem = {
    id: number;
    title: string;
    href: string;
    children?: Omit<MenuItem, 'id' | 'children'>[];
};

export type Currency = 'RUB' | 'USD' | 'EUR';

export type AvailabilityStatus = 'IN_STOCK' | 'BACKORDER' | 'OUT_OF_STOCK' | 'DISCONTINUED';

export type CartItem = {
    id: number;
    sku: string;
    slug: string;
    name: string;
    price: number;
    currency: Currency;
    imageUrl: string | null;
    unitShortName?: string;
    minOrderQty?: number;
    stepQty?: number;
    availability?: AvailabilityStatus;
    leadTimeDays?: number | null;
    quantity: number;
};

export type NewsItem = {
    id: number;
    title: string;
    description: string;
    img: string;
};

export type ProductSummary = Omit<CartItem, 'quantity'>;

export type PaymentType = 'BANK_TRANSFER' | 'PREPAYMENT' | 'POSTPAYMENT';

export type DeliveryType = 'PICKUP' | 'TRANSPORT_COMPANY' | 'CDEK';

export type OrganizationAddress = {
    id: number;
    label: string | null;
    fullAddress: string;
    country: string;
    region: string | null;
    city: string;
    street: string;
    house: string | null;
    flat: string | null;
    building: string | null;
    postalCode: string | null;
    isLegal: boolean;
    isShipping: boolean;
    isPrimary: boolean;
};
