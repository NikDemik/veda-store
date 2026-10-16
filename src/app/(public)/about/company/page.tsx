import AboutPage from '@/components/pages/public/AboutPage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'О компании',
    'Информация о компании VEDA VFD, продукции и подходе к B2B-поставкам.',
);

export default function CompanyPage() {
    return <AboutPage />;
}
