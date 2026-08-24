'use client';

import { useEffect, useState } from 'react';
import { z } from 'zod';
import { CheckoutDeliveryMethodSection } from '@/components/checkout/checkout-delivery-method-section';
import type {
    CartItem,
    DeliveryType,
    OrganizationAddress,
    PaymentType,
} from '@/types/data';
import { Checkbox } from '../ui/checkbox';

type ShippingAddressDetails = {
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
    data: Omit<ShippingAddressDetails, 'fullAddress'> & {
        fiasId?: string | null;
        kladrId?: string | null;
    };
};

type CheckoutFormProps = {
    items: CartItem[];
    organizationId: number;
    organizationName?: string | null;
    organizationInn: string;
    formId: string;
    onSubmittingChange?: (isSubmitting: boolean) => void;
    onSuccess?: (orderNumber?: string) => void;
};

const checkoutSchema = z
    .object({
        paymentType: z.enum(['BANK_TRANSFER', 'PREPAYMENT', 'POSTPAYMENT'], {
            message: 'Please select a payment type.',
        }),
        deliveryType: z.enum(['PICKUP', 'TRANSPORT_COMPANY', 'CDEK'], {
            message: 'Please select a delivery type.',
        }),
        shippingFullAddress: z.string().trim().optional(),
        comment: z.string().trim().optional(),
    })
    .superRefine((data, ctx) => {
        if (data.deliveryType === 'PICKUP') {
            return;
        }

        if (!data.shippingFullAddress) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'Пожалуйста, укажите полный адрес.',
                path: ['shippingFullAddress'],
            });
        }
    });

