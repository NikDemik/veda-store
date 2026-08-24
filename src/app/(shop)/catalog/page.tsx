import CatalogPage from '@/components/pages/shop/catalog-page';
import { createPageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata(
    'Каталог',
    'Каталог продукции Anneng: товары, характеристики, документация и цены для B2B-заказов.',
);

export default function Catalog() {
    return <CatalogPage />;
}
