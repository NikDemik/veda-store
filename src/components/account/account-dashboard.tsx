'use client';

import {
    type Dispatch,
    type FormEvent,
    type SetStateAction,
    useEffect,
    useState,
} from 'react';
import { signOut } from 'next-auth/react';
import { Pencil, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type OrderStatus = 'NEW' | 'IN_PROGRESS' | 'CANCELLED' | 'COMPLETED';
type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE';
type FulfillmentStatus = 'ASSEMBLING' | 'SHIPPED' | 'DELIVERED';
type OrderDocumentStatus = 'REQUIRED' | 'GENERATED' | 'SENT' | 'SIGNED';
type PaymentType = 'BANK_TRANSFER' | 'PREPAYMENT' | 'POSTPAYMENT';
type DeliveryType = 'PICKUP' | 'TRANSPORT_COMPANY' | 'CDEK';
type OrganizationType = 'OOO' | 'AO' | 'IP' | 'OTHER';

type AccountDashboardProps = {
    account: {
        id: number;
        email: string;
        firstName: string;
        lastName: string;
        phone: string | null;
        role: string;
        createdAt: Date;
        lastLoginAt: Date | null;
        organization: {
            id: number;
            fullName: string;
            shortName: string | null;
            type: OrganizationType;
            inn: string;
            kpp: string | null;
            phone: string | null;
            email: string | null;
            website: string | null;
            defaultPaymentType: PaymentType;
            deferredPaymentDays: number;
            addresses: Array<{
                id: number;
                label: string | null;
                fullAddress: string;
                country: string;
                region: string | null;
                city: string;
                street: string;
                house: string | null;
                building: string | null;
                flat: string | null;
                postalCode: string | null;
                isLegal: boolean;
                isShipping: boolean;
                isPrimary: boolean;
            }>;
            orders: Array<{
                id: number;
                number: string;
                orderStatus: OrderStatus;
                paymentStatus: PaymentStatus;
                fulfillmentStatus: FulfillmentStatus;
                documentStatus: OrderDocumentStatus;
                paymentType: PaymentType;
                deliveryType: DeliveryType;
                subtotal: unknown;
                discountTotal: unknown;
                vatTotal: unknown;
                grandTotal: unknown;
                createdAt: Date;
                requestedDeliveryDate: Date | null;
                comment: string | null;
                shippingAddress: {
                    city: string;
                    street: string;
                    house: string | null;
                } | null;
                items: Array<{
                    id: number;
                    productSku: string;
                    productName: string;
                    quantity: number;
                    unitPrice: unknown;
                    vatRate: unknown;
                    lineTotal: unknown;
                }>;
                documents: Array<{
                    id: number;
                    type: string;
                    number: string | null;
                    fileUrl: string | null;
                    issuedAt: Date | null;
                }>;
            }>;
        };
    };
    labels: {
        orderStatus: Record<OrderStatus, string>;
        paymentStatus: Record<PaymentStatus, string>;
        fulfillmentStatus: Record<FulfillmentStatus, string>;
        documentStatus: Record<OrderDocumentStatus, string>;
        paymentType: Record<PaymentType, string>;
        deliveryType: Record<DeliveryType, string>;
    };
};

type AccountOrder = AccountDashboardProps['account']['organization']['orders'][number];
type AccountAddress = AccountDashboardProps['account']['organization']['addresses'][number];
type NewAddressFormState = {
    fullAddress: string;
    country: string;
    region: string | null;
    city: string;
    street: string;
    house: string | null;
    building: string | null;
    flat: string | null;
    postalCode: string | null;
};
type AddressSuggestion = {
    value: string;
    unrestrictedValue: string;
    data: Omit<NewAddressFormState, 'fullAddress'> & {
        fiasId?: string | null;
        kladrId?: string | null;
    };
};
type SettingsFormState = {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    organizationInn: string;
    organizationType: OrganizationType;
    organizationKpp: string;
    organizationFullName: string;
    organizationShortName: string;
    organizationFullAddress: string;
    newPassword: string;
};

const organizationTypeOptions: Array<{ value: OrganizationType; label: string }> = [
    { value: 'OOO', label: 'ООО' },
    { value: 'AO', label: 'АО' },
    { value: 'IP', label: 'ИП' },
    { value: 'OTHER', label: 'Другое' },
];

type DashboardTab = 'overview' | 'orders' | 'addresses' | 'settings';

const emptyNewAddressForm: NewAddressFormState = {
    fullAddress: '',
    country: 'RU',
    region: null,
    city: '',
    street: '',
    house: null,
    building: null,
    flat: null,
    postalCode: null,
};

const dashboardTabs: Array<{ id: DashboardTab; shortLabel: string; label: string; description: string }> = [
    {
        id: 'overview',
        shortLabel: 'ЛК',
        label: 'Личный кабинет',
        description: 'Сводка по заказам, активности и динамике.',
    },
    {
        id: 'orders',
        shortLabel: 'Заказы',
        label: 'Заказы',
        description: 'Подробная история заказов и состав каждого заказа.',
    },
    {
        id: 'addresses',
        shortLabel: 'Адреса',
        label: 'Адреса',
        description: 'Юридические и отгрузочные адреса организации.',
    },
    {
        id: 'settings',
        shortLabel: 'Настройки',
        label: 'Настройки',
        description: 'Контакты пользователя и реквизиты компании.',
    },
];

const documentTypeLabels: Record<string, string> = {
    INVOICE: 'Счет',
    INVOICE_OFFER: 'Счет-оферта',
    WAYBILL: 'Накладная',
    ACT: 'Акт',
    CONTRACT: 'Договор',
    INVOICE_FACTURA: 'Счет-фактура',
    UPD: 'УПД',
    UKD: 'УКД',
    PAYMENT_ORDER: 'Платежное поручение',
    SPECIFICATION: 'Спецификация',
};

function formatDate(value: Date | string | null) {
    if (!value) return 'Не указано';

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    }).format(new Date(value));
}

function formatMoney(value: unknown) {
    const amount = Number(value);

    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(Number.isFinite(amount) ? amount : 0);
}

function buildAddress(address: {
    postalCode: string | null;
    country: string;
    region: string | null;
    city: string;
    street: string;
    house: string | null;
    building: string | null;
}) {
    return [
        address.postalCode,
        // address.country,
        address.region,
        address.city,
        address.street,
        address.house ? `д. ${address.house}` : null,
        address.building ? `стр. ${address.building}` : null,
    ]
        .filter(Boolean)
        .join(', ');
}

function getOrderStatusTone(status: OrderStatus) {
    if (status === 'COMPLETED') {
        return 'bg-[#dff3e6] text-[#146c43]';
    }

    if (status === 'CANCELLED') {
        return 'bg-[#fde6e6] text-[#a12b2b]';
    }

    if (status === 'IN_PROGRESS') {
        return 'bg-[#fff1d6] text-[#9a6400]';
    }

    return 'bg-black text-white';
}

function SectionTitle({ title, description }: { title: string; description: string }) {
    return (
        <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-black lg:text-3xl">{title}</h1>
            <p className="max-w-3xl text-sm leading-6 text-dark-grey">{description}</p>
        </div>
    );
}

