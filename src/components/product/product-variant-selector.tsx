import Link from 'next/link';
import { cn } from '@/lib/utils';

type ProductVariant = {
    id: number;
    slug: string;
    availability: 'IN_STOCK' | 'BACKORDER' | 'OUT_OF_STOCK' | 'DISCONTINUED';
    stockQty: number;
    value: string;
    numericValue: number | null;
};

type ProductVariantSelectorProps = {
    attributeName: string;
    unit: string | null;
    currentProductId: number;
    variants: ProductVariant[];
};

export function ProductVariantSelector({
    attributeName,
    unit,
    currentProductId,
    variants,
}: ProductVariantSelectorProps) {
    if (variants.length < 2) return null;

    const sortedVariants = [...variants].sort((left, right) => {
        if (left.numericValue !== null && right.numericValue !== null) {
            return left.numericValue - right.numericValue;
        }
        return left.value.localeCompare(right.value, 'ru', { numeric: true });
    });
    const currentVariant = sortedVariants.find((variant) => variant.id === currentProductId);

    return (
        <div className="space-y-3">
            <p className="font-medium text-black">
                {attributeName}
                {currentVariant ? `: ${currentVariant.value}${unit ? ` ${unit}` : ''}` : ''}
            </p>
            <div className="flex flex-wrap gap-2" aria-label={`Выбор: ${attributeName}`}>
                {sortedVariants.map((variant) => {
                    const isCurrent = variant.id === currentProductId;
                    const isOutOfStock =
                        variant.availability !== 'IN_STOCK' || variant.stockQty <= 0;
                    const label = `${variant.value}${unit ? ` ${unit}` : ''}`;

                    if (isCurrent) {
                        return (
                            <span
                                key={variant.id}
                                aria-current="page"
                                className="inline-flex min-h-10 items-center rounded-lg border border-black bg-black px-4 py-2 text-sm font-medium text-white"
                            >
                                {label}
                            </span>
                        );
                    }

                    return (
                        <Link
                            key={variant.id}
                            href={`/product/${variant.slug}`}
                            title={isOutOfStock ? `${label} — нет в наличии` : label}
                            className={cn(
                                'inline-flex min-h-10 items-center rounded-lg border border-dark-grey px-4 py-2 text-sm font-medium text-black transition-colors hover:border-black hover:bg-grey/40',
                                isOutOfStock && 'border-dashed text-dark-grey',
                            )}
                        >
                            {label}
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
