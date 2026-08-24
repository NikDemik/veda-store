'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';

type FormState = {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationType: OrganizationType;
    organizationFullName: string;
    organizationShortName: string;
    organizationInn: string;
    organizationKpp: string;
    organizationFullAddress: string; // адрес оставляем для отображения
    phone: string;
};

type OrganizationType = 'OOO' | 'AO' | 'IP' | 'OTHER';

type OrganizationSuggestion = {
    inn: string;
    fullName: string;
    shortName: string;
    type: OrganizationType;
    kpp: string;
    legalAddress: string;
    // 👇 Структура адреса
    addressStructure: {
        postalCode: string | null;
        region: string | null;
        regionType: string | null;
        area: string | null;
        city: string;
        cityType: string | null;
        settlement: string | null;
        settlementType: string | null;
        street: string;
        streetType: string | null;
        house: string | null;
        block: string | null;
        flat: string | null;
        fiasId: string | null;
        kladrId: string | null;
    };
};

const initialState: FormState = {
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    organizationType: 'OOO',
    organizationFullName: '',
    organizationShortName: '',
    organizationInn: '',
    organizationKpp: '',
    organizationFullAddress: '',
    phone: '',
};

const organizationTypeOptions: Array<{ value: OrganizationType; label: string }> = [
    { value: 'OOO', label: 'ООО' },
    { value: 'AO', label: 'АО' },
    { value: 'IP', label: 'ИП' },
    { value: 'OTHER', label: 'Другое' },
];

function getSafeCallbackUrl(value: string | null) {
    if (!value) {
        return '/catalog';
    }

    if (value.startsWith('/') && !value.startsWith('//')) {
        return value;
    }

    try {
        const url = new URL(value);

        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return '/catalog';
    }
}

function RegisterForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [form, setForm] = useState<FormState>(initialState);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccessModalOpen, setIsSuccessModalOpen] = useState(false);
    const [isPrivacyPolicyAccepted, setIsPrivacyPolicyAccepted] = useState(false);
    const [isPersonalDataAccepted, setIsPersonalDataAccepted] = useState(false);
    const [isInnLookupLoading, setIsInnLookupLoading] = useState(false);
    const [innLookupError, setInnLookupError] = useState<string | null>(null);
    const [organizationSuggestions, setOrganizationSuggestions] = useState<
        OrganizationSuggestion[]
    >([]);
    const [selectedAddressStructure, setSelectedAddressStructure] = useState<any>(null);
    const callbackUrl = getSafeCallbackUrl(searchParams.get('callbackUrl'));

    const isFormComplete =
        form.firstName.trim() !== '' &&
        form.lastName.trim() !== '' &&
        form.email.trim() !== '' &&
        form.password.trim() !== '' &&
        form.organizationFullName.trim() !== '' &&
        form.organizationFullAddress.trim() !== '' &&
        form.organizationInn.trim() !== '' &&
        isPrivacyPolicyAccepted &&
        isPersonalDataAccepted;

    function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function handleSuccessModalClose() {
        setIsSuccessModalOpen(false);
        router.push(callbackUrl);
    }

    // Применение выбранной организации (заполнение полей)
    function applyOrganizationSuggestion(suggestion: OrganizationSuggestion) {
        setForm((prev) => ({
            ...prev,
            organizationInn: suggestion.inn,
            organizationType: suggestion.type,
            organizationFullName: suggestion.fullName || prev.organizationFullName,
            organizationShortName: suggestion.shortName || prev.organizationShortName,
            organizationKpp: suggestion.kpp,
            organizationFullAddress: suggestion.legalAddress || prev.organizationFullAddress,
        }));
        // 👇 Сохраняем структуру адреса отдельно
        setSelectedAddressStructure(suggestion.addressStructure);

        setOrganizationSuggestions([]);
        setInnLookupError(null);
    }

    useEffect(() => {
        const inn = form.organizationInn.replace(/\D/g, '');

        if (inn !== form.organizationInn) {
            setForm((prev) => ({ ...prev, organizationInn: inn }));
            return;
        }

        if (inn.length < 3) {
            setIsInnLookupLoading(false);
            setInnLookupError(null);
            setOrganizationSuggestions([]);
            return;
        }

        const controller = new AbortController();
        const timeoutId = window.setTimeout(async () => {
            setIsInnLookupLoading(true);
            setInnLookupError(null);

            try {
                const response = await fetch(`/api/dadata/party?inn=${inn}`, {
                    method: 'GET',
                    signal: controller.signal,
                    cache: 'no-store',
                });

                const payload = (await response.json().catch(() => null)) as {
                    error?: string;
                    organizations?: OrganizationSuggestion[];
                } | null;

                if (!response.ok) {
                    throw new Error(payload?.error ?? 'Не удалось получить данные организации');
                }

                const suggestions = payload?.organizations ?? [];
                setOrganizationSuggestions(suggestions);

                if (suggestions.length === 0) {
                    setInnLookupError('Организация с таким ИНН не найдена');
                    return;
                }

                const exactMatch = suggestions.find((item) => item.inn === inn);

                if (exactMatch) {
                    applyOrganizationSuggestion(exactMatch);
                }
            } catch (lookupError) {
                if (controller.signal.aborted) {
                    return;
                }

                setOrganizationSuggestions([]);
                const message =
                    lookupError instanceof Error
                        ? lookupError.message
                        : 'Не удалось получить данные организации';
                setInnLookupError(message);
            } finally {
                if (!controller.signal.aborted) {
                    setIsInnLookupLoading(false);
                }
            }
        }, 500);

        return () => {
            controller.abort();
            window.clearTimeout(timeoutId);
        };
    }, [form.organizationInn]);

    // Отправка формы (функция на кнопке)
    async function onSubmit(event: React.SubmitEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: form.email,
                password: form.password,
                firstName: form.firstName,
                lastName: form.lastName,
                organizationFullName: form.organizationFullName,
                organizationShortName: form.organizationShortName || undefined,
                organizationType: form.organizationType,
                organizationInn: form.organizationInn,
                organizationKpp: form.organizationKpp || undefined,
                organizationFullAddress: form.organizationFullAddress,
                phone: form.phone || undefined,
                addressStructure: selectedAddressStructure,
            }),
        });

        if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;
            setError(payload?.error ?? 'Не удалось зарегистрироваться');
            setIsLoading(false);
            return;
        }

        const result = await signIn('credentials', {
            email: form.email,
            password: form.password,
            redirect: false,
            callbackUrl,
        });

        setIsLoading(false);

        if (!result || result.error) {
            setError('Регистрация успешна, но вход не выполнен. Попробуйте войти вручную.');
            return;
        }

        setIsSuccessModalOpen(true);
    }

    return (
        <div className="relative container mx-auto space-y-8 px-5">
            <div className="w-full bg-white py-12 dark:bg-black">
                <div className="mx-auto flex w-full flex-col gap-4 rounded-2xl border border-border bg-white p-10 shadow-shadow-main dark:bg-black">
                    <h2 className="text-black dark:text-white">Регистрация</h2>
                    <div className="mt-5 font-semibold">Укажите данные юридического лица</div>
                    <Separator />

                    <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
                        <label className="block">
                            <span className="text-sm text-black dark:text-white">ИНН</span>
                            <input
                                type="text"
                                required
                                value={form.organizationInn}
                                onChange={(event) =>
                                    updateField('organizationInn', event.target.value)
                                }
                                inputMode="numeric"
                                maxLength={12}
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="7701234567"
                            />
                            {organizationSuggestions.length > 0 && (
                                <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white shadow-sm dark:bg-black">
                                    {organizationSuggestions.map((suggestion) => (
                                        <button
                                            key={`${suggestion.inn}-${suggestion.kpp}`}
                                            type="button"
                                            onClick={() => applyOrganizationSuggestion(suggestion)}
                                            className="block w-full border-b border-border px-3 py-2 text-left last:border-b-0 hover:bg-muted/40"
                                        >
                                            <span className="block text-sm text-black dark:text-white">
                                                {suggestion.shortName || suggestion.fullName}
                                            </span>
                                            <span className="mt-1 block text-xs text-dark-grey">
                                                ИНН {suggestion.inn}
                                                {suggestion.kpp ? ` / КПП ${suggestion.kpp}` : ''}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                            <span className="mt-2 block text-xs text-dark-grey">
                                {isInnLookupLoading
                                    ? 'Ищем организацию по ИНН...'
                                    : (innLookupError ??
                                      'Введите ИНН, и мы автоматически заполним реквизиты организации')}
                            </span>
                        </label>

                        <label className="block">
                            <span className="text-sm text-black dark:text-white">КПП</span>
                            <input
                                type="text"
                                value={form.organizationKpp}
                                onChange={(event) =>
                                    updateField('organizationKpp', event.target.value)
                                }
                                inputMode="numeric"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="770101001"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm text-black dark:text-white">
                                Тип организации
                            </span>
                            <select
                                required
                                value={form.organizationType}
                                onChange={(event) =>
                                    updateField(
                                        'organizationType',
                                        event.target.value as OrganizationType,
                                    )
                                }
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                            >
                                {organizationTypeOptions.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="block sm:col-span-2">
                            <span className="text-sm text-black dark:text-white">
                                Полное наименование организации
                            </span>
                            <input
                                type="text"
                                required
                                value={form.organizationFullName}
                                onChange={(event) =>
                                    updateField('organizationFullName', event.target.value)
                                }
                                autoComplete="organization"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="ООО Ромашка"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm text-black dark:text-white">
                                Короткое название
                            </span>
                            <input
                                type="text"
                                value={form.organizationShortName}
                                onChange={(event) =>
                                    updateField('organizationShortName', event.target.value)
                                }
                                autoComplete="organization"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="Ромашка"
                            />
                        </label>

                        <label className="block sm:col-span-2">
                            <span className="text-sm text-black dark:text-white">
                                Юридический адрес
                            </span>
                            <input
                                type="text"
                                required
                                value={form.organizationFullAddress}
                                onChange={(event) =>
                                    updateField('organizationFullAddress', event.target.value)
                                }
                                autoComplete="address-line1"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="г. Москва, ул. Тверская, д. 1"
                            />
                        </label>

                        <div className="mt-5 flex flex-col gap-4 sm:col-span-2">
                            <div className="font-semibold">Укажите данные контактного лица</div>
                            <Separator />
                        </div>

                        <label className="block">
                            <span className="text-sm text-black dark:text-white">Имя</span>
                            <input
                                type="text"
                                required
                                value={form.firstName}
                                onChange={(event) => updateField('firstName', event.target.value)}
                                autoComplete="given-name"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="Иван"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm text-black dark:text-white">Фамилия</span>
                            <input
                                type="text"
                                required
                                value={form.lastName}
                                onChange={(event) => updateField('lastName', event.target.value)}
                                autoComplete="family-name"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="Иванов"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm text-black dark:text-white">Email</span>
                            <input
                                type="email"
                                required
                                value={form.email}
                                onChange={(event) => updateField('email', event.target.value)}
                                autoComplete="email"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="email@company.ru"
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm text-black dark:text-white">Телефон</span>
                            <input
                                type="tel"
                                value={form.phone}
                                onChange={(event) => updateField('phone', event.target.value)}
                                autoComplete="tel"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="+7 999 123-45-67"
                            />
                        </label>

                        <label className="block sm:col-span-2">
                            <span className="text-sm text-black dark:text-white">Пароль</span>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={form.password}
                                onChange={(event) => updateField('password', event.target.value)}
                                autoComplete="new-password"
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                                placeholder="Минимум 8 символов"
                            />
                            <span className="mt-2 block text-xs text-dark-grey">
                                {innLookupError ??
                                    'Придумайте пароль, минимальное количество символов 8'}
                            </span>
                        </label>

                        {error && <p className="text-sm text-red-600 sm:col-span-2">{error}</p>}

                        <div className="space-y-3 sm:col-span-2">
                            <label className="flex items-start gap-3 text-sm text-black dark:text-white">
                                <Checkbox
                                    checked={isPrivacyPolicyAccepted}
                                    onCheckedChange={(checked) =>
                                        setIsPrivacyPolicyAccepted(checked === true)
                                    }
                                    className="mt-0.5"
                                />
                                <span>
                                    Я принимаю{' '}
                                    <Link
                                        className="font-semibold text-accent"
                                        href="/about/legal/privacy-policy"
                                    >
                                        политику конфиденциальности
                                    </Link>
                                </span>
                            </label>

                            <label className="flex items-start gap-3 text-sm text-black dark:text-white">
                                <Checkbox
                                    checked={isPersonalDataAccepted}
                                    onCheckedChange={(checked) =>
                                        setIsPersonalDataAccepted(checked === true)
                                    }
                                    className="mt-0.5"
                                />
                                <span>
                                    Я даю{' '}
                                    <Link
                                        className="font-semibold text-accent"
                                        href="/about/legal/personal-data-consent"
                                    >
                                        согласие на обработку персональных данных
                                    </Link>
                                </span>
                            </label>
                        </div>

                        <Button
                            type="submit"
                            disabled={isLoading || !isFormComplete}
                            variant="default"
                            size="default"
                            className="text-sm sm:col-span-2"
                        >
                            {isLoading ? 'Создаем аккаунт...' : 'Зарегистрироваться'}
                        </Button>
                    </form>

                    <p className="mt-6 text-sm text-dark-grey">
                        Уже есть аккаунт?{' '}
                        <Link
                            className="font-semibold text-accent"
                            href={`/auth/login?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                        >
                            Войти
                        </Link>
                    </p>
                </div>
            </div>

            {isSuccessModalOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="register-success-title"
                >
                    <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="register-success-title"
                                    className="text-xl font-semibold text-black"
                                >
                                    Регистрация
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    Регистрация прошла успешна
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={handleSuccessModalClose}
                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-grey hover:text-black"
                                aria-label="Закрыть окно успешной регистрации"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <Button
                                type="button"
                                variant="default"
                                size="default"
                                onClick={handleSuccessModalClose}
                                className="w-full sm:w-auto"
                            >
                                Продолжить
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}

export default function RegisterPage() {
    return (
        <Suspense fallback={null}>
            <RegisterForm />
        </Suspense>
    );
}
