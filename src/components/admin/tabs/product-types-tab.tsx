'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField, SectionTitle, inputClassName } from '../admin-ui';
import type { AdminProductType } from '../types';

export function ProductTypesTab({ productTypes }: { productTypes: AdminProductType[] }) {
    const router = useRouter();
    const [editing, setEditing] = useState<AdminProductType | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [busy, setBusy] = useState(false);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);
        setBusy(true); setMessage(null);
        const response = await fetch(editing ? `/api/admin/product-types/${editing.id}` : '/api/admin/product-types', {
            method: editing ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: data.get('code'), name: data.get('name'), sortOrder: data.get('sortOrder'), isActive: data.get('isActive') === 'on' }),
        });
        const result = await response.json() as { error?: string };
        setBusy(false);
        if (!response.ok) return setMessage({ type: 'error', text: result.error || 'Не удалось сохранить тип.' });
        setEditing(null); form.reset(); setMessage({ type: 'success', text: 'Тип товара сохранён.' }); router.refresh();
    }

    async function remove(type: AdminProductType) {
        if (!window.confirm(`Удалить тип «${type.name}»?`)) return;
        const response = await fetch(`/api/admin/product-types/${type.id}`, { method: 'DELETE' });
        const result = await response.json() as { error?: string };
        if (!response.ok) return setMessage({ type: 'error', text: result.error || 'Не удалось удалить тип.' });
        setMessage({ type: 'success', text: 'Тип удалён.' }); router.refresh();
    }

    return <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
        <SectionTitle title="Типы товаров" description="Справочник типов товаров. Записи можно создавать вручную или загружать при импорте." />
        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-2">
                {productTypes.map((type) => <div key={type.id} className="flex items-center justify-between gap-4 rounded-xl border border-grey/80 p-4">
                    <div><div className="flex items-center gap-2 font-semibold">{type.name}</div><p className="mt-1 text-xs text-dark-grey">{type.code} · {type._count.products} товаров · {type.isActive ? 'активен' : 'отключён'}</p></div>
                    <div className="flex gap-2"><button type="button" title="Редактировать" onClick={() => setEditing(type)}><Pencil className="size-4" /></button><button type="button" title="Удалить" onClick={() => void remove(type)}><Trash2 className="size-4 text-red-600" /></button></div>
                </div>)}
            </div>
            <form key={editing?.id ?? 'new'} onSubmit={submit} className="rounded-3xl bg-grey/20 p-5">
                <h2 className="text-lg font-semibold">{editing ? 'Редактировать тип' : 'Новый тип'}</h2>
                <div className="mt-4 space-y-4">
                    <FormField label="Название"><input className={inputClassName} name="name" defaultValue={editing?.name ?? ''} required /></FormField>
                    <FormField label="Код"><input className={inputClassName} name="code" defaultValue={editing?.code ?? ''} placeholder="SIGNAL_INDICATOR" required /></FormField>
                    <FormField label="Порядок"><input className={inputClassName} type="number" min="0" name="sortOrder" defaultValue={editing?.sortOrder ?? 0} /></FormField>
                    <label className="flex gap-2 rounded-lg bg-white p-3 text-sm"><input type="checkbox" name="isActive" defaultChecked={editing?.isActive ?? true} /> Активен</label>
                    {message ? <p className={cn('rounded-lg p-3 text-sm', message.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700')}>{message.text}</p> : null}
                    <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 font-semibold text-white"><Plus className="size-4" />{busy ? 'Сохранение...' : 'Сохранить'}</button>
                    {editing ? <button type="button" className="w-full text-sm text-dark-grey" onClick={() => setEditing(null)}>Отменить редактирование</button> : null}
                </div>
            </form>
        </div>
    </section>;
}
