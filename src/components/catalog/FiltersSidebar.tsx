'use client';

import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import type { CatalogFilters } from '@/types/filter';
import { Checkbox } from '@/components/ui/checkbox';

interface FiltersSidebarProps {
    availableSeries: Array<{ id: number; name: string; slug: string }>;
    availableCurrents: string[];
    availableSpecs: string[];
    activeFilters: CatalogFilters;
}

export default function FiltersSidebar({
    availableSeries,
    availableCurrents,
    availableSpecs,
    activeFilters,
}: FiltersSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [expandedSections, setExpandedSections] = useState({
        series: true,
        currentA: true,
        specs: true,
    });

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        // Получаем текущие значения для этого фильтра
        const currentValues = params.getAll(key);

        if (currentValues.includes(value)) {
            // Если значение уже есть - удаляем его
            const newValues = currentValues.filter((v) => v !== value);
            params.delete(key);
            newValues.forEach((v) => params.append(key, v));
        } else {
            // Если значения нет - добавляем
            params.append(key, value);
        }

        // Сбрасываем страницу при изменении фильтров
        params.delete('page');

        router.push(`${pathname}?${params.toString()}`);
    };

    const clearAllFilters = () => {
        router.push(pathname);
    };

    const isFilterActive = (key: string, value: string) => {
        return searchParams.getAll(key).includes(value);
    };

    const selectedFilterCount = ['series', 'currentA', 'specs'].reduce(
        (count, key) => count + searchParams.getAll(key).length,
        0,
    );
    const hasActiveFilters = selectedFilterCount > 0;

    return (
        <div className=" flex flex-col gap-6 bg-white py-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold">Фильтры</h2>
            </div>

            {/* Фильтр по сериям */}
            {availableSeries.length > 0 && (
                <div className="border-b pb-4">
                    <button
                        onClick={() => toggleSection('series')}
                        className="flex justify-between items-center w-full text-left font-medium mb-5"
                    >
                        <span className="text-base font-bold leading-[140%]">Серия</span>
                        <span>
                            {expandedSections.series ? (
                                <ChevronUp size={28} />
                            ) : (
                                <ChevronDown size={28} />
                            )}
                        </span>
                    </button>

                    {expandedSections.series && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableSeries.map((series) => (
                                <label key={series.id} className="flex items-center gap-2">
                                    <Checkbox
                                        id="select-series"
                                        checked={isFilterActive('series', series.slug)}
                                        onCheckedChange={() => updateFilter('series', series.slug)}
                                        className="h-5 w-5"
                                    />
                                    <span className="text-sm leading-[150%]">{series.name}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Фильтр по амперажу */}
            {availableCurrents.length > 0 && (
                <div className="border-b pb-4">
                    <button
                        onClick={() => toggleSection('currentA')}
                        className="flex justify-between items-center w-full text-left font-medium mb-5"
                    >
                        <span className="text-base font-bold leading-[140%]">Ток (А)</span>

                        <span>
                            {expandedSections.series ? (
                                <ChevronUp size={28} />
                            ) : (
                                <ChevronDown size={28} />
                            )}
                        </span>
                    </button>

                    {expandedSections.currentA && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableCurrents.map((current) => (
                                <label key={current} className="flex items-center gap-2">
                                    <Checkbox
                                        id="select-series"
                                        checked={isFilterActive('currentA', current)}
                                        onCheckedChange={() => updateFilter('currentA', current)}
                                        className="h-5 w-5"
                                    />
                                    <span className="text-sm leading-[150%]">{current} A</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Фильтр по количеству шин */}
            {availableSpecs.length > 0 && (
                <div>
                    <button
                        onClick={() => toggleSection('specs')}
                        className="flex justify-between items-center w-full text-left font-medium mb-5"
                    >
                        <span className="text-base font-bold leading-[140%]">Количество шин</span>
                        <span>
                            {expandedSections.series ? (
                                <ChevronUp size={28} />
                            ) : (
                                <ChevronDown size={28} />
                            )}
                        </span>
                    </button>

                    {expandedSections.specs && (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                            {availableSpecs.map((spec) => (
                                <label key={spec} className="flex items-center gap-2">
                                    <Checkbox
                                        id="select-series"
                                        checked={isFilterActive('specs', spec)}
                                        onCheckedChange={() => updateFilter('specs', spec)}
                                        className="h-5 w-5"
                                    />
                                    <span className="text-sm leading-[150%]">{spec}</span>
                                </label>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Информация о количестве выбранных фильтров */}
            {hasActiveFilters && (
                <div className="pt-4 border-t text-sm text-dark-grey">
                    Выбрано фильтров: {selectedFilterCount}
                </div>
            )}
        </div>
    );
}
