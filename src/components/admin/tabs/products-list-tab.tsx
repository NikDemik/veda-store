'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { Boxes, ClipboardList, FileSpreadsheet, PackageCheck, Pencil, Plus, Trash2, X } from 'lucide-react';
import { CatalogImportPanel } from '../catalog-import/CatalogImportPanel';
import {
    availabilityLabels,
    formatDate,
    formatMoney,
    getAvailabilityTone,
    getProductStatusTone,
    productStatusLabels,
} from '../admin-format';
import { inputClassName, Metric, SectionTitle, StatusBadge } from '../admin-ui';
import type { AdminProduct, AvailabilityStatus } from '../types';

type ProductsListTabProps = {
    products: AdminProduct[];
    onAddProduct: () => void;
    onEditProduct: (product: AdminProduct) => void;
};

export function ProductsListTab({ products, onAddProduct, onEditProduct }: ProductsListTabProps) {
    const router = useRouter();
    const [articleFilter, setArticleFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [seriesFilter, setSeriesFilter] = useState('all');
    const [availabilityFilter, setAvailabilityFilter] = useState<'all' | AvailabilityStatus>('all');
    const [deleteCandidate, setDeleteCandidate] = useState<AdminProduct | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [showImport, setShowImport] = useState(false);
    const activeProducts = products.filter((product) => product.status === 'ACTIVE').length;
    const inStockProducts = products.filter((product) => product.availability === 'IN_STOCK').length;
    const categories = useMemo(
        () =>
            Array.from(
                new Map(
                    products.map((product) => [
                        product.category.id,
                        { id: product.category.id, name: product.category.name },
                    ]),
                ).values(),
            ).sort((firstCategory, secondCategory) =>
                firstCategory.name.localeCompare(secondCategory.name, 'ru'),
            ),
        [products],
    );
    const series = useMemo(
        () =>
            Array.from(
                new Map(
                    products.flatMap((product) =>
                        product.series ? [[product.series.id, product.series] as const] : [],
                    ),
                ).values(),
            ).sort((firstSeries, secondSeries) =>
                firstSeries.name.localeCompare(secondSeries.name, 'ru'),
            ),
        [products],
    );
    const filteredProducts = useMemo(() => {
        const normalizedArticle = articleFilter.trim().toLowerCase();

        return products.filter((product) => {
            const matchesArticle =
                normalizedArticle.length === 0 ||
                product.article?.toLowerCase().includes(normalizedArticle) ||
                product.sku.toLowerCase().includes(normalizedArticle);
            const matchesCategory =
                categoryFilter === 'all' || product.category.id.toString() === categoryFilter;
            const matchesAvailability =
                availabilityFilter === 'all' || product.availability === availabilityFilter;
            const matchesSeries =
                seriesFilter === 'all' ||
                (seriesFilter === 'none'
                    ? product.series === null
                    : product.series?.id.toString() === seriesFilter);

            return matchesArticle && matchesCategory && matchesAvailability && matchesSeries;
        });
    }, [articleFilter, availabilityFilter, categoryFilter, products, seriesFilter]);
    const hasActiveFilters =
        articleFilter.trim().length > 0 ||
        categoryFilter !== 'all' ||
        seriesFilter !== 'all' ||
        availabilityFilter !== 'all';

    function resetFilters() {
        setArticleFilter('');
        setCategoryFilter('all');
        setSeriesFilter('all');
        setAvailabilityFilter('all');
    }

    async function handleDeleteProduct() {
        if (!deleteCandidate) return;

        setIsDeleting(true);
        setDeleteError(null);
        setMessage(null);

        try {
            const response = await fetch(`/api/admin/products/${deleteCandidate.id}`, {
                method: 'DELETE',
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setDeleteError(result.error || 'Не удалось удалить товар.');
                return;
            }

            setDeleteCandidate(null);
            setMessage({ type: 'success', text: 'Товар удален.' });
            router.refresh();
        } catch {
            setDeleteError('Не удалось удалить товар. Проверьте соединение и повторите попытку.');
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <SectionTitle
                    title="Все товары"
                    description="Каталог товаров с текущими ценами, остатками, статусами и привязкой к категориям."
                />
                <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => setShowImport((value) => !value)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-accent px-5 text-sm font-semibold text-accent"><FileSpreadsheet className="size-4" />Импортировать XLSX</button>
                    <button type="button" onClick={onAddProduct} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[8px] bg-accent px-5 text-sm font-semibold text-white transition-opacity hover:opacity-90"><Plus className="size-4" aria-hidden="true" />Добавить товар</button>
                </div>
            </div>

            {showImport ? <CatalogImportPanel onClose={() => setShowImport(false)} onApplied={() => router.refresh()} /> : null}

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Metric icon={Boxes} label="Всего товаров" value={products.length.toString()} />
                <Metric icon={PackageCheck} label="Активные" value={activeProducts.toString()} />
                <Metric icon={ClipboardList} label="В наличии" value={inStockProducts.toString()} />
            </div>

            <div className="mt-6 rounded-[1.5rem] border border-grey/80 bg-grey/20 p-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-end">
                    <label className="block space-y-2 text-sm font-medium text-black">
                        <span>Артикул</span>
                        <input
                            className={inputClassName}
                            type="search"
                            value={articleFilter}
                            onChange={(event) => setArticleFilter(event.target.value)}
                            placeholder="Артикул или SKU"
                        />
                    </label>
                    <label className="block space-y-2 text-sm font-medium text-black">
                        <span>Категория</span>
                        <select
                            className={inputClassName}
                            value={categoryFilter}
                            onChange={(event) => setCategoryFilter(event.target.value)}
                        >
                            <option value="all">Все категории</option>
                            {categories.map((category) => (
                                <option key={category.id} value={category.id}>
                                    {category.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block space-y-2 text-sm font-medium text-black">
                        <span>Серия</span>
                        <select
                            className={inputClassName}
                            value={seriesFilter}
                            onChange={(event) => setSeriesFilter(event.target.value)}
                        >
                            <option value="all">Все серии</option>
                            <option value="none">Без серии</option>
                            {series.map((item) => (
                                <option key={item.id} value={item.id}>
                                    {item.name}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="block space-y-2 text-sm font-medium text-black">
                        <span>Наличие</span>
                        <select
                            className={inputClassName}
                            value={availabilityFilter}
                            onChange={(event) =>
                                setAvailabilityFilter(
                                    event.target.value as 'all' | AvailabilityStatus,
                                )
                            }
                        >
                            <option value="all">Любое наличие</option>
                            {Object.entries(availabilityLabels).map(([value, label]) => (
                                <option key={value} value={value}>
                                    {label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <button
                        type="button"
                        onClick={resetFilters}
                        disabled={!hasActiveFilters}
                        className="inline-flex min-h-11 items-center justify-center rounded-[8px] border border-grey/80 bg-white px-4 text-sm font-semibold text-black transition-colors hover:bg-grey disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Сбросить
                    </button>
                </div>
                <p className="mt-3 text-sm text-dark-grey">
                    Показано {filteredProducts.length} из {products.length}
                </p>
            </div>

            {message ? (
                <p
                    className={`mt-6 rounded-[8px] px-3 py-2 text-sm ${
                        message.type === 'success'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                    }`}
                >
                    {message.text}
                </p>
            ) : null}

            <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-245 border-collapse text-left text-sm">
                    <thead className="bg-grey text-xs uppercase tracking-[0.12em] text-dark-grey">
                        <tr>
                            <th className="px-4 py-3 font-medium">Товар</th>
                            <th className="px-4 py-3 font-medium">Категория</th>
                            <th className="px-4 py-3 font-medium">Статус</th>
                            <th className="px-4 py-3 font-medium">Цена</th>
                            <th className="px-4 py-3 font-medium">Остаток</th>
                            <th className="px-4 py-3 font-medium">Данные</th>
                            <th className="px-4 py-3 font-medium">Дата</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredProducts.map((product) => (
                            <tr
                                key={product.id}
                                className="group border-t border-border align-top transition-colors hover:bg-grey/20"
                            >
                                <td className="px-4 py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="font-semibold text-black">
                                                {product.name}
                                            </p>
                                            <p className="mt-1 text-xs text-dark-grey">
                                                SKU {product.sku}
                                            </p>
                                            {product.article ? (
                                                <p className="mt-1 text-xs text-dark-grey">
                                                    Артикул {product.article}
                                                </p>
                                            ) : null}
                                        </div>
                                        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                            <button
                                                type="button"
                                                onClick={() => onEditProduct(product)}
                                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-accent/10 hover:text-accent"
                                                aria-label={`Редактировать товар ${product.name}`}
                                                title="Редактировать"
                                            >
                                                <Pencil className="size-4" aria-hidden="true" />
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setDeleteCandidate(product);
                                                    setDeleteError(null);
                                                }}
                                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-red-50 hover:text-red-600"
                                                aria-label={`Удалить товар ${product.name}`}
                                                title="Удалить"
                                            >
                                                <Trash2 className="size-4" aria-hidden="true" />
                                            </button>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-4 py-4">
                                    <p className="font-medium text-black">
                                        {product.category.name}
                                    </p>
                                    <p className="mt-1 text-xs text-dark-grey">
                                        {[product.brand?.name, product.series?.name]
                                            .filter(Boolean)
                                            .join(' / ') || 'Без бренда и серии'}
                                    </p>
                                </td>
                                <td className="px-4 py-4">
                                    <div className="flex flex-wrap gap-2">
                                        <StatusBadge
                                            className={getProductStatusTone(product.status)}
                                        >
                                            {productStatusLabels[product.status]}
                                        </StatusBadge>
                                        <StatusBadge
                                            className={getAvailabilityTone(product.availability)}
                                        >
                                            {availabilityLabels[product.availability]}
                                        </StatusBadge>
                                    </div>
                                </td>
                                <td className="px-4 py-4 font-semibold text-black">
                                    {formatMoney(product.price)}
                                </td>
                                <td className="px-4 py-4 text-dark-grey">
                                    {product.stockQty} {product.unitMeasure.shortName}
                                    <p className="mt-1 text-xs">
                                        Мин. заказ: {product.minOrderQty}
                                    </p>
                                </td>
                                <td className="px-4 py-4 text-dark-grey">
                                    {product._count.images} изобр., {product._count.specs} хар.
                                </td>
                                <td className="px-4 py-4 text-dark-grey">
                                    {formatDate(product.createdAt)}
                                </td>
                            </tr>
                        ))}
                        {filteredProducts.length === 0 ? (
                            <tr>
                                <td
                                    className="px-4 py-8 text-center text-sm text-dark-grey"
                                    colSpan={7}
                                >
                                    Товары по выбранным фильтрам не найдены.
                                </td>
                            </tr>
                        ) : null}
                    </tbody>
                </table>
            </div>

            {deleteCandidate ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-product-title"
                >
                    <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="delete-product-title"
                                    className="text-xl font-semibold text-black"
                                >
                                    Удаление товара
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    Вы уверены что хотите удалить этот товар?
                                </p>
                                <p className="mt-2 text-sm font-medium text-black">
                                    {deleteCandidate.name}
                                </p>
                                {deleteError ? (
                                    <p className="mt-4 rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {deleteError}
                                    </p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteCandidate(null);
                                    setDeleteError(null);
                                }}
                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-grey hover:text-black"
                                aria-label="Закрыть окно удаления"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteCandidate(null);
                                    setDeleteError(null);
                                }}
                                disabled={isDeleting}
                                className="inline-flex items-center justify-center rounded-[8px] border border-grey/80 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-grey disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteProduct}
                                disabled={isDeleting}
                                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                {isDeleting ? 'Удаление...' : 'Удалить'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
