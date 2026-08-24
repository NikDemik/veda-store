'use client';

import { useState } from 'react';
import { formatDate } from '../admin-format';
import { SectionTitle, StatusBadge, inputClassName } from '../admin-ui';
import type { AdminContactLead, LeadStatus } from '../types';

type ContactLeadsTabProps = {
    contactLeads: AdminContactLead[];
    labels: Record<LeadStatus, string>;
};

const leadStatusOptions: LeadStatus[] = ['NEW', 'IN_PROGRESS', 'COMPLETED'];

function getLeadStatusTone(status: LeadStatus) {
    if (status === 'NEW') return 'border-blue-100 bg-blue-50 text-blue-700';
    if (status === 'IN_PROGRESS') return 'border-amber-100 bg-amber-50 text-amber-700';

    return 'border-green-100 bg-green-50 text-green-700';
}

export function ContactLeadsTab({ contactLeads, labels }: ContactLeadsTabProps) {
    const [items, setItems] = useState(contactLeads);
    const [savingLeadId, setSavingLeadId] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    async function updateLeadStatus(lead: AdminContactLead, status: LeadStatus) {
        if (savingLeadId === lead.id || lead.status === status) return;

        setSavingLeadId(lead.id);
        setError(null);

        try {
            const response = await fetch(`/api/admin/contact-leads/${lead.id}/status`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status }),
            });
            const result = (await response.json()) as {
                error?: string;
                lead?: Pick<AdminContactLead, 'id' | 'status'>;
            };

            if (!response.ok || !result.lead) {
                setError(result.error || 'Не удалось обновить статус заявки.');
                return;
            }

            setItems((currentItems) =>
                currentItems.map((item) =>
                    item.id === result.lead?.id ? { ...item, status: result.lead.status } : item,
                ),
            );
        } catch {
            setError('Не удалось обновить статус заявки. Проверьте соединение и повторите попытку.');
        } finally {
            setSavingLeadId(null);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title="Заявки"
                description="Обращения из форм обратной связи с контактами клиента и статусом обработки."
            />

            {error ? (
                <div className="mt-4 rounded-[8px] border border-[#f3b9b9] bg-[#fde6e6] px-4 py-3 text-sm text-[#a12b2b]">
                    {error}
                </div>
            ) : null}

            <div className="mt-6 overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                    <thead>
                        <tr className="text-xs uppercase tracking-[0.12em] text-dark-grey">
                            <th className="px-4 py-3 font-medium">Клиент</th>
                            <th className="px-4 py-3 font-medium">Контакты</th>
                            <th className="px-4 py-3 font-medium">Сообщение</th>
                            <th className="px-4 py-3 font-medium">Статус</th>
                            <th className="px-4 py-3 font-medium">Источник</th>
                            <th className="px-4 py-3 font-medium">Создана</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((lead) => (
                            <tr key={lead.id} className="border-t border-border align-top">
                                <td className="px-4 py-4">
                                    <p className="font-semibold text-black">{lead.name}</p>
                                    <p className="mt-1 text-xs text-dark-grey">ID {lead.id}</p>
                                    <p className="mt-2 text-xs text-dark-grey">
                                        Согласие: {lead.consent ? 'получено' : 'нет'}
                                    </p>
                                </td>
                                <td className="px-4 py-4 text-dark-grey">
                                    <a className="block text-black hover:text-accent" href={`tel:${lead.phone}`}>
                                        {lead.phone}
                                    </a>
                                    <a className="mt-1 block hover:text-accent" href={`mailto:${lead.email}`}>
                                        {lead.email}
                                    </a>
                                </td>
                                <td className="max-w-[320px] px-4 py-4 text-dark-grey">
                                    {lead.message || 'Без сообщения'}
                                </td>
                                <td className="px-4 py-4">
                                    <div className="space-y-2">
                                        <select
                                            className={`${inputClassName} py-2 ${getLeadStatusTone(lead.status)}`}
                                            value={lead.status}
                                            disabled={savingLeadId === lead.id}
                                            onChange={(event) =>
                                                updateLeadStatus(lead, event.target.value as LeadStatus)
                                            }
                                        >
                                            {leadStatusOptions.map((status) => (
                                                <option key={status} value={status}>
                                                    {labels[status]}
                                                </option>
                                            ))}
                                        </select>
                                        {savingLeadId === lead.id ? (
                                            <span className="text-xs text-dark-grey">Сохранение...</span>
                                        ) : (
                                            <StatusBadge>{labels[lead.status]}</StatusBadge>
                                        )}
                                    </div>
                                </td>
                                <td className="px-4 py-4 text-dark-grey">{lead.source}</td>
                                <td className="px-4 py-4 text-dark-grey">{formatDate(lead.createdAt)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {items.length === 0 ? (
                <div className="mt-6 rounded-3xl border border-dashed border-grey/80 p-6 text-sm text-dark-grey">
                    Заявок пока нет.
                </div>
            ) : null}
        </section>
    );
}
