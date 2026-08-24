'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CatalogSort } from '@/types/filter';
import { catalogSortOptions } from '@/data/catalog/sortOptions';

type CatalogSortSelectProps = {
    activeSort: CatalogSort;
};

export default function CatalogSortSelect({ activeSort }: CatalogSortSelectProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const updateSort = (sort: CatalogSort) => {
        const params = new URLSearchParams(searchParams.toString());

        if (sort === 'popular') {
            params.delete('sort');
        } else {
            params.set('sort', sort);
        }

        params.delete('page');

        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    return (
        <select
            value={activeSort}
            onChange={(event) => updateSort(event.target.value as CatalogSort)}
            className="rounded border px-2 py-1"
            aria-label="Сортировка товаров"
        >
            {catalogSortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label}
                </option>
            ))}
        </select>
    );
}
