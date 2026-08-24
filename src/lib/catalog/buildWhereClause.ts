import { Prisma } from '@prisma/client';

export function buildWhereClause(
    categoryId: number,
    seriesSlug?: string | string[],
    currentA?: string | string[],
    specs?: string | string[],
): Prisma.ProductWhereInput {
    const where: Prisma.ProductWhereInput = {
        categoryId,
        status: 'ACTIVE',
        isSellable: true,
    };

    if (seriesSlug) {
        const seriesArray = Array.isArray(seriesSlug) ? seriesSlug : [seriesSlug];
        where.series = {
            slug: { in: seriesArray },
        };
    }

    if (currentA) {
        const currentValues = (Array.isArray(currentA) ? currentA : [currentA])
            .map(Number)
            .filter(Number.isFinite);
        where.attributeValues = {
            some: {
                attribute: { code: 'rated_current_a' },
                numberValue: { in: currentValues },
            },
        };
    }

    if (specs) {
        const poles = (Array.isArray(specs) ? specs : [specs])
            .map(Number)
            .filter(Number.isFinite);
        where.AND = [
            ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
            {
                attributeValues: {
                    some: {
                        attribute: { code: 'poles' },
                        numberValue: { in: poles },
                    },
                },
            },
        ];
    }

    return where;
}
