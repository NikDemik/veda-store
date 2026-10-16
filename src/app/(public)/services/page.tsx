import ServicesPage from '@/components/pages/public/ServicesPage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Услуги',
    'Услуги VEDA VFD для подбора, поставки и сопровождения B2B-заказов.',
);

export default function Services() {
    return <ServicesPage />;
}
