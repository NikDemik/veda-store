export type HeroSlide = {
    title: string;
    accent: string;
    breakBeforeAccent?: boolean;
    description: string[];
    image: string;
    imageAlt: string;
};

export const heroSlides: HeroSlide[] = [
    {
        title: 'Преобразователи частоты',
        accent: 'VEDA VFD VF-11 Compact Drive',
        description: [
            'Компактный привод для широкого спектра применения в промышленности и системах ОВиК.',
            'Экономичный и компактный частотный преобразователь, мощностью от 0,4 до 7,5 кВт',
        ],
        image: '/img/hero/veda-vfd-vf-11.png',
        imageAlt: 'Преобразователь частоты VEDA',
    },
    {
        title: 'Преобразователи частоты',
        accent: 'VEDA VFD VF-51 Micro Drive',
        description: [
            'Подходит для применения с насосами, вентиляторами, станками и конвейерами.',
            'Универсальный и компактный преобразователь частоты, мощностью от 0,75 до 22 кВт.',
        ],
        image: '/img/hero/veda-vfd-vf-51.png',
        imageAlt: 'Преобразователь частоты VEDA',
    },
    {
        title: 'Преобразователи частоты',
        accent: 'VEDA VFD VF-101 Basic Drive',
        breakBeforeAccent: true,
        description: [
            'Подходит для систем отопления, вентиляции и кондиционирования, а также насосов, общепромышленных применений, в том числе с тяжелыми пусками.',
            'Специализированный преобразователь частоты мощностью от 0,75 до 1120 кВт.',
        ],
        image: '/img/hero/veda-vfd-vf-101.png',
        imageAlt: 'Преобразователь частоты VEDA',
    },
];
