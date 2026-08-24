import LegalDocumentsPage from '@/components/about/legal/LegalDocumentsPage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Правовая информация',
    'Юридические документы интернет-магазина Anneng Electric для B2B-заказов, оплаты, доставки, персональных данных и электронного документооборота.',
);

export default function LegalRoute() {
    return <LegalDocumentsPage />;
}
