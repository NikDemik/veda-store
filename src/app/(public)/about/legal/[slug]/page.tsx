import { notFound } from 'next/navigation';

import LegalDocumentPage, {
    getLegalStaticParams,
} from '@/components/about/legal/LegalDocumentPage';
import { getLegalDocument } from '@/data/legal/legalDocuments';
import { createPageMetadata } from '@/lib/metadata';

type LegalDocumentRouteProps = {
    params: Promise<{
        slug: string;
    }>;
};

export function generateStaticParams() {
    return getLegalStaticParams();
}

export async function generateMetadata({ params }: LegalDocumentRouteProps) {
    const { slug } = await params;
    const document = getLegalDocument(slug);

    if (!document) {
        return createPageMetadata('Правовой документ', 'Правовая информация VEDA VFD.');
    }

    return createPageMetadata(document.title, document.summary);
}

export default async function LegalDocumentRoute({ params }: LegalDocumentRouteProps) {
    const { slug } = await params;
    const document = getLegalDocument(slug);

    if (!document) {
        notFound();
    }

    return <LegalDocumentPage document={document} />;
}
