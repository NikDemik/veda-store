import DeliveryPage from '@/components/pages/public/DeliveryPage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Доставка',
    'Условия доставки Anneng Electric: самовывоз, собственная доставка и транспортные компании по России.',
);

export default function Delivery() {
    return <DeliveryPage />;
}
