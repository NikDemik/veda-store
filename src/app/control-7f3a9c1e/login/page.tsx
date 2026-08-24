import AdminLoginPage from '@/components/pages/admin/admin-login-page';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Вход в админ-панель',
    'Авторизация сотрудников в административной панели Anneng.',
);

export default function ControlPanelLogin() {
    return <AdminLoginPage />;
}
