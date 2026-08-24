export const serviceCards = [
    {
        title: 'Подбор оборудования',
        iconName: 'ZoomIn',
        text: 'Помогаем подобрать троллейные шинопроводы и другое оборудование под технические требования.',
        style: { card: 'bg-dark-accent', text: 'text-white', icon: 'var(--grey)' },
    },
    {
        title: 'Проектные поставки',
        iconName: 'ShoppingBag',
        text: 'Комплексные поставки оборудования для промышленных и логистических объектов.',
        style: { card: 'bg-grey', text: 'text-black', icon: 'var(--black)' },
    },
    {
        title: 'Поставка и логистика',
        iconName: 'PackageCheck',
        text: 'Организуем поставку оборудования со склада или под заказ с доставкой по России.',
        style: { card: 'bg-grey', text: 'text-black', icon: 'var(--black)' },
    },
    {
        title: 'Техническая поддержка',
        iconName: 'MessagesSquare',
        text: 'Консультации по эксплуатации, подбору комплектующих и замене оборудования.',
        style: { card: 'bg-dark-grey', text: 'text-dark-accent', icon: 'var(--dark-accent)' },
    },
] as const;
