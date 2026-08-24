'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Boxes, Pencil, Plus, Ruler, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField, Metric, SectionTitle, inputClassName } from '../admin-ui';
import type { AdminUnitMeasure } from '../types';

type UnitMeasuresTabProps = {
    unitMeasures: AdminUnitMeasure[];
};

export function UnitMeasuresTab({ unitMeasures }: UnitMeasuresTabProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingUnitMeasure, setEditingUnitMeasure] = useState<AdminUnitMeasure | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<AdminUnitMeasure | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const activeUnitMeasures = unitMeasures.filter((unitMeasure) => unitMeasure.isActive).length;
    const usedUnitMeasures = unitMeasures.filter((unitMeasure) => unitMeasure._count.products > 0).length;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch(
                editingUnitMeasure
                    ? `/api/admin/unit-measures/${editingUnitMeasure.id}`
                    : '/api/admin/unit-measures',
                {
                    method: editingUnitMeasure ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: formData.get('name'),
                        code: formData.get('code'),
                        shortName: formData.get('shortName'),
                        sortOrder: formData.get('sortOrder'),
                        isActive: formData.get('isActive') === 'on',
                    }),
                },
            );
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setMessage({
                    type: 'error',
                    text:
                        result.error ||
                        (editingUnitMeasure
                            ? 'Не удалось обновить единицу измерения.'
                            : 'Не удалось добавить единицу измерения.'),
                });
                return;
            }

            form.reset();
            setEditingUnitMeasure(null);
            setMessage({
                type: 'success',
                text: editingUnitMeasure
                    ? 'Единица измерения обновлена.'
                    : 'Единица измерения добавлена.',
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

    async function handleDeleteUnitMeasure() {
        if (!deleteCandidate) return;

        setIsDeleting(true);
        setMessage(null);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/admin/unit-measures/${deleteCandidate.id}`, {
                method: 'DELETE',
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setDeleteError(result.error || 'Не удалось удалить единицу измерения.');
                return;
            }

            if (editingUnitMeasure?.id === deleteCandidate.id) {
                setEditingUnitMeasure(null);
            }
            setDeleteCandidate(null);
            setMessage({ type: 'success', text: 'Единица измерения удалена.' });
            router.refresh();
        } catch {
            setDeleteError(
                'Не удалось удалить единицу измерения. Проверьте соединение и повторите попытку.',
            );
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title="Единицы измерения"
                description="Справочник единиц для цены, остатков, заказов и публичных карточек товаров."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Metric icon={Ruler} label="Всего единиц" value={unitMeasures.length.toString()} />
                <Metric icon={Ruler} label="Активные" value={activeUnitMeasures.toString()} />
                <Metric icon={Boxes} label="С товарами" value={usedUnitMeasures.toString()} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                        <thead className="bg-grey text-xs uppercase tracking-[0.12em] text-dark-grey">
                            <tr>
                                <th className="px-4 py-3 font-medium">Единица</th>
                                <th className="px-4 py-3 font-medium">Код</th>
                                <th className="px-4 py-3 font-medium">Порядок</th>
                                <th className="px-4 py-3 font-medium">Статус</th>
                                <th className="px-4 py-3 font-medium">Товары</th>
                            </tr>
                        </thead>
                        <tbody>
                            {unitMeasures.map((unitMeasure) => (
                                <tr
                                    key={unitMeasure.id}
                                    className="group border-t border-border align-top transition-colors hover:bg-grey/20"
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-black">
                                                    {unitMeasure.name}
                                                </p>
                                                <p className="mt-1 text-xs text-dark-grey">
                                                    {unitMeasure.shortName}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingUnitMeasure(unitMeasure);
                                                        setMessage(null);
                                                    }}
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-accent/10 hover:text-accent"
                                                    aria-label={`Редактировать единицу ${unitMeasure.name}`}
                                                    title="Редактировать"
                                                >
                                                    <Pencil className="size-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeleteCandidate(unitMeasure);
                                                        setDeleteError(null);
                                                    }}
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-red-50 hover:text-red-600"
                                                    aria-label={`Удалить единицу ${unitMeasure.name}`}
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        {editingUnitMeasure?.id === unitMeasure.id ? (
                                            <p className="mt-2 text-xs font-medium text-accent">Редактируется</p>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">{unitMeasure.code}</td>
                                    <td className="px-4 py-4 text-dark-grey">{unitMeasure.sortOrder}</td>
                                    <td className="px-4 py-4 text-dark-grey">
                                        {unitMeasure.isActive ? 'Активна' : 'Отключена'}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">
                                        {unitMeasure._count.products}
                                    </td>
                                </tr>
                            ))}
                            {unitMeasures.length === 0 ? (
                                <tr>
                                    <td
                                        className="px-4 py-8 text-center text-sm text-dark-grey"
                                        colSpan={5}
                                    >
                                        Единицы измерения пока не добавлены.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                <form
                    key={editingUnitMeasure?.id ?? 'new-unit-measure'}
                    className="rounded-3xl bg-grey/20 p-5"
                    onSubmit={handleSubmit}
                >
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold text-black">
                            {editingUnitMeasure
                                ? 'Редактировать единицу'
                                : 'Новая единица'}
                        </h2>
                        {editingUnitMeasure ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingUnitMeasure(null);
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
                                placeholder="Штука"
                                defaultValue={editingUnitMeasure?.name ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Код">
                            <input
                                className={inputClassName}
                                name="code"
                                placeholder="pcs"
                                defaultValue={editingUnitMeasure?.code ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Краткое обозначение">
                            <input
                                className={inputClassName}
                                name="shortName"
                                placeholder="шт."
                                defaultValue={editingUnitMeasure?.shortName ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Порядок сортировки">
                            <input
                                className={inputClassName}
                                name="sortOrder"
                                placeholder="0"
                                defaultValue={editingUnitMeasure?.sortOrder ?? 0}
                                min="0"
                                step="1"
                                type="number"
                            />
                        </FormField>
                        <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                            <input
                                name="isActive"
                                type="checkbox"
                                defaultChecked={editingUnitMeasure?.isActive ?? true}
                            />
                            Активна
                        </label>
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
                            {editingUnitMeasure ? (
                                <Pencil className="size-4" aria-hidden="true" />
                            ) : (
                                <Plus className="size-4" aria-hidden="true" />
                            )}
                            {isSubmitting
                                ? editingUnitMeasure
                                    ? 'Сохранение...'
                                    : 'Добавление...'
                                : editingUnitMeasure
                                  ? 'Сохранить единицу'
                                  : 'Добавить единицу'}
                        </button>
                    </div>
                </form>
            </div>

            {deleteCandidate ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-unit-measure-title"
                >
                    <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="delete-unit-measure-title"
                                    className="text-xl font-semibold text-black"
                                >
                                    Удаление единицы измерения
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    Вы уверены, что хотите удалить эту единицу измерения?
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
                                onClick={handleDeleteUnitMeasure}
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
