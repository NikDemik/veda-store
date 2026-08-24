import type { MenuItem } from '@/types/data';

const menuData: MenuItem[] = [
    { id: 1, title: 'Каталог', href: '/catalog' },
    {
        id: 2,
        title: 'О нас',
        href: '/about',
        children: [
            { title: 'О компании', href: '/about/company' },
            { title: 'Реквизиты', href: '/about/requisites' },
            { title: 'Правовая информация', href: '/about/legal' },
        ],
    },
    { id: 3, title: 'Услуги', href: '/services' },
    {
        id: 6,
        title: 'Информация',
        href: '/information',
        children: [
            { title: 'Доставка', href: '/information/delivery' },
            { title: 'Оплата', href: '/information/payment' },
        ],
    },
    { id: 4, title: 'Контакты', href: '/contacts' },
];

export default menuData;
