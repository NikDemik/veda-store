'use client';

import type { DeliveryType, OrganizationAddress } from '@/types/data';
import { MapPin } from 'lucide-react';

type AddressSuggestion = {
    value: string;
    unrestrictedValue: string;
    data: {
        country: string;
        region: string | null;
        city: string;
        street: string;
        house: string | null;
        building: string | null;
        flat: string | null;
        postalCode: string | null;
        fiasId?: string | null;
        kladrId?: string | null;
    };
};

const deliveryOptions: Array<{
    value: DeliveryType;
    title: string;
    description: string;
}> = [
    {
        value: 'PICKUP',
        title: 'Самовывоз',
        description: 'Адрес доставки не требуется, детали получения согласует менеджер.',
    },
    {
        value: 'TRANSPORT_COMPANY',
        title: 'Доставка ТК',
        description: 'Отгрузка через транспортную компанию на указанный адрес.',
    },
];

type CheckoutDeliveryMethodSectionProps = {
    formId: string;
    deliveryType: DeliveryType;
    onDeliveryTypeChangeAction: (value: DeliveryType) => void;
    requiresShippingAddress: boolean;
    organizationAddresses: OrganizationAddress[];
    selectedAddressId: number | null;
    isLoadingAddresses: boolean;
    onSavedAddressSelectAction: (address: OrganizationAddress) => void;
    shippingFullAddress: string;
    addressSuggestions: AddressSuggestion[];
    isLoadingAddressSuggestions: boolean;
    onAddressSuggestionSelectAction: (suggestion: AddressSuggestion) => void;
    onShippingFullAddressChangeAction: (value: string) => void;
    comment: string;
    onCommentChangeAction: (value: string) => void;
    submitError: string;
    submitSuccess: string;
    onSubmitAction: (event: React.FormEvent<HTMLFormElement>) => void;
};

function formatAddress(address: OrganizationAddress) {
    return [address.fullAddress].filter(Boolean).join(', ');
}

