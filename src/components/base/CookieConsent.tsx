'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Cookie, Settings2, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import {
    COOKIE_CONSENT_STORAGE_KEY,
    COOKIE_CONSENT_VERSION,
    CookieConsentRecord,
    CookiePreferences,
    cookieCategories,
} from '@/config/cookieConsent';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

const defaultPreferences: CookiePreferences = {
    necessary: true,
    functional: false,
    analytical: true,
    marketing: false,
};

const acceptedPreferences: CookiePreferences = {
    necessary: true,
    functional: true,
    analytical: true,
    marketing: true,
};

const declinedPreferences: CookiePreferences = {
    necessary: true,
    functional: false,
    analytical: false,
    marketing: false,
};

declare global {
    interface Window {
        ym?: ((...args: unknown[]) => void) & { a?: unknown[]; l?: number };
    }
}

function enableYandexMetrika() {
    const counterId = process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID;

    if (!counterId || document.querySelector('[data-cookie-consent-metrika]')) {
        return;
    }

    window.ym =
        window.ym ||
        function (...args: unknown[]) {
            (window.ym!.a = window.ym!.a || []).push(args);
        };
    window.ym.l = Date.now();

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://mc.yandex.ru/metrika/tag.js';
    script.dataset.cookieConsentMetrika = 'true';
    document.head.appendChild(script);

    window.ym(Number(counterId), 'init', {
        accurateTrackBounce: true,
        clickmap: true,
        trackLinks: true,
        webvisor: false,
    });
}

function readConsent(): CookieConsentRecord | null {
    try {
        const value = window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY);
        if (!value) return null;

        const consent = JSON.parse(value) as CookieConsentRecord;
        if (consent.version !== COOKIE_CONSENT_VERSION) return null;

        if (!consent.eventId) {
            const migratedConsent = {
                ...consent,
                eventId: window.crypto.randomUUID(),
                serverLogged: false,
            };
            window.localStorage.setItem(
                COOKIE_CONSENT_STORAGE_KEY,
                JSON.stringify(migratedConsent),
            );
            return migratedConsent;
        }

        return consent;
    } catch {
        return null;
    }
}

async function logConsent(record: CookieConsentRecord) {
    const response = await fetch('/api/cookie-consent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            eventId: record.eventId,
            action: record.action,
            categories: record.categories,
            version: record.version,
        }),
    });

    if (!response.ok) {
        throw new Error(`Consent logging failed with status ${response.status}`);
    }

    const current = readConsent();
    if (current?.eventId === record.eventId) {
        window.localStorage.setItem(
            COOKIE_CONSENT_STORAGE_KEY,
            JSON.stringify({ ...current, serverLogged: true }),
        );
    }
}

