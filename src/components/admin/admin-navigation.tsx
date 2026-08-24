'use client';

import {
    Boxes,
    ChevronDown,
    FolderTree,
    Layers3,
    ListTree,
    Ruler,
    Tags,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AdminTab } from './types';

const primaryTabs: Array<{
    id: AdminTab;
    shortLabel: string;
    label: string;
    description: string;
}> = [
    {
        id: 'orders',
        shortLabel: 'Заказы',
        label: 'Заказы',
        description: 'Последние заказы клиентов: статусы, оплата, доставка, документы и сумма.',
    },
    {
        id: 'contact-leads',
        shortLabel: 'Заявки',
        label: 'Заявки',
        description: 'Обращения из форм обратной связи, контакты и статус обработки.',
    },
    {
        id: 'organizations',
        shortLabel: 'Орг.',
        label: 'Организации',
        description: 'Клиентские компании, пользователи, реквизиты и накопленный оборот.',
    },
    {
        id: 'settings',
        shortLabel: 'Настр.',
        label: 'Настройки',
        description: 'Данные продавца и платежные реквизиты для счетов, документов и публичных страниц.',
    },
];

export const productTabs: Array<{
    id: AdminTab;
    icon: LucideIcon;
    label: string;
    description: string;
}> = [
    {
        id: 'products-list',
        icon: Boxes,
        label: 'Все товары',
        description: 'Список товаров каталога с ценами, остатками и привязками.',
    },
    {
        id: 'brands',
        icon: Tags,
        label: 'Бренды',
        description: 'Справочник брендов для карточек товаров и загрузки медиа.',
    },
    {
        id: 'categories',
        icon: FolderTree,
        label: 'Категории',
        description: 'Список категорий и форма добавления новой категории.',
    },
    {
        id: 'series',
        icon: Layers3,
        label: 'Серии товаров',
        description: 'Список серий и форма добавления новой серии товаров.',
    },
];

export const referenceTabs: Array<{
    id: AdminTab;
    icon: LucideIcon;
    label: string;
    description: string;
}> = [
    {
        id: 'product-types',
        icon: ListTree,
        label: 'Типы товаров',
        description: 'Защищённые роли компонентов и дополнительные типы номенклатуры.',
    },
    {
        id: 'unit-measures',
        icon: Ruler,
        label: 'Единицы измерения',
        description: 'Справочник единиц для цен, остатков и карточек товаров.',
    },
];

type AdminNavigationProps = {
    activeTab: AdminTab;
    isProductsMenuOpen: boolean;
    isReferencesMenuOpen: boolean;
    productsMenuActive: boolean;
    referencesMenuActive: boolean;
    onToggleProductsMenu: () => void;
    onToggleReferencesMenu: () => void;
    onTabChange: (tab: AdminTab) => void;
};

