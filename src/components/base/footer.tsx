'use client';

import contactData from '@/data/contactData';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Mail, Phone, Clock, MoveUp } from 'lucide-react';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { legalMenu } from '@/data/shared/legalMenu';

export default function Footer() {
    const currentYear = new Date().getFullYear();
    const pathname = usePathname();
    const isActive = (path: string) => pathname.startsWith(path);
    const openCookieSettings = () => {
        window.dispatchEvent(new Event('cookie-consent-open'));
    };
    return (
        <footer className=" w-full bg-white text-dark-grey border-t dark:bg-black">
            <div className=" container px-5 mx-auto flex flex-col">
                {/* TOP LINE */}
                <div className=" flex w-full justify-between items-center py-5 ">
                    <div className="hidden sm:flex flex-col lg:flex-row sm:gap-x-5 sm:justify-start">
                        <div className="flex justify-between gap-1 items-center hover-white">
                            <Mail size={18} aria-hidden="true" />
                            <a href={`mailto:${contactData.email}`}>{contactData.email}</a>
                        </div>
                        <div className="flex justify-between gap-1 items-center">
                            <Clock size={18} aria-hidden="true" />
                            <p>Пн-Пт с 09.00 до 18.00</p>
                        </div>
                    </div>

                    <div className="hidden sm:flex flex-col lg:flex-row sm:gap-x-5 sm:justify-start">
                        <div className="flex justify-between gap-1 items-center hover-white">
                            <Phone size={18} aria-hidden="true" />
                            <a href={`tel:${contactData.phone}`}>{contactData.phone}</a>
                        </div>
                        <div className="flex justify-between gap-1 items-center hover-white">
                            <Phone size={18} aria-hidden="true" />
                            <a href={`tel:${contactData.phone2}`}>{contactData.phone2}</a>
                        </div>
                    </div>
                </div>
                {/* MAIN FOOTER */}
                <div className="flex flex-col gap-5 w-full justify-between items-center py-5">
                    <div className="flex w-full justify-between">
                        {/* LOGO*/}
                        <Link href="/">
                            <Image
                                src={'/logo/logo-anneng-black.svg'}
                                width={230}
                                height={50}
                                quality={100}
                                alt="Логотип"
                                loading="eager"
                                className="dark:hidden"
                            />
                            <Image
                                src={'/logo/logo-anneng-white.png'}
                                width={230}
                                height={50}
                                quality={100}
                                alt="Логотип"
                                loading="eager"
                                className="hidden dark:block"
                            />
                        </Link>
                    </div>
                    <Separator />
                    <div className="flex flex-col sm:flex-row w-full justify-between">
                        {/* NAVIGATION */}
                        <nav className="flex flex-col gap-2 justify-center items-start">
                            {legalMenu.map((nav) => (
                                <Link
                                    key={nav.href}
                                    href={nav.href}
                                    className={`whitespace-nowrap transition-all duration-300 text-black dark:text-white ${isActive(`${nav.href}`) ? 'text-accent dark:text-accent' : 'hover:text-accent dark:hover:text-accent'}`}
                                >
                                    {nav.title}
                                </Link>
                            ))}
                            <button
                                type="button"
                                className="cursor-pointer text-left text-black transition-colors duration-300 hover:text-accent dark:text-white dark:hover:text-accent"
                                onClick={openCookieSettings}
                            >
                                Настройки cookie
                            </button>
                        </nav>
                        <Link
                            href={'https://b2b-design.ru/'}
                            className="flex items-end mt-5 sm:mt-0 underline hover:text-accent dark:hover:text-accent"
                        >
                            Разработка и дизайн
                        </Link>
                    </div>
                </div>
                <div className="flex justify-center items-center mt-8 mb-2">
                    <div>© {currentYear}. Все права защищены.</div>
                </div>
            </div>
        </footer>
    );
}
