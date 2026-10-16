import RegisterPage from '@/components/pages/auth/register-page';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Регистрация',
    'Регистрация личного кабинета VEDA VFD для оформления B2B-заказов.',
);

export default function Register() {
    return <RegisterPage />;
}
