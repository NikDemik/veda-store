import ProductPage from '@/components/pages/shop/product-page';
import { createPageMetadata, createProductMetadata } from '@/lib/metadata';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type ProductRouteProps = {
    params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductRouteProps) {
    const { slug } = await params;
    const product = await prisma.product.findUnique({
        where: { slug, status: 'ACTIVE' },
        select: {
            name: true,
            description: true,
            seoTitle: true,
            metaDescription: true,
            imageUrl: true,
        },
    });

    if (!product) {
        return createPageMetadata('Товар не найден');
    }

    return createProductMetadata({
        title: product.seoTitle?.trim() || product.name,
        description: product.metaDescription?.trim() || product.description,
        imageUrl: product.imageUrl,
    });
}

export default function Product(props: ProductRouteProps) {
    return <ProductPage {...props} />;
}
