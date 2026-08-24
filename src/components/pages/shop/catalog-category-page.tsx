import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { buildWhereClause } from '@/lib/catalog/buildWhereClause';
import { Suspense } from 'react';

import FiltersSidebar from '@/components/catalog/FiltersSidebar';
import CatalogHeader from '@/components/catalog/CatalogHeader';
import CatalogProductCard from '@/components/catalog/CatalogProductCard';
import ActiveFilters from '@/components/catalog/ActiveFilters';
import CatalogBreadcrumbs from '@/components/catalog/catalog-breadcrumbs';
import CatalogSortSelect from '@/components/catalog/CatalogSortSelect';
import type { CatalogFilters, CatalogSort } from '@/types/filter';
import type { Prisma } from '@prisma/client';

type CatalogCategoryPageProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<CatalogFilters>;
};

const catalogSortValues = new Set<CatalogSort>([
    'popular',
    'price-asc',
    'price-desc',
    'name-asc',
]);

function getCatalogSort(sort: CatalogFilters['sort']): CatalogSort {
    const value = Array.isArray(sort) ? sort[0] : sort;

    return value && catalogSortValues.has(value) ? value : 'popular';
}

function getProductOrderBy(sort: CatalogSort): Prisma.ProductOrderByWithRelationInput[] {
    switch (sort) {
        case 'price-asc':
            return [{ price: 'asc' }, { name: 'asc' }, { id: 'asc' }];
        case 'price-desc':
            return [{ price: 'desc' }, { name: 'asc' }, { id: 'asc' }];
        case 'popular':
        case 'name-asc':
        default:
            return [{ name: 'asc' }, { id: 'asc' }];
    }
}

export default async function CatalogCategoryPage({
    params,
    searchParams,
}: CatalogCategoryPageProps) {
    const { slug } = await params;
    const filters = await searchParams;
    const activeSort = getCatalogSort(filters.sort);

    if (!slug) {
        notFound();
    }

    const category = await prisma.category.findUnique({
        where: { slug },
    });

    if (!category) {
        notFound();
    }

    const [availableSeries, availableCurrents, availableSpecs, products] = await Promise.all([
        prisma.series.findMany({
            where: {
                products: { some: { categoryId: category.id } },
            },
            orderBy: { name: 'asc' },
            select: { id: true, name: true, slug: true },
        }),
        prisma.productAttributeValue.findMany({
            where: {
                attribute: { code: 'rated_current_a' },
                numberValue: { not: null },
                product: { categoryId: category.id, status: 'ACTIVE', isSellable: true },
            },
            select: { numberValue: true },
            distinct: ['numberValue'],
            orderBy: { numberValue: 'asc' },
        }),
        prisma.productAttributeValue.findMany({
            where: {
                product: { categoryId: category.id },
                attribute: { code: 'poles' },
                numberValue: { not: null },
            },
            select: { numberValue: true },
            distinct: ['numberValue'],
            orderBy: { numberValue: 'asc' },
        }),
        prisma.product.findMany({
            where: buildWhereClause(
                category.id,
                filters.series,
                filters.currentA,
                filters.specs,
            ),
            orderBy: getProductOrderBy(activeSort),
            select: {
                id: true,
                sku: true,
                name: true,
                description: true,
                slug: true,
                price: true,
                priceOld: true,
                currency: true,
                availability: true,
                leadTimeDays: true,
                minOrderQty: true,
                stepQty: true,
                unitMeasure: {
                    select: {
                        shortName: true,
                    },
                },
                imageUrl: true,
                popularityWeight: true,
                series: {
                    select: { name: true, slug: true },
                },
                attributeValues: {
                    where: {
                        attribute: { code: { in: ['rated_current_a', 'poles'] } },
                    },
                    select: {
                        numberValue: true,
                        attribute: { select: { code: true } },
                    },
                },
            },
        }),
    ]);

    const salesByProductId =
        activeSort === 'popular' && products.length > 0
            ? new Map(
                  (
                      await prisma.orderItem.groupBy({
                          by: ['productId'],
                          where: {
                              productId: { in: products.map((product) => product.id) },
                              order: {
                                  orderStatus: { not: 'CANCELLED' },
                              },
                          },
                          _sum: {
                              quantity: true,
                          },
                      })
                  ).map((sale) => [sale.productId, sale._sum.quantity ?? 0]),
              )
            : new Map<number, number>();

    const formattedProducts = products.map((product) => ({
        ...product,
        currentA: product.attributeValues
            .find((value) => value.attribute.code === 'rated_current_a')
            ?.numberValue?.toString() ?? null,
        numberOfTyres: product.attributeValues
            .find((value) => value.attribute.code === 'poles')
            ?.numberValue?.toString(),
        popularityScore: product.popularityWeight + (salesByProductId.get(product.id) ?? 0),
    }));

    if (activeSort === 'popular') {
        formattedProducts.sort((left, right) => {
            const scoreDiff = right.popularityScore - left.popularityScore;

            if (scoreDiff !== 0) return scoreDiff;

            const nameDiff = left.name.localeCompare(right.name, 'ru');

            return nameDiff || left.id - right.id;
        });
    }

    const hasActiveFilters =
        Boolean(filters.series) || Boolean(filters.currentA) || Boolean(filters.specs);

    return (
        <>
            <CatalogBreadcrumbs category={category} />
            <section className="relative w-screen py-12">
                <div className="relative container mx-auto space-y-8 px-5">
                    <CatalogHeader category={category} />

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-5 lg:grid-cols-5">
                        <Suspense fallback={<div>Загрузка фильтров...</div>}>
                            <FiltersSidebar
                                availableSeries={availableSeries}
                                availableCurrents={availableCurrents.flatMap((item) =>
                                    item.numberValue ? [item.numberValue.toString()] : [],
                                )}
                                availableSpecs={availableSpecs.flatMap((item) =>
                                    item.numberValue ? [item.numberValue.toString()] : [],
                                )}
                                activeFilters={filters}
                            />
                        </Suspense>

                        <div className="col-span-4 py-4">
                            {hasActiveFilters && (
                                <div className="flex flex-wrap items-center gap-2 mb-2.5">
                                    <span className=" font-semibold text-black">
                                        Активные фильтры:
                                    </span>
                                    <ActiveFilters filters={filters} />
                                </div>
                            )}

                            <div className="flex items-center justify-between">
                                <span>Найдено товаров: {products.length}</span>
                                <CatalogSortSelect activeSort={activeSort} />
                            </div>

                            <div className="mt-6">
                                {products.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                                        {formattedProducts.map((product) => (
                                            <CatalogProductCard
                                                key={product.id}
                                                product={product}
                                            />
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-dark-accent/70">
                                        В этой категории нет товаров, соответствующих выбранным
                                        фильтрам.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </>
    );
}
