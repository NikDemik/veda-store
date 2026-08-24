'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { CatalogFilters } from '@/types/filter';

type ActiveFiltersProps = {
    filters: CatalogFilters;
};

export default function ActiveFilters({ filters }: ActiveFiltersProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const removeFilter = (key: string, value?: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value != null) {
            const currentValues = params.getAll(key).filter((v) => v !== value);
            params.delete(key);
            currentValues.forEach((v) => params.append(key, v));
        } else {
            params.delete(key);
        }
        const query = params.toString();
        router.push(query ? `${pathname}?${query}` : pathname);
    };

    const clearAllFilters = () => {
        router.push(pathname);
    };

    const hasActiveFilters = searchParams.toString().length > 0;

    return (
        <div className="flex flex-wrap gap-2">
            {Array.isArray(filters.series)
                ? filters.series.map((s) => (
                      <span
                          key={`series-${s}`}
                          className="flex items-center gap-1 rounded-full bg-grey px-3 py-1 text-sm text-black"
                      >
                          Серия: {s}
                          <button
                              onClick={() => removeFilter('series', s)}
                              className="ml-1 hover:text-dark-accent"
                          >
                              ×
                          </button>
                      </span>
                  ))
                : filters.series && (
                      <span className="flex items-center gap-1 rounded-full bg-grey px-3 py-1 text-sm text-black">
                          Серия: {filters.series}
                          <button
                              onClick={() => removeFilter('series')}
                              className="ml-1 hover:text-dark-accent"
                          >
                              ×
                          </button>
                      </span>
                  )}

            {Array.isArray(filters.currentA)
                ? filters.currentA.map((a) => (
                      <span
                          key={`current-${a}`}
                          className="flex items-center gap-1 rounded-full bg-grey px-3 py-1 text-sm text-black"
                      >
                          {a}A
                          <button
                              onClick={() => removeFilter('currentA', a)}
                              className="ml-1 hover:text-dark-accent"
                          >
                              ×
                          </button>
                      </span>
                  ))
                : filters.currentA && (
                      <span className="flex items-center gap-1 rounded-full bg-grey px-3 py-1 text-sm text-black">
                          {filters.currentA}A
                          <button
                              onClick={() => removeFilter('currentA')}
                              className="ml-1 hover:text-dark-accent"
                          >
                              ×
                          </button>
                      </span>
                  )}

            {Array.isArray(filters.specs)
                ? filters.specs.map((s) => (
                      <span
                          key={`specs-${s}`}
                          className="flex items-center gap-1 rounded-full bg-grey px-3 py-1 text-sm text-black"
                      >
                          {s} шин
                          <button
                              onClick={() => removeFilter('specs', s)}
                              className="ml-1 hover:text-dark-accent"
                          >
                              ×
                          </button>
                      </span>
                  ))
                : filters.specs && (
                      <span className="flex items-center gap-1 rounded-full bg-grey px-3 py-1 text-sm text-black">
                          {filters.specs} шин
                          <button
                              onClick={() => removeFilter('specs')}
                              className="ml-1 hover:text-dark-accent"
                          >
                              ×
                          </button>
                      </span>
                  )}
            {hasActiveFilters && (
                <button
                    onClick={clearAllFilters}
                    className="text-sm text-red-600 hover:text-red-800"
                >
                    Сбросить все
                </button>
            )}
        </div>
    );
}
