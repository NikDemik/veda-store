'use client';

import { useEffect, useId, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface QuantitySelectorProps {
    initialValue?: number;
    min?: number;
    max?: number;
    step?: number;
    onChange?: (value: number) => void;
    className?: string;
}

export function QuantitySelector({
    initialValue = 1,
    min = 1,
    max = 999,
    step = 1,
    onChange,
    className,
}: QuantitySelectorProps) {
    const errorId = useId();
    const safeMin = Math.max(1, min);
    const safeStep = Math.max(1, step);
    const safeMax = Math.max(safeMin, max);
    const normalizeValue = (value: number) => {
        const clamped = Math.max(safeMin, Math.min(safeMax, value));
        const offset = clamped - safeMin;

        return Math.min(
            safeMax,
            safeMin + Math.max(0, Math.round(offset / safeStep)) * safeStep,
        );
    };
    const [quantity, setQuantity] = useState(() => normalizeValue(initialValue));
    const [inputValue, setInputValue] = useState(() => String(normalizeValue(initialValue)));
    const [validationMessage, setValidationMessage] = useState<string | null>(null);

    useEffect(() => {
        const nextValue = normalizeValue(initialValue);
        setQuantity(nextValue);
        setInputValue(String(nextValue));
        setValidationMessage(null);
    }, [initialValue, safeMax, safeMin, safeStep]);

    const applyValue = (value: number) => {
        setQuantity(value);
        setInputValue(String(value));
        setValidationMessage(null);
        onChange?.(value);
    };

    const handleDecrease = () => {
        const newValue = normalizeValue(quantity - safeStep);
        applyValue(newValue);
    };

    const handleIncrease = () => {
        const newValue = normalizeValue(quantity + safeStep);
        applyValue(newValue);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const nextInput = e.target.value.replace(/\D/g, '');
        setInputValue(nextInput);

        if (nextInput === '') {
            setValidationMessage(null);
            return;
        }

        const value = Number(nextInput);

        if (value < safeMin || value > safeMax) {
            setValidationMessage(`Введите количество от ${safeMin} до ${safeMax}`);
            return;
        }

        if ((value - safeMin) % safeStep !== 0) {
            setValidationMessage(`Товар продаётся кратно ${safeStep}`);
            return;
        }

        applyValue(value);
    };

    const restoreCurrentValue = () => {
        if (inputValue === '' || validationMessage) {
            setInputValue(String(quantity));
            setValidationMessage(null);
        }
    };

    return (
        <div className={cn('relative inline-flex', className)}>
            <div className="flex w-full items-center justify-between rounded-md bg-grey px-5">
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-background"
                    onClick={handleDecrease}
                    disabled={quantity <= safeMin}
                    aria-label="Уменьшить количество"
                >
                    <Minus className="h-6 w-6" />
                </Button>

                <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={inputValue}
                    onChange={handleInputChange}
                    onBlur={restoreCurrentValue}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur();
                        if (event.key === 'Escape') restoreCurrentValue();
                    }}
                    className="w-12 border-0 bg-transparent text-center font-medium focus:outline-none focus:ring-0"
                    aria-label="Количество товара"
                    aria-invalid={Boolean(validationMessage)}
                    aria-describedby={validationMessage ? errorId : undefined}
                />

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md hover:bg-background"
                    onClick={handleIncrease}
                    disabled={quantity >= safeMax}
                    aria-label="Увеличить количество"
                >
                    <Plus className="h-6 w-6" />
                </Button>
            </div>

            {validationMessage ? (
                <div
                    id={errorId}
                    role="alert"
                    className="absolute left-1/2 top-full z-20 mt-2 w-max max-w-64 -translate-x-1/2 rounded-md bg-black px-3 py-2 text-center text-xs text-white shadow-lg"
                >
                    {validationMessage}
                </div>
            ) : null}
        </div>
    );
}
