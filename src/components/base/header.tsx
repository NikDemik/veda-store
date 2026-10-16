'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Mail, Phone, Clock, Search, ShoppingCart, Menu, X, ChevronDown } from 'lucide-react';
import contactData from '@/data/contactData';
import menuData from '@/data/menuData';
import { useCart } from '@/components/cart/cart-context';
import AccountMenu from '@/components/auth/account-menu';
import ThemeToggle from '@/components/base/theme-toggle';

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [openDesktopMenuId, setOpenDesktopMenuId] = useState<number | null>(null);
    const [isMainHeaderPinned, setIsMainHeaderPinned] = useState(false);
    const [mainHeaderHeight, setMainHeaderHeight] = useState(0);
    const topLineRef = useRef<HTMLDivElement>(null);
    const mainHeaderRef = useRef<HTMLElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const desktopNavRef = useRef<HTMLElement>(null);
    const pathname = usePathname();
    const isActive = (path: string) => pathname.startsWith(path);
    const { items } = useCart();
    const cartCount = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);

    useEffect(() => {
        const updateMainHeaderPosition = () => {
            const topLineHeight = topLineRef.current?.offsetHeight ?? 0;
            const headerHeight = mainHeaderRef.current?.offsetHeight ?? 0;

            setMainHeaderHeight(headerHeight);
            setIsMainHeaderPinned(window.scrollY >= topLineHeight);
        };

        updateMainHeaderPosition();
        window.addEventListener('scroll', updateMainHeaderPosition, { passive: true });
        window.addEventListener('resize', updateMainHeaderPosition);

        return () => {
            window.removeEventListener('scroll', updateMainHeaderPosition);
            window.removeEventListener('resize', updateMainHeaderPosition);
        };
    }, [isMobileMenuOpen, isSearchOpen]);

    useEffect(() => {
        if (isSearchOpen) {
            searchInputRef.current?.focus();
        }
    }, [isSearchOpen]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (!desktopNavRef.current?.contains(event.target as Node)) {
                setOpenDesktopMenuId(null);
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <>
            <div
                ref={topLineRef}
                className="relative z-50 w-full bg-transparent text-dark-grey dark:bg-black"
            >
                <div className="container px-5 mx-auto">
                    {/* TOP LINE */}
                    <div className=" flex w-full justify-between items-center py-4 xl:text-sm">
                        <div className="hidden sm:flex flex-col lg:flex-row sm:gap-x-5 sm:justify-start">
                            <div className="flex justify-between gap-1 items-center hover-white dark:hover-accent">
                                <Mail size={18} aria-hidden="true" />
                                <a href={`mailto:${contactData.email}`}>{contactData.email}</a>
                            </div>
                            <div className="flex justify-between gap-1 items-center">
                                <Clock size={18} aria-hidden="true" />
                                <p>Пн-Пт с 09.00 до 18.00 (МСК)</p>
                            </div>
                        </div>

                        <div className="hidden sm:flex flex-col lg:flex-row sm:gap-x-5 sm:justify-start ">
                            <div className="flex justify-between gap-1 items-center hover-white dark:hover-accent">
                                <Phone size={18} aria-hidden="true" />
                                <a href={`tel:${contactData.phone}`}>{contactData.phone}</a>
                            </div>
                            <div className="flex justify-between gap-1 items-center hover-white dark:hover-accent">
                                <Phone size={18} aria-hidden="true" />
                                <a href={`tel:${contactData.phone2}`}>{contactData.phone2}</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <header
                ref={mainHeaderRef}
                className={`${isMainHeaderPinned ? 'fixed left-0 top-0 shadow-sm' : 'relative'} z-40 w-full border-b bg-white/65 text-dark-grey backdrop-blur dark:bg-black/65 glass-wet`}
            >
                <div className="container px-5 mx-auto flex flex-col">
                    {/* MAIN HEADER */}
                    <div className="flex w-full justify-between items-center py-4 text-black dark:text-white xl:text-base ">
                        {/* LOGO*/}
                        <Link href="/">
                            <p className="text-2xl lg:text-3xl font-medium text-center leading-[80%] uppercase">
                                Альпарк
                            </p>
                            <span className="text-sm text-muted-foreground">
                                поставщик преобразователей VEDA
                            </span>
                        </Link>
                        {/* NAVIGATION */}
                        <nav
                            ref={desktopNavRef}
                            className="hidden xl:flex gap-6 justify-center items-center "
                        >
                            {menuData.map((nav) =>
                                nav.children ? (
                                    <div key={nav.id} className="relative">
                                        <button
                                            type="button"
                                            aria-haspopup="menu"
                                            aria-expanded={openDesktopMenuId === nav.id}
                                            className={`flex items-center gap-1 whitespace-nowrap transition-all duration-300 ${isActive(nav.href) ? 'text-accent dark:text-accent' : 'text-black hover:text-accent dark:text-white dark:hover:text-accent'}`}
                                            onClick={() =>
                                                setOpenDesktopMenuId((current) =>
                                                    current === nav.id ? null : nav.id,
                                                )
                                            }
                                        >
                                            {nav.title}
                                            <ChevronDown
                                                size={16}
                                                aria-hidden="true"
                                                className={`transition-transform duration-300 ${openDesktopMenuId === nav.id ? 'rotate-180' : ''}`}
                                            />
                                        </button>
                                        {openDesktopMenuId === nav.id && (
                                            <div
                                                className="absolute left-0 top-8 z-50 min-w-60 rounded-xl border border-black/20 bg-white/80 p-2 text-sm text-black shadow-lg backdrop-blur dark:border-white/20 dark:bg-black/80 dark:text-white"
                                                role="menu"
                                            >
                                                {nav.children.map((child) => (
                                                    <Link
                                                        key={child.href}
                                                        href={child.href}
                                                        role="menuitem"
                                                        className={`block rounded-lg px-3 py-2 hover:bg-white/10 hover:text-accent ${isActive(child.href) ? 'text-accent' : ''}`}
                                                        onClick={() => setOpenDesktopMenuId(null)}
                                                    >
                                                        {child.title}
                                                    </Link>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <Link
                                        key={nav.id}
                                        href={nav.href}
                                        className={`whitespace-nowrap transition-all duration-300 text-black dark:text-white ${isActive(nav.href) ? 'text-accent dark:text-accent' : 'hover:text-accent dark:hover:text-accent'}`}
                                    >
                                        {nav.title}
                                    </Link>
                                ),
                            )}
                        </nav>
                        {/* MENU USER*/}
                        <div className=" flex gap-6 justify-center items-center font-medium">
                            {/* SEARCH */}
                            <button
                                type="button"
                                aria-label="Открыть поиск"
                                aria-expanded={isSearchOpen}
                                aria-controls="header-search-panel"
                                className="hidden xl:flex items-center text-black dark:text-white hover:text-accent dark:hover:text-accent"
                                onClick={() => setIsSearchOpen((prev) => !prev)}
                            >
                                <Search size={18} aria-hidden="true" />
                            </button>
                            {/* CART */}
                            <Link
                                href="/cart"
                                aria-label="Добавить в корзину"
                                className="flex items-center gap-2 text-black dark:text-white hover:text-accent dark:hover:text-accent"
                            >
                                <span className="hidden lg:block">Корзина</span>
                                <span className="relative inline-flex">
                                    <ShoppingCart size={18} aria-hidden="true" />
                                    {cartCount > 0 && (
                                        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-semibold text-black">
                                            {cartCount}
                                        </span>
                                    )}
                                </span>
                            </Link>
                            {/* ACCOUNT */}
                            <AccountMenu />
                            <ThemeToggle />
                            <button
                                type="button"
                                className="xl:hidden flex items-center text-black dark:text-white hover-accent"
                                aria-label={isMobileMenuOpen ? 'Мобильное меню' : 'Мобильное меню'}
                                aria-expanded={isMobileMenuOpen}
                                aria-controls="mobile-nav"
                                onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                            >
                                {isMobileMenuOpen ? (
                                    <X size={22} aria-hidden="true" />
                                ) : (
                                    <Menu size={22} aria-hidden="true" />
                                )}
                            </button>
                        </div>
                    </div>

                    <div
                        id="header-search-panel"
                        className={`hidden overflow-hidden transition-all duration-300 ease-out lg:block ${isSearchOpen ? 'max-h-24 opacity-100 translate-y-0 pb-4' : 'max-h-0 opacity-0 -translate-y-2 pb-0 pointer-events-none'}`}
                    >
                        <form
                            action="/catalog"
                            method="get"
                            role="search"
                            className="flex items-center gap-3 border-t border-dark-grey/30 pt-4"
                        >
                            <label htmlFor="header-search" className="sr-only">
                                Поиск
                            </label>
                            <input
                                ref={searchInputRef}
                                id="header-search"
                                name="q"
                                type="search"
                                placeholder="Поиск"
                                className="w-full bg-transparent text-black dark:text-white placeholder:text-dark-grey/70 dark:placeholder:text-white pl-0 focus:outline-none"
                            />
                            <button
                                type="submit"
                                aria-label="Найти"
                                className="flex items-center text-black dark:text-white hover:text-accent dark:hover:text-accent"
                            >
                                <Search size={18} aria-hidden="true" />
                            </button>
                        </form>
                    </div>

                    {/* MOBIL HEADER */}
                    {isMobileMenuOpen && (
                        <div
                            id="mobile-nav"
                            className="xl:hidden flex flex-col gap-4 py-4 text-black dark:text-white"
                        >
                            <nav className="flex flex-col gap-3">
                                {menuData.map((nav) => (
                                    <div key={nav.id} className="flex flex-col gap-2">
                                        {nav.children ? (
                                            <>
                                                <span
                                                    className={
                                                        isActive(nav.href) ? 'text-accent' : ''
                                                    }
                                                >
                                                    {nav.title}
                                                </span>
                                                <div className="ml-3 flex flex-col gap-2 border-l border-black/20 pl-3 dark:border-white/20">
                                                    {nav.children.map((child) => (
                                                        <Link
                                                            key={child.href}
                                                            href={child.href}
                                                            className={
                                                                isActive(child.href)
                                                                    ? 'text-accent'
                                                                    : ''
                                                            }
                                                            onClick={() =>
                                                                setIsMobileMenuOpen(false)
                                                            }
                                                        >
                                                            {child.title}
                                                        </Link>
                                                    ))}
                                                </div>
                                            </>
                                        ) : (
                                            <Link
                                                href={nav.href}
                                                onClick={() => setIsMobileMenuOpen(false)}
                                            >
                                                {nav.title}
                                            </Link>
                                        )}
                                    </div>
                                ))}
                            </nav>
                            <form
                                action="/catalog"
                                method="get"
                                role="search"
                                className="flex items-center gap-2"
                            >
                                <label htmlFor="header-search-mobile" className="sr-only">
                                    Поиск
                                </label>
                                <input
                                    id="header-search-mobile"
                                    name="q"
                                    type="search"
                                    placeholder="Поиск"
                                    className=" w-full bg-transparent text-black dark:text-white placeholder:text-dark-grey/70 dark:placeholder:text-white pl-0 focus:outline focus:rounded-xl"
                                />
                                <Search size={18} aria-hidden="true" />
                            </form>
                        </div>
                    )}
                </div>
            </header>
            {isMainHeaderPinned && <div aria-hidden="true" style={{ height: mainHeaderHeight }} />}
        </>
    );
}
