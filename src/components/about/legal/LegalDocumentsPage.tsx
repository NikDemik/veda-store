import Link from 'next/link';
import { ArrowRight, FileText } from 'lucide-react';

import { legalDocuments } from '@/data/legal/legalDocuments';
import { legalDocumentGroups } from '@/data/legal/documentGroups';

export default function LegalDocumentsPage() {
    return (
        <section className="relative w-screen py-12">
            <div className="relative container mx-auto px-5">
                <div className="max-w-4xl">
                    <h1 className="mt-3 text-black uppercase dark:text-white">
                        Правовая информация
                    </h1>
                    <p className="mt-5 text-base leading-7 text-dark-grey dark:text-white/70 sm:text-lg sm:leading-6">
                        Документы интернет-магазина VEDA VFD для работы с юридическими лицами
                        и индивидуальными предпринимателями: регистрация, заказы, оплата по счету,
                        поставка промышленного оборудования, персональные данные и электронный
                        документооборот.
                    </p>
                </div>

                <div className="mt-10 space-y-10">
                    {legalDocumentGroups.map((group) => {
                        const documents = group.slugs
                            .map((slug) =>
                                legalDocuments.find((document) => document.slug === slug),
                            )
                            .filter((document): document is (typeof legalDocuments)[number] =>
                                Boolean(document),
                            );

                        return (
                            <section key={group.title} className="space-y-4">
                                <h2 className="text-2xl font-semibold text-black dark:text-white">
                                    {group.title}
                                </h2>
                                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                    {documents.map((document) => (
                                        <Link
                                            key={document.slug}
                                            href={`/about/legal/${document.slug}`}
                                            className="group flex min-h-48 flex-col rounded-lg border border-grey/80 bg-white p-5 shadow-sm transition hover:border-accent hover:shadow-md dark:border-white/15 dark:bg-white/5"
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-grey text-accent/40 dark:bg-white/5 dark:text-accent">
                                                    <FileText className="h-5 w-5" aria-hidden />
                                                </span>
                                                <h3 className="min-w-0 text-lg font-semibold leading-snug text-black dark:text-white">
                                                    {document.title}
                                                </h3>
                                            </div>
                                            <p className="mt-4 flex-1 text-sm leading-6 text-dark-grey dark:text-white/70">
                                                {document.summary}
                                            </p>
                                            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
                                                Открыть документ
                                                <ArrowRight
                                                    className="h-4 w-4 transition group-hover:translate-x-1"
                                                    aria-hidden
                                                />
                                            </span>
                                        </Link>
                                    ))}
                                </div>
                            </section>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
