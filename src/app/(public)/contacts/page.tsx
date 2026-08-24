import ContactsPage from '@/components/pages/public/ContactsPage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Контакты',
    'Контактная информация Anneng: адрес, телефон, email и форма обратной связи.',
);

export default function Contacts() {
    return <ContactsPage />;
}
