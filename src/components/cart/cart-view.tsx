'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Trash2 } from 'lucide-react';
import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { QuantitySelector } from '@/components/ui/quantity-selector';
import currencyFormat from '@/lib/currencyFormat';
import { getSafeImageUrl } from '@/lib/imageUrl';
import { formatPrice, multiplyPrice } from '@/lib/price';

export function CartView() {
    const { items, updateQuantity, removeItem, clear, total, currency } = useCart();
    const router = useRouter();
    const pathname = usePathname();
    const { data: session, status } = useSession();
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

    useEffect(() => {
        setSelectedIds((prev) => prev.filter((id) => items.some((item) => item.id === id)));
    }, [items]);

    const isAllSelected = items.length > 0 && selectedIds.length === items.length;
    const hasSelectedItems = selectedIds.length > 0;
    const selectedCount = useMemo(
        () =>
            items.reduce(
                (sum, item) => (selectedIds.includes(item.id) ? sum + item.quantity : sum),
                0,
            ),
        [items, selectedIds],
    );

    const toggleItemSelection = (id: number, checked: boolean) => {
        setSelectedIds((prev) => {
            if (checked) {
                return prev.includes(id) ? prev : [...prev, id];
            }

            return prev.filter((selectedId) => selectedId !== id);
        });
    };

    const toggleAllSelection = (checked: boolean) => {
        setSelectedIds(checked ? items.map((item) => item.id) : []);
    };

    const clearSelectedItems = () => {
        if (!hasSelectedItems) return;

        if (selectedIds.length === items.length) {
            clear();
            setSelectedIds([]);
            return;
        }

        selectedIds.forEach((id) => removeItem(id));
        setSelectedIds([]);
    };

    const handleCheckoutClick = () => {
        if (status === 'loading') return;

        const itemsParam =
            selectedIds.length > 0 ? `?items=${encodeURIComponent(selectedIds.join(','))}` : '';
        const checkoutUrl = `/checkout${itemsParam}`;

        if (status !== 'authenticated' || !session?.user) {
            const callbackUrl = encodeURIComponent(checkoutUrl);
            router.push(`/auth/register?callbackUrl=${callbackUrl}`);
            return;
        }

        router.push(checkoutUrl);
    };

    if (items.length === 0) {
        return (
            <section className="relative w-screen pt-20 pb-40">
                <div className="container mx-auto px-5">
                    <div className="mx-auto max-w-sm space-y-6 text-center">
                        <h1 className="text-black">Корзина</h1>
                        <p className="text-dark-grey">Ваша корзина пуста.</p>
                        <Button variant="default" size="default" asChild>
                            <Link href="/catalog">Перейти в каталог</Link>
                        </Button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="relative w-screen py-12">
            <div className="container mx-auto space-y-8 px-5">
                <h1 className="mb-8 uppercase text-black">Корзина</h1>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
                    <div className="space-y-5 lg:col-span-3">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <label className="flex items-center gap-3 text-sm text-black">
                                <Checkbox
                                    checked={isAllSelected}
                                    onCheckedChange={(checked) =>
                                        toggleAllSelection(checked === true)
                                    }
                                    aria-label="Выбрать все товары"
                                />
                                <span>Выбрать все товары</span>
                            </label>
                            <Button
                                variant="ghost"
                                onClick={clearSelectedItems}
                                size="lg"
                                disabled={!hasSelectedItems}
                                className="text-sm text-red-500 disabled:text-dark-grey"
                            >
                                Удалить выбранное
                            </Button>
                        </div>

                        <div className="space-y-5">
                            {items.map((item) => (
                                <div
                                    key={item.id}
                                    className="grid gap-6 rounded-2xl border border-grey bg-white p-5 sm:grid-cols-[auto_140px_minmax(0,1fr)_auto]"
                                >
                                    <div className="flex items-start pt-1">
                                        <Checkbox
                                            checked={selectedIds.includes(item.id)}
                                            onCheckedChange={(checked) =>
                                                toggleItemSelection(item.id, checked === true)
                                            }
                                            aria-label={`Выбрать товар ${item.name}`}
                                        />
                                    </div>
                                    <div className="relative h-32 w-full overflow-hidden rounded-xl bg-grey">
                                        <Image
                                            src={getSafeImageUrl(item.imageUrl)}
                                            alt={item.name}
                                            fill
                                            className="object-contain"
                                        />
                                    </div>
                                    <div className="flex flex-col justify-between space-y-4">
                                        <div className="space-y-2">
                                            <Link
                                                href={`/product/${item.slug}`}
                                                className="text-lg leading-1 font-medium text-black"
                                            >
                                                {item.name}
                                            </Link>
                                            <div className="text-dark-grey">
                                                {formatPrice(item.price)}{' '}
                                                {currencyFormat(item.currency)} /{' '}
                                                {item.unitShortName || 'шт.'}
                                            </div>
                                            <div className="text-dark-grey">
                                                Артикул: {item.sku}
                                            </div>
                                            {item.availability === 'BACKORDER' ? (
                                                <div className="inline-flex w-fit rounded-md bg-amber-100 px-2.5 py-1 text-sm font-medium text-amber-900">
                                                    Под заказ
                                                    {item.leadTimeDays
                                                        ? ` · ориентировочно ${item.leadTimeDays} дн.`
                                                        : ''}
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-4">
                                            <QuantitySelector
                                                key={`${item.id}-${item.quantity}`}
                                                initialValue={item.quantity}
                                                min={item.minOrderQty ?? 1}
                                                step={item.stepQty ?? 1}
                                                className="h-12"
                                                onChange={(value) => updateQuantity(item.id, value)}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col justify-between">
                                        <div className="text-right text-lg font-semibold text-black">
                                            {formatPrice(multiplyPrice(item.price, item.quantity))}{' '}
                                            {currencyFormat(item.currency)}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeItem(item.id)}
                                            className="hover:text-red-500"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ДЕТАЛИ ЗАКАЗА */}
                    <div className="flex flex-col gap-5">
                        <div className="space-y-6 rounded-2xl bg-grey p-6">
                            <p className="text-lg font-semibold text-black">Детали заказа</p>
                            <div className="text-dark-grey">
                                Товары, {totalItems} шт.
                                {hasSelectedItems ? ` Выбрано: ${selectedCount} шт.` : ''}
                            </div>
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div className="text-base text-black">Итого</div>
                                <div className="text-2xl font-semibold text-black">
                                    {formatPrice(total)} {currency ? currencyFormat(currency) : ''}
                                </div>
                            </div>
                        </div>

                        {items.some((item) => item.availability === 'BACKORDER') ? (
                            <p className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
                                Цена и срок поставки товаров «Под заказ» подтверждаются менеджером после оформления.
                            </p>
                        ) : null}

                        <div>
                            <Button
                                variant="default"
                                size="default"
                                onClick={handleCheckoutClick}
                                disabled={status === 'loading'}
                            >
                                Оформить заказ
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
