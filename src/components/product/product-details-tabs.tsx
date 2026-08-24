'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';

type ProductCharacteristic = {
    id: string;
    name: string;
    value: string;
};

type ProductDocument = {
    id: string | number;
    title: string;
    href: string;
};

type ProductDetailsTabsProps = {
    description: string | null;
    primaryCharacteristics: ProductCharacteristic[];
    additionalCharacteristics: ProductCharacteristic[];
    otherCharacteristics: ProductCharacteristic[];
    documents: ProductDocument[];
};

type TabId = 'description' | 'characteristics' | 'documents';

function CharacteristicsGroup({
    title,
    characteristics,
}: {
    title: string;
    characteristics: ProductCharacteristic[];
}) {
    if (!characteristics.length) return null;

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-black">{title}</h3>
            <dl>
                {characteristics.map((characteristic) => (
                    <div
                        key={characteristic.id}
                        className="flex items-end justify-between gap-4 border-b border-dark-grey py-3"
                    >
                        <dt className="font-medium tracking-wide text-black">
                            {characteristic.name}
                        </dt>
                        <dd className="shrink-0 text-right font-medium text-black">
                            {characteristic.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

export function ProductDetailsTabs({
    description,
    primaryCharacteristics,
    additionalCharacteristics,
    otherCharacteristics,
    documents,
}: ProductDetailsTabsProps) {
    const hasCharacteristics =
        primaryCharacteristics.length > 0 ||
        additionalCharacteristics.length > 0 ||
        otherCharacteristics.length > 0;
    const initialTab: TabId = description
        ? 'description'
        : hasCharacteristics
          ? 'characteristics'
          : 'documents';
    const [activeTab, setActiveTab] = useState<TabId>(initialTab);

    useEffect(() => {
        const openHashTab = () => {
            if (window.location.hash === '#characteristics' && hasCharacteristics) {
                setActiveTab('characteristics');
            }
        };
        const handleCharacteristicsLinkClick = (event: MouseEvent) => {
            const target = event.target;

            if (
                hasCharacteristics &&
                target instanceof Element &&
                target.closest('a[href="#characteristics"]')
            ) {
                setActiveTab('characteristics');
            }
        };

        openHashTab();
        window.addEventListener('hashchange', openHashTab);
        document.addEventListener('click', handleCharacteristicsLinkClick);

        return () => {
            window.removeEventListener('hashchange', openHashTab);
            document.removeEventListener('click', handleCharacteristicsLinkClick);
        };
    }, [hasCharacteristics]);

    const tabs = [
        description ? { id: 'description' as const, label: 'Описание' } : null,
        hasCharacteristics
            ? { id: 'characteristics' as const, label: 'Характеристики' }
            : null,
        documents.length ? { id: 'documents' as const, label: 'Документация' } : null,
    ].filter((tab): tab is { id: TabId; label: string } => tab !== null);

    if (!tabs.length) return null;

    return (
        <section id="characteristics" className="scroll-mt-24 bg-white">
            <div
                className="flex gap-6 overflow-x-auto border-b border-dark-grey"
                role="tablist"
                aria-label="Информация о товаре"
            >
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`product-tab-${tab.id}`}
                        onClick={() => setActiveTab(tab.id)}
                        className={`shrink-0 border-b-2 px-1 py-4 font-semibold transition-colors ${
                            activeTab === tab.id
                                ? 'border-black text-black'
                                : 'border-transparent text-dark-grey hover:text-black'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div
                id={`product-tab-${activeTab}`}
                role="tabpanel"
                className="max-w-4xl pt-8"
            >
                {activeTab === 'description' && description ? (
                    <p className="whitespace-pre-line text-dark-grey">{description}</p>
                ) : null}

                {activeTab === 'characteristics' ? (
                    <div className="space-y-8">
                        <CharacteristicsGroup
                            title="Основные характеристики"
                            characteristics={primaryCharacteristics}
                        />
                        <CharacteristicsGroup
                            title="Дополнительные характеристики"
                            characteristics={additionalCharacteristics}
                        />
                        <CharacteristicsGroup
                            title="Остальные характеристики"
                            characteristics={otherCharacteristics}
                        />
                    </div>
                ) : null}

                {activeTab === 'documents' ? (
                    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                        {documents.map((document) => (
                            <a
                                key={document.id}
                                href={document.href}
                                download
                                className="flex items-center gap-x-2 gap-y-3"
                            >
                                <FileText size={32} strokeWidth={1} />
                                <span>{document.title}</span>
                            </a>
                        ))}
                    </div>
                ) : null}
            </div>
        </section>
    );
}
