import Link from 'next/link';
import { ArrowRight, Check, FileCheck2, Landmark, ReceiptText, ShieldCheck } from 'lucide-react';

import ContactsSection from '@/components/contacts/ContactsSection';
import { Button } from '@/components/ui/button';
import {
    paymentBenefits,
    paymentDocuments,
    paymentNotice,
    paymentSteps,
} from '@/data/information/paymentData';

const benefitIcons = {
    Landmark,
    FileCheck2,
    ShieldCheck,
} as const;

export default function PaymentPage() {
    return (
        <main className="w-screen pt-12">
            <div className="container mx-auto space-y-16 px-5 pb-20 lg:space-y-24">
                <section className="space-y-8">
                    <div className="max-w-4xl space-y-4">
                        <p className="font-semibold uppercase tracking-[0.16em] text-dark-accent">
                            Информация для покупателей
                        </p>
                        <h1 className="uppercase text-dark-accent">Оплата</h1>
                        <p className="max-w-3xl text-base leading-7 text-dark-grey lg:text-lg">
                            Оплата заказов производится по выставленному счёту банковским переводом.
                            Перед оплатой менеджер подтверждает состав заказа, стоимость и условия
                            поставки.
                        </p>
                    </div>

                    <div className="grid gap-5 md:grid-cols-3">
                        {paymentBenefits.map((benefit) => {
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
                    <div className="max-w-3xl space-y-3">
                        <p className="font-semibold uppercase tracking-[0.16em] text-dark-accent">
                            Порядок оплаты
                        </p>
                        <h2 className="section-title uppercase">
                            От заказа до поступления средств
                        </h2>
                    </div>

                    <ol className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
                        {paymentSteps.map((step) => (
                            <li
                                key={step.number}
                                className="flex min-h-64 flex-col rounded-lg border border-grey bg-white p-6 shadow-sm"
                            >
                                <span className="mb-10 text-3xl font-bold text-accent">
                                    {step.number}
                                </span>
                                <div className="mt-auto space-y-3">
                                    <h3>{step.title}</h3>
                                    <p className="leading-6 text-dark-grey">{step.text}</p>
                                </div>
                            </li>
                        ))}
                    </ol>
                </section>

                <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
                    <div className="rounded-lg bg-black p-6 text-white lg:p-10 dark:bg-grey dark:text-black">
                        <div className="mb-8 flex items-center gap-4">
                            <ReceiptText
                                className="text-accent"
                                size={36}
                                strokeWidth={1.5}
                                aria-hidden="true"
                            />
                            <h2 className="section-title-white">Документы по заказу</h2>
                        </div>
                        <div className="grid gap-8 md:grid-cols-2">
                            {paymentDocuments.map((document) => (
                                <div key={document.title} className="space-y-4">
                                    <h3 className="text-white/70 dark:text-white/80">
                                        {document.title}
                                    </h3>
                                    <ul className="space-y-3 text-white/75 dark:text-white/70">
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
                                {paymentNotice.map((notice) => (
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
                            <Link href="/about/legal/payment-terms">
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
