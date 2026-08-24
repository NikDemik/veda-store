import type { CatalogSort } from '@/types/filter';

export const catalogSortOptions: Array<{ value: CatalogSort; label: string }> = [
    { value: 'popular', label: 'По популярности' },
    { value: 'price-asc', label: 'Цена по возрастанию' },
    { value: 'price-desc', label: 'Цена по убыванию' },
    { value: 'name-asc', label: 'По названию' },
];
