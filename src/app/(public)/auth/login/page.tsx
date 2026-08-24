import LoginPage from '@/components/pages/auth/login-page';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Вход',
    'Вход в личный кабинет Anneng для просмотра заказов и данных организации.',
);

export default function Login() {
    return <LoginPage />;
}
