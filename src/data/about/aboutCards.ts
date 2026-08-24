export type AboutCardItem = {
    id: number;
    number: string;
    iconName: 'Award' | 'PackageCheck' | 'Truck' | 'Handshake';
    title: string;
    description: string;
};

export const aboutCards: AboutCardItem[] = [
    {
        id: 1,
        number: '01.',
        iconName: 'Award',
        title: 'Официальный представитель ANNENG в России',
        description: 'Прямые поставки от ANNENG. Гарантия подлинности и заводской сервис',
    },
    {
        id: 2,
        number: '02.',
        iconName: 'PackageCheck',
        title: 'Большой ассортимент в наличии на складе',
        description: 'Широкий ассортимент всегда в наличии. Отгрузка со склада в день заказа',
    },
    {
        id: 3,
        number: '03.',
        iconName: 'Truck',
        title: 'Доставка по всей России',
        description: 'Быстрая логистика в любой регион: от Калининграда до Владивостока',
    },
    {
        id: 4,
        number: '04.',
        iconName: 'Handshake',
        title: 'Работаем с B2B',
        description: 'Специальные цены и индивидуальные условия для бизнеса и производства',
    },
];
