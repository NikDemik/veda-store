'use client';

import { Search, ShieldCheck } from 'lucide-react';
import { FormEvent, useState } from 'react';

import { inputClassName } from './admin-ui';

type ConsentLog = {
    id: number;
    eventId: string;
    action: 'accept-all' | 'decline' | 'custom';
    necessary: boolean;
    functional: boolean;
    analytical: boolean;
    marketing: boolean;
    policyVersion: string;
    consentedAt: string;
};

const actionLabels: Record<ConsentLog['action'], string> = {
    'accept-all': 'Приняты все',
    decline: 'Только необходимые',
    custom: 'Индивидуальные настройки',
};

const categoryLabels: Array<[keyof Pick<
    ConsentLog,
    'necessary' | 'functional' | 'analytical' | 'marketing'
>, string]> = [
    ['necessary', 'Необходимые'],
    ['functional', 'Функциональные'],
    ['analytical', 'Аналитические'],
    ['marketing', 'Маркетинговые'],
];

export function CookieConsentLookup() {
    const [logs, setLogs] = useState<ConsentLog[] | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);

        setIsLoading(true);
        setError(null);
        setLogs(null);

        try {
            const response = await fetch('/api/admin/cookie-consents/lookup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ip: formData.get('ip') }),
            });
            const result = (await response.json()) as { error?: string; logs?: ConsentLog[] };

            if (!response.ok) {
                setError(result.error || 'Не удалось выполнить проверку.');
                return;
            }

            setLogs(result.logs ?? []);
        } catch {
            setError('Не удалось выполнить запрос. Проверьте соединение и повторите попытку.');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <div className="mt-6 space-y-6">
            <div className="rounded-3xl border border-grey/80 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                    <span className="rounded-xl bg-accent/10 p-2.5 text-dark-accent">
                        <ShieldCheck className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                        <h2 className="text-lg font-semibold text-black">Проверка согласия по IP</h2>
                        <p className="mt-1 max-w-3xl text-sm leading-6 text-dark-grey">
                            Введите предполагаемый IP-адрес. Адрес нормализуется и хэшируется на
                            сервере; исходное значение не сохраняется в базе данных.
                        </p>
                    </div>
                </div>

                <form className="mt-5 flex flex-col gap-3 sm:flex-row" onSubmit={handleSubmit}>
                    <label className="min-w-0 flex-1">
                        <span className="sr-only">IPv4- или IPv6-адрес</span>
                        <input
                            className={inputClassName}
                            name="ip"
                            placeholder="Например, 203.0.113.10 или 2001:db8::1"
                            autoComplete="off"
                            spellCheck={false}
                            required
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                    >
                        <Search className="size-4" aria-hidden="true" />
                        {isLoading ? 'Проверка...' : 'Найти согласия'}
                    </button>
                </form>

                {error ? (
                    <p role="alert" className="mt-4 rounded-[8px] bg-red-50 px-4 py-3 text-sm text-red-700">
                        {error}
                    </p>
                ) : null}
            </div>

            {logs !== null ? (
                <div>
                    <h2 className="text-lg font-semibold text-black">
                        {logs.length > 0
                            ? `Найдено событий: ${logs.length}`
                            : 'События согласия не найдены'}
                    </h2>
                    {logs.length > 0 ? (
                        <div className="mt-4 overflow-x-auto rounded-2xl border border-grey/80">
                            <table className="w-full min-w-[760px] text-left text-sm">
                                <thead className="bg-grey/40 text-dark-grey">
                                    <tr>
                                        <th className="px-4 py-3 font-semibold">Дата и время</th>
                                        <th className="px-4 py-3 font-semibold">Действие</th>
                                        <th className="px-4 py-3 font-semibold">Категории</th>
                                        <th className="px-4 py-3 font-semibold">Версия</th>
                                        <th className="px-4 py-3 font-semibold">ID события</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-grey/80">
                                    {logs.map((log) => (
                                        <tr key={log.id}>
                                            <td className="whitespace-nowrap px-4 py-3">
                                                {new Intl.DateTimeFormat('ru-RU', {
                                                    dateStyle: 'medium',
                                                    timeStyle: 'medium',
                                                }).format(new Date(log.consentedAt))}
                                            </td>
                                            <td className="px-4 py-3">{actionLabels[log.action]}</td>
                                            <td className="px-4 py-3">
                                                {categoryLabels
                                                    .filter(([key]) => log[key])
                                                    .map(([, label]) => label)
                                                    .join(', ')}
                                            </td>
                                            <td className="px-4 py-3">{log.policyVersion}</td>
                                            <td className="max-w-52 truncate px-4 py-3 font-mono text-xs" title={log.eventId}>
                                                {log.eventId}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="mt-2 text-sm text-dark-grey">
                            Проверьте адрес и убедитесь, что согласие было записано с текущим
                            секретом хэширования.
                        </p>
                    )}
                </div>
            ) : null}
        </div>
    );
}

