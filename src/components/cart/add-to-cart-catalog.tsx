'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCart } from '@/components/cart/cart-context';
import { Button } from '@/components/ui/button';
import { QuantitySelector } from '@/components/ui/quantity-selector';
import currencyFormat from '@/lib/currencyFormat';
import { getSafeImageUrl } from '@/lib/imageUrl';
import { formatCatalogPrice } from '@/lib/price';
import type { ProductSummary } from '@/types/data';
import ShoppingCartAddIcon from '../svg/shopping-cart-add';
import ShoppingCartInIcon from '../svg/shopping-cart-in';

type AddToCartProps = {
    product: ProductSummary;
};

export function AddToCartCatalog({ product }: AddToCartProps) {
    const { addItem, items, updateQuantity } = useCart();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const minOrderQty = Math.max(1, product.minOrderQty ?? 1);
    const stepQty = Math.max(1, product.stepQty ?? 1);
    const isInCart = items.some((item) => item.id === product.id);
    const cartItem = items.find((item) => item.id === product.id);
    const quantity = cartItem?.quantity ?? minOrderQty;
    const formattedPrice = useMemo(
        () => `${formatCatalogPrice(product.price)} ${currencyFormat(product.currency)}`,
        [product.currency, product.price],
    );

    const handleAddToCart = () => {
        addItem(product, minOrderQty);
        setIsModalOpen(true);
    };

    const handleQuantityChange = (value: number) => {
        updateQuantity(product.id, value);
    };

    return (
        <div>
            <Button variant="default" size="icon" disabled={isInCart} onClick={handleAddToCart}>
                {isInCart ? (
                    <ShoppingCartInIcon size={22} color="white" />
                ) : (
                    <ShoppingCartAddIcon size={22} color="white" />
                )}
            </Button>

            {isModalOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="catalog-add-to-cart-modal-title"
                >
                    <div className="w-full max-w-4xl rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <h2
                                id="catalog-add-to-cart-modal-title"
                                className="text-xl font-semibold text-black"
                            >
                                Товар добавлен в корзину
                            </h2>
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-grey hover:text-black"
                                aria-label="Закрыть окно добавления товара в корзину"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-6 flex flex-col gap-6">
                            <div className="grid grid-cols-[96px_1fr] gap-4 sm:grid-cols-[126px_1fr]">
                                <div className="aspect-square overflow-hidden rounded-lg bg-grey">
                                    <Image
                                        src={getSafeImageUrl(product.imageUrl)}
                                        width={126}
                                        height={126}
                                        className="h-full w-full object-contain object-center"
                                        alt={product.name}
                                    />
                                </div>
                                <div className="flex min-w-0 flex-col gap-3">
                                    <h4 className="line-clamp-3 font-medium leading-5">
                                        {product.name}
                                    </h4>
                                    <span className="price">{formattedPrice}</span>
                                    <QuantitySelector
                                        key={`${product.id}-${quantity}`}
                                        initialValue={quantity}
                                        min={minOrderQty}
                                        step={stepQty}
                                        className="h-12 w-full max-w-[180px] px-3"
                                        onChange={handleQuantityChange}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Button asChild variant="default" size="default">
                                    <Link href="/cart">Перейти в корзину</Link>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="default"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Продолжить покупки
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
