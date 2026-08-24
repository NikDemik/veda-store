export const COOKIE_CONSENT_VERSION = '1.0';
export const COOKIE_CONSENT_STORAGE_KEY = 'anneng_cookie_consent';

export const cookieCategories = [
    {
        id: 'necessary',
        label: 'Необходимые',
        description: 'Обеспечивают работу сайта, корзины, авторизации и форм. Их нельзя отключить.',
        storage: 'на время сессии или согласно сроку работы сервиса',
        required: true,
        defaultChecked: true,
    },
    {
        id: 'functional',
        label: 'Функциональные',
        description: 'Запоминают выбранные вами настройки сайта.',
        storage: 'до 12 месяцев',
        required: false,
        defaultChecked: false,
    },
    {
        id: 'analytical',
        label: 'Аналитические',
        description: 'Помогают оценивать посещаемость и улучшать сайт с помощью Яндекс.Метрики.',
        storage: 'до 24 месяцев',
        required: false,
        defaultChecked: true,
    },
    {
        id: 'marketing',
        label: 'Маркетинговые',
        description: 'Используются для оценки эффективности рекламных кампаний.',
        storage: 'до 90 дней',
        required: false,
        defaultChecked: false,
    },
] as const;

export type CookieCategoryId = (typeof cookieCategories)[number]['id'];
export type CookiePreferences = Record<CookieCategoryId, boolean>;

export type CookieConsentRecord = {
    eventId: string;
    action: 'accept-all' | 'decline' | 'custom';
    categories: CookiePreferences;
    timestamp: string;
    version: string;
    serverLogged?: boolean;
};
