import Image from 'next/image';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getSafeImageUrl } from '@/lib/imageUrl';
import ArrowIcon from '@/components/svg/arrow-icon';

export default async function CatalogPage() {
    const categories = await prisma.category.findMany({
        where: {
            products: {
                some: {
                    status: 'ACTIVE',
                },
            },
        },
        include: {
            products: {
                where: {
                    status: 'ACTIVE',
                },
                select: {
                    id: true,
                },
            },
        },
    });
    const productIds = categories.flatMap((category) =>
        category.products.map((product) => product.id),
    );
    const salesByProductId =
        productIds.length > 0
            ? new Map(
                  (
                      await prisma.orderItem.groupBy({
                          by: ['productId'],
                          where: {
                              productId: { in: productIds },
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
    const sortedCategories = categories
        .map((category) => ({
            ...category,
            popularityScore: category.products.reduce(
                (score, product) => score + (salesByProductId.get(product.id) ?? 0),
                0,
            ),
        }))
        .sort((left, right) => {
            const scoreDiff = right.popularityScore - left.popularityScore;

            if (scoreDiff !== 0) return scoreDiff;

            return left.name.localeCompare(right.name, 'ru') || left.id - right.id;
        });

    return (
        <section className="relative w-screen py-12 min-h-screen">
            <div className="relative container mx-auto space-y-8 px-5">
                <h1 className="mb-8 uppercase text-black">Категории</h1>

                {sortedCategories.length === 0 ? (
                    <p className="text-dark-grey">Товары пока не добавлены</p>
                ) : null}

                <div className="grid grid-cols-1 gap-5  lg:grid-cols-2 xl:grid-cols-3">
                    {sortedCategories.map((category) => {
                        const imageUrl = getSafeImageUrl(category.imageUrl);

                        return (
                            <Link
                                key={category.id}
                                href={`/catalog/${category.slug}`}
                                aria-label={category.name}
                                className="relative block w-full rounded-xl bg-grey border border-grey p-6 transition-shadow duration-300 hover:shadow-md hover:border-accent"
                            >
                                <div className="relative z-50 flex h-full flex-col justify-between gap-2">
                                    <div className="space-y-2">
                                        <div>
                                            <h2 className="text-dark-accent">{category.name}</h2>
                                            {category.description ? (
                                                <p className="mt-2 max-w-md text-sm text-dark-grey">
                                                    {category.description}
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>

                                    <div className=" relative flex justify-center items-center w-full h-30">
                                        <Image
                                            src={imageUrl}
                                            fill
                                            quality={100}
                                            alt={category.name}
                                            className="object-contain object-center"
                                            sizes="220px"
                                        />
                                    </div>

                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-dark-grey">
                                            Товаров в категории: {category.products.length}
                                        </p>
                                        <ArrowIcon size={60} color="var(--accent)" />
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
