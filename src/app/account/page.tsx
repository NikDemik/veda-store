import AccountPage from '@/components/pages/account/account-page';
import { createPageMetadata } from '@/lib/metadata';

export const dynamic = 'force-dynamic';

export const metadata = createPageMetadata(
    'Личный кабинет',
    'Личный кабинет Anneng: заказы, данные организации и настройки аккаунта.',
);

export default function Account() {
    return <AccountPage />;
}
