import Link from 'next/link';
import {
    ArrowRight,
    Check,
    ClipboardCheck,
    Clock3,
    MapPinned,
    PackageCheck,
    Route,
    Truck,
    Warehouse,
} from 'lucide-react';

import ContactsSection from '@/components/contacts/ContactsSection';
import { Button } from '@/components/ui/button';
import {
    deliveryBenefits,
    deliveryDocuments,
    deliveryMethods,
    deliveryNotice,
} from '@/data/information/deliveryData';

const benefitIcons = {
    Clock3,
    Route,
    ClipboardCheck,
} as const;

const methodIcons = {
    Warehouse,
    Truck,
    MapPinned,
} as const;

export default function DeliveryPage() {
    return (
        <main className="w-screen pt-12">
            <div className="container mx-auto space-y-16 px-5 pb-20 lg:space-y-24">
                <section className="space-y-8">
                    <div className="max-w-4xl space-y-4">
                        <p className="font-semibold uppercase tracking-[0.16em] text-dark-accent">
                            Информация для покупателей
                        </p>
                        <h1 className="uppercase text-dark-accent">Доставка</h1>
                        <p className="max-w-3xl text-base leading-7 text-dark-grey lg:text-lg">
                            Организуем получение промышленного оборудования удобным способом:
                            самовывозом, собственным транспортом или через транспортную компанию.
                            Условия каждой поставки подтверждаем до отгрузки.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {deliveryBenefits.map((benefit) => {
                            const Icon = benefitIcons[benefit.iconName];

                            return (
                                <article
                                    key={benefit.title}
                                    className="flex min-h-56 flex-col justify-between rounded-lg bg-grey p-6"
                                >
                                    <Icon
                                        className="text-dark-accent"
                                        size={34}
                                        strokeWidth={1.5}
                                        aria-hidden="true"
                                    />
                                    <div className="space-y-3">
                                        <h2>{benefit.title}</h2>
                                        <p className="leading-6 text-dark-grey">{benefit.text}</p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="space-y-8">
                    <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                        <div className="space-y-3">
                            <p className="font-semibold uppercase tracking-[0.16em] text-dark-accent">
                                Способы получения
                            </p>
                            <h2 className="section-title uppercase">Выберите удобный вариант</h2>
                        </div>
                        <p className="max-w-xl leading-6 text-dark-grey">
                            Менеджер проверит наличие, габариты груза и предложит подходящий способ
                            доставки для вашего заказа.
                        </p>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-3">
                        {deliveryMethods.map((method) => {
                            const Icon = methodIcons[method.iconName];

                            return (
                                <article
                                    key={method.title}
                                    className="flex flex-col rounded-lg border border-grey bg-white p-6 shadow-sm"
                                >
                                    <div className="mb-8 flex items-start justify-between gap-4">
                                        <div className="space-y-2">
                                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-dark-accent">
                                                {method.eyebrow}
                                            </p>
                                            <h3 className="text-xl">{method.title}</h3>
                                        </div>
                                        <span className="rounded-full bg-accent/15 p-3 text-dark-accent">
                                            <Icon size={26} strokeWidth={1.5} aria-hidden="true" />
                                        </span>
                                    </div>
                                    <p className="mb-6 leading-6 text-dark-grey">
                                        {method.description}
                                    </p>
                                    <ul className="mt-auto space-y-3">
                                        {method.details.map((detail) => (
                                            <li key={detail} className="flex gap-3 leading-5">
                                                <Check
                                                    className="mt-0.5 shrink-0 text-dark-accent"
                                                    size={17}
                                                    aria-hidden="true"
                                                />
                                                <span>{detail}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            );
                        })}
                    </div>
                </section>

                <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="rounded-lg bg-black p-6 text-white lg:p-10 dark:bg-grey dark:text-black">
                        <div className="mb-8 flex items-center gap-4">
                            <PackageCheck
                                className="text-accent"
                                size={36}
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            <h2 className="section-title-white">Документы при получении</h2>
                        </div>
                        <div className="grid gap-8 md:grid-cols-2">
                            {deliveryDocuments.map((document) => (
                                <div key={document.title} className="space-y-4">
                                    <h3 className=" text-white/70 dark:text-white/80">
                                        {document.title}
                                    </h3>
                                    <ul className="space-y-3 text-white/75 dark:text-white/60">
                                        {document.items.map((item) => (
                                            <li key={item} className="flex gap-3 leading-5">
                                                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" />
                                                <span>{item}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </div>

                    <aside className="flex flex-col justify-between gap-8 rounded-lg bg-accent p-6 text-black lg:p-10">
                        <div className="space-y-5">
                            <h2 className="section-title">Важно знать</h2>
                            <ul className="space-y-4">
                                {deliveryNotice.map((notice) => (
                                    <li key={notice} className="flex gap-3 leading-6">
                                        <Check
                                            className="mt-1 shrink-0"
                                            size={18}
                                            aria-hidden="true"
                                        />
                                        <span>{notice}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Button
                            asChild
                            variant="outline"
                            className="border-black hover:border-black"
                        >
                            <Link href="/about/legal/delivery-terms">
                                Полные условия
                                <ArrowRight size={18} aria-hidden="true" />
                            </Link>
                        </Button>
                    </aside>
                </section>
            </div>

            <ContactsSection />
        </main>
    );
}
