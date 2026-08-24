export type PopularCategory = {
    title: string[];
    items: string[];
    image: string;
    imageAlt: string;
    href: string;
};

export const popularCategories: PopularCategory[] = [
    {
        title: ['Троллейный шинопровод', 'в закрытом корпусе'],
        items: ['Cерия HFP56', 'Ток от 35А до 240А'],
        image: '/img/categories/anneng-hfp.png',
        imageAlt: 'Троллейный шинопровод в закрытом корпусе',
        href: '/catalog',
    },
    {
        title: ['Однополюсный', 'шинопровод'],
        items: ['Серия JDC-H', 'Ток от 250А до 5000А'],
        image: '/img/categories/anneng-jdc.png',
        imageAlt: 'Однополюсный шинопровод',
        href: '/catalog',
    },
    {
        title: ['Изолированный контактный', 'рельс'],
        items: ['Серия U12', 'Ток от 10А до 100А'],
        image: '/img/categories/anneng-u12.png',
        imageAlt: 'Изолированный контактный рельс',
        href: '/catalog',
    },
];
