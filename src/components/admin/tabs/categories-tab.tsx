'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState, type FormEvent } from 'react';
import { Boxes, FolderTree, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FormField, Metric, SectionTitle, inputClassName } from '../admin-ui';
import type { AdminCategory } from '../types';

type CategoriesTabProps = {
    categories: AdminCategory[];
};

const maxCategoryImageSize = 8 * 1024 * 1024;

export function CategoriesTab({ categories }: CategoriesTabProps) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploadingImage, setIsUploadingImage] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
    const [deleteCandidate, setDeleteCandidate] = useState<AdminCategory | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
        null,
    );
    const rootCategories = categories.filter((category) => category.parentId === null).length;
    const availableParentCategories = editingCategory
        ? categories.filter((category) => category.id !== editingCategory.id)
        : categories;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const form = event.currentTarget;
        const formData = new FormData(form);

        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch(
                editingCategory ? `/api/admin/categories/${editingCategory.id}` : '/api/admin/categories',
                {
                    method: editingCategory ? 'PATCH' : 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        name: formData.get('name'),
                        slug: formData.get('slug'),
                        parentId: formData.get('parentId'),
                        imageUrl: formData.get('imageUrl'),
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
                        (editingCategory
                            ? 'Не удалось обновить категорию.'
                            : 'Не удалось добавить категорию.'),
                });
                return;
            }

            form.reset();
            setEditingCategory(null);
            setMessage({
                type: 'success',
                text: editingCategory ? 'Категория обновлена.' : 'Категория добавлена.',
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

    async function handleDeleteCategory() {
        if (!deleteCandidate) return;

        setIsDeleting(true);
        setMessage(null);
        setDeleteError(null);

        try {
            const response = await fetch(`/api/admin/categories/${deleteCandidate.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                setDeleteError(result.error || 'Не удалось удалить категорию.');
                return;
            }

            if (editingCategory?.id === deleteCandidate.id) {
                setEditingCategory(null);
            }
            setDeleteCandidate(null);
            setMessage({ type: 'success', text: 'Категория удалена.' });
            router.refresh();
        } catch {
            setDeleteError('Не удалось удалить категорию. Проверьте соединение и повторите попытку.');
        } finally {
            setIsDeleting(false);
        }
    }

    async function handleCategoryImageUpload(file: File) {
        const form = formRef.current;

        if (!form) return;

        setIsUploadingImage(true);
        setMessage(null);

        try {
            const validationError = validateCategoryImageFile(file);

            if (validationError) {
                setMessage({ type: 'error', text: validationError });
                return;
            }

            const formData = new FormData(form);
            const categorySlug = getStringFormValue(formData, 'slug');

            if (!categorySlug) {
                setMessage({ type: 'error', text: 'Укажите slug категории перед загрузкой изображения.' });
                return;
            }

            if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(categorySlug)) {
                setMessage({
                    type: 'error',
                    text: 'Slug категории должен содержать латиницу, цифры и дефисы.',
                });
                return;
            }

            const uploadPayload = {
                kind: 'category-image' as const,
                fileName: file.name,
                contentType: file.type,
                size: file.size,
                categorySlug,
            };
            const response = await fetch('/api/admin/storage/presign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(uploadPayload),
            });
            const result = await parseUploadResponse(response);

            if (!response.ok || !result.uploadUrl || !result.url) {
                setMessage({
                    type: 'error',
                    text: result.error || 'Не удалось подготовить загрузку изображения в Object Storage.',
                });
                return;
            }

            try {
                const uploadResponse = await fetch(result.uploadUrl, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': file.type,
                        'Cache-Control': result.cacheControl || 'public, max-age=86400',
                    },
                    body: file,
                });

                if (!uploadResponse.ok) {
                    const errorText = (await uploadResponse.text()).trim();

                    setMessage({
                        type: 'error',
                        text:
                            errorText ||
                            `Object Storage вернул ошибку ${uploadResponse.status} при загрузке изображения.`,
                    });
                    return;
                }
            } catch {
                const fallbackResult = await uploadCategoryImageThroughServer(file, uploadPayload);

                if (!fallbackResult.url) {
                    setMessage({
                        type: 'error',
                        text:
                            fallbackResult.error ||
                            'Не удалось загрузить изображение через сервер после ошибки прямой загрузки.',
                    });
                    return;
                }

                result.url = fallbackResult.url;
            }

            const imageInput = form.querySelector<HTMLInputElement>('input[name="imageUrl"]');

            if (imageInput) {
                imageInput.value = result.url;
                imageInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            setMessage({ type: 'success', text: 'Изображение загружено в Object Storage.' });
        } catch (error) {
            setMessage({
                type: 'error',
                text:
                    error instanceof Error
                        ? `Не удалось загрузить изображение: ${error.message}`
                        : 'Не удалось загрузить изображение. Проверьте соединение и настройки Object Storage.',
            });
        } finally {
            setIsUploadingImage(false);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title="Категории"
                description="Список категорий каталога и форма добавления новой категории."
            />

            <div className="mt-6 grid gap-4 md:grid-cols-2">
                <Metric
                    icon={FolderTree}
                    label="Всего категорий"
                    value={categories.length.toString()}
                />
                <Metric icon={Boxes} label="Корневые категории" value={rootCategories.toString()} />
            </div>

            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-180 border-collapse text-left text-sm">
                        <thead className="bg-grey text-xs uppercase tracking-[0.12em] text-dark-grey">
                            <tr>
                                <th className="px-4 py-3 font-medium">Категория</th>
                                <th className="px-4 py-3 font-medium">Родитель</th>
                                <th className="px-4 py-3 font-medium">Товары</th>
                                <th className="px-4 py-3 font-medium">Подкатегории</th>
                                <th className="px-4 py-3 font-medium">Изображение</th>
                            </tr>
                        </thead>
                        <tbody>
                            {categories.map((category) => (
                                <tr
                                    key={category.id}
                                    className="group border-t border-border align-top transition-colors hover:bg-grey/20"
                                >
                                    <td className="px-4 py-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold text-black">{category.name}</p>
                                                <p className="mt-1 text-xs text-dark-grey">
                                                    {category.slug}
                                                </p>
                                            </div>
                                            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setEditingCategory(category);
                                                        setMessage(null);
                                                    }}
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-accent/10 hover:text-accent"
                                                    aria-label={`Редактировать категорию ${category.name}`}
                                                    title="Редактировать"
                                                >
                                                    <Pencil className="size-4" aria-hidden="true" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setDeleteCandidate(category);
                                                        setDeleteError(null);
                                                    }}
                                                    className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-red-50 hover:text-red-600"
                                                    aria-label={`Удалить категорию ${category.name}`}
                                                    title="Удалить"
                                                >
                                                    <Trash2 className="size-4" aria-hidden="true" />
                                                </button>
                                            </div>
                                        </div>
                                        {editingCategory?.id === category.id ? (
                                            <p className="mt-2 text-xs font-medium text-accent">
                                                Редактируется
                                            </p>
                                        ) : null}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">
                                        {category.parent?.name || 'Корневая'}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">
                                        {category._count.products}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">
                                        {category._count.children}
                                    </td>
                                    <td className="px-4 py-4 text-dark-grey">
                                        {category.imageUrl ? 'Есть' : 'Нет'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <form
                    ref={formRef}
                    key={editingCategory?.id ?? 'new-category'}
                    className="rounded-3xl bg-grey/20 p-5"
                    onSubmit={handleSubmit}
                >
                    <div className="flex items-start justify-between gap-3">
                        <h2 className="text-lg font-semibold text-black">
                            {editingCategory ? 'Редактировать категорию' : 'Новая категория'}
                        </h2>
                        {editingCategory ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setEditingCategory(null);
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
                                placeholder="Название категории"
                                defaultValue={editingCategory?.name ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Slug">
                            <input
                                className={inputClassName}
                                name="slug"
                                placeholder="slug-kategorii"
                                defaultValue={editingCategory?.slug ?? ''}
                                required
                            />
                        </FormField>
                        <FormField label="Родительская категория">
                            <select
                                className={inputClassName}
                                name="parentId"
                                defaultValue={editingCategory?.parentId ?? ''}
                            >
                                <option value="">Корневая категория</option>
                                {availableParentCategories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                        <FormField label="URL изображения">
                            <div className="grid gap-2">
                                <input
                                    className={inputClassName}
                                    name="imageUrl"
                                    placeholder="/img/categories/category.png"
                                    defaultValue={editingCategory?.imageUrl ?? ''}
                                />
                                <UploadButton
                                    accept="image/jpeg,image/png,image/webp,image/gif"
                                    disabled={isUploadingImage}
                                    isUploading={isUploadingImage}
                                    label="Загрузить изображение"
                                    onFileSelect={handleCategoryImageUpload}
                                />
                            </div>
                        </FormField>
                        <FormField label="Описание">
                            <textarea
                                className={cn(inputClassName, 'min-h-24 resize-y')}
                                name="description"
                                placeholder="Краткое описание"
                                defaultValue={editingCategory?.description ?? ''}
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
                            disabled={isSubmitting || isUploadingImage}
                            className="inline-flex w-full items-center justify-center gap-2 rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {editingCategory ? (
                                <Pencil className="size-4" aria-hidden="true" />
                            ) : (
                                <Plus className="size-4" aria-hidden="true" />
                            )}
                            {isSubmitting
                                ? editingCategory
                                    ? 'Сохранение...'
                                    : 'Добавление...'
                                : editingCategory
                                  ? 'Сохранить категорию'
                                  : 'Добавить категорию'}
                        </button>
                    </div>
                </form>
            </div>

            {deleteCandidate ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="delete-category-title"
                >
                    <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 id="delete-category-title" className="text-xl font-semibold text-black">
                                    Удаление категории
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    Вы уверены что хотите удалить эту категорию?
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
                                onClick={handleDeleteCategory}
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

function UploadButton({
    accept,
    disabled,
    isUploading,
    label,
    onFileSelect,
}: {
    accept: string;
    disabled: boolean;
    isUploading: boolean;
    label: string;
    onFileSelect: (file: File) => void;
}) {
    return (
        <label
            className={cn(
                'inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 text-sm font-semibold text-black transition-colors hover:border-accent hover:text-accent',
                disabled && 'pointer-events-none cursor-not-allowed opacity-60',
            )}
        >
            <UploadCloud className="size-4" aria-hidden="true" />
            {isUploading ? 'Загрузка...' : label}
            <input
                accept={accept}
                className="sr-only"
                disabled={disabled}
                type="file"
                onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = '';

                    if (file) {
                        onFileSelect(file);
                    }
                }}
            />
        </label>
    );
}

function validateCategoryImageFile(file: File) {
    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

    if (!allowedImageTypes.includes(file.type)) {
        return 'Загрузите изображение в формате JPEG, PNG, WebP или GIF.';
    }

    if (file.size > maxCategoryImageSize) {
        return 'Изображение категории должно быть не больше 8 МБ.';
    }

    if (file.size <= 0) {
        return 'Загруженный файл пустой.';
    }

    return null;
}

async function parseUploadResponse(response: Response) {
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
        return (await response.json()) as {
            uploadUrl?: string;
            url?: string;
            key?: string;
            contentType?: string;
            size?: number;
            cacheControl?: string;
            error?: string;
        };
    }

    const text = (await response.text()).trim();

    if (text.toLowerCase().includes('request entity too large')) {
        return {
            error:
                'Файл слишком большой для загрузки через Vercel Function. Для файлов больше 4.5 МБ нужна прямая загрузка в Object Storage.',
        };
    }

    return {
        error: text || `Сервер загрузки вернул ошибку ${response.status}.`,
    };
}

async function uploadCategoryImageThroughServer(
    file: File,
    payload: {
        kind: 'category-image';
        categorySlug: string;
    },
) {
    const formData = new FormData();

    formData.set('kind', payload.kind);
    formData.set('file', file);
    formData.set('categorySlug', payload.categorySlug);

    const response = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: formData,
    });

    return parseUploadResponse(response);
}

function getStringFormValue(formData: FormData, fieldName: string) {
    const value = formData.get(fieldName);

    return typeof value === 'string' ? value.trim() : '';
}
