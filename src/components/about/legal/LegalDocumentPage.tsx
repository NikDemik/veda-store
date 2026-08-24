import Link from 'next/link';
import { ArrowLeft, ArrowRight } from 'lucide-react';

import {
    type LegalDocument,
    getRelatedLegalDocuments,
    legalDocuments,
} from '@/data/legal/legalDocuments';

type LegalDocumentPageProps = {
    document: LegalDocument;
};

export default function LegalDocumentPage({ document }: LegalDocumentPageProps) {
    const relatedDocuments = getRelatedLegalDocuments(document);

    return (
        <section className="relative w-screen py-12">
            <div className="relative container mx-auto grid gap-10 px-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                <article className="min-w-0">
                    {/* <Link
                        href="/about/legal"
                        className="inline-flex items-center gap-2 text-sm font-medium text-accent"
                    >
                        <ArrowLeft className="h-4 w-4" aria-hidden />
                        Все документы
                    </Link> */}

                    <header className=" border-b border-grey/80 pb-8 dark:border-white/15">
                        <div className="flex items-center justify-between gap-4">
                            <h1 className="mt-3 text-balance uppercase text-black dark:text-white">
                                {document.title}
                            </h1>
                            <Link
                                href="/about/legal"
                                className="inline-flex items-center gap-2 text-sm font-medium text-accent"
                            >
                                <ArrowLeft className="h-4 w-4" aria-hidden />
                                Все документы
                            </Link>
                        </div>
                        <dl className="mt-6 grid gap-4 rounded-lg border border-grey/80 p-5 text-sm dark:border-white/15 sm:grid-cols-2">
                            <div>
                                <dt className="text-dark-grey dark:text-white/60">
                                    Дата вступления в силу
                                </dt>
                                <dd className="mt-1 font-medium text-black dark:text-white">
                                    {document.effectiveDate}
                                </dd>
                            </div>
                            <div>
                                <dt className="text-dark-grey dark:text-white/60">
                                    Область применения
                                </dt>
                                <dd className="mt-1 font-medium text-black dark:text-white">
                                    {document.scope}
                                </dd>
                            </div>
                        </dl>
                    </header>

                    <div className="mt-8 space-y-9">
                        {document.sections.map((section, index) => (
                            <section key={`${section.title}-${index}`} className="space-y-4">
                                <h2 className="text-2xl font-semibold text-black dark:text-white">
                                    {index + 1}. {section.title}
                                </h2>
                                {section.paragraphs?.map((paragraph) => (
                                    <p
                                        key={paragraph}
                                        className="text-base leading-8 text-dark-grey dark:text-white/75"
                                    >
                                        {paragraph}
                                    </p>
                                ))}
                                {section.items ? (
                                    <ul className="space-y-3 pl-5 text-base leading-7 text-dark-grey dark:text-white/75">
                                        {section.items.map((item) => (
                                            <li key={item} className="list-disc">
                                                {item}
                                            </li>
                                        ))}
                                    </ul>
                                ) : null}
                            </section>
                        ))}
                    </div>
                </article>

                <aside className="h-fit rounded-lg border border-grey/80 bg-white p-5 dark:border-white/15 dark:bg-white/5 lg:sticky lg:top-24">
                    <h2 className="text-lg font-semibold text-black dark:text-white">
                        Связанные документы
                    </h2>
                    <div className="mt-4 space-y-3">
                        {relatedDocuments.map((relatedDocument) => (
                            <Link
                                key={relatedDocument.slug}
                                href={`/about/legal/${relatedDocument.slug}`}
                                className="group flex items-start justify-between gap-3 rounded-lg border border-transparent p-3 text-sm transition hover:border-accent/40 hover:bg-accent/5"
                            >
                                <span className="leading-6 text-black dark:text-white">
                                    {relatedDocument.title}
                                </span>
                                <ArrowRight
                                    className="mt-1 h-4 w-4 shrink-0 text-accent transition group-hover:translate-x-1"
                                    aria-hidden
                                />
                            </Link>
                        ))}
                    </div>
                </aside>
            </div>
        </section>
    );
}

export function getLegalStaticParams() {
    return legalDocuments.map((document) => ({
        slug: document.slug,
    }));
}