export function CheckoutForm({
    items,
    organizationId,
    organizationName,
    organizationInn,
    formId,
    onSubmittingChange,
    onSuccess,
}: CheckoutFormProps) {
    const [paymentType, setPaymentType] = useState<PaymentType>('BANK_TRANSFER');
    const [deliveryType, setDeliveryType] = useState<DeliveryType>('PICKUP');
    const [shippingFullAddress, setShippingFullAddress] = useState('');
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');
    const [submitSuccess, setSubmitSuccess] = useState('');
    const [organizationAddresses, setOrganizationAddresses] = useState<OrganizationAddress[]>([]);
    const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
    const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
    const [shippingAddressDetails, setShippingAddressDetails] = useState<ShippingAddressDetails | null>(
        null,
    );
    const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
    const [isLoadingAddressSuggestions, setIsLoadingAddressSuggestions] = useState(false);

    const applyAddressDetails = (address: Partial<ShippingAddressDetails> & { fullAddress: string }) => {
        setShippingFullAddress(address.fullAddress);
        setShippingAddressDetails({
            fullAddress: address.fullAddress,
            country: address.country ?? 'RU',
            region: address.region ?? null,
            city: address.city ?? '',
            street: address.street ?? '',
            house: address.house ?? null,
            building: address.building ?? null,
            flat: address.flat ?? null,
            postalCode: address.postalCode ?? null,
        });
    };

    useEffect(() => {
        onSubmittingChange?.(isSubmitting);
    }, [isSubmitting, onSubmittingChange]);

    useEffect(() => {
        if (deliveryType !== 'TRANSPORT_COMPANY' || organizationAddresses.length > 0) {
            return;
        }

        let ignore = false;

        const loadAddresses = async () => {
            setIsLoadingAddresses(true);

            try {
                const response = await fetch('/api/organization/addresses');
                const data = (await response.json()) as {
                    addresses?: OrganizationAddress[];
                };

                if (!response.ok) {
                    throw new Error('Не удалось загрузить адреса организации');
                }

                if (ignore) {
                    return;
                }

                const addresses = data.addresses ?? [];
                setOrganizationAddresses(addresses);

                const primaryAddress =
                    addresses.find((address) => address.isPrimary) ?? addresses[0];

                if (primaryAddress) {
                    setSelectedAddressId(primaryAddress.id);
                    applyAddressDetails({
                        fullAddress: primaryAddress.fullAddress,
                        country: primaryAddress.country,
                        region: primaryAddress.region,
                        city: primaryAddress.city,
                        street: primaryAddress.street,
                        house: primaryAddress.house,
                        building: primaryAddress.building,
                        flat: primaryAddress.flat,
                        postalCode: primaryAddress.postalCode,
                    });
                }
            } catch {
                if (!ignore) {
                    setOrganizationAddresses([]);
                }
            } finally {
                if (!ignore) {
                    setIsLoadingAddresses(false);
                }
            }
        };

        void loadAddresses();

        return () => {
            ignore = true;
        };
    }, [deliveryType, organizationAddresses.length]);

    useEffect(() => {
        if (deliveryType !== 'TRANSPORT_COMPANY' || selectedAddressId) {
            setAddressSuggestions([]);
            setIsLoadingAddressSuggestions(false);
            return;
        }

        const query = shippingFullAddress.trim();

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
                    throw new Error(data.error || 'Failed to load address suggestions');
                }

                setAddressSuggestions(data.suggestions ?? []);
            } catch (error) {
                if (controller.signal.aborted) {
                    return;
                }

                setAddressSuggestions([]);

                if (error instanceof Error) {
                    setSubmitError(error.message);
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
    }, [deliveryType, selectedAddressId, shippingFullAddress]);

    const selectSavedAddress = (address: OrganizationAddress) => {
        setSelectedAddressId(address.id);
        setAddressSuggestions([]);
        applyAddressDetails({
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
    };

    const selectAddressSuggestion = (suggestion: AddressSuggestion) => {
        setSelectedAddressId(null);
        setAddressSuggestions([]);
        applyAddressDetails({
            ...suggestion.data,
            fullAddress: suggestion.unrestrictedValue || suggestion.value,
        });
    };

    const resetSavedAddressSelection = () => {
        setSelectedAddressId(null);
    };

    const requiresShippingAddress = deliveryType !== 'PICKUP';

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setSubmitError('');
        setSubmitSuccess('');

        if (items.length === 0) {
            setSubmitError('Корзина пустая.');
            return;
        }

        const parsed = checkoutSchema.safeParse({
            paymentType,
            deliveryType,
            shippingFullAddress,
            comment,
        });

        if (!parsed.success) {
            setSubmitError(parsed.error.errors[0]?.message ?? 'Пожалуйста, заполните форму.');
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationId,
                    paymentType: parsed.data.paymentType,
                    deliveryType: parsed.data.deliveryType,
                    shippingAddressId:
                        parsed.data.deliveryType === 'TRANSPORT_COMPANY' ? selectedAddressId : null,
                    comment: parsed.data.comment || null,
                    shippingAddress:
                        parsed.data.deliveryType === 'PICKUP'
                            ? null
                            : {
                                  fullAddress: parsed.data.shippingFullAddress || '',
                                  country: shippingAddressDetails?.country ?? 'RU',
                                  region: shippingAddressDetails?.region ?? null,
                                  city: shippingAddressDetails?.city || '',
                                  street: shippingAddressDetails?.street || '',
                                  house: shippingAddressDetails?.house ?? null,
                                  building: shippingAddressDetails?.building ?? null,
                                  flat: shippingAddressDetails?.flat ?? null,
                                  postalCode: shippingAddressDetails?.postalCode ?? null,
                              },
                    items: items.map((item) => ({
                        productId: item.id,
                        quantity: item.quantity,
                    })),
                }),
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data?.error || 'Не удалось создать заказ');
            }

            const orderNumber = data.order?.number as string | undefined;
            setSubmitSuccess(`Заказ #${orderNumber ?? ''} был создан.`.trim());
            onSuccess?.(orderNumber);
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Не удалось создать заказ';
            setSubmitError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="space-y-6 rounded-2xl border border-grey bg-white p-6">
                <h2 className="text-black">Данные получателя</h2>
                <p className="text-sm">
                    Заказ будет оформлен на {organizationName || `организацию #${organizationId}`},
                    ИНН: {organizationInn}
                </p>
            </div>

            <div className="space-y-6 rounded-2xl border border-grey bg-white p-6">
                <h2 className="text-black">Способ оплаты</h2>
                <div className="grid grid-cols-2 gap-5">
                    <div className="flex gap-5 rounded-2xl bg-grey p-5">
                        <Checkbox
                            className="h-5 w-5"
                            checked
                            disabled
                            onCheckedChange={() => setPaymentType('BANK_TRANSFER')}
                        />
                        <p>Безналичный расчет по счету</p>
                    </div>
                </div>
            </div>

            <CheckoutDeliveryMethodSection
                formId={formId}
                deliveryType={deliveryType}
                onDeliveryTypeChangeAction={setDeliveryType}
                requiresShippingAddress={requiresShippingAddress}
                organizationAddresses={organizationAddresses}
                selectedAddressId={selectedAddressId}
                isLoadingAddresses={isLoadingAddresses}
                onSavedAddressSelectAction={selectSavedAddress}
                shippingFullAddress={shippingFullAddress}
                addressSuggestions={addressSuggestions}
                isLoadingAddressSuggestions={isLoadingAddressSuggestions}
                onAddressSuggestionSelectAction={selectAddressSuggestion}
                onShippingFullAddressChangeAction={(value) => {
                    resetSavedAddressSelection();
                    setAddressSuggestions([]);
                    setShippingFullAddress(value);
                    setShippingAddressDetails(null);
                }}
                comment={comment}
                onCommentChangeAction={setComment}
                submitError={submitError}
                submitSuccess={submitSuccess}
                onSubmitAction={handleSubmit}
            />
        </div>
    );
}
