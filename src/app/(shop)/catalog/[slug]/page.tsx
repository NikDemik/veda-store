import CatalogCategoryPage from '@/components/pages/shop/catalog-category-page';
import { createPageMetadata } from '@/lib/metadata';
import { prisma } from '@/lib/prisma';
import type { CatalogFilters } from '@/types/filter';

export const dynamic = 'force-dynamic';

type CatalogCategoryRouteProps = {
    params: Promise<{ slug: string }>;
    searchParams: Promise<CatalogFilters>;
};

export async function generateMetadata({ params }: Pick<CatalogCategoryRouteProps, 'params'>) {
    const { slug } = await params;
    const category = await prisma.category.findUnique({
        where: { slug },
        select: {
            name: true,
            description: true,
        },
    });

    if (!category) {
        return createPageMetadata('Категория не найдена');
    }

    return createPageMetadata(
        category.name,
        category.description || `Каталог продукции VEDA VFD в категории ${category.name}.`,
    );
}

export default function CatalogCategory(props: CatalogCategoryRouteProps) {
    return <CatalogCategoryPage {...props} />;
}
