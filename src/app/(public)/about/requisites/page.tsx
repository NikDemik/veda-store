import RequisitesPage from '@/components/about/requisites/RequisitesPage';
import { createPageMetadata } from '@/lib/metadata';

export const metadata = createPageMetadata(
    'Реквизиты',
    'Юридические и банковские реквизиты компании VEDA VFD.',
);

export default function RequisitesRoute() {
    return <RequisitesPage />;
}
