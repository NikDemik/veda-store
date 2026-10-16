import { redirect } from 'next/navigation';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'О компании',
    'Информация о компании VEDA VFD.',
);

export default function AboutPage() {
    redirect('/about/company');
}
