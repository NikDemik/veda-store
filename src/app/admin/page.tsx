import AdminPage from '@/components/pages/admin/admin-page';
import { createPageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata(
    'Админ-панель',
    'Административная панель Anneng для управления каталогом, заказами и настройками.',
);

export default function Admin() {
    return <AdminPage />;
}
