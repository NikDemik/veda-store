'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Boxes, Layers3, Pencil, Plus, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField, Metric, SectionTitle, inputClassName } from '../admin-ui';
import type { AdminSeries } from '../types';

type SeriesTabProps = {
    series: AdminSeries[];
};

export function SeriesTab({ series }: SeriesTabProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingSeries, setEditingSeries] = useState<AdminSeries | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<AdminSeries | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const usedSeries = series.filter((item) => item._count.products > 0).length;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch(
                editingSeries ? `/api/admin/series/${editingSeries.id}` : '/api/admin/series',
                {
                    method: editingSeries ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: formData.get('name'),
                        slug: formData.get('slug'),
                        description: formData.get('description'),
                    }),
                },
            );
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setMessage({
                    type: 'error',
                    text:
                        result.error ||
                        (editingSeries ? 'Не удалось обновить серию.' : 'Не удалось добавить серию.'),
                });
                return;
            }

            form.reset();
            setEditingSeries(null);
            setMessage({
                type: 'success',
                text: editingSeries ? 'Серия обновлена.' : 'Серия добавлена.',
            });
            router.refresh();
        } catch {
            setMessage({
                type: 'error',
                text: 'Не удалось отправить форму. Проверьте соединение и повторите попытку.',
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleDeleteSeries() {
        if (!deleteCandidate) return;

        setIsDeleting(true);
        setMessage(null);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/admin/series/${deleteCandidate.id}`, {
                method: 'DELETE',
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setDeleteError(result.error || 'Не удалось удалить серию.');
                return;
            }

            if (editingSeries?.id === deleteCandidate.id) {
                setEditingSeries(null);
            }
            setDeleteCandidate(null);
            setMessage({ type: 'success', text: 'Серия удалена.' });
            router.refresh();
        } catch {
            setDeleteError('Не удалось удалить серию. Проверьте соединение и повторите попытку.');
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title="Серии товаров"
                description="Список серий каталога и форма добавления новой серии товаров."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Metric icon={Layers3} label="Всего серий" value={series.length.toString()} />
                <Metric icon={Boxes} label="С товарами" value={usedSeries.toString()} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                        <thead className="bg-grey text-xs uppercase tracking-[0.12em] text-dark-grey">
                            <tr>
                                <th className="px-4 py-3 font-medium">Серия</th>
                                <th className="px-4 py-3 font-medium">Описание</th>
                                <th className="px-4 py-3 font-medium">Товары</th>
                            </tr>
                        </thead>
                        <tbody>
                            {series.map((item) => (
                                <tr
                                    key={item.id}
                                    className="group border-t border-border align-top transition-colors hover:bg-grey/20"
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-black">{item.name}</p>
                                                <p className="mt-1 text-xs text-dark-grey">{item.slug}</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingSeries(item);
                                                        setMessage(null);
                                                    }}
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-accent/10 hover:text-accent"
                                                    aria-label={`Редактировать серию ${item.name}`}
                                                    title="Редактировать"
                                                >
                                                    <Pencil className="size-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeleteCandidate(item);
                                                        setDeleteError(null);
                                                    }}
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-red-50 hover:text-red-600"
                                                    aria-label={`Удалить серию ${item.name}`}
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        {editingSeries?.id === item.id ? (
                                            <p className="mt-2 text-xs font-medium text-accent">Редактируется</p>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">
                                        {item.description || 'Без описания'}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">{item._count.products}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <form
                    key={editingSeries?.id ?? 'new-series'}
                    className="rounded-3xl bg-grey/20 p-5"
                    onSubmit={handleSubmit}
                >
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold text-black">
                            {editingSeries ? 'Редактировать серию' : 'Новая серия'}
                        </h2>
                        {editingSeries ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingSeries(null);
                                    setMessage(null);
                                }}
                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-white hover:text-black"
                                aria-label="Отменить редактирование"
                                title="Отменить"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        ) : null}
                    </div>
                    <div className="mt-4 space-y-4">
                        <FormField label="Название">
                            <input
                                className={inputClassName}
                                name="name"
                                placeholder="Название серии"
                                defaultValue={editingSeries?.name ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Slug">
                            <input
                                className={inputClassName}
                                name="slug"
                                placeholder="slug-serii"
                                defaultValue={editingSeries?.slug ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Описание">
                            <textarea
                                className={cn(inputClassName, 'min-h-24 resize-y')}
                                name="description"
                                placeholder="Краткое описание серии"
                                defaultValue={editingSeries?.description ?? ''}
                            />
                        </FormField>
                        {message ? (
                            <p
                                className={cn(
                                    'rounded-[8px] px-3 py-2 text-sm',
                                    message.type === 'success'
                                        ? 'bg-green-50 text-green-700'
                                        : 'bg-red-50 text-red-700',
                                )}
                            >
                                {message.text}
                            </p>
                        ) : null}
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {editingSeries ? (
                                <Pencil className="size-4" aria-hidden="true" />
                            ) : (
                                <Plus className="size-4" aria-hidden="true" />
                            )}
                            {isSubmitting
                                ? editingSeries
                                    ? 'Сохранение...'
                                    : 'Добавление...'
                                : editingSeries
                                  ? 'Сохранить серию'
                                  : 'Добавить серию'}
                        </button>
                    </div>
                </form>
            </div>

            {deleteCandidate ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-series-title"
                >
                    <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 id="delete-series-title" className="text-xl font-semibold text-black">
                                    Удаление серии
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    Вы уверены что хотите удалить эту серию?
                                </p>
                                <p className="mt-2 text-sm font-medium text-black">
                                    {deleteCandidate.name}
                                </p>
                                {deleteError ? (
                                    <p className="mt-4 rounded-[8px] bg-red-50 px-3 py-2 text-sm text-red-700">
                                        {deleteError}
                                    </p>
                                ) : null}
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteCandidate(null);
                                    setDeleteError(null);
                                }}
                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-grey hover:text-black"
                                aria-label="Закрыть окно удаления"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => {
                                    setDeleteCandidate(null);
                                    setDeleteError(null);
                                }}
                                disabled={isDeleting}
                                className="inline-flex items-center justify-center rounded-[8px] border border-grey/80 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-grey disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleDeleteSeries}
                                disabled={isDeleting}
                                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-red-600 px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Trash2 className="size-4" aria-hidden="true" />
                                {isDeleting ? 'Удаление...' : 'Удалить'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}
