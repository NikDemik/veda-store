'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { fromMinorUnits, toMinorUnits } from '@/lib/price';
import type { CartItem, Currency } from '@/types/data';

type CartContextValue = {
    items: CartItem[];
    addItem: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
    updateQuantity: (id: number, quantity: number) => void;
    removeItem: (id: number) => void;
    clear: () => void;
    total: number;
    currency: Currency | null;
};

const CartContext = createContext<CartContextValue | null>(null);

const STORAGE_KEY = 'giovenzana_cart_v1';
const MAX_CART_QUANTITY = 10000;

function getQuantityRules(item: Pick<CartItem, 'minOrderQty' | 'stepQty'>) {
    return {
        min: Math.max(1, item.minOrderQty ?? 1),
        step: Math.max(1, item.stepQty ?? 1),
    };
}

function normalizeQuantity(quantity: number, item: Pick<CartItem, 'minOrderQty' | 'stepQty'>) {
    const { min, step } = getQuantityRules(item);
    const clamped = Math.max(min, Math.min(MAX_CART_QUANTITY, quantity));
    const offset = clamped - min;

    return Math.min(
        MAX_CART_QUANTITY,
        min + Math.max(0, Math.round(offset / step)) * step,
    );
}

export function CartProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<CartItem[]>([]);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw) as CartItem[];
                if (Array.isArray(parsed)) {
                    const normalized = parsed
                        .map((item) => ({
                            ...item,
                            id: Number(item.id),
                            unitShortName: item.unitShortName || 'шт.',
                            minOrderQty: item.minOrderQty
                                ? Math.max(1, Number(item.minOrderQty))
                                : undefined,
                            stepQty: item.stepQty ? Math.max(1, Number(item.stepQty)) : undefined,
                            availability: item.availability ?? 'IN_STOCK',
                        }))
                        .filter((item) => Number.isFinite(item.id));
                    setItems(normalized);
                }
            }
        } catch {
            // Ignore storage errors and start with an empty cart.
        }
        setIsReady(true);
    }, []);

    useEffect(() => {
        if (!isReady) return;
        try {
            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch {
            // Ignore storage errors (private mode, quota, etc.).
        }
    }, [items, isReady]);

    const addItem = (item: Omit<CartItem, 'quantity'>, quantity = 1) => {
        const safeQuantity = normalizeQuantity(quantity, item);
        setItems((prev) => {
            const existing = prev.find((entry) => entry.id === item.id);
            if (existing) {
                return prev.map((entry) =>
                    entry.id === item.id
                        ? {
                              ...entry,
                              ...item,
                              quantity: normalizeQuantity(entry.quantity + safeQuantity, item),
                          }
                        : entry,
                );
            }
            return [...prev, { ...item, quantity: safeQuantity }];
        });
    };

    const updateQuantity = (id: number, quantity: number) => {
        setItems((prev) =>
            prev.map((entry) =>
                entry.id === id
                    ? { ...entry, quantity: normalizeQuantity(quantity, entry) }
                    : entry,
            ),
        );
    };

    const removeItem = (id: number) => {
        setItems((prev) => prev.filter((entry) => entry.id !== id));
    };

    const clear = () => {
        setItems([]);
    };

    const total = useMemo(
        () =>
            fromMinorUnits(
                items.reduce(
                    (sum, entry) => sum + toMinorUnits(entry.price) * entry.quantity,
                    0,
                ),
            ),
        [items],
    );

    const currency = items[0]?.currency ?? null;

    return (
        <CartContext.Provider
            value={{
                items,
                addItem,
                updateQuantity,
                removeItem,
                clear,
                total,
                currency,
            }}
        >
            {children}
        </CartContext.Provider>
    );
}

export function useCart() {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart must be used within a CartProvider');
    }
    return context;
}

