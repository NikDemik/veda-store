import HomePage from '@/components/pages/public/HomePage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'VEDA VFD',
    'B2B-каталог продукции VEDA VFD: преобразователи частоты, комплектующие, техническая документация и оформление заказа.',
);

export default function Home() {
    return <HomePage />;
}
