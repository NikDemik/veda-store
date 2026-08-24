'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Fragment } from 'react';

import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

const segmentLabels: Record<string, string> = {
    information: 'Информация',
    delivery: 'Доставка',
    payment: 'Оплата',
    about: 'О нас',
    company: 'О компании',
    legal: 'Правовая информация',
    requisites: 'Реквизиты',
    'account-rules': 'Правила использования личного кабинета',
    'cookie-policy': 'Политика использования Cookie',
    'delivery-terms': 'Условия доставки',
    'edo-procedure': 'Порядок ЭДО',
    'intellectual-property': 'Интеллектуальная собственность',
    'legal-messages': 'Юридически значимые сообщения',
    'marketing-consent': 'Согласие на рассылки',
    'order-terms': 'Условия оформления заказа',
    'payment-terms': 'Условия оплаты',
    'personal-data-consent': 'Согласие на обработку персональных данных',
    'personal-data-policy': 'Политика обработки персональных данных',
    'privacy-policy': 'Политика конфиденциальности',
    'returns-terms': 'Условия возврата товара',
    'store-rules': 'Правила работы интернет-магазина',
    'supply-contract-procedure': 'Регламент договора поставки',
    warranty: 'Гарантийные обязательства',
    account: 'Личный кабинет',
    admin: 'Админ-панель',
    auth: 'Авторизация',
    cart: 'Корзина',
    catalog: 'Каталог',
    checkout: 'Оформление заказа',
    contacts: 'Контакты',
    login: 'Авторизация',
    product: 'Товар',
    register: 'Регистрация',
    services: 'Услуги',
};

const hiddenSegments = new Set(['auth']);

function formatSegmentLabel(segment: string) {
    const label = segmentLabels[segment];

    if (label) {
        return label;
    }

    const decodedSegment = decodeURIComponent(segment).replace(/-/g, ' ');

    return decodedSegment.charAt(0).toUpperCase() + decodedSegment.slice(1);
}

export default function SiteBreadcrumbs() {
    const pathname = usePathname();

    if (
        !pathname ||
        pathname === '/' ||
        pathname.startsWith('/catalog/') ||
        pathname.startsWith('/product/')
    ) {
        return null;
    }

    const segments = pathname.split('/').filter(Boolean);
    const visibleSegments = segments
        .map((segment, index) => ({ segment, index }))
        .filter(({ segment }) => !hiddenSegments.has(segment));

    return (
        <div className="w-screen bg-white dark:bg-black">
            <div className="container mx-auto px-5 pt-5">
                <Breadcrumb>
                    <BreadcrumbList className="gap-1.5 text-sm text-dark-grey sm:gap-1.5">
                        <BreadcrumbItem>
                            <BreadcrumbLink asChild className="text-dark-grey hover:text-accent">
                                <Link href="/">Главная</Link>
                            </BreadcrumbLink>
                        </BreadcrumbItem>

                        {visibleSegments.map(({ segment, index }, visibleIndex) => {
                            const href = `/${segments.slice(0, index + 1).join('/')}`;
                            const isCurrentPage = visibleIndex === visibleSegments.length - 1;
                            const label = formatSegmentLabel(segment);

                            return (
                                <Fragment key={href}>
                                    <BreadcrumbSeparator className="text-dark-grey">
                                        /
                                    </BreadcrumbSeparator>
                                    <BreadcrumbItem>
                                        {isCurrentPage ? (
                                            <BreadcrumbPage className="text-accent">
                                                {label}
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink
                                                asChild
                                                className="text-dark-grey hover:text-accent"
                                            >
                                                <Link href={href}>{label}</Link>
                                            </BreadcrumbLink>
                                        )}
                                    </BreadcrumbItem>
                                </Fragment>
                            );
                        })}
                    </BreadcrumbList>
                </Breadcrumb>
            </div>
        </div>
    );
}
