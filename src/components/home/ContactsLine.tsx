'use client';

import Link from 'next/link';

import { Button } from '@/components/ui/button';

export default function ContactsLine() {
    return (
        <section className="relative w-full overflow-hidden border-y bg-[url('/img/bg-3.png')] dark:bg-[url('/img/bg-2.png')] bg-cover bg-fixed bg-center py-10 shadow-md ">
            <div className="absolute inset-0 bg-white/70 dark:bg-black/60" aria-hidden="true" />

            <div className="relative z-10 container mx-auto px-5 grid gap-6 lg:grid-cols-[1fr_auto] md:items-center">
                <p className="max-w-3xl text-2xl font-semibold leading-tight text-black uppercase md:text-3xl dark:text-white">
                    Являемся официальным дистрибьютером бренда{' '}
                    <span className="text-accent">VEDA VFD</span> в России
                </p>

                <div className="flex w-full flex-col gap-2 sm:gap-5 sm:flex-row md:w-auto">
                    <Button asChild className="sm:w-auto">
                        <Link href="/pdf/anneng.pdf" download>
                            Скачать каталог
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        size="default"
                        className="text-dark-accent sm:w-auto"
                    >
                        <Link href="/contacts">Стать партнёром</Link>
                    </Button>
                </div>
            </div>
        </section>
    );
}