export function AdminNavigation({
    activeTab,
    isProductsMenuOpen,
    isReferencesMenuOpen,
    productsMenuActive,
    referencesMenuActive,
    onToggleProductsMenu,
    onToggleReferencesMenu,
    onTabChange,
}: AdminNavigationProps) {
    return (
        <aside className="lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[2rem] bg-grey p-4 sm:p-5">
                <div className="rounded-2xl">
                    <h2 className="mt-3 text-2xl font-semibold text-black">Разделы панели</h2>
                </div>

                <nav className="mt-4 flex flex-col gap-3">
                    {primaryTabs.map((tab) => (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => onTabChange(tab.id)}
                            className={cn(
                                'rounded-3xl border px-5 py-4 text-left transition-all duration-200',
                                activeTab === tab.id
                                    ? 'border-accent/30 bg-accent text-white shadow-shadow-main/10'
                                    : 'border-grey/80 bg-white hover:border-accent/30 hover:bg-accent/5',
                            )}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <p
                                    className={cn(
                                        'text-sm font-semibold',
                                        activeTab === tab.id ? 'text-white' : 'text-black',
                                    )}
                                >
                                    {tab.label}
                                </p>
                                <span
                                    className={cn(
                                        'rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.16em]',
                                        activeTab === tab.id
                                            ? 'bg-white/15 text-white'
                                            : 'bg-grey text-black',
                                    )}
                                >
                                    {tab.shortLabel}
                                </span>
                            </div>
                            <p
                                className={cn(
                                    'mt-2 text-xs leading-5',
                                    activeTab === tab.id ? 'text-white/75' : 'text-dark-grey',
                                )}
                            >
                                {tab.description}
                            </p>
                        </button>
                    ))}

                    <div
                        className={cn(
                            'rounded-3xl border bg-white transition-all duration-200',
                            productsMenuActive
                                ? 'border-accent/30 shadow-shadow-main/10'
                                : 'border-grey/80',
                        )}
                    >
                        <button
                            type="button"
                            onClick={onToggleProductsMenu}
                            className={cn(
                                'flex w-full items-center justify-between gap-3 rounded-3xl px-5 py-4 text-left transition-colors duration-200',
                                productsMenuActive ? 'bg-accent text-white' : 'hover:bg-accent/5',
                            )}
                        >
                            <div>
                                <p
                                    className={cn(
                                        'text-sm font-semibold',
                                        productsMenuActive ? 'text-white' : 'text-black',
                                    )}
                                >
                                    Товары
                                </p>
                                <p
                                    className={cn(
                                        'mt-2 text-xs leading-5',
                                        productsMenuActive ? 'text-white/75' : 'text-dark-grey',
                                    )}
                                >
                                    Каталог, карточки товаров, категории и серии.
                                </p>
                            </div>
                            <ChevronDown
                                className={cn(
                                    'size-5 shrink-0 transition-transform',
                                    isProductsMenuOpen ? 'rotate-180' : 'rotate-0',
                                )}
                                aria-hidden="true"
                            />
                        </button>

                        {isProductsMenuOpen ? (
                            <div className="space-y-2 px-3 pb-3 pt-2">
                                {productTabs.map((tab) => {
                                    const Icon = tab.icon;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => onTabChange(tab.id)}
                                            className={cn(
                                                'flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-200',
                                                activeTab === tab.id
                                                    ? 'bg-accent/10 text-accent'
                                                    : 'text-dark-grey hover:bg-grey/60 hover:text-black',
                                            )}
                                        >
                                            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                            <div>
                                                <p className="text-sm font-semibold">{tab.label}</p>
                                                <p className="mt-1 text-xs leading-5">{tab.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>

                    <div
                        className={cn(
                            'rounded-3xl border bg-white transition-all duration-200',
                            referencesMenuActive
                                ? 'border-accent/30 shadow-shadow-main/10'
                                : 'border-grey/80',
                        )}
                    >
                        <button
                            type="button"
                            onClick={onToggleReferencesMenu}
                            className={cn(
                                'flex w-full items-center justify-between gap-3 rounded-3xl px-5 py-4 text-left transition-colors duration-200',
                                referencesMenuActive ? 'bg-accent text-white' : 'hover:bg-accent/5',
                            )}
                        >
                            <div>
                                <p
                                    className={cn(
                                        'text-sm font-semibold',
                                        referencesMenuActive ? 'text-white' : 'text-black',
                                    )}
                                >
                                    Справочники
                                </p>
                                <p
                                    className={cn(
                                        'mt-2 text-xs leading-5',
                                        referencesMenuActive ? 'text-white/75' : 'text-dark-grey',
                                    )}
                                >
                                    Нормализованные значения для каталога и заказов.
                                </p>
                            </div>
                            <ChevronDown
                                className={cn(
                                    'size-5 shrink-0 transition-transform',
                                    isReferencesMenuOpen ? 'rotate-180' : 'rotate-0',
                                )}
                                aria-hidden="true"
                            />
                        </button>

                        {isReferencesMenuOpen ? (
                            <div className="space-y-2 px-3 pb-3 pt-2">
                                {referenceTabs.map((tab) => {
                                    const Icon = tab.icon;

                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => onTabChange(tab.id)}
                                            className={cn(
                                                'flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left transition-colors duration-200',
                                                activeTab === tab.id
                                                    ? 'bg-accent/10 text-accent'
                                                    : 'text-dark-grey hover:bg-grey/60 hover:text-black',
                                            )}
                                        >
                                            <Icon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                                            <div>
                                                <p className="text-sm font-semibold">{tab.label}</p>
                                                <p className="mt-1 text-xs leading-5">{tab.description}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                </nav>
            </div>
        </aside>
    );
}
