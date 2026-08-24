import type { AvailabilityStatus, OrderStatus, ProductStatus } from './types';

export const productStatusLabels: Record<ProductStatus, string> = {
    DRAFT: 'Черновик',
    ACTIVE: 'Активен',
    ARCHIVED: 'Архив',
};

export const availabilityLabels: Record<AvailabilityStatus, string> = {
    IN_STOCK: 'В наличии',
    BACKORDER: 'Под заказ',
    OUT_OF_STOCK: 'Нет в наличии',
    DISCONTINUED: 'Снят с продажи',
};

export function formatMoney(value: unknown) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        maximumFractionDigits: 2,
    }).format(Number(value));
}

export function formatDate(value: Date | string | null) {
    if (!value) return 'Не указано';

    return new Intl.DateTimeFormat('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    }).format(new Date(value));
}

export function getOrderStatusTone(status: OrderStatus) {
    if (status === 'COMPLETED') return 'bg-[#dff3e6] text-[#146c43]';
    if (status === 'CANCELLED') return 'bg-[#fde6e6] text-[#a12b2b]';
    if (status === 'IN_PROGRESS') return 'bg-[#fff1d6] text-[#9a6400]';
    return 'bg-grey text-black';
}

export function getActivityTone(isActive: boolean) {
    return isActive ? 'bg-[#dff3e6] text-[#146c43]' : 'bg-[#fde6e6] text-[#a12b2b]';
}

export function getProductStatusTone(status: ProductStatus) {
    if (status === 'ACTIVE') return 'bg-[#dff3e6] text-[#146c43]';
    if (status === 'ARCHIVED') return 'bg-[#fde6e6] text-[#a12b2b]';
    return 'bg-[#fff1d6] text-[#9a6400]';
}

export function getAvailabilityTone(status: AvailabilityStatus) {
    if (status === 'IN_STOCK') return 'bg-[#dff3e6] text-[#146c43]';
    if (status === 'OUT_OF_STOCK' || status === 'DISCONTINUED') {
        return 'bg-[#fde6e6] text-[#a12b2b]';
    }

    return 'bg-[#fff1d6] text-[#9a6400]';
}
