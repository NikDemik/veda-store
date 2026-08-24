import HomePage from '@/components/pages/public/HomePage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Anneng',
    'B2B-каталог продукции Anneng: шинопроводы, комплектующие, техническая документация и оформление заказа.',
);

export default function Home() {
    return <HomePage />;
}