export function CheckoutDeliveryMethodSection({
    formId,
    deliveryType,
    onDeliveryTypeChangeAction,
    requiresShippingAddress,
    organizationAddresses,
    selectedAddressId,
    isLoadingAddresses,
    onSavedAddressSelectAction,
    shippingFullAddress,
    addressSuggestions,
    isLoadingAddressSuggestions,
    onAddressSuggestionSelectAction,
    onShippingFullAddressChangeAction,
    comment,
    onCommentChangeAction,
    submitError,
    submitSuccess,
    onSubmitAction,
}: CheckoutDeliveryMethodSectionProps) {
    const shouldShowSavedAddresses =
        deliveryType === 'TRANSPORT_COMPANY' && organizationAddresses.length > 0;

    return (
        <div className="space-y-6 rounded-2xl border border-grey bg-white p-6">
            <h2 className="text-black">Способ получения</h2>
            <div className="grid gap-5 sm:grid-cols-2">
                {deliveryOptions.map((option) => (
                    <button
                        key={option.value}
                        type="button"
                        onClick={() => onDeliveryTypeChangeAction(option.value)}
                        className={`rounded-2xl border p-5 text-left transition-colors ${
                            deliveryType === option.value
                                ? 'border-black bg-black text-white'
                                : 'border-grey bg-grey text-black hover:border-black/30'
                        }`}
                    >
                        <p className="text-base font-medium">{option.title}</p>
                        <p
                            className={`mt-2 text-sm leading-6 ${
                                deliveryType === option.value ? 'text-white/75' : 'text-dark-grey'
                            }`}
                        >
                            {option.description}
                        </p>
                    </button>
                ))}
            </div>

            <form id={formId} className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={onSubmitAction}>
                {requiresShippingAddress ? (
                    <>
                        {deliveryType === 'TRANSPORT_COMPANY' ? (
                            <div className="space-y-4 sm:col-span-2">
                                <div className="flex items-center justify-between gap-3">
                                    {isLoadingAddresses ? (
                                        <span className="text-sm text-dark-grey">
                                            Загружаем адреса организации...
                                        </span>
                                    ) : null}
                                </div>

                                {shouldShowSavedAddresses ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-dark-grey">
                                            Доступные сохраненные адреса организации:
                                        </p>
                                        <div className="grid gap-3">
                                            {organizationAddresses.map((address) => (
                                                <button
                                                    key={address.id}
                                                    type="button"
                                                    onClick={() =>
                                                        onSavedAddressSelectAction(address)
                                                    }
                                                    className={` space-y-4 rounded-2xl border p-5 text-left transition-colors ${
                                                        selectedAddressId === address.id
                                                            ? 'border-black bg-black text-white'
                                                            : 'border-grey bg-grey text-black hover:border-black/30'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-medium">
                                                            {address.label || 'Адрес организации'}
                                                        </p>
                                                        {address.isPrimary ? (
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs ${
                                                                    selectedAddressId === address.id
                                                                        ? 'bg-white/15 text-white'
                                                                        : 'bg-white text-black'
                                                                }`}
                                                            >
                                                                Основной
                                                            </span>
                                                        ) : null}
                                                        {address.isLegal ? (
                                                            <span
                                                                className={`rounded-full px-2 py-1 text-xs ${
                                                                    selectedAddressId === address.id
                                                                        ? 'bg-white/15 text-white'
                                                                        : 'bg-white text-black'
                                                                }`}
                                                            >
                                                                Юридический
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                    <div className="flex items-center gap-5">
                                                        <MapPin
                                                            color={`${
                                                                selectedAddressId === address.id
                                                                    ? 'var(--accent)'
                                                                    : 'var(--dark-grey)'
                                                            }`}
                                                        />
                                                        <p
                                                            className={`text-sm leading-6 ${
                                                                selectedAddressId === address.id
                                                                    ? 'text-white/75'
                                                                    : 'text-dark-grey'
                                                            }`}
                                                        >
                                                            {formatAddress(address)}
                                                        </p>
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}

                        <label className="flex flex-col gap-2 text-sm text-dark-grey col-span-2">
                            Укажите новый адрес:
                            <div className="relative">
                                <input
                                    required
                                    autoComplete="off"
                                    value={shippingFullAddress}
                                    onChange={(event) =>
                                        onShippingFullAddressChangeAction(event.target.value)
                                    }
                                    className="w-full rounded-xl border border-grey bg-white px-3 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-black/10"
                                    placeholder="г. Москва, ул. Тверская, д. 1"
                                />

                                {isLoadingAddressSuggestions ? (
                                    <p className="mt-2 text-xs text-dark-grey">
                                        Загрузка предложений по адресам...
                                    </p>
                                ) : null}

                                {addressSuggestions.length > 0 ? (
                                    <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-20 overflow-hidden rounded-2xl border border-grey bg-white shadow-lg">
                                        {addressSuggestions.map((suggestion) => (
                                            <button
                                                key={`${suggestion.unrestrictedValue}-${suggestion.value}`}
                                                type="button"
                                                onClick={() =>
                                                    onAddressSuggestionSelectAction(suggestion)
                                                }
                                                className="block w-full border-b border-grey px-4 py-3 text-left text-sm text-black transition-colors last:border-b-0 hover:bg-grey"
                                            >
                                                {suggestion.unrestrictedValue || suggestion.value}
                                            </button>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        </label>
                    </>
                ) : (
                    <div className="flex gap-5 rounded-2xl bg-black p-5 text-sm text-white leading-6 sm:col-span-2">
                        <MapPin color="var(--accent)" />
                        <p>г. Долгопрудный, Лихачевский проспект, 46, строение 1</p>
                    </div>
                )}

                <label className="flex flex-col gap-2 text-sm text-dark-grey sm:col-span-2">
                    Комментарий к заказу
                    <textarea
                        rows={2}
                        value={comment}
                        onChange={(event) => onCommentChangeAction(event.target.value)}
                        className="rounded-xl border border-grey bg-white px-5 py-2 text-base text-black focus:outline-none focus:ring-2 focus:ring-black/10 dark:bg-black dark:text-white"
                    />
                </label>

                <div className="text-sm text-dark-grey sm:col-span-2">
                    {submitError && <span className="text-red-500">{submitError}</span>}
                    {submitSuccess && <span className="text-green-600">{submitSuccess}</span>}
                </div>
            </form>
        </div>
    );
}