function InfoCard({ label, value }: { label: string; value: string }) {
    return (
        <div className="rounded-3xl border border-accent/30 bg-white p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">{label}</p>
            <p className="mt-2 text-base leading-6 text-black">{value}</p>
        </div>
    );
}

function OverviewChart({
    orders,
}: {
    orders: AccountDashboardProps['account']['organization']['orders'];
}) {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
        const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const label = new Intl.DateTimeFormat('ru-RU', { month: 'short' }).format(date);

        return { key, label, total: 0, count: 0 };
    });

    const monthMap = new Map(months.map((month) => [month.key, month]));

    for (const order of orders) {
        const date = new Date(order.createdAt);
        const key = `${date.getFullYear()}-${date.getMonth()}`;
        const bucket = monthMap.get(key);

        if (!bucket) continue;

        bucket.total += Number(order.grandTotal);
        bucket.count += 1;
    }

    const maxTotal = Math.max(...months.map((month) => month.total), 1);

    return (
        <div className="rounded-[2rem] border border-grey/80 bg-white dark:bg-black p-6">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">
                        График заказов
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-black">Оборот за 6 месяцев</h2>
                </div>
                <p className="text-sm text-dark-grey">По сумме заказов</p>
            </div>

            <div className="mt-8 grid h-64 grid-cols-6 items-end gap-3">
                {months.map((month) => {
                    const height = `${Math.max((month.total / maxTotal) * 100, month.total > 0 ? 12 : 4)}%`;

                    return (
                        <div key={month.key} className="flex h-full flex-col justify-end gap-3">
                            <div className="flex-1 rounded-[1.75rem] bg-grey/50 p-2">
                                <div
                                    className="flex h-full items-end rounded-[1.25rem] bg-[linear-gradient(180deg,#6ea6f0_0%,#1f6ed7_100%)] px-3 py-4 text-white transition-all"
                                    style={{ height }}
                                >
                                    <div>
                                        <p className="text-[11px] uppercase tracking-[0.12em] text-white/75">
                                            {month.count} шт.
                                        </p>
                                        <p className="mt-1 text-sm font-semibold">
                                            {month.total > 0 ? formatMoney(month.total) : '0 ₽'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-center text-sm font-medium capitalize text-black">
                                {month.label}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function AccountDashboard({ account, labels }: AccountDashboardProps) {
    const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
    const [orders, setOrders] = useState<AccountOrder[]>(account.organization.orders);
    const [addresses, setAddresses] = useState<AccountAddress[]>(account.organization.addresses);
    const [selectedOrderIds, setSelectedOrderIds] = useState<number[]>([]);
    const [selectedAddressIds, setSelectedAddressIds] = useState<number[]>([]);
    const [isDeletingOrders, setIsDeletingOrders] = useState(false);
    const [isDeletingAddresses, setIsDeletingAddresses] = useState(false);
    const [ordersError, setOrdersError] = useState<string | null>(null);
    const [addressesError, setAddressesError] = useState<string | null>(null);
    const [addressesSuccess, setAddressesSuccess] = useState<string | null>(null);
    const [isAddAddressModalOpen, setIsAddAddressModalOpen] = useState(false);
    const [isConfirmingNewAddress, setIsConfirmingNewAddress] = useState(false);
    const [editingAddressId, setEditingAddressId] = useState<number | null>(null);
    const [newAddressForm, setNewAddressForm] = useState<NewAddressFormState>(
        emptyNewAddressForm,
    );
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = useState(false);
    const [isSavingNewAddress, setIsSavingNewAddress] = useState(false);

    const organizationName = account.organization.shortName || account.organization.fullName;
    const legalAddress = addresses.find((address) => address.isLegal) ?? null;
    const initialSettingsForm: SettingsFormState = {
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        phone: account.phone || '',
        organizationInn: account.organization.inn,
        organizationType: account.organization.type,
        organizationKpp: account.organization.kpp || '',
        organizationFullName: account.organization.fullName,
        organizationShortName: account.organization.shortName || '',
        organizationFullAddress:
            legalAddress?.fullAddress || (legalAddress ? buildAddress(legalAddress) : ''),
        newPassword: '',
    };
    const [settingsForm, setSettingsForm] = useState<SettingsFormState>(initialSettingsForm);
    const [isEditingSettings, setIsEditingSettings] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);
    const [isDeactivatingAccount, setIsDeactivatingAccount] = useState(false);
    const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
    const [deleteAccountError, setDeleteAccountError] = useState<string | null>(null);
    const [settingsError, setSettingsError] = useState<string | null>(null);
    const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
    const totalRevenue = orders.reduce((sum, order) => sum + Number(order.grandTotal), 0);
    const paidOrders = orders.filter((order) => order.paymentStatus === 'PAID').length;
    const awaitingOrders = orders.filter(
        (order) => order.paymentStatus === 'PENDING' || order.paymentStatus === 'OVERDUE',
    ).length;
    const processingOrders = orders.filter(
        (order) => order.orderStatus === 'NEW' || order.orderStatus === 'IN_PROGRESS',
    ).length;
    const averageOrder = orders.length > 0 ? totalRevenue / orders.length : 0;
    const lastOrder = orders[0] ?? null;
    const totalItems = orders.reduce(
        (sum, order) => sum + order.items.reduce((inner, item) => inner + item.quantity, 0),
        0,
    );

    function toggleSelection(id: number, setSelectedIds: Dispatch<SetStateAction<number[]>>) {
        setSelectedIds((currentIds) =>
            currentIds.includes(id)
                ? currentIds.filter((itemId) => itemId !== id)
                : [...currentIds, id],
        );
    }

    useEffect(() => {
        if (!isAddAddressModalOpen || isConfirmingNewAddress) {
            setAddressSuggestions([]);
            setIsLoadingAddressSuggestions(false);
            return;
        }

        const query = newAddressForm.fullAddress.trim();

        if (query.length < 3) {
            setAddressSuggestions([]);
            setIsLoadingAddressSuggestions(false);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setIsLoadingAddressSuggestions(true);

            try {
                const response = await fetch(
                    `/api/dadata/address?query=${encodeURIComponent(query)}`,
                    {
                        signal: controller.signal,
                    },
                );
                const data = (await response.json()) as {
                    suggestions?: AddressSuggestion[];
                    error?: string;
                };

                if (!response.ok) {
                    throw new Error(data.error || 'Не удалось загрузить подсказки адресов.');
                }

                setAddressSuggestions(data.suggestions ?? []);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setAddressSuggestions([]);

                if (error instanceof Error) {
                    setAddressesError(error.message);
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoadingAddressSuggestions(false);
                }
            }
        }, 300);

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [isAddAddressModalOpen, isConfirmingNewAddress, newAddressForm.fullAddress]);

    function openAddAddressModal() {
        setAddressesError(null);
        setAddressesSuccess(null);
        setEditingAddressId(null);
        setNewAddressForm(emptyNewAddressForm);
        setAddressSuggestions([]);
        setIsConfirmingNewAddress(false);
        setIsAddAddressModalOpen(true);
    }

    function openEditAddressModal(address: AccountAddress) {
        if (address.isLegal) return;

        setAddressesError(null);
        setAddressesSuccess(null);
        setEditingAddressId(address.id);
        setNewAddressForm({
            fullAddress: address.fullAddress,
            country: address.country,
            region: address.region,
            city: address.city,
            street: address.street,
            house: address.house,
            building: address.building,
            flat: address.flat,
            postalCode: address.postalCode,
        });
        setAddressSuggestions([]);
        setIsConfirmingNewAddress(false);
        setIsAddAddressModalOpen(true);
    }

    function closeAddAddressModal() {
        if (isSavingNewAddress) return;

        setIsAddAddressModalOpen(false);
        setIsConfirmingNewAddress(false);
        setEditingAddressId(null);
        setNewAddressForm(emptyNewAddressForm);
        setAddressSuggestions([]);
    }

    function selectAddressSuggestion(suggestion: AddressSuggestion) {
        setNewAddressForm({
            ...suggestion.data,
            fullAddress: suggestion.unrestrictedValue || suggestion.value,
        });
        setAddressSuggestions([]);
        setAddressesError(null);
    }

    function updateNewAddress(value: string) {
        setNewAddressForm({
            ...emptyNewAddressForm,
            fullAddress: value,
        });
        setAddressSuggestions([]);
        setAddressesError(null);
        setAddressesSuccess(null);
    }

    function requestNewAddressConfirmation(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!newAddressForm.fullAddress.trim()) {
            setAddressesError('Укажите новый адрес.');
            return;
        }

        setAddressesError(null);
        setIsConfirmingNewAddress(true);
    }

    async function saveAddress() {
        if (isSavingNewAddress) return;

        const isEditingAddress = editingAddressId !== null;
        setIsSavingNewAddress(true);
        setAddressesError(null);
        setAddressesSuccess(null);

        try {
            const response = await fetch(
                isEditingAddress
                    ? `/api/organization/addresses/${editingAddressId}`
                    : '/api/organization/addresses',
                {
                    method: isEditingAddress ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newAddressForm),
                },
            );

            const payload = (await response.json().catch(() => null)) as {
                error?: string;
                address?: AccountAddress;
            } | null;

            if (!response.ok || !payload?.address) {
                throw new Error(
                    payload?.error ||
                        (isEditingAddress
                            ? 'Не удалось сохранить изменения адреса.'
                            : 'Не удалось сохранить новый адрес.'),
                );
            }

            setAddresses((currentAddresses) =>
                isEditingAddress
                    ? currentAddresses.map((address) =>
                          address.id === payload.address?.id
                              ? (payload.address as AccountAddress)
                              : address,
                      )
                    : [...currentAddresses, payload.address as AccountAddress],
            );
            setAddressesSuccess(
                isEditingAddress ? 'Адрес обновлен.' : 'Новый адрес добавлен.',
            );
            setIsAddAddressModalOpen(false);
            setIsConfirmingNewAddress(false);
            setEditingAddressId(null);
            setNewAddressForm(emptyNewAddressForm);
            setAddressSuggestions([]);
        } catch (error) {
            setAddressesError(
                error instanceof Error ? error.message : 'Не удалось сохранить адрес.',
            );
        } finally {
            setIsSavingNewAddress(false);
        }
    }

    async function deleteSelectedOrders() {
        if (selectedOrderIds.length === 0 || isDeletingOrders) return;

        setIsDeletingOrders(true);
        setOrdersError(null);

        try {
            const deletedOrderIds = await Promise.all(
                selectedOrderIds.map(async (orderId) => {
                    const response = await fetch(`/api/orders/${orderId}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) {
                        const data = (await response.json().catch(() => null)) as {
                            error?: string;
                        } | null;
                        throw new Error(data?.error || 'Не удалось удалить заказ.');
                    }

                    return orderId;
                }),
            );

            setOrders((currentOrders) =>
                currentOrders.filter((order) => !deletedOrderIds.includes(order.id)),
            );
            setSelectedOrderIds([]);
        } catch (error) {
            setOrdersError(
                error instanceof Error ? error.message : 'Не удалось удалить выбранные заказы.',
            );
        } finally {
            setIsDeletingOrders(false);
        }
    }

    async function deleteSelectedAddresses() {
        if (selectedAddressIds.length === 0 || isDeletingAddresses) return;

        setIsDeletingAddresses(true);
        setAddressesError(null);

        try {
            const deletedAddressIds = await Promise.all(
                selectedAddressIds.map(async (addressId) => {
                    const response = await fetch(`/api/organization/addresses/${addressId}`, {
                        method: 'DELETE',
                    });

                    if (!response.ok) {
                        const data = (await response.json().catch(() => null)) as {
                            error?: string;
                        } | null;
                        throw new Error(data?.error || 'Не удалось удалить адрес.');
                    }

                    return addressId;
                }),
            );

            setAddresses((currentAddresses) =>
                currentAddresses.filter((address) => !deletedAddressIds.includes(address.id)),
            );
            setSelectedAddressIds([]);
        } catch (error) {
            setAddressesError(
                error instanceof Error ? error.message : 'Не удалось удалить выбранные адреса.',
            );
        } finally {
            setIsDeletingAddresses(false);
        }
    }

    function updateSettingsField<K extends keyof SettingsFormState>(
        key: K,
        value: SettingsFormState[K],
    ) {
        setSettingsForm((currentForm) => ({ ...currentForm, [key]: value }));
    }

    function resetSettingsForm() {
        setSettingsForm({
            ...initialSettingsForm,
            newPassword: '',
        });
        setSettingsError(null);
        setSettingsSuccess(null);
        setIsEditingSettings(false);
    }

    async function saveSettings(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (isSavingSettings) return;

        setIsSavingSettings(true);
        setSettingsError(null);
        setSettingsSuccess(null);

        try {
            const response = await fetch('/api/account/settings', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settingsForm),
            });

            const payload = (await response.json().catch(() => null)) as {
                error?: string;
                user?: {
                    email: string;
                    firstName: string;
                    lastName: string;
                    phone: string | null;
                };
                organization?: {
                    fullName: string;
                    shortName: string | null;
                    type: OrganizationType;
                    inn: string;
                    kpp: string | null;
                };
                address?: AccountAddress;
            } | null;

            if (!response.ok || !payload?.user || !payload.organization || !payload.address) {
                throw new Error(payload?.error || 'Не удалось сохранить изменения.');
            }

            const updatedAddress = payload.address;

            const updatedSettingsForm: SettingsFormState = {
                email: payload.user.email,
                firstName: payload.user.firstName,
                lastName: payload.user.lastName,
                phone: payload.user.phone || '',
                organizationInn: payload.organization.inn,
                organizationType: payload.organization.type,
                organizationKpp: payload.organization.kpp || '',
                organizationFullName: payload.organization.fullName,
                organizationShortName: payload.organization.shortName || '',
                organizationFullAddress: updatedAddress.fullAddress,
                newPassword: '',
            };

            setSettingsForm(updatedSettingsForm);
            setAddresses((currentAddresses) => {
                const remainingAddresses = currentAddresses.filter(
                    (address) => !(address.isLegal && address.id !== updatedAddress.id),
                );
                const existingIndex = remainingAddresses.findIndex(
                    (address) => address.id === updatedAddress.id,
                );

                if (existingIndex === -1) {
                    return [updatedAddress, ...remainingAddresses];
                }

                return remainingAddresses.map((address) =>
                    address.id === updatedAddress.id ? updatedAddress : address,
                );
            });
            account.email = payload.user.email;
            account.firstName = payload.user.firstName;
            account.lastName = payload.user.lastName;
            account.phone = payload.user.phone;
            account.organization.fullName = payload.organization.fullName;
            account.organization.shortName = payload.organization.shortName;
            account.organization.type = payload.organization.type;
            account.organization.inn = payload.organization.inn;
            account.organization.kpp = payload.organization.kpp;
            setSettingsSuccess('Данные обновлены.');
            setIsEditingSettings(false);
        } catch (error) {
            setSettingsError(
                error instanceof Error ? error.message : 'Не удалось сохранить изменения.',
            );
        } finally {
            setIsSavingSettings(false);
        }
    }

    async function deactivateAccount() {
        if (isDeactivatingAccount) return;

        const password = deleteAccountPassword;

        if (!password) {
            setDeleteAccountError('Введите пароль от аккаунта.');
            return;
        }

        setIsDeactivatingAccount(true);
        setDeleteAccountError(null);
        setSettingsError(null);
        setSettingsSuccess(null);

        try {
            const response = await fetch('/api/account/deactivate', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password }),
            });
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;

            if (!response.ok) {
                throw new Error(payload?.error || 'Не удалось удалить аккаунт.');
            }

            await signOut({ callbackUrl: '/' });
        } catch (error) {
            setSettingsError(
                error instanceof Error ? error.message : 'Не удалось удалить аккаунт.',
            );
            setIsDeleteAccountModalOpen(false);
            setIsDeactivatingAccount(false);
            setDeleteAccountPassword('');
        }
    }

    function openDeleteAccountModal() {
        setSettingsError(null);
        setSettingsSuccess(null);
        setDeleteAccountError(null);
        setDeleteAccountPassword('');
        setIsDeleteAccountModalOpen(true);
    }

    function closeDeleteAccountModal() {
        if (isDeactivatingAccount) return;

        setIsDeleteAccountModalOpen(false);
        setDeleteAccountError(null);
        setDeleteAccountPassword('');
    }

    return (
        <section className="w-screen bg-white py-14 sm:py-18 lg:py-20">
            <div className="container mx-auto px-5">
                <div className="rounded-[2.25rem] bg-[linear-gradient(135deg,#0e1623_0%,#12315f_100%)] px-6 py-8 text-white sm:px-8 sm:py-10">
                    <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
                        <div className="space-y-4">
                            <p className="text-sm uppercase tracking-[0.28em] text-white/60">
                                Личный кабинет
                            </p>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-semibold sm:text-4xl">
                                    {account.firstName} {account.lastName}
                                </h1>
                                <p className="max-w-2xl text-sm leading-6 text-white/75 sm:text-base">
                                    Управление заказами, адресами и реквизитами компании в одном
                                    dashboard.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3">
                            <div className="rounded-3xl border border-white/15 bg-white/8 px-5 py-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                                    Организация
                                </p>
                                <p className="mt-2 text-sm text-white">{organizationName}</p>
                            </div>
                            <div className="rounded-3xl border border-white/15 bg-white/8 px-5 py-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                                    Заказы
                                </p>
                                <p className="mt-2 text-sm text-white">{orders.length} записей</p>
                            </div>
                            <div className="rounded-3xl border border-white/15 bg-white/8 px-5 py-4">
                                <p className="text-xs uppercase tracking-[0.18em] text-white/55">
                                    Адреса
                                </p>
                                <p className="mt-2 text-sm text-white">
                                    {addresses.length} адресов
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)] xl:gap-8">
                    <aside className="lg:sticky lg:top-28 lg:self-start">
                        <div className="rounded-[2rem] bg-grey p-4 sm:p-5">
                            <div className="rounded-2xl ">
                                {/* <p className="text-xs uppercase tracking-[0.2em] text-dark-grey">Меню dashboard</p> */}
                                <h2 className="mt-3 text-2xl font-semibold text-black">
                                    Разделы кабинета
                                </h2>
                                {/* <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    Переключайте вкладки слева, чтобы быстро перейти к нужному разделу.
                                </p> */}
                            </div>

                            <nav className="mt-4 flex flex-col gap-3">
                                {dashboardTabs.map((tab) => (
                                    <button
                                        key={tab.id}
                                        type="button"
                                        onClick={() => setActiveTab(tab.id)}
                                        className={cn(
                                            'rounded-3xl border px-5 py-4 text-left transition-all duration-200',
                                            activeTab === tab.id
                                                ? 'border-accent/30 bg-accent text-white shadow-shadow-main/10'
                                                : 'border-grey/80 bg-white hover:border-accent/30 hover:bg-accent/5',
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <p
                                                className={cn(
                                                    'text-sm font-semibold',
                                                    activeTab === tab.id
                                                        ? 'text-white'
                                                        : 'text-black',
                                                )}
                                            >
                                                {tab.label}
                                            </p>
                                            <span
                                                className={cn(
                                                    'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]',
                                                    activeTab === tab.id
                                                        ? 'bg-white/15 text-white'
                                                        : 'bg-grey text-black',
                                                )}
                                            >
                                                {tab.shortLabel}
                                            </span>
                                        </div>
                                        <p
                                            className={cn(
                                                'mt-2 text-xs leading-5',
                                                activeTab === tab.id
                                                    ? 'text-white/75'
                                                    : 'text-dark-grey',
                                            )}
                                        >
                                            {tab.description}
                                        </p>
                                    </button>
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <div className="space-y-6 xl:space-y-8">
                        {activeTab === 'overview' ? (
                            <>
                                <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
                                    <SectionTitle
                                        title="Личный кабинет"
                                        description="Ключевые показатели по заказам, текущая активность и краткая аналитика по аккаунту."
                                    />

                                    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <InfoCard
                                            label="Всего заказов"
                                            value={`${orders.length}`}
                                        />
                                        <InfoCard
                                            label="На сумму"
                                            value={formatMoney(totalRevenue)}
                                        />
                                        <InfoCard
                                            label="Средний заказ"
                                            value={formatMoney(averageOrder)}
                                        />
                                        <InfoCard label="Товарных единиц" value={`${totalItems}`} />
                                    </div>

                                    <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                                        <InfoCard
                                            label="Оплачено / завершено"
                                            value={`${paidOrders}`}
                                        />
                                        <InfoCard
                                            label="Ожидают оплаты"
                                            value={`${awaitingOrders}`}
                                        />
                                        <InfoCard label="В работе" value={`${processingOrders}`} />
                                        <InfoCard
                                            label="Последний заказ"
                                            value={
                                                lastOrder
                                                    ? `${lastOrder.number}, ${formatDate(lastOrder.createdAt)}`
                                                    : 'Пока нет'
                                            }
                                        />
                                    </div>
                                </section>

                                <OverviewChart orders={orders} />

                                <section className="rounded-[2rem] border border-grey/80 bg-grey/25 p-6 sm:p-8">
                                    <SectionTitle
                                        title="Быстрый обзор"
                                        description="Срез по последнему заказу, текущим статусам и настройкам организации."
                                    />

                                    <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                                        <div className="rounded-3xl border border-grey/70 bg-white p-5">
                                            <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">
                                                Последний заказ
                                            </p>
                                            {lastOrder ? (
                                                <>
                                                    <div className="mt-4 flex flex-wrap items-center gap-3">
                                                        <h2 className="text-xl font-semibold text-black">
                                                            {lastOrder.number}
                                                        </h2>
                                                        <span
                                                            className={cn(
                                                                'rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]',
                                                                getOrderStatusTone(
                                                                    lastOrder.orderStatus,
                                                                ),
                                                            )}
                                                        >
                                                            {
                                                                labels.orderStatus[
                                                                    lastOrder.orderStatus
                                                                ]
                                                            }
                                                        </span>
                                                    </div>
                                                    <div className="mt-4 grid gap-3 text-sm text-dark-grey sm:grid-cols-2">
                                                        <p>
                                                            Создан:{' '}
                                                            {formatDate(lastOrder.createdAt)}
                                                        </p>
                                                        <p>
                                                            Сумма:{' '}
                                                            {formatMoney(lastOrder.grandTotal)}
                                                        </p>
                                                        <p>
                                                            Оплата:{' '}
                                                            {
                                                                labels.paymentType[
                                                                    lastOrder.paymentType
                                                                ]
                                                            }
                                                        </p>
                                                        <p>
                                                            Доставка:{' '}
                                                            {
                                                                labels.deliveryType[
                                                                    lastOrder.deliveryType
                                                                ]
                                                            }
                                                        </p>
                                                    </div>
                                                </>
                                            ) : (
                                                <p className="mt-4 text-sm text-dark-grey">
                                                    Заказов пока нет.
                                                </p>
                                            )}
                                        </div>

                                        <div className="rounded-3xl border border-grey/70 bg-white p-5">
                                            <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">
                                                Организация
                                            </p>
                                            <h2 className="mt-4 text-xl font-semibold text-black">
                                                {organizationName}
                                            </h2>
                                            <div className="mt-4 space-y-3 text-sm leading-6 text-dark-grey">
                                                <p>ИНН: {account.organization.inn}</p>
                                                <p>
                                                    Стандартная оплата:{' '}
                                                    {
                                                        labels.paymentType[
                                                            account.organization.defaultPaymentType
                                                        ]
                                                    }
                                                </p>
                                                <p>
                                                    Отсрочка:{' '}
                                                    {account.organization.deferredPaymentDays} дн.
                                                </p>
                                                <p>
                                                    Последний вход:{' '}
                                                    {formatDate(account.lastLoginAt)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </>
                        ) : null}

                        {activeTab === 'orders' ? (
                            <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
                                <SectionTitle
                                    title="Заказы"
                                    description="Подробный список заказов со статусами, суммами, документами и раскрывающимся составом товаров."
                                />

                                <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-grey/25 p-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-dark-grey">
                                        Выбрано заказов: {selectedOrderIds.length}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={deleteSelectedOrders}
                                        disabled={selectedOrderIds.length === 0 || isDeletingOrders}
                                        className={cn(
                                            'rounded-full px-5 py-3 text-sm font-semibold transition',
                                            selectedOrderIds.length === 0 || isDeletingOrders
                                                ? 'cursor-not-allowed bg-grey text-dark-grey'
                                                : 'bg-black text-white hover:bg-accent',
                                        )}
                                    >
                                        {isDeletingOrders ? 'Удаление...' : 'Удалить выбранные'}
                                    </button>
                                </div>

                                {ordersError ? (
                                    <p className="mt-4 rounded-2xl bg-[#fde6e6] px-4 py-3 text-sm text-[#a12b2b]">
                                        {ordersError}
                                    </p>
                                ) : null}

                                {orders.length === 0 ? (
                                    <div className="mt-6 rounded-3xl bg-grey/25 px-6 py-10 text-center">
                                        <p className="text-lg text-black">Заказов пока нет</p>
                                        <p className="mt-2 text-sm text-dark-grey">
                                            После оформления первого заказа история появится здесь.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-6 space-y-4">
                                        {orders.map((order) => (
                                            <article
                                                key={order.id}
                                                className="rounded-3xl border border-grey/70 bg-grey/10 p-5"
                                            >
                                                <label className="mb-4 inline-flex items-center gap-3 text-sm font-medium text-black">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedOrderIds.includes(
                                                            order.id,
                                                        )}
                                                        onChange={() =>
                                                            toggleSelection(
                                                                order.id,
                                                                setSelectedOrderIds,
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-grey/80 accent-black"
                                                    />
                                                    Выбрать заказ
                                                </label>

                                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                                    <div className="space-y-3">
                                                        <div className="flex flex-wrap items-center gap-3">
                                                            <h2 className="text-lg font-semibold text-black">
                                                                {order.number}
                                                            </h2>
                                                            <span
                                                                className={cn(
                                                                    'rounded-full px-3 py-1 text-xs uppercase tracking-[0.16em]',
                                                                    getOrderStatusTone(
                                                                        order.orderStatus,
                                                                    ),
                                                                )}
                                                            >
                                                                {
                                                                    labels.orderStatus[
                                                                        order.orderStatus
                                                                    ]
                                                                }
                                                            </span>
                                                        </div>

                                                        <div className="grid gap-3 text-sm text-dark-grey sm:grid-cols-2 xl:grid-cols-4">
                                                            <p>
                                                                Создан:{' '}
                                                                {formatDate(order.createdAt)}
                                                            </p>
                                                            <p>
                                                                Оплата:{' '}
                                                                {
                                                                    labels.paymentType[
                                                                        order.paymentType
                                                                    ]
                                                                }
                                                            </p>
                                                            <p>
                                                                Доставка:{' '}
                                                                {
                                                                    labels.deliveryType[
                                                                        order.deliveryType
                                                                    ]
                                                                }
                                                            </p>
                                                            <p>Позиций: {order.items.length}</p>
                                                            <p>
                                                                Документов: {order.documents.length}
                                                            </p>
                                                            <p>
                                                                НДС: {formatMoney(order.vatTotal)}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="rounded-3xl bg-white px-5 py-4 text-left lg:min-w-56 lg:text-right">
                                                        <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">
                                                            Сумма
                                                        </p>
                                                        <p className="mt-2 text-2xl font-semibold text-black">
                                                            {formatMoney(order.grandTotal)}
                                                        </p>
                                                        <p className="mt-2 text-sm text-dark-grey">
                                                            Подытог: {formatMoney(order.subtotal)}
                                                        </p>
                                                        <p className="text-sm text-dark-grey">
                                                            Скидка:{' '}
                                                            {formatMoney(order.discountTotal)}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-5 grid gap-4 border-t border-grey/60 pt-5 md:grid-cols-2">
                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">
                                                            Адрес доставки
                                                        </p>
                                                        <p className="mt-2 text-sm leading-6 text-black">
                                                            {order.deliveryType === 'PICKUP'
                                                                ? 'Самовывоз'
                                                                : order.shippingAddress
                                                                  ? [
                                                                        order.shippingAddress.city,
                                                                        order.shippingAddress
                                                                            .street,
                                                                        order.shippingAddress.house
                                                                            ? `д. ${order.shippingAddress.house}`
                                                                            : null,
                                                                    ]
                                                                        .filter(Boolean)
                                                                        .join(', ')
                                                                  : 'Не указано'}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">
                                                            Комментарий и дата поставки
                                                        </p>
                                                        <p className="mt-2 text-sm leading-6 text-black">
                                                            {order.comment || 'Без комментария'}
                                                        </p>
                                                        <p className="mt-2 text-sm text-dark-grey">
                                                            Желаемая поставка:{' '}
                                                            {formatDate(
                                                                order.requestedDeliveryDate,
                                                            )}
                                                        </p>
                                                    </div>
                                                </div>

                                                {order.documents.length > 0 ? (
                                                    <div className="mt-5 rounded-3xl bg-white p-4">
                                                        <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">
                                                            Документы заказа
                                                        </p>
                                                        <div className="mt-3 flex flex-wrap gap-2">
                                                            {order.documents.map((document) => {
                                                                const documentLabel = `${
                                                                    documentTypeLabels[
                                                                        document.type
                                                                    ] || document.type
                                                                }${document.number ? ` №${document.number}` : ''}`;
                                                                const isInvoice =
                                                                    document.type === 'INVOICE';

                                                                return isInvoice ? (
                                                                    <a
                                                                        key={document.id}
                                                                        href={`/api/orders/${order.id}/invoice`}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center justify-center rounded-full bg-accent px-4 py-2 text-xs font-semibold text-white transition hover:bg-accent/90"
                                                                    >
                                                                        Скачать счет
                                                                    </a>
                                                                ) : (
                                                                    <span
                                                                        key={document.id}
                                                                        className="rounded-full bg-grey px-3 py-2 text-xs text-black"
                                                                    >
                                                                        {documentLabel}
                                                                    </span>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ) : null}

                                                <details className="mt-5 rounded-3xl border border-grey/70 bg-white open:shadow-shadow-main/10">
                                                    <summary className="cursor-pointer list-none px-5 py-4">
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div>
                                                                <p className="text-sm font-semibold text-black">
                                                                    Состав заказа
                                                                </p>
                                                                <p className="mt-1 text-xs text-dark-grey">
                                                                    Нажмите, чтобы показать товары
                                                                </p>
                                                            </div>
                                                            <span className="rounded-full bg-grey px-3 py-1 text-xs uppercase tracking-[0.16em] text-black">
                                                                {order.items.length} шт.
                                                            </span>
                                                        </div>
                                                    </summary>

                                                    <div className="border-t border-grey/70 px-5 py-4">
                                                        <div className="space-y-3">
                                                            {order.items.map((item) => (
                                                                <div
                                                                    key={item.id}
                                                                    className="grid gap-3 rounded-3xl bg-grey/35 p-4 md:grid-cols-[minmax(0,1.5fr)_repeat(4,minmax(0,0.7fr))]"
                                                                >
                                                                    <div>
                                                                        <p className="text-base font-semibold text-black">
                                                                            {item.productName}
                                                                        </p>
                                                                        <p className="mt-1 text-xs uppercase tracking-[0.14em] text-dark-grey">
                                                                            SKU: {item.productSku}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs uppercase tracking-[0.14em] text-dark-grey">
                                                                            Кол-во
                                                                        </p>
                                                                        <p className="mt-2 text-sm text-black">
                                                                            {item.quantity}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs uppercase tracking-[0.14em] text-dark-grey">
                                                                            Цена
                                                                        </p>
                                                                        <p className="mt-2 text-sm text-black">
                                                                            {formatMoney(
                                                                                item.unitPrice,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs uppercase tracking-[0.14em] text-dark-grey">
                                                                            НДС
                                                                        </p>
                                                                        <p className="mt-2 text-sm text-black">
                                                                            {Number(item.vatRate)}%
                                                                        </p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-xs uppercase tracking-[0.14em] text-dark-grey">
                                                                            Сумма
                                                                        </p>
                                                                        <p className="mt-2 text-sm font-semibold text-black">
                                                                            {formatMoney(
                                                                                item.lineTotal,
                                                                            )}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </details>
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ) : null}

                        {activeTab === 'addresses' ? (
                            <section className="rounded-[2rem] border border-grey/80 bg-grey/25 p-6 sm:p-8">
                                <SectionTitle
                                    title="Адреса"
                                    description="Юридические и отгрузочные адреса организации, которые используются при оформлении документов и доставок."
                                />

                                <div className="mt-6 flex flex-col gap-3 rounded-3xl bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                                    <p className="text-sm text-dark-grey">
                                        Выбрано адресов: {selectedAddressIds.length}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={deleteSelectedAddresses}
                                        disabled={
                                            selectedAddressIds.length === 0 || isDeletingAddresses
                                        }
                                        className={cn(
                                            'rounded-full px-5 py-3 text-sm font-semibold transition',
                                            selectedAddressIds.length === 0 || isDeletingAddresses
                                                ? 'cursor-not-allowed bg-grey text-dark-grey'
                                                : 'bg-black text-white hover:bg-accent',
                                        )}
                                    >
                                        {isDeletingAddresses ? 'Удаление...' : 'Удалить выбранные'}
                                    </button>
                                </div>

                                <div className="mt-3 flex justify-end">
                                    <button
                                        type="button"
                                        onClick={openAddAddressModal}
                                        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent"
                                    >
                                        <Plus className="size-4" aria-hidden="true" />
                                        Добавить адрес
                                    </button>
                                </div>

                                {addressesError ? (
                                    <p className="mt-4 rounded-2xl bg-[#fde6e6] px-4 py-3 text-sm text-[#a12b2b]">
                                        {addressesError}
                                    </p>
                                ) : null}

                                {addressesSuccess ? (
                                    <p className="mt-4 rounded-2xl bg-[#dff3e6] px-4 py-3 text-sm text-[#146c43]">
                                        {addressesSuccess}
                                    </p>
                                ) : null}

                                {addresses.length === 0 ? (
                                    <div className="mt-6 rounded-3xl border border-dashed border-grey/80 bg-white px-6 py-10 text-center">
                                        <p className="text-lg text-black">Адреса не найдены</p>
                                        <p className="mt-2 text-sm text-dark-grey">
                                            После добавления адресов организации они будут
                                            отображаться здесь.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="mt-6 grid gap-4 lg:grid-cols-2">
                                        {addresses.map((address) => (
                                            <article
                                                key={address.id}
                                                className="rounded-3xl border border-grey/70 bg-white p-5"
                                            >
                                                {!address.isLegal ? (
                                                    <label className="inline-flex items-center gap-3 text-sm font-medium text-black">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedAddressIds.includes(
                                                            address.id,
                                                        )}
                                                        onChange={() =>
                                                            toggleSelection(
                                                                address.id,
                                                                setSelectedAddressIds,
                                                            )
                                                        }
                                                        className="h-4 w-4 rounded border-grey/80 accent-black"
                                                    />
                                                    Выбрать адрес
                                                    </label>
                                                ) : null}

                                                <div className="mt-4 flex flex-wrap items-center gap-2">
                                                    {address.isPrimary ? (
                                                        <span className="rounded-full bg-black px-3 py-1 text-xs uppercase tracking-[0.16em] text-white">
                                                            Основной
                                                        </span>
                                                    ) : null}
                                                    {address.isLegal ? (
                                                        <span className="rounded-full bg-accent px-3 py-1 text-xs uppercase tracking-[0.16em] text-white">
                                                            Юридический
                                                        </span>
                                                    ) : null}
                                                    {address.isShipping ? (
                                                        <span className="rounded-full bg-grey px-3 py-1 text-xs uppercase tracking-[0.16em] text-black">
                                                            Отгрузочный
                                                        </span>
                                                    ) : null}
                                                </div>

                                                <h2 className="mt-4 text-lg font-semibold text-black">
                                                    {address.label || 'Адрес организации'}
                                                </h2>
                                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                                    {address.fullAddress}
                                                </p>
                                                {!address.isLegal ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => openEditAddressModal(address)}
                                                        className="mt-4 inline-flex items-center gap-2 rounded-full border border-grey/80 px-4 py-2 text-sm font-semibold text-black transition hover:border-black"
                                                    >
                                                        <Pencil className="size-4" aria-hidden="true" />
                                                        Редактировать
                                                    </button>
                                                ) : null}
                                            </article>
                                        ))}
                                    </div>
                                )}
                            </section>
                        ) : null}

                        {isAddAddressModalOpen ? (
                            <div
                                className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                                role="dialog"
                                aria-modal="true"
                            >
                                <div className="w-full max-w-xl rounded-[2rem] bg-white p-6 shadow-xl">
                                    <div className="flex items-start justify-between gap-4">
                                        <div>
                                            <p className="text-xs uppercase tracking-[0.18em] text-dark-grey">
                                                Адрес доставки
                                            </p>
                                            <h2 className="mt-2 text-xl font-semibold text-black">
                                                {isConfirmingNewAddress
                                                    ? editingAddressId
                                                        ? 'Подтвердите изменение адреса'
                                                        : 'Подтвердите добавление адреса'
                                                    : editingAddressId
                                                      ? 'Редактировать адрес'
                                                      : 'Добавить адрес'}
                                            </h2>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={closeAddAddressModal}
                                            className="rounded-full border border-grey/80 p-2 text-black transition hover:border-black"
                                            aria-label="Закрыть"
                                        >
                                            <X className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>

                                    {addressesError ? (
                                        <p className="mt-4 rounded-2xl bg-[#fde6e6] px-4 py-3 text-sm text-[#a12b2b]">
                                            {addressesError}
                                        </p>
                                    ) : null}

                                    {isConfirmingNewAddress ? (
                                        <div className="mt-6 space-y-5">
                                            <div className="rounded-2xl bg-grey/40 p-4">
                                                <p className="text-sm text-dark-grey">
                                                    {editingAddressId
                                                        ? 'Адрес будет обновлен:'
                                                        : 'Новый адрес будет добавлен в адреса организации:'}
                                                </p>
                                                <p className="mt-2 text-base font-semibold leading-6 text-black">
                                                    {newAddressForm.fullAddress}
                                                </p>
                                            </div>

                                            <div className="flex flex-wrap justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => setIsConfirmingNewAddress(false)}
                                                    disabled={isSavingNewAddress}
                                                    className="rounded-full border border-grey/80 px-5 py-3 text-sm font-semibold text-black transition hover:border-black disabled:cursor-not-allowed disabled:text-dark-grey"
                                                >
                                                    Вернуться
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={saveAddress}
                                                    disabled={isSavingNewAddress}
                                                    className={cn(
                                                        'rounded-full px-5 py-3 text-sm font-semibold text-white transition',
                                                        isSavingNewAddress
                                                            ? 'cursor-not-allowed bg-grey text-dark-grey'
                                                            : 'bg-black hover:bg-accent',
                                                    )}
                                                >
                                                    {isSavingNewAddress
                                                        ? 'Сохранение...'
                                                        : 'Подтвердить'}
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <form
                                            className="mt-6 space-y-5"
                                            onSubmit={requestNewAddressConfirmation}
                                        >
                                            <label className="block text-sm text-dark-grey">
                                                Укажите новый адрес:
                                                <div className="relative mt-2">
                                                    <input
                                                        required
                                                        autoComplete="off"
                                                        value={newAddressForm.fullAddress}
                                                        onChange={(event) =>
                                                            updateNewAddress(event.target.value)
                                                        }
                                                        className="w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent"
                                                        placeholder="г. Москва, ул. Тверская, д. 1"
                                                    />

                                                    {isLoadingAddressSuggestions ? (
                                                        <p className="mt-2 text-xs text-dark-grey">
                                                            Загрузка предложений по адресам...
                                                        </p>
                                                    ) : null}

                                                    {addressSuggestions.length > 0 ? (
                                                        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 max-h-64 overflow-y-auto rounded-2xl border border-grey bg-white shadow-lg">
                                                            {addressSuggestions.map((suggestion) => (
                                                                <button
                                                                    key={`${suggestion.unrestrictedValue}-${suggestion.value}`}
                                                                    type="button"
                                                                    onClick={() =>
                                                                        selectAddressSuggestion(
                                                                            suggestion,
                                                                        )
                                                                    }
                                                                    className="block w-full border-b border-grey px-4 py-3 text-left text-sm text-black transition-colors last:border-b-0 hover:bg-grey"
                                                                >
                                                                    {suggestion.unrestrictedValue ||
                                                                        suggestion.value}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </label>

                                            <div className="flex flex-wrap justify-end gap-3">
                                                <button
                                                    type="button"
                                                    onClick={closeAddAddressModal}
                                                    className="rounded-full border border-grey/80 px-5 py-3 text-sm font-semibold text-black transition hover:border-black"
                                                >
                                                    Отмена
                                                </button>
                                                <button
                                                    type="submit"
                                                    className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent"
                                                >
                                                    {editingAddressId
                                                        ? 'Сохранить адрес'
                                                        : 'Сохранить новый адрес'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        ) : null}

                        {activeTab === 'settings' ? (
                            <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
                                <SectionTitle
                                    title="Настройки"
                                    description="Личные данные пользователя и основные реквизиты организации, на которую оформляются заказы."
                                />

                                <form className="mt-6 space-y-6" onSubmit={saveSettings}>
                                    <div className="flex flex-col gap-3 rounded-3xl bg-grey/20 p-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-black">
                                                Регистрационные данные
                                            </p>
                                            <p className="mt-1 text-sm text-dark-grey">
                                                Пароль не отображается. Для изменения укажите новый
                                                пароль.
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap gap-3">
                                            {isEditingSettings ? (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={resetSettingsForm}
                                                        className="rounded-full border border-grey/80 px-5 py-3 text-sm font-semibold text-black transition hover:border-black"
                                                    >
                                                        Отмена
                                                    </button>
                                                    <button
                                                        type="submit"
                                                        disabled={isSavingSettings}
                                                        className={cn(
                                                            'rounded-full px-5 py-3 text-sm font-semibold text-white transition',
                                                            isSavingSettings
                                                                ? 'cursor-not-allowed bg-grey text-dark-grey'
                                                                : 'bg-black hover:bg-accent',
                                                        )}
                                                    >
                                                        {isSavingSettings
                                                            ? 'Сохранение...'
                                                            : 'Сохранить'}
                                                    </button>
                                                </>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSettingsError(null);
                                                        setSettingsSuccess(null);
                                                        setIsEditingSettings(true);
                                                    }}
                                                    className="rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent"
                                                >
                                                    Редактировать
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {settingsError ? (
                                        <p className="rounded-2xl bg-[#fde6e6] px-4 py-3 text-sm text-[#a12b2b]">
                                            {settingsError}
                                        </p>
                                    ) : null}

                                    {settingsSuccess ? (
                                        <p className="rounded-2xl bg-[#dff3e6] px-4 py-3 text-sm text-[#146c43]">
                                            {settingsSuccess}
                                        </p>
                                    ) : null}

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block">
                                            <span className="text-sm text-black">Имя</span>
                                            <input
                                                type="text"
                                                value={settingsForm.firstName}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'firstName',
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="text-sm text-black">Фамилия</span>
                                            <input
                                                type="text"
                                                value={settingsForm.lastName}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'lastName',
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="text-sm text-black">Email</span>
                                            <input
                                                type="email"
                                                value={settingsForm.email}
                                                onChange={(event) =>
                                                    updateSettingsField('email', event.target.value)
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="text-sm text-black">Телефон</span>
                                            <input
                                                type="tel"
                                                value={settingsForm.phone}
                                                onChange={(event) =>
                                                    updateSettingsField('phone', event.target.value)
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block">
                                            <span className="text-sm text-black">ИНН</span>
                                            <input
                                                type="text"
                                                value={settingsForm.organizationInn}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'organizationInn',
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="text-sm text-black">КПП</span>
                                            <input
                                                type="text"
                                                value={settingsForm.organizationKpp}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'organizationKpp',
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="text-sm text-black">
                                                Тип организации
                                            </span>
                                            <select
                                                value={settingsForm.organizationType}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'organizationType',
                                                        event.target.value as OrganizationType,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            >
                                                {organizationTypeOptions.map((option) => (
                                                    <option key={option.value} value={option.value}>
                                                        {option.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>

                                        <label className="block sm:col-span-2">
                                            <span className="text-sm text-black">
                                                Полное наименование организации
                                            </span>
                                            <input
                                                type="text"
                                                value={settingsForm.organizationFullName}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'organizationFullName',
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>

                                        <label className="block">
                                            <span className="text-sm text-black">
                                                Короткое название
                                            </span>
                                            <input
                                                type="text"
                                                value={settingsForm.organizationShortName}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'organizationShortName',
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>

                                        <label className="block sm:col-span-2">
                                            <span className="text-sm text-black">
                                                Юридический адрес
                                            </span>
                                            <input
                                                type="text"
                                                value={settingsForm.organizationFullAddress}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'organizationFullAddress',
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <label className="block">
                                            <span className="text-sm text-black">Новый пароль</span>
                                            <input
                                                type="password"
                                                minLength={8}
                                                value={settingsForm.newPassword}
                                                onChange={(event) =>
                                                    updateSettingsField(
                                                        'newPassword',
                                                        event.target.value,
                                                    )
                                                }
                                                disabled={!isEditingSettings}
                                                placeholder="Оставьте пустым, если менять не нужно"
                                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                            />
                                        </label>
                                    </div>
                                </form>

                                <div className="mt-8 rounded-3xl border border-red-200 bg-red-50 p-5">
                                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-semibold text-red-700">
                                                Удаление аккаунта
                                            </p>
                                            <p className="mt-1 text-sm leading-6 text-red-700/80">
                                                Аккаунт будет деактивирован. Заказы и документы
                                                сохранятся в системе.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={openDeleteAccountModal}
                                            disabled={isDeactivatingAccount}
                                            className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                                        >
                                            Удалить аккаунт
                                        </button>
                                    </div>
                                </div>
                            </section>
                        ) : null}
                    </div>
                </div>
            </div>

            {isDeleteAccountModalOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-account-title"
                >
                    <div className="w-full max-w-md rounded-[2rem] bg-white p-6 shadow-xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-xs uppercase tracking-[0.18em] text-red-600">
                                    Удаление аккаунта
                                </p>
                                <h2
                                    id="delete-account-title"
                                    className="mt-2 text-xl font-semibold text-black"
                                >
                                    Подтвердите действие
                                </h2>
                            </div>
                            <button
                                type="button"
                                onClick={closeDeleteAccountModal}
                                disabled={isDeactivatingAccount}
                                className="rounded-full border border-grey/80 p-2 text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
                                aria-label="Закрыть"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <p className="mt-5 text-sm leading-6 text-dark-grey">
                            Аккаунт будет удален. Восстановить доступ можно будет только через
                            администратора сайта.
                        </p>

                        <label className="mt-5 block">
                            <span className="text-sm font-medium text-black">
                                Пароль от аккаунта
                            </span>
                            <input
                                type="password"
                                value={deleteAccountPassword}
                                onChange={(event) => {
                                    setDeleteAccountPassword(event.target.value);
                                    setDeleteAccountError(null);
                                }}
                                disabled={isDeactivatingAccount}
                                autoComplete="current-password"
                                className="mt-2 w-full rounded-2xl border border-grey/80 bg-white px-4 py-3 text-sm text-black outline-none transition focus:ring-2 focus:ring-accent disabled:bg-grey/20 disabled:text-dark-grey"
                                placeholder="Введите пароль"
                            />
                        </label>

                        {deleteAccountError ? (
                            <p className="mt-3 rounded-2xl bg-[#fde6e6] px-4 py-3 text-sm text-[#a12b2b]">
                                {deleteAccountError}
                            </p>
                        ) : null}

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={closeDeleteAccountModal}
                                disabled={isDeactivatingAccount}
                                className="inline-flex items-center justify-center rounded-full border border-grey/80 px-5 py-3 text-sm font-semibold text-black transition hover:border-black disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Отменить
                            </button>
                            <button
                                type="button"
                                onClick={deactivateAccount}
                                disabled={isDeactivatingAccount || deleteAccountPassword === ''}
                                className="inline-flex items-center justify-center rounded-full bg-red-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {isDeactivatingAccount ? 'Удаление...' : 'Подтвердить'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
