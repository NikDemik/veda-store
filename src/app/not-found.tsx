import Link from 'next/link';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Страница не найдена',
    'Запрошенная страница не найдена на сайте Anneng.',
);

export default function NotFound() {
    return (
        <div>
            <h1>404</h1>
            <p>Страница не найдена</p>
            <Link href="/">На главную</Link>
        </div>
    );
}
