'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Boxes, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField, Metric, SectionTitle, inputClassName } from '../admin-ui';
import type { AdminBrand } from '../types';

type BrandsTabProps = {
    brands: AdminBrand[];
};

export function BrandsTab({ brands }: BrandsTabProps) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingBrand, setEditingBrand] = useState<AdminBrand | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<AdminBrand | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const usedBrands = brands.filter((brand) => brand._count.products > 0).length;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch(
                editingBrand ? `/api/admin/brands/${editingBrand.id}` : '/api/admin/brands',
                {
                    method: editingBrand ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: formData.get('name'),
                        slug: formData.get('slug'),
                        country: formData.get('country'),
                    }),
                },
            );
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setMessage({
                    type: 'error',
                    text:
                        result.error ||
                        (editingBrand
                            ? 'Не удалось обновить бренд.'
                            : 'Не удалось добавить бренд.'),
                });
                return;
            }

            form.reset();
            setEditingBrand(null);
            setMessage({
                type: 'success',
                text: editingBrand ? 'Бренд обновлен.' : 'Бренд добавлен.',
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

    async function handleDeleteBrand() {
        if (!deleteCandidate) return;

        setIsDeleting(true);
        setMessage(null);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/admin/brands/${deleteCandidate.id}`, {
                method: 'DELETE',
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setDeleteError(result.error || 'Не удалось удалить бренд.');
                return;
            }

            if (editingBrand?.id === deleteCandidate.id) {
                setEditingBrand(null);
            }
            setDeleteCandidate(null);
            setMessage({ type: 'success', text: 'Бренд удален.' });
            router.refresh();
        } catch {
            setDeleteError('Не удалось удалить бренд. Проверьте соединение и повторите попытку.');
        } finally {
            setIsDeleting(false);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title="Бренды"
                description="Справочник брендов для карточек товаров, фильтрации и путей загрузки медиа."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Metric icon={Tags} label="Всего брендов" value={brands.length.toString()} />
                <Metric icon={Boxes} label="С товарами" value={usedBrands.toString()} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                        <thead className="bg-grey text-xs uppercase tracking-[0.12em] text-dark-grey">
                            <tr>
                                <th className="px-4 py-3 font-medium">Бренд</th>
                                <th className="px-4 py-3 font-medium">Страна</th>
                                <th className="px-4 py-3 font-medium">Товары</th>
                            </tr>
                        </thead>
                        <tbody>
                            {brands.map((brand) => (
                                <tr
                                    key={brand.id}
                                    className="group border-t border-border align-top transition-colors hover:bg-grey/20"
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-black">{brand.name}</p>
                                                <p className="mt-1 text-xs text-dark-grey">{brand.slug}</p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingBrand(brand);
                                                        setMessage(null);
                                                    }}
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-accent/10 hover:text-accent"
                                                    aria-label={`Редактировать бренд ${brand.name}`}
                                                    title="Редактировать"
                                                >
                                                    <Pencil className="size-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeleteCandidate(brand);
                                                        setDeleteError(null);
                                                    }}
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-red-50 hover:text-red-600"
                                                    aria-label={`Удалить бренд ${brand.name}`}
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        {editingBrand?.id === brand.id ? (
                                            <p className="mt-2 text-xs font-medium text-accent">Редактируется</p>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">
                                        {brand.country || 'Не указана'}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">{brand._count.products}</td>
                                </tr>
                            ))}
                            {brands.length === 0 ? (
                                <tr>
                                    <td
                                        className="px-4 py-8 text-center text-sm text-dark-grey"
                                        colSpan={3}
                                    >
                                        Бренды пока не добавлены.
                                    </td>
                                </tr>
                            ) : null}
                        </tbody>
                    </table>
                </div>

                <form
                    key={editingBrand?.id ?? 'new-brand'}
                    className="rounded-3xl bg-grey/20 p-5"
                    onSubmit={handleSubmit}
                >
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold text-black">
                            {editingBrand ? 'Редактировать бренд' : 'Новый бренд'}
                        </h2>
                        {editingBrand ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingBrand(null);
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
                                placeholder="Anneng"
                                defaultValue={editingBrand?.name ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Slug">
                            <input
                                className={inputClassName}
                                name="slug"
                                placeholder="anneng"
                                defaultValue={editingBrand?.slug ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Страна">
                            <input
                                className={inputClassName}
                                name="country"
                                placeholder="China"
                                defaultValue={editingBrand?.country ?? ''}
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
                            {editingBrand ? (
                                <Pencil className="size-4" aria-hidden="true" />
                            ) : (
                                <Plus className="size-4" aria-hidden="true" />
                            )}
                            {isSubmitting
                                ? editingBrand
                                    ? 'Сохранение...'
                                    : 'Добавление...'
                                : editingBrand
                                  ? 'Сохранить бренд'
                                  : 'Добавить бренд'}
                        </button>
                    </div>
                </form>
            </div>

            {deleteCandidate ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-brand-title"
                >
                    <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 id="delete-brand-title" className="text-xl font-semibold text-black">
                                    Удаление бренда
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    Вы уверены, что хотите удалить этот бренд? В товарах он будет очищен.
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
                                onClick={handleDeleteBrand}
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
