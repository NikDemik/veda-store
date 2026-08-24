export function toMinorUnits(value: number) {
    const normalized = Number.isFinite(value) ? value : 0;
    return Math.round((normalized + Number.EPSILON) * 100);
}

export function fromMinorUnits(value: number) {
    return value / 100;
}

export function multiplyPrice(price: number, quantity: number) {
    return fromMinorUnits(toMinorUnits(price) * quantity);
}

export function formatPrice(
    value: number,
    options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
    },
) {
    const amount = Number.isFinite(value) ? value : 0;
    const minimumFractionDigits = options?.minimumFractionDigits ?? 2;
    const maximumFractionDigits = options?.maximumFractionDigits ?? 2;

    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits,
        maximumFractionDigits,
    }).format(amount);
}

export function formatCatalogPrice(value: number) {
    return formatPrice(value, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    });
}
