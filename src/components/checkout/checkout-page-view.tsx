'use client';

import { useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { CheckoutForm } from '@/components/checkout/checkout-form';
import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import currencyFormat from '@/lib/currencyFormat';
import { formatPrice, fromMinorUnits, toMinorUnits } from '@/lib/price';

export function CheckoutPageView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session, status } = useSession();
    const { items, clear, removeItem } = useCart();
    const checkoutFormId = useId();
    const [isSubmittingOrder, setIsSubmittingOrder] = useState(false);

    const selectedIds = useMemo(() => {
        const raw = searchParams.get('items');
        if (!raw) return [];

        return raw
            .split(',')
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value));
    }, [searchParams]);

    const checkoutItems = useMemo(() => {
        if (selectedIds.length === 0) {
            return items;
        }

        return items.filter((item) => selectedIds.includes(item.id));
    }, [items, selectedIds]);

    const checkoutTotal = useMemo(
        () =>
            fromMinorUnits(
                checkoutItems.reduce(
                    (sum, item) => sum + toMinorUnits(item.price) * item.quantity,
                    0,
                ),
            ),
        [checkoutItems],
    );

    if (status === 'loading') {
        return (
            <section className="relative w-screen py-20">
                <div className="container mx-auto px-5">
                    <p className="text-black">Загрузка...</p>
                </div>
            </section>
        );
    }

    if (status !== 'authenticated' || !session?.user) {
        const callbackUrl = encodeURIComponent(
            `/checkout${searchParams.toString() ? `?${searchParams.toString()}` : ''}`,
        );
        router.replace(`/auth/register?callbackUrl=${callbackUrl}`);
        return null;
    }

    if (checkoutItems.length === 0) {
        return (
            <section className="relative w-screen py-12">
                <div className="container mx-auto px-5">
                    <div className="mx-auto max-w-xl rounded-3xl border border-grey/60 bg-white p-8 text-center">
                        <h1 className="text-black">Оформление заказа</h1>
                        <p className="mt-3 text-dark-grey">
                            В корзине нет товаров для оформления заказа.
                        </p>
                        <div className="mt-6">
                            <Button asChild>
                                <Link href="/catalog">Перейти в каталог</Link>
                            </Button>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative w-screen py-12">
            <div className="container mx-auto space-y-8 px-5">
                <div className="space-y-3">
                    <h1 className="uppercase text-black">Оформление заказа</h1>
                    <p className="text-sm text-dark-grey">
                        Проверьте состав заказа и заполните данные доставки.
                    </p>
                    {checkoutItems.some((item) => item.availability === 'BACKORDER') ? (
                        <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                            В заказе есть товары «Под заказ». Менеджер подтвердит их цену и срок поставки; счёт будет сформирован после согласования.
                        </p>
                    ) : null}
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                    <div className="lg:col-span-3">
                        <CheckoutForm
                            items={checkoutItems}
                            organizationId={session.user.organizationId}
                            organizationInn={session.user.organizationInn}
                            organizationName={session.user.organizationName}
                            formId={checkoutFormId}
                            onSubmittingChange={setIsSubmittingOrder}
                            onSuccess={() => {
                                if (
                                    selectedIds.length === 0 ||
                                    selectedIds.length === items.length
                                ) {
                                    clear();
                                } else {
                                    selectedIds.forEach((id) => removeItem(id));
                                }

                                router.push('/account');
                            }}
                        />
                    </div>

                    <div className="flex flex-col gap-5">
                        <aside className="space-y-6 rounded-2xl bg-grey p-6">
                            <p className="text-lg font-semibold text-black">Состав заказа</p>
                            <div className="space-y-4">
                                {checkoutItems.map((item) => (
                                    <div key={`checkout-${item.id}`}>
                                        <p className="text-sm font-medium text-black">
                                            {item.name}
                                        </p>
                                        <p className="mt-1 text-sm text-dark-grey">
                                            {item.quantity} {item.unitShortName || 'шт.'} x{' '}
                                            {formatPrice(item.price)} {currencyFormat(item.currency)}
                                        </p>
                                        {item.availability === 'BACKORDER' ? (
                                            <span className="mt-2 inline-flex rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-900">
                                                Под заказ
                                            </span>
                                        ) : null}
                                    </div>
                                ))}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-base text-black">Итого</span>
                                <span className="text-2xl font-semibold text-black">
                                    {formatPrice(checkoutTotal)}{' '}
                                    {checkoutItems[0]
                                        ? currencyFormat(checkoutItems[0].currency)
                                        : ''}
                                </span>
                            </div>
                        </aside>

                        <Button
                            type="submit"
                            form={checkoutFormId}
                            disabled={isSubmittingOrder}
                            className="w-full"
                        >
                            {isSubmittingOrder ? 'Оформляем заказ...' : 'Оформить заказ'}
                        </Button>
                    </div>
                </div>
            </div>
        </section>
    );
}
