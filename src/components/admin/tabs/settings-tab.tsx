'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Bell, Building2, CheckCircle2, CreditCard, Mail, Pencil, Plus, Save, Send, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField, InfoLine, Metric, SectionTitle, inputClassName } from '../admin-ui';
import { CookieConsentLookup } from '../CookieConsentLookup';
import type { AdminCompanyBankAccount, AdminCompanyProfile, AdminNotificationSetting } from '../types';

type SettingsInnerTab = 'company' | 'bank-accounts' | 'notifications' | 'cookie-consents';

type SettingsTabProps = {
    companyProfile: AdminCompanyProfile | null;
    notificationSetting: AdminNotificationSetting | null;
};

const emptyAccount: AdminCompanyBankAccount | null = null;

export function SettingsTab({ companyProfile, notificationSetting }: SettingsTabProps) {
    const router = useRouter();
    const [activeInnerTab, setActiveInnerTab] = useState<SettingsInnerTab>('company');
    const [editingAccount, setEditingAccount] = useState<AdminCompanyBankAccount | null>(emptyAccount);
    const [isCompanySubmitting, setIsCompanySubmitting] = useState(false);
    const [isAccountSubmitting, setIsAccountSubmitting] = useState(false);
    const [isNotificationSubmitting, setIsNotificationSubmitting] = useState(false);
    const [deletingAccountId, setDeletingAccountId] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const bankAccounts = companyProfile?.bankAccounts ?? [];
    const defaultBankAccount = bankAccounts.find((account) => account.isDefault);
    const isEmailConfigured = Boolean(
        notificationSetting?.smtpHost &&
            notificationSetting.smtpFromEmail &&
            notificationSetting.salesEmail,
    );
    const isTelegramConfigured = Boolean(
        notificationSetting?.telegramBotToken && notificationSetting.telegramChatId,
    );

    async function handleCompanySubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        setIsCompanySubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/company-profile', {
                method: companyProfile ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fullName: formData.get('fullName'),
                    shortName: formData.get('shortName'),
                    inn: formData.get('inn'),
                    kpp: formData.get('kpp'),
                    ogrn: formData.get('ogrn'),
                    legalAddress: formData.get('legalAddress'),
                    actualAddress: formData.get('actualAddress'),
                    postalAddress: formData.get('postalAddress'),
                    email: formData.get('email'),
                    phone: formData.get('phone'),
                    website: formData.get('website'),
                    directorName: formData.get('directorName'),
                    accountantName: formData.get('accountantName'),
                    basis: formData.get('basis'),
                    isActive: formData.get('isActive') === 'on',
                }),
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setMessage({ type: 'error', text: result.error || 'Не удалось сохранить данные компании.' });
                return;
            }

            setMessage({ type: 'success', text: 'Данные компании сохранены.' });
            router.refresh();
        } catch {
            setMessage({ type: 'error', text: 'Не удалось отправить форму. Проверьте соединение и повторите попытку.' });
        } finally {
            setIsCompanySubmitting(false);
        }
    }

    async function handleAccountSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!companyProfile) {
            setMessage({ type: 'error', text: 'Сначала заполните данные компании.' });
            setActiveInnerTab('company');
            return;
        }

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsAccountSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch(
                editingAccount
                    ? `/api/admin/company-bank-accounts/${editingAccount.id}`
                    : '/api/admin/company-bank-accounts',
                {
                    method: editingAccount ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        companyProfileId: companyProfile.id,
                        bankName: formData.get('bankName'),
                        bankAddress: formData.get('bankAddress'),
                        bik: formData.get('bik'),
                        checkingAccount: formData.get('checkingAccount'),
                        correspondentAccount: formData.get('correspondentAccount'),
                        recipientName: formData.get('recipientName'),
                        isDefault: formData.get('isDefault') === 'on',
                        isActive: formData.get('isActive') === 'on',
                    }),
                },
            );
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setMessage({ type: 'error', text: result.error || 'Не удалось сохранить банковские реквизиты.' });
                return;
            }

            form.reset();
            setEditingAccount(null);
            setMessage({ type: 'success', text: 'Банковские реквизиты сохранены.' });
            router.refresh();
        } catch {
            setMessage({ type: 'error', text: 'Не удалось отправить форму. Проверьте соединение и повторите попытку.' });
        } finally {
            setIsAccountSubmitting(false);
        }
    }

    async function handleDeleteAccount(accountId: number) {
        setDeletingAccountId(accountId);
        setMessage(null);

        try {
            const response = await fetch(`/api/admin/company-bank-accounts/${accountId}`, {
                method: 'DELETE',
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setMessage({ type: 'error', text: result.error || 'Не удалось удалить банковские реквизиты.' });
                return;
            }

            if (editingAccount?.id === accountId) {
                setEditingAccount(null);
            }
            setMessage({ type: 'success', text: 'Банковские реквизиты удалены.' });
            router.refresh();
        } catch {
            setMessage({ type: 'error', text: 'Не удалось удалить банковские реквизиты. Проверьте соединение и повторите попытку.' });
        } finally {
            setDeletingAccountId(null);
        }
    }

    async function handleNotificationSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);

        setIsNotificationSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch('/api/admin/notification-settings', {
                method: notificationSetting ? 'PATCH' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    isActive: formData.get('isActive') === 'on',
                    notifyLeadCreated: formData.get('notifyLeadCreated') === 'on',
                    notifyOrderCreated: formData.get('notifyOrderCreated') === 'on',
                    salesEmailEnabled: formData.get('salesEmailEnabled') === 'on',
                    customerEmailEnabled: formData.get('customerEmailEnabled') === 'on',
                    telegramEnabled: formData.get('telegramEnabled') === 'on',
                    salesEmail: formData.get('salesEmail'),
                    smtpHost: formData.get('smtpHost'),
                    smtpPort: Number(formData.get('smtpPort') || 587),
                    smtpSecure: formData.get('smtpSecure') === 'on',
                    smtpUser: formData.get('smtpUser'),
                    smtpPassword: formData.get('smtpPassword'),
                    smtpFromEmail: formData.get('smtpFromEmail'),
                    smtpFromName: formData.get('smtpFromName'),
                    telegramBotToken: formData.get('telegramBotToken'),
                    telegramChatId: formData.get('telegramChatId'),
                }),
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setMessage({ type: 'error', text: result.error || 'Не удалось сохранить настройки уведомлений.' });
                return;
            }

            setMessage({ type: 'success', text: 'Настройки уведомлений сохранены.' });
            router.refresh();
        } catch {
            setMessage({ type: 'error', text: 'Не удалось отправить форму. Проверьте соединение и повторите попытку.' });
        } finally {
            setIsNotificationSubmitting(false);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title="Настройки"
                description="Данные продавца и платежные реквизиты для счетов, закрывающих документов и страниц сайта."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Metric icon={Building2} label="Профиль компании" value={companyProfile ? 'Заполнен' : 'Не заполнен'} />
                <Metric icon={CreditCard} label="Банковские счета" value={bankAccounts.length.toString()} />
                <Metric icon={Bell} label="Уведомления" value={notificationSetting?.isActive ? 'Включены' : 'Отключены'} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2 border-b border-grey/80 pb-3">
                <SettingsTabButton
                    isActive={activeInnerTab === 'company'}
                    onClick={() => setActiveInnerTab('company')}
                >
                    Моя компания
                </SettingsTabButton>
                <SettingsTabButton
                    isActive={activeInnerTab === 'bank-accounts'}
                    onClick={() => setActiveInnerTab('bank-accounts')}
                >
                    Реквизиты
                </SettingsTabButton>
                <SettingsTabButton
                    isActive={activeInnerTab === 'notifications'}
                    onClick={() => setActiveInnerTab('notifications')}
                >
                    Уведомления
                </SettingsTabButton>
                <SettingsTabButton
                    isActive={activeInnerTab === 'cookie-consents'}
                    onClick={() => setActiveInnerTab('cookie-consents')}
                >
                    Согласия cookie
                </SettingsTabButton>
            </div>

            {message ? (
                <p
                    className={cn(
                        'mt-5 rounded-[8px] px-4 py-3 text-sm',
                        message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700',
                    )}
                >
                    {message.text}
                </p>
            ) : null}

            {activeInnerTab === 'company' ? (
                <form className="mt-6 space-y-6" onSubmit={handleCompanySubmit}>
                    <div className="grid gap-4 lg:grid-cols-2">
                        <FormField label="Полное наименование">
                            <input className={inputClassName} name="fullName" defaultValue={companyProfile?.fullName ?? ''} required />
                        </FormField>
                        <FormField label="Краткое наименование">
                            <input className={inputClassName} name="shortName" defaultValue={companyProfile?.shortName ?? ''} />
                        </FormField>
                        <FormField label="ИНН">
                            <input className={inputClassName} name="inn" defaultValue={companyProfile?.inn ?? ''} inputMode="numeric" required />
                        </FormField>
                        <FormField label="КПП">
                            <input className={inputClassName} name="kpp" defaultValue={companyProfile?.kpp ?? ''} inputMode="numeric" />
                        </FormField>
                        <FormField label="ОГРН">
                            <input className={inputClassName} name="ogrn" defaultValue={companyProfile?.ogrn ?? ''} inputMode="numeric" />
                        </FormField>
                        <FormField label="Основание полномочий">
                            <input className={inputClassName} name="basis" defaultValue={companyProfile?.basis ?? ''} placeholder="Устав" />
                        </FormField>
                        <FormField label="Генеральный директор">
                            <input className={inputClassName} name="directorName" defaultValue={companyProfile?.directorName ?? ''} />
                        </FormField>
                        <FormField label="Главный бухгалтер">
                            <input className={inputClassName} name="accountantName" defaultValue={companyProfile?.accountantName ?? ''} />
                        </FormField>
                        <FormField label="Email">
                            <input className={inputClassName} name="email" defaultValue={companyProfile?.email ?? ''} type="email" />
                        </FormField>
                        <FormField label="Телефон">
                            <input className={inputClassName} name="phone" defaultValue={companyProfile?.phone ?? ''} />
                        </FormField>
                        <FormField label="Сайт">
                            <input className={inputClassName} name="website" defaultValue={companyProfile?.website ?? ''} />
                        </FormField>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                        <FormField label="Юридический адрес">
                            <textarea className={cn(inputClassName, 'min-h-28 resize-y')} name="legalAddress" defaultValue={companyProfile?.legalAddress ?? ''} required />
                        </FormField>
                        <FormField label="Фактический адрес">
                            <textarea className={cn(inputClassName, 'min-h-28 resize-y')} name="actualAddress" defaultValue={companyProfile?.actualAddress ?? ''} />
                        </FormField>
                        <FormField label="Почтовый адрес">
                            <textarea className={cn(inputClassName, 'min-h-28 resize-y')} name="postalAddress" defaultValue={companyProfile?.postalAddress ?? ''} />
                        </FormField>
                    </div>

                    <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                        <input name="isActive" type="checkbox" defaultChecked={companyProfile?.isActive ?? true} />
                        Активна
                    </label>

                    <button
                        type="submit"
                        disabled={isCompanySubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save className="size-4" aria-hidden="true" />
                        {isCompanySubmitting ? 'Сохранение...' : 'Сохранить компанию'}
                    </button>
                </form>
            ) : null}

            {activeInnerTab === 'bank-accounts' ? (
                <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
                    <div className="space-y-4">
                        {bankAccounts.map((account) => (
                            <article key={account.id} className="rounded-3xl border border-grey/80 p-5">
                                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                    <div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h2 className="text-lg font-semibold text-black">{account.bankName}</h2>
                                            {account.isDefault ? (
                                                <span className="rounded-[8px] bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
                                                    Основной
                                                </span>
                                            ) : null}
                                            {!account.isActive ? (
                                                <span className="rounded-[8px] bg-grey px-2.5 py-1 text-xs font-medium text-dark-grey">
                                                    Отключен
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="mt-4 grid gap-2 text-sm text-dark-grey sm:grid-cols-2">
                                            <InfoLine label="БИК" value={account.bik} />
                                            <InfoLine label="Р/с" value={account.checkingAccount} />
                                            <InfoLine label="К/с" value={account.correspondentAccount} />
                                            <InfoLine label="Получатель" value={account.recipientName || companyProfile?.shortName || companyProfile?.fullName || 'Не указан'} />
                                        </div>
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setEditingAccount(account);
                                                setMessage(null);
                                            }}
                                            className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-accent/10 hover:text-accent"
                                            aria-label={`Редактировать реквизиты ${account.bankName}`}
                                            title="Редактировать"
                                        >
                                            <Pencil className="size-4" aria-hidden="true" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleDeleteAccount(account.id)}
                                            disabled={deletingAccountId === account.id}
                                            className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                                            aria-label={`Удалить реквизиты ${account.bankName}`}
                                            title="Удалить"
                                        >
                                            <Trash2 className="size-4" aria-hidden="true" />
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                        {bankAccounts.length === 0 ? (
                            <div className="rounded-3xl border border-dashed border-grey/80 p-6 text-sm text-dark-grey">
                                Банковские реквизиты пока не добавлены.
                            </div>
                        ) : null}
                    </div>

                    <form
                        key={editingAccount?.id ?? 'new-bank-account'}
                        className="rounded-3xl bg-grey/20 p-5"
                        onSubmit={handleAccountSubmit}
                    >
                        <div className="flex items-start justify-between gap-3">
                            <h2 className="text-lg font-semibold text-black">
                                {editingAccount ? 'Редактировать реквизиты' : 'Новые реквизиты'}
                            </h2>
                            {editingAccount ? (
                                <button
                                    type="button"
                                    onClick={() => setEditingAccount(null)}
                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-white hover:text-black"
                                    aria-label="Отменить редактирование"
                                    title="Отменить"
                                >
                                    <X className="size-4" aria-hidden="true" />
                                </button>
                            ) : null}
                        </div>

                        <div className="mt-4 space-y-4">
                            <FormField label="Банк">
                                <input className={inputClassName} name="bankName" defaultValue={editingAccount?.bankName ?? ''} required disabled={!companyProfile} />
                            </FormField>
                            <FormField label="Адрес банка">
                                <textarea className={cn(inputClassName, 'min-h-24 resize-y')} name="bankAddress" defaultValue={editingAccount?.bankAddress ?? ''} disabled={!companyProfile} />
                            </FormField>
                            <FormField label="БИК">
                                <input className={inputClassName} name="bik" defaultValue={editingAccount?.bik ?? ''} inputMode="numeric" required disabled={!companyProfile} />
                            </FormField>
                            <FormField label="Расчетный счет">
                                <input className={inputClassName} name="checkingAccount" defaultValue={editingAccount?.checkingAccount ?? ''} inputMode="numeric" required disabled={!companyProfile} />
                            </FormField>
                            <FormField label="Корреспондентский счет">
                                <input className={inputClassName} name="correspondentAccount" defaultValue={editingAccount?.correspondentAccount ?? ''} inputMode="numeric" required disabled={!companyProfile} />
                            </FormField>
                            <FormField label="Получатель">
                                <input className={inputClassName} name="recipientName" defaultValue={editingAccount?.recipientName ?? ''} disabled={!companyProfile} />
                            </FormField>
                            <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                                <input name="isDefault" type="checkbox" defaultChecked={editingAccount?.isDefault ?? bankAccounts.length === 0} disabled={!companyProfile} />
                                Основной счет
                            </label>
                            <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                                <input name="isActive" type="checkbox" defaultChecked={editingAccount?.isActive ?? true} disabled={!companyProfile} />
                                Активен
                            </label>
                            <button
                                type="submit"
                                disabled={isAccountSubmitting || !companyProfile}
                                className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {editingAccount ? <Pencil className="size-4" aria-hidden="true" /> : <Plus className="size-4" aria-hidden="true" />}
                                {isAccountSubmitting ? 'Сохранение...' : editingAccount ? 'Сохранить реквизиты' : 'Добавить реквизиты'}
                            </button>
                        </div>
                    </form>
                </div>
            ) : null}

            {activeInnerTab === 'notifications' ? (
                <form className="mt-6 space-y-6" onSubmit={handleNotificationSubmit}>
                    <div className="grid gap-4 md:grid-cols-3">
                        <Metric icon={Mail} label="SMTP" value={isEmailConfigured ? 'Настроен' : 'Не настроен'} />
                        <Metric icon={Send} label="Telegram" value={isTelegramConfigured ? 'Настроен' : 'Не настроен'} />
                        <Metric
                            icon={CheckCircle2}
                            label="Основной счет"
                            value={defaultBankAccount ? defaultBankAccount.bik : 'Не выбран'}
                        />
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                            <input name="isActive" type="checkbox" defaultChecked={notificationSetting?.isActive ?? true} />
                            Включить уведомления
                        </label>
                        <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                            <input name="notifyLeadCreated" type="checkbox" defaultChecked={notificationSetting?.notifyLeadCreated ?? true} />
                            Уведомлять о новых заявках
                        </label>
                        <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                            <input name="notifyOrderCreated" type="checkbox" defaultChecked={notificationSetting?.notifyOrderCreated ?? true} />
                            Уведомлять о новых заказах
                        </label>
                        <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                            <input name="customerEmailEnabled" type="checkbox" defaultChecked={notificationSetting?.customerEmailEnabled ?? true} />
                            Отправлять подтверждение клиенту
                        </label>
                    </div>

                    <div className="rounded-3xl border border-grey/80 p-5">
                        <h2 className="text-lg font-semibold text-black">Email через SMTP</h2>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black lg:col-span-2">
                                <input name="salesEmailEnabled" type="checkbox" defaultChecked={notificationSetting?.salesEmailEnabled ?? true} />
                                Отправлять письма на почту продаж
                            </label>
                            <FormField label="Почта продаж">
                                <input className={inputClassName} name="salesEmail" defaultValue={notificationSetting?.salesEmail ?? ''} type="email" />
                            </FormField>
                            <FormField label="Email отправителя">
                                <input className={inputClassName} name="smtpFromEmail" defaultValue={notificationSetting?.smtpFromEmail ?? ''} type="email" />
                            </FormField>
                            <FormField label="Имя отправителя">
                                <input className={inputClassName} name="smtpFromName" defaultValue={notificationSetting?.smtpFromName ?? ''} placeholder="Имя отправителя" />
                            </FormField>
                            <FormField label="SMTP host">
                                <input className={inputClassName} name="smtpHost" defaultValue={notificationSetting?.smtpHost ?? ''} placeholder="smtp.example.ru" />
                            </FormField>
                            <FormField label="SMTP port">
                                <input className={inputClassName} name="smtpPort" defaultValue={notificationSetting?.smtpPort ?? 587} inputMode="numeric" type="number" min={1} max={65535} />
                            </FormField>
                            <FormField label="SMTP user">
                                <input className={inputClassName} name="smtpUser" defaultValue={notificationSetting?.smtpUser ?? ''} autoComplete="username" />
                            </FormField>
                            <FormField label="SMTP password">
                                <input className={inputClassName} name="smtpPassword" defaultValue={notificationSetting?.smtpPassword ?? ''} autoComplete="new-password" type="password" />
                            </FormField>
                            <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                                <input name="smtpSecure" type="checkbox" defaultChecked={notificationSetting?.smtpSecure ?? false} />
                                Использовать SSL/TLS
                            </label>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-grey/80 p-5">
                        <h2 className="text-lg font-semibold text-black">Telegram Bot API</h2>
                        <div className="mt-4 grid gap-4 lg:grid-cols-2">
                            <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black lg:col-span-2">
                                <input name="telegramEnabled" type="checkbox" defaultChecked={notificationSetting?.telegramEnabled ?? true} />
                                Отправлять уведомления администратору в Telegram
                            </label>
                            <FormField label="Bot token">
                                <input className={inputClassName} name="telegramBotToken" defaultValue={notificationSetting?.telegramBotToken ?? ''} autoComplete="off" />
                            </FormField>
                            <FormField label="Chat ID">
                                <input className={inputClassName} name="telegramChatId" defaultValue={notificationSetting?.telegramChatId ?? ''} />
                            </FormField>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isNotificationSubmitting}
                        className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Save className="size-4" aria-hidden="true" />
                        {isNotificationSubmitting ? 'Сохранение...' : 'Сохранить уведомления'}
                    </button>
                </form>
            ) : null}

            {activeInnerTab === 'cookie-consents' ? <CookieConsentLookup /> : null}
        </section>
    );
}

function SettingsTabButton({
    isActive,
    onClick,
    children,
}: {
    isActive: boolean;
    onClick: () => void;
    children: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'rounded-[8px] px-4 py-2 text-sm font-semibold transition-colors',
                isActive ? 'bg-accent text-white' : 'bg-grey/50 text-dark-grey hover:bg-grey hover:text-black',
            )}
        >
            {children}
        </button>
    );
}