export default function CookieConsent() {
    const [isReady, setIsReady] = useState(false);
    const [showBanner, setShowBanner] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [hasConsent, setHasConsent] = useState(false);
    const [preferences, setPreferences] = useState<CookiePreferences>(defaultPreferences);
    const settingsTitleRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        const consent = readConsent();

        if (consent) {
            setPreferences(consent.categories);
            setHasConsent(true);
            if (consent.categories.analytical) enableYandexMetrika();
            if (!consent.serverLogged) {
                void logConsent(consent).catch((error) => console.warn(error));
            }
        } else {
            setShowBanner(true);
        }

        setIsReady(true);
    }, []);

    useEffect(() => {
        if (!showSettings) return;

        settingsTitleRef.current?.focus();
        const closeOnEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setShowSettings(false);
        };
        document.addEventListener('keydown', closeOnEscape);
        return () => document.removeEventListener('keydown', closeOnEscape);
    }, [showSettings]);

    useEffect(() => {
        const openSettings = () => setShowSettings(true);
        window.addEventListener('cookie-consent-open', openSettings);
        return () => window.removeEventListener('cookie-consent-open', openSettings);
    }, []);

    const saveConsent = (
        categories: CookiePreferences,
        action: CookieConsentRecord['action'],
    ) => {
        const record: CookieConsentRecord = {
            eventId: window.crypto.randomUUID(),
            action,
            categories,
            timestamp: new Date().toISOString(),
            version: COOKIE_CONSENT_VERSION,
        };

        window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, JSON.stringify(record));
        void logConsent(record).catch((error) => console.warn(error));
        setPreferences(categories);
        setHasConsent(true);
        setShowBanner(false);
        setShowSettings(false);

        if (categories.analytical) enableYandexMetrika();
        window.dispatchEvent(new CustomEvent('cookie-consent-change', { detail: record }));
    };

    if (!isReady) return null;

    return (
        <>
            <AnimatePresence>
                {showBanner && (
                    <motion.section
                        role="dialog"
                        aria-label="Согласие на использование cookie"
                        aria-live="polite"
                        initial={{ opacity: 0, y: 24 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 24 }}
                        transition={{ duration: 0.3 }}
                        className="fixed right-3 bottom-3 left-3 z-[100] mx-auto max-w-6xl rounded-2xl border border-black/10 bg-white/95 p-4 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 sm:p-5"
                    >
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                            <div className="flex min-w-0 flex-1 gap-3">
                                <Cookie
                                    aria-hidden="true"
                                    className="mt-0.5 size-6 shrink-0 text-dark-accent dark:text-accent"
                                />
                                <p className="text-sm leading-6 text-slate-700 dark:text-slate-300">
                                    Мы используем cookie для работы сайта и, с вашего согласия,
                                    для аналитики и улучшения сервиса. Подробнее — в{' '}
                                    <Link
                                        className="font-medium text-dark-accent underline underline-offset-2 dark:text-accent"
                                        href="/about/legal/cookie-policy"
                                    >
                                        Политике использования Cookie
                                    </Link>{' '}
                                    и{' '}
                                    <Link
                                        className="font-medium text-dark-accent underline underline-offset-2 dark:text-accent"
                                        href="/about/legal/personal-data-policy"
                                    >
                                        Политике обработки персональных данных
                                    </Link>
                                    .
                                </p>
                            </div>
                            <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:w-auto">
                                <Button
                                    size="lg"
                                    className="w-full"
                                    onClick={() => saveConsent(acceptedPreferences, 'accept-all')}
                                >
                                    Принять все
                                </Button>
                                <Button
                                    size="lg"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => saveConsent(declinedPreferences, 'decline')}
                                >
                                    Только необходимые
                                </Button>
                                <Button
                                    size="lg"
                                    variant="secondary"
                                    className="w-full"
                                    onClick={() => setShowSettings(true)}
                                >
                                    Настроить
                                </Button>
                            </div>
                        </div>
                    </motion.section>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showSettings && (
                    <motion.div
                        className="fixed inset-0 z-[110] flex items-end justify-center p-3 sm:items-center"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <button
                            type="button"
                            aria-label="Закрыть настройки cookie"
                            className="absolute inset-0 cursor-default bg-black/60 backdrop-blur-sm"
                            onClick={() => setShowSettings(false)}
                        />
                        <motion.div
                            role="dialog"
                            aria-modal="true"
                            aria-labelledby="cookie-settings-title"
                            initial={{ opacity: 0, y: 20, scale: 0.98 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 20, scale: 0.98 }}
                            transition={{ duration: 0.25 }}
                            className="relative max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-950 sm:p-7"
                        >
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Закрыть"
                                className="absolute top-4 right-4"
                                onClick={() => setShowSettings(false)}
                            >
                                <X className="size-4" />
                            </Button>
                            <h2
                                id="cookie-settings-title"
                                ref={settingsTitleRef}
                                tabIndex={-1}
                                className="pr-10 text-xl font-semibold text-black outline-none dark:text-white"
                            >
                                Настройки cookie
                            </h2>
                            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                                Выберите категории, которые разрешаете использовать. Необходимые
                                cookie всегда включены.
                            </p>

                            <div className="mt-5 space-y-3">
                                {cookieCategories.map((category) => (
                                    <label
                                        key={category.id}
                                        className="flex cursor-pointer gap-3 rounded-xl border border-slate-200 p-4 dark:border-white/10"
                                    >
                                        <Checkbox
                                            className="mt-0.5"
                                            checked={preferences[category.id]}
                                            disabled={category.required}
                                            onCheckedChange={(checked) =>
                                                setPreferences((current) => ({
                                                    ...current,
                                                    [category.id]: checked === true,
                                                }))
                                            }
                                        />
                                        <span className="min-w-0">
                                            <span className="font-semibold text-black dark:text-white">
                                                {category.label}
                                                {category.required && (
                                                    <span className="ml-2 text-xs font-normal text-dark-accent dark:text-accent">
                                                        всегда включены
                                                    </span>
                                                )}
                                            </span>
                                            <span className="mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-400">
                                                {category.description} Срок хранения: {category.storage}.
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </div>

                            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="sm:w-auto"
                                    onClick={() => setShowSettings(false)}
                                >
                                    Отмена
                                </Button>
                                <Button
                                    size="lg"
                                    className="sm:w-auto"
                                    onClick={() => saveConsent(preferences, 'custom')}
                                >
                                    Сохранить настройки
                                </Button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {hasConsent && !showBanner && !showSettings && (
                <Button
                    type="button"
                    variant="secondary"
                    size="icon"
                    aria-label="Изменить настройки cookie"
                    title="Настройки cookie"
                    className="fixed bottom-4 left-4 z-[90] size-11 shadow-lg"
                    onClick={() => setShowSettings(true)}
                >
                    <Settings2 className="size-5" />
                </Button>
            )}
        </>
    );
}
