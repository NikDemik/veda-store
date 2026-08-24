'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2, UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { availabilityLabels, productStatusLabels } from '../admin-format';
import { FormField, SectionTitle, inputClassName } from '../admin-ui';
import type {
    AdminAttributeDefinition,
    AdminCategory,
    AdminProduct,
    AdminProductVariantGroup,
    AdminProductType,
    AdminUnitMeasure,
} from '../types';

const maxProductImageSize = 8 * 1024 * 1024;
const maxCatalogPdfSize = 30 * 1024 * 1024;
type ProductFormTabProps = {
    brands: Array<{ id: number; name: string; slug: string }>;
    categories: AdminCategory[];
    series: Array<{ id: number; name: string; slug: string }>;
    unitMeasures: AdminUnitMeasure[];
    productTypes: AdminProductType[];
    variantGroups: AdminProductVariantGroup[];
    attributeDefinitions: AdminAttributeDefinition[];
    products: AdminProduct[];
    editingProduct?: AdminProduct | null;
    onEditCancel?: () => void;
    onSaved?: () => void;
};

type StepId = 'main' | 'pricing' | 'parameters' | 'media' | 'docs' | 'seo';

type ProductImageUploadContext =
    | {
          brandSlug: string;
          seriesSlug: string;
          productSlug: string;
          imageSequence: number;
      }
    | { error: string };

type CatalogDocumentUploadContext =
    | {
          brandSlug: string;
          seriesSlug: string;
      }
    | { error: string };

const steps: Array<{ id: StepId; label: string; description: string }> = [
    { id: 'main', label: 'Основное', description: 'Идентификация товара и описание' },
    { id: 'pricing', label: 'Цены и наличие', description: 'Цена, НДС, остатки и поставка' },
    { id: 'parameters', label: 'Параметры', description: 'Штатные поля Product и характеристики' },
    { id: 'media', label: 'Медиа', description: 'Основное изображение и галерея' },
    { id: 'docs', label: 'Документация', description: 'PDF или ссылка на datasheet' },
    { id: 'seo', label: 'SEO', description: 'Title и Meta Description' },
];

export function ProductFormTab({
    brands,
    categories,
    series,
    unitMeasures,
    productTypes,
    variantGroups,
    attributeDefinitions,
    products,
    editingProduct = null,
    onEditCancel,
    onSaved,
}: ProductFormTabProps) {
    const router = useRouter();
    const formRef = useRef<HTMLFormElement>(null);
    const [activeStep, setActiveStep] = useState<StepId>('main');
    const [specRows, setSpecRows] = useState(() => getInitialSpecRows(editingProduct));
    const [galleryRows, setGalleryRows] = useState(() => getInitialImageRows(editingProduct));
    const [documentRows, setDocumentRows] = useState(() => getInitialDocumentRows(editingProduct));
    const [packageRows, setPackageRows] = useState(() => getInitialPackageRows(editingProduct));
    const [primaryImageRowId, setPrimaryImageRowId] = useState(() =>
        getInitialPrimaryImageRowId(editingProduct, galleryRows),
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingField, setUploadingField] = useState<string | null>(null);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [saveConfirmationModal, setSaveConfirmationModal] = useState(false);
    const [notificationModal, setNotificationModal] = useState<{
        type: 'success' | 'error';
        text: string;
    } | null>(null);
    const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(
        editingProduct?.series?.id ?? null,
    );
    const [selectedProductTypeId, setSelectedProductTypeId] = useState<number | null>(
        editingProduct?.productTypeId ?? null,
    );
    const activeStepIndex = steps.findIndex((step) => step.id === activeStep);
    const isEditing = Boolean(editingProduct);

    useEffect(() => {
        const imageRows = getInitialImageRows(editingProduct);

        setActiveStep('main');
        setSpecRows(getInitialSpecRows(editingProduct));
        setGalleryRows(imageRows);
        setDocumentRows(getInitialDocumentRows(editingProduct));
        setPackageRows(getInitialPackageRows(editingProduct));
        setPrimaryImageRowId(getInitialPrimaryImageRowId(editingProduct, imageRows));
        setMessage(null);
        setSaveConfirmationModal(false);
        setNotificationModal(null);
        setSelectedSeriesId(editingProduct?.series?.id ?? null);
        setSelectedProductTypeId(editingProduct?.productTypeId ?? null);
    }, [editingProduct]);

    function goToPreviousStep() {
        const previousStep = steps[Math.max(activeStepIndex - 1, 0)];
        setActiveStep(previousStep.id);
    }

    function goToNextStep() {
        const nextStep = steps[Math.min(activeStepIndex + 1, steps.length - 1)];
        setActiveStep(nextStep.id);
    }

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        setNotificationModal(null);
        setSaveConfirmationModal(true);
    }

    async function handleConfirmedSubmit() {
        const form = formRef.current;

        if (!form) return;

        const formData = new FormData(form);
        applyPrimaryImageSelection(formData, galleryRows, primaryImageRowId);

        setSaveConfirmationModal(false);
        setIsSubmitting(true);
        setMessage(null);

        try {
            const response = await fetch(editingProduct ? `/api/admin/products/${editingProduct.id}` : '/api/admin/products', {
                method: editingProduct ? 'PATCH' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...Object.fromEntries(formData.entries()),
                    specs: collectDynamicRows(formData, 'specs', ['name', 'value', 'unit']),
                    attributeValues: attributeDefinitions.map((attribute) => ({
                        attributeId: attribute.id,
                        textValue:
                            attribute.dataType === 'TEXT'
                                ? formData.get(`attributes.${attribute.id}.value`)
                                : null,
                        numberValue:
                            attribute.dataType === 'NUMBER'
                                ? formData.get(`attributes.${attribute.id}.value`)
                                : null,
                        booleanValue:
                            attribute.dataType === 'BOOLEAN'
                                ? formData.get(`attributes.${attribute.id}.value`) === 'true'
                                : undefined,
                    })),
                    packageItems: collectDynamicRows(formData, 'packageItems', [
                        'componentProductId',
                        'itemName',
                        'quantity',
                        'isIncluded',
                        'note',
                    ]),
                    images: collectDynamicRows(formData, 'images', [
                        'url',
                        'altText',
                        'sortOrder',
                        'isPrimary',
                    ]),
                    documents: collectDynamicRows(formData, 'documents', [
                        'title',
                        'url',
                        'fileName',
                        'mimeType',
                        'size',
                        'storageKey',
                        'sortOrder',
                    ]),
                }),
            });
            const result = (await response.json()) as { error?: string };

            if (!response.ok) {
                const errorMessage =
                    result.error || (editingProduct ? 'Не удалось обновить товар.' : 'Не удалось сохранить товар.');

                setMessage({
                    type: 'error',
                    text: errorMessage,
                });
                setNotificationModal({ type: 'error', text: errorMessage });
                return;
            }

            const imageRowId = createRowId();

            form.reset();
            setSpecRows([createRowId()]);
            setGalleryRows([imageRowId]);
            setDocumentRows([createRowId()]);
            setPackageRows([createRowId()]);
            setPrimaryImageRowId(imageRowId);
            setActiveStep('main');
            const successMessage = 'Товар сохранен';

            setMessage({ type: 'success', text: successMessage });
            setNotificationModal({ type: 'success', text: successMessage });
            onSaved?.();
            router.refresh();
        } catch {
            const errorMessage =
                'Не удалось отправить форму. Проверьте соединение и повторите попытку.';

            setMessage({
                type: 'error',
                text: errorMessage,
            });
            setNotificationModal({ type: 'error', text: errorMessage });
        } finally {
            setIsSubmitting(false);
        }
    }

    async function handleStorageUpload(
        file: File,
        kind: 'product-image' | 'catalog-pdf',
        targetFieldName: string,
        imageSequence?: number,
    ) {
        setUploadingField(targetFieldName);
        setMessage(null);

        try {
            const validationError = validateUploadFile(kind, file);

            if (validationError) {
                setMessage({ type: 'error', text: validationError });
                return;
            }

            const uploadPayload: {
                kind: 'product-image' | 'catalog-pdf';
                fileName: string;
                contentType: string;
                size: number;
                brandSlug?: string;
                seriesSlug?: string;
                productSlug?: string;
                imageSequence?: number;
            } = {
                kind,
                fileName: file.name,
                contentType: file.type,
                size: file.size,
            };

            if (kind === 'product-image') {
                const uploadContext = getProductImageUploadContext(
                    new FormData(formRef.current ?? undefined),
                    brands,
                    series,
                    imageSequence,
                );

                if ('error' in uploadContext) {
                    setMessage({ type: 'error', text: uploadContext.error });
                    return;
                }

                uploadPayload.brandSlug = uploadContext.brandSlug;
                uploadPayload.seriesSlug = uploadContext.seriesSlug;
                uploadPayload.productSlug = uploadContext.productSlug;
                uploadPayload.imageSequence = uploadContext.imageSequence;
            }

            if (kind === 'catalog-pdf') {
                const uploadContext = getCatalogDocumentUploadContext(
                    new FormData(formRef.current ?? undefined),
                    brands,
                    series,
                );

                if ('error' in uploadContext) {
                    setMessage({ type: 'error', text: uploadContext.error });
                    return;
                }

                uploadPayload.brandSlug = uploadContext.brandSlug;
                uploadPayload.seriesSlug = uploadContext.seriesSlug;
            }

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
                    text: result.error || 'Не удалось загрузить файл в Object Storage.',
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
                            `Object Storage вернул ошибку ${uploadResponse.status} при загрузке файла.`,
                    });
                    return;
                }
            } catch (error) {
                if (kind !== 'product-image') {
                    throw error;
                }

                const fallbackResult = await uploadFileThroughServer(file, uploadPayload);

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
                result.key = fallbackResult.key;
                result.contentType = fallbackResult.contentType;
                result.size = fallbackResult.size;
            }

            const targetInput = document.querySelector<HTMLInputElement>(
                `input[name="${targetFieldName}"]`,
            );

            if (targetInput) {
                targetInput.value = result.url;
                targetInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            fillUploadedDocumentMetadata(targetFieldName, file, result);

            setMessage({ type: 'success', text: 'Файл загружен в Object Storage.' });
        } catch (error) {
            const message =
                error instanceof Error
                    ? `Не удалось загрузить файл: ${error.message}`
                    : 'Не удалось загрузить файл. Проверьте соединение и настройки Object Storage.';

            setMessage({
                type: 'error',
                text: message,
            });
        } finally {
            setUploadingField(null);
        }
    }

    return (
        <section className="rounded-[2rem] border border-grey/80 bg-white p-6 sm:p-8">
            <SectionTitle
                title={editingProduct ? 'Редактировать товар' : 'Добавить товар'}
                description={
                    editingProduct
                        ? 'Редактирование карточки товара: основное, цены, параметры, медиа и документация.'
                        : 'Пошаговая форма новой карточки товара: основное, цены, параметры, медиа и документация.'
                }
            />

            {editingProduct ? (
                <div className="mt-6 flex items-center justify-between gap-3 rounded-3xl bg-grey/20 p-5">
                    <div>
                        <p className="text-sm font-semibold text-black">{editingProduct.name}</p>
                        <p className="mt-1 text-xs text-dark-grey">SKU {editingProduct.sku}</p>
                    </div>
                    <button
                        type="button"
                        onClick={onEditCancel}
                        className="inline-flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-grey"
                    >
                        <X className="size-4" aria-hidden="true" />
                        Отменить
                    </button>
                </div>
            ) : null}

            <form
                ref={formRef}
                key={editingProduct?.id ?? 'new-product'}
                className="mt-6 grid gap-6"
                onSubmit={handleSubmit}
                noValidate
            >
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    {steps.map((step, index) => (
                        <button
                            key={step.id}
                            type="button"
                            onClick={() => setActiveStep(step.id)}
                            className={cn(
                                'rounded-2xl border px-4 py-3 text-left transition-colors',
                                activeStep === step.id
                                    ? 'border-accent bg-accent text-white'
                                    : 'border-grey/80 bg-white hover:border-accent/30 hover:bg-accent/5',
                            )}
                        >
                            <span
                                className={cn(
                                    'inline-flex size-7 items-center justify-center rounded-full text-xs font-semibold',
                                    activeStep === step.id ? 'bg-white/15 text-white' : 'bg-grey text-black',
                                )}
                            >
                                {index + 1}
                            </span>
                            <p className="mt-3 text-sm font-semibold">{step.label}</p>
                            <p
                                className={cn(
                                    'mt-1 text-xs leading-5',
                                    activeStep === step.id ? 'text-white/75' : 'text-dark-grey',
                                )}
                            >
                                {step.description}
                            </p>
                        </button>
                    ))}
                </div>

                <div className="rounded-3xl border border-grey/80 p-5 sm:p-6">
                    <div className={activeStep === 'main' ? 'block' : 'hidden'}>
                        <MainStep
                            brands={brands}
                            categories={categories}
                            series={series}
                            product={editingProduct}
                            productTypes={productTypes}
                            variantGroups={variantGroups}
                            attributeDefinitions={attributeDefinitions}
                            onSeriesChange={setSelectedSeriesId}
                            onProductTypeChange={setSelectedProductTypeId}
                        />
                    </div>
                    <div className={activeStep === 'pricing' ? 'block' : 'hidden'}>
                        <PricingStep product={editingProduct} unitMeasures={unitMeasures} />
                    </div>
                    <div className={activeStep === 'parameters' ? 'block' : 'hidden'}>
                        <ParametersStep
                            product={editingProduct}
                            attributeDefinitions={attributeDefinitions}
                            products={products}
                            packageRows={packageRows}
                            specRows={specRows}
                            onAddSpec={() => setSpecRows((rows) => [...rows, createRowId()])}
                            onRemoveSpec={(rowId) =>
                                setSpecRows((rows) => rows.filter((row) => row !== rowId))
                            }
                            onAddPackageItem={() =>
                                setPackageRows((rows) => [...rows, createRowId()])
                            }
                            onRemovePackageItem={(rowId) =>
                                setPackageRows((rows) => rows.filter((row) => row !== rowId))
                            }
                        />
                    </div>
                    <div className={activeStep === 'media' ? 'block' : 'hidden'}>
                        <MediaStep
                            product={editingProduct}
                            galleryRows={galleryRows}
                            primaryImageRowId={primaryImageRowId}
                            uploadingField={uploadingField}
                            onUploadFile={handleStorageUpload}
                            onAddImage={() => setGalleryRows((rows) => [...rows, createRowId()])}
                            onPrimaryImageChange={setPrimaryImageRowId}
                            onRemoveImage={(rowId) =>
                                setGalleryRows((rows) => {
                                    const nextRows = rows.filter((row) => row !== rowId);

                                    if (nextRows.length === 1 || primaryImageRowId === rowId) {
                                        setPrimaryImageRowId(nextRows[0] ?? '');
                                    }

                                    return nextRows;
                                })
                            }
                        />
                    </div>
                    <div className={activeStep === 'docs' ? 'block' : 'hidden'}>
                        <DocsStep
                            product={editingProduct}
                            documentRows={documentRows}
                            uploadingField={uploadingField}
                            onUploadFile={handleStorageUpload}
                            onAddDocument={() => setDocumentRows((rows) => [...rows, createRowId()])}
                            onRemoveDocument={(rowId) =>
                                setDocumentRows((rows) => rows.filter((row) => row !== rowId))
                            }
                        />
                    </div>
                    <div className={activeStep === 'seo' ? 'block' : 'hidden'}>
                        <SeoStep product={editingProduct} />
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={goToPreviousStep}
                            disabled={activeStepIndex === 0}
                            className="inline-flex items-center gap-2 rounded-[8px] border border-grey/80 px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            <ChevronLeft className="size-4" aria-hidden="true" />
                            Назад
                        </button>
                        <button
                            type="button"
                            onClick={goToNextStep}
                            disabled={activeStepIndex === steps.length - 1}
                            className="inline-flex items-center gap-2 rounded-[8px] border border-grey/80 px-5 py-3 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-45"
                        >
                            Далее
                            <ChevronRight className="size-4" aria-hidden="true" />
                        </button>
                    </div>

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

                    <div className="flex flex-wrap gap-3">
                        <button
                            type="reset"
                            onClick={() => {
                                setMessage(null);
                                setSaveConfirmationModal(false);
                                setNotificationModal(null);
                                if (!isEditing) {
                                    const imageRowId = createRowId();

                                    setSpecRows([createRowId()]);
                                    setGalleryRows([imageRowId]);
                                    setDocumentRows([createRowId()]);
                                    setPrimaryImageRowId(imageRowId);
                                }
                            }}
                            className="rounded-[8px] border border-grey/80 px-5 py-3 text-sm font-semibold text-black"
                        >
                            Очистить
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center gap-2 rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {editingProduct ? (
                                <Pencil className="size-4" aria-hidden="true" />
                            ) : (
                                <Plus className="size-4" aria-hidden="true" />
                            )}
                            {isSubmitting
                                ? editingProduct
                                    ? 'Сохранение...'
                                    : 'Сохранение...'
                                : editingProduct
                                  ? 'Сохранить изменения'
                                  : 'Сохранить товар'}
                        </button>
                    </div>
                </div>
            </form>

            {saveConfirmationModal ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="product-form-save-confirmation-title"
                >
                    <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="product-form-save-confirmation-title"
                                    className="text-xl font-semibold text-black"
                                >
                                    Подтвердите сохранение
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    {editingProduct
                                        ? 'Внести изменение в карточку товара'
                                        : 'Добавить новый товар'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSaveConfirmationModal(false)}
                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-grey hover:text-black"
                                aria-label="Закрыть подтверждение сохранения"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => setSaveConfirmationModal(false)}
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center rounded-[8px] border border-grey/80 bg-white px-5 py-3 text-sm font-semibold text-black transition-colors hover:bg-grey disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                Отмена
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmedSubmit}
                                disabled={isSubmitting}
                                className="inline-flex items-center justify-center gap-2 rounded-[8px] bg-accent px-5 py-3 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {editingProduct ? (
                                    <Pencil className="size-4" aria-hidden="true" />
                                ) : (
                                    <Plus className="size-4" aria-hidden="true" />
                                )}
                                {isSubmitting ? 'Сохранение...' : 'Сохранить'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {notificationModal ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="product-form-notification-title"
                >
                    <div className="w-full max-w-md rounded-[1.5rem] bg-white p-6 shadow-2xl">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2
                                    id="product-form-notification-title"
                                    className="text-xl font-semibold text-black"
                                >
                                    {notificationModal.type === 'success'
                                        ? 'Товар сохранен'
                                        : 'Не удалось сохранить товар'}
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-dark-grey">
                                    {notificationModal.text}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setNotificationModal(null)}
                                className="inline-flex size-8 items-center justify-center rounded-[8px] text-dark-grey transition-colors hover:bg-grey hover:text-black"
                                aria-label="Закрыть уведомление"
                            >
                                <X className="size-4" aria-hidden="true" />
                            </button>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                type="button"
                                onClick={() => setNotificationModal(null)}
                                className={cn(
                                    'inline-flex items-center justify-center rounded-[8px] px-5 py-3 text-sm font-semibold text-white transition-opacity',
                                    notificationModal.type === 'success' ? 'bg-accent' : 'bg-red-600',
                                )}
                            >
                                Понятно
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </section>
    );
}

function MainStep({
    brands,
    categories,
    series,
    product,
    productTypes,
    variantGroups,
    attributeDefinitions,
    onSeriesChange,
    onProductTypeChange,
}: {
    brands: Array<{ id: number; name: string }>;
    categories: AdminCategory[];
    series: Array<{ id: number; name: string }>;
    product: AdminProduct | null;
    productTypes: AdminProductType[];
    variantGroups: AdminProductVariantGroup[];
    attributeDefinitions: AdminAttributeDefinition[];
    onSeriesChange: (seriesId: number | null) => void;
    onProductTypeChange: (productTypeId: number | null) => void;
}) {
    const [selectedVariantGroup, setSelectedVariantGroup] = useState(
        product?.variantGroupId ? String(product.variantGroupId) : '',
    );
    const isCreatingVariantGroup = selectedVariantGroup === 'new';

    return (
        <StepPanel title="Основное">
            <div className="grid gap-4 lg:grid-cols-2">
                <FormField label="Категория">
                    <select className={inputClassName} name="categoryId" defaultValue={product?.category.id ?? ''} required>
                        <option value="" disabled>
                            Выберите категорию
                        </option>
                        {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                                {category.name}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Бренд">
                    <select className={inputClassName} name="brandId" defaultValue={product?.brand?.id ?? ''}>
                        <option value="">Без бренда</option>
                        {brands.map((brand) => (
                            <option key={brand.id} value={brand.id}>
                                {brand.name}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Серия">
                    <select
                        className={inputClassName}
                        name="seriesId"
                        defaultValue={product?.series?.id ?? ''}
                        onChange={(event) => onSeriesChange(event.target.value ? Number(event.target.value) : null)}
                    >
                        <option value="">Без серии</option>
                        {series.map((item) => (
                            <option key={item.id} value={item.id}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Тип товара">
                    <select
                        className={inputClassName}
                        name="productTypeId"
                        defaultValue={product?.productTypeId ?? ''}
                        required
                        onChange={(event) => onProductTypeChange(event.target.value ? Number(event.target.value) : null)}
                    >
                        <option value="" disabled>Выберите тип</option>
                        {productTypes.filter((type) => type.isActive || type.id === product?.productTypeId).map((type) => (
                            <option key={type.id} value={type.id}>
                                {type.name}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Группа вариантов">
                    <select
                        className={inputClassName}
                        value={selectedVariantGroup}
                        onChange={(event) => setSelectedVariantGroup(event.target.value)}
                    >
                        <option value="">Без группы вариантов</option>
                        {variantGroups.map((group) => (
                            <option key={group.id} value={group.id}>
                                {group.name} — {group.attribute.name}
                                {group.attribute.unit ? `, ${group.attribute.unit}` : ''}
                            </option>
                        ))}
                        <option value="new">Создать новую группу…</option>
                    </select>
                    <input
                        type="hidden"
                        name="variantGroupId"
                        value={
                            selectedVariantGroup && selectedVariantGroup !== 'new'
                                ? selectedVariantGroup
                                : ''
                        }
                    />
                </FormField>
                {isCreatingVariantGroup ? (
                    <>
                        <FormField label="Название новой группы">
                            <input
                                className={inputClassName}
                                name="newVariantGroupName"
                                placeholder="Троллейный шинопровод HFP56"
                                maxLength={191}
                                required
                            />
                        </FormField>
                        <FormField label="Код новой группы">
                            <input
                                className={inputClassName}
                                name="newVariantGroupCode"
                                placeholder="hfp56-trolley-busbar"
                                maxLength={191}
                                pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                                required
                            />
                        </FormField>
                        <FormField label="Основной параметр вариантов">
                            <select
                                className={inputClassName}
                                name="newVariantGroupAttributeId"
                                defaultValue=""
                                required
                            >
                                <option value="" disabled>
                                    Выберите характеристику
                                </option>
                                {attributeDefinitions.map((attribute) => (
                                    <option key={attribute.id} value={attribute.id}>
                                        {attribute.name}
                                        {attribute.unit ? `, ${attribute.unit}` : ''}
                                    </option>
                                ))}
                            </select>
                        </FormField>
                    </>
                ) : null}
                <FormField label="SKU">
                    <input
                        className={inputClassName}
                        name="sku"
                        placeholder="TR60605CW"
                        defaultValue={product?.sku ?? ''}
                        maxLength={191}
                        required
                    />
                </FormField>
                <FormField label="Артикул">
                    <input
                        className={inputClassName}
                        name="article"
                        placeholder="Необязательно"
                        defaultValue={product?.article ?? ''}
                        maxLength={191}
                    />
                </FormField>
                <FormField label="Название">
                    <input
                        className={inputClassName}
                        name="name"
                        placeholder="Например: Короб шинопровода TR60"
                        defaultValue={product?.name ?? ''}
                        maxLength={191}
                        required
                    />
                </FormField>
                <FormField label="Slug">
                    <input
                        className={inputClassName}
                        name="slug"
                        placeholder="korob-shinoprovoda-tr60"
                        defaultValue={product?.slug ?? ''}
                        maxLength={191}
                        required
                    />
                </FormField>
                <FormField label="Статус">
                    <select className={inputClassName} name="status" defaultValue={product?.status ?? 'ACTIVE'}>
                        {Object.entries(productStatusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </FormField>
                <label className="flex items-center gap-3 rounded-2xl bg-grey/20 px-4 py-3 text-sm font-medium">
                    <input
                        type="checkbox"
                        name="isSellable"
                        defaultChecked={product?.isSellable ?? true}
                    />
                    Доступен для продажи и показа в каталоге
                </label>
            </div>
            <FormField label="Описание">
                <textarea
                    className={cn(inputClassName, 'min-h-32 resize-y')}
                    name="description"
                    placeholder="Краткое описание товара"
                    defaultValue={product?.description ?? ''}
                    maxLength={2000}
                />
            </FormField>
        </StepPanel>
    );
}

function SeoStep({ product }: { product: AdminProduct | null }) {
    return (
        <StepPanel title="SEO">
            <div className="grid gap-4">
                <FormField label="SEO Title">
                    <input
                        className={inputClassName}
                        name="seoTitle"
                        placeholder="Заголовок страницы в поисковой выдаче"
                        defaultValue={product?.seoTitle ?? ''}
                        maxLength={191}
                    />
                </FormField>
                <FormField label="Модель">
                    <input
                        className={inputClassName}
                        name="model"
                        placeholder="Например: HFP56-4-12/65"
                        defaultValue={product?.model ?? ''}
                        maxLength={191}
                    />
                </FormField>
                <FormField label="Штрихкод">
                    <input
                        className={inputClassName}
                        name="barcode"
                        placeholder="EAN-13"
                        defaultValue={product?.barcode ?? ''}
                        maxLength={191}
                    />
                </FormField>
                <FormField label="Meta Description">
                    <textarea
                        className={cn(inputClassName, 'min-h-32 resize-y')}
                        name="metaDescription"
                        placeholder="Описание страницы для поисковой выдачи"
                        defaultValue={product?.metaDescription ?? ''}
                        maxLength={5000}
                    />
                </FormField>
            </div>
        </StepPanel>
    );
}

function PricingStep({
    product,
    unitMeasures,
}: {
    product: AdminProduct | null;
    unitMeasures: AdminUnitMeasure[];
}) {
    const activeUnitMeasures = unitMeasures.filter(
        (unitMeasure) => unitMeasure.isActive || unitMeasure.id === product?.unitMeasureId,
    );

    return (
        <StepPanel title="Цены и наличие">
            <div className="grid gap-4 lg:grid-cols-3">
                <FormField label="Базовая цена">
                    <input
                        className={inputClassName}
                        name="price"
                        placeholder="0.00"
                        defaultValue={product?.price ?? ''}
                        type="number"
                        min="0"
                        step="0.01"
                        required
                    />
                </FormField>
                <FormField label="Закупочная цена">
                    <input
                        className={inputClassName}
                        name="purchasePrice"
                        placeholder="0.00"
                        defaultValue={product?.purchasePrice ?? ''}
                        type="number"
                        min="0"
                        step="0.01"
                    />
                </FormField>
                <FormField label="Старая цена">
                    <input
                        className={inputClassName}
                        name="priceOld"
                        placeholder="0.00"
                        defaultValue={product?.priceOld ?? ''}
                        type="number"
                        min="0"
                        step="0.01"
                    />
                </FormField>
                <FormField label="Валюта">
                    <input
                        className={inputClassName}
                        name="currency"
                        placeholder="RUB"
                        defaultValue={product?.currency ?? 'RUB'}
                    />
                </FormField>
                <FormField label="Единица измерения">
                    <select
                        className={inputClassName}
                        name="unitMeasureId"
                        defaultValue={product?.unitMeasureId ?? activeUnitMeasures[0]?.id ?? ''}
                        required
                    >
                        <option value="" disabled>
                            Выберите единицу
                        </option>
                        {activeUnitMeasures.map((unitMeasure) => (
                            <option key={unitMeasure.id} value={unitMeasure.id}>
                                {unitMeasure.name} ({unitMeasure.shortName})
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="НДС, %">
                    <input
                        className={inputClassName}
                        name="vatRate"
                        placeholder="22.00"
                        defaultValue={product?.vatRate ?? ''}
                        type="number"
                        min="0"
                        step="0.01"
                    />
                </FormField>
                <FormField label="Наличие">
                    <select className={inputClassName} name="availability" defaultValue={product?.availability ?? 'IN_STOCK'}>
                        {Object.entries(availabilityLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </FormField>
                <FormField label="Остаток">
                    <input
                        className={inputClassName}
                        name="stockQty"
                        placeholder="0"
                        defaultValue={product?.stockQty ?? ''}
                        type="number"
                        min="0"
                    />
                </FormField>
                <FormField label="Минимальный заказ">
                    <input
                        className={inputClassName}
                        name="minOrderQty"
                        placeholder="1"
                        defaultValue={product?.minOrderQty ?? ''}
                        type="number"
                        min="1"
                    />
                </FormField>
                <FormField label="Шаг заказа">
                    <input
                        className={inputClassName}
                        name="stepQty"
                        placeholder="1"
                        defaultValue={product?.stepQty ?? ''}
                        type="number"
                        min="1"
                    />
                </FormField>
                <FormField label="Вес популярности">
                    <input
                        className={inputClassName}
                        name="popularityWeight"
                        placeholder="0"
                        defaultValue={product?.popularityWeight ?? 0}
                        type="number"
                        min="0"
                        step="1"
                    />
                </FormField>
                <FormField label="Срок поставки, дней">
                    <input
                        className={inputClassName}
                        name="leadTimeDays"
                        placeholder="Не указан"
                        defaultValue={product?.leadTimeDays ?? ''}
                        type="number"
                        min="0"
                    />
                </FormField>
            </div>
        </StepPanel>
    );
}


function ParametersStep({
    product,
    specRows,
    onAddSpec,
    onRemoveSpec,
    attributeDefinitions,
    products,
    packageRows,
    onAddPackageItem,
    onRemovePackageItem,
}: {
    product: AdminProduct | null;
    specRows: string[];
    onAddSpec: () => void;
    onRemoveSpec: (rowId: string) => void;
    attributeDefinitions: AdminAttributeDefinition[];
    products: AdminProduct[];
    packageRows: string[];
    onAddPackageItem: () => void;
    onRemovePackageItem: (rowId: string) => void;
}) {
    const primaryAttributes = attributeDefinitions.filter(
        (attribute) => attribute.isFilterable,
    );

    return (
        <StepPanel title="Параметры">
            <div>
                <h3 className="text-base font-semibold">Основные характеристики</h3>
                <p className="mt-1 text-sm text-dark-grey">
                    Используются фильтрами каталога.
                </p>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                    {primaryAttributes.map((attribute) => {
                        const value = product?.attributeValues.find(
                            (item) => item.attributeId === attribute.id,
                        );
                        return (
                            <FormField
                                key={attribute.id}
                                label={`${attribute.name}${attribute.unit ? `, ${attribute.unit}` : ''}`}
                            >
                                {attribute.dataType === 'BOOLEAN' ? (
                                    <select
                                        className={inputClassName}
                                        name={`attributes.${attribute.id}.value`}
                                        defaultValue={
                                            value?.booleanValue === null || value?.booleanValue === undefined
                                                ? ''
                                                : String(value.booleanValue)
                                        }
                                    >
                                        <option value="">Не задано</option>
                                        <option value="true">Да</option>
                                        <option value="false">Нет</option>
                                    </select>
                                ) : (
                                    <input
                                        className={inputClassName}
                                        name={`attributes.${attribute.id}.value`}
                                        type={attribute.dataType === 'NUMBER' ? 'number' : 'text'}
                                        step={attribute.dataType === 'NUMBER' ? '0.0001' : undefined}
                                        defaultValue={
                                            attribute.dataType === 'NUMBER'
                                                ? (value?.numberValue ?? '')
                                                : (value?.textValue ?? '')
                                        }
                                    />
                                )}
                            </FormField>
                        );
                    })}
                </div>
            </div>

            <div className="mt-8">
                <h3 className="text-base font-semibold">Дополнительные характеристики</h3>
                <div className="mt-4 grid gap-4 lg:grid-cols-3">
                <FormField label="Вес, кг">
                    <input
                        className={inputClassName}
                        name="weightKg"
                        placeholder="0.000"
                        type="number"
                        min="0"
                        step="0.001"
                        defaultValue={product?.weightKg ?? ''}
                    />
                </FormField>
                <FormField label="Ширина, мм">
                    <input
                        className={inputClassName}
                        name="widthMm"
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={product?.widthMm ?? ''}
                    />
                </FormField>
                <FormField label="Высота, мм">
                    <input
                        className={inputClassName}
                        name="heightMm"
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={product?.heightMm ?? ''}
                    />
                </FormField>
                <FormField label="Глубина, мм">
                    <input
                        className={inputClassName}
                        name="depthMm"
                        placeholder="0.00"
                        type="number"
                        min="0"
                        step="0.01"
                        defaultValue={product?.depthMm ?? ''}
                    />
                </FormField>
                <FormField label="Температура от, °C">
                    <input
                        className={inputClassName}
                        name="operatingTempFromC"
                        placeholder="-25"
                        type="number"
                        defaultValue={product?.operatingTempFromC ?? ''}
                    />
                </FormField>
                <FormField label="Температура до, °C">
                    <input
                        className={inputClassName}
                        name="operatingTempToC"
                        placeholder="55"
                        type="number"
                        defaultValue={product?.operatingTempToC ?? ''}
                    />
                </FormField>
                </div>
            </div>

            <DynamicRowsHeader title="Характеристики товара" onAdd={onAddSpec} />
            <div className="space-y-3">
                {specRows.map((rowId, index) => (
                    <div
                        key={rowId}
                        className="grid gap-3 rounded-2xl bg-grey/20 p-4 lg:grid-cols-[1fr_1fr_160px_44px]"
                    >
                        <input
                            className={inputClassName}
                            name={`specs.${index}.name`}
                            placeholder="Название"
                            defaultValue={product?.specs[index]?.name ?? ''}
                            maxLength={191}
                        />
                        <input
                            className={inputClassName}
                            name={`specs.${index}.value`}
                            placeholder="Значение"
                            defaultValue={product?.specs[index]?.value ?? ''}
                            maxLength={191}
                        />
                        <input
                            className={inputClassName}
                            name={`specs.${index}.unit`}
                            placeholder="Ед. изм."
                            defaultValue={product?.specs[index]?.unit ?? ''}
                            maxLength={191}
                        />
                        <RemoveRowButton
                            disabled={specRows.length === 1}
                            label="Удалить характеристику"
                            onClick={() => onRemoveSpec(rowId)}
                        />
                    </div>
                ))}
            </div>

            <DynamicRowsHeader title="Состав комплекта" onAdd={onAddPackageItem} />
            <div className="space-y-3">
                {packageRows.map((rowId, index) => (
                    <div
                        key={rowId}
                        className="grid gap-3 rounded-2xl bg-grey/20 p-4 lg:grid-cols-[1fr_1fr_140px_150px_1fr_44px]"
                    >
                        <input
                            className={inputClassName}
                            name={`packageItems.${index}.itemName`}
                            placeholder="Название элемента комплекта"
                            defaultValue={product?.packageItems[index]?.itemName ?? ''}
                        />
                        <select
                            className={inputClassName}
                            name={`packageItems.${index}.componentProductId`}
                            defaultValue={product?.packageItems[index]?.componentProductId ?? ''}
                        >
                            <option value="">Только информационная строка</option>
                            {products
                                .filter((item) => item.id !== product?.id)
                                .map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.article || item.sku} — {item.name}
                                    </option>
                                ))}
                        </select>
                        <input
                            className={inputClassName}
                            name={`packageItems.${index}.quantity`}
                            type="number"
                            min="0.001"
                            step="0.001"
                            defaultValue={product?.packageItems[index]?.quantity ?? 1}
                        />
                        <label className="flex items-center gap-2 text-sm">
                            <input
                                type="checkbox"
                                name={`packageItems.${index}.isIncluded`}
                                defaultChecked={product?.packageItems[index]?.isIncluded ?? true}
                            />
                            Входит в комплект
                        </label>
                        <input
                            className={inputClassName}
                            name={`packageItems.${index}.note`}
                            placeholder="Примечание"
                            defaultValue={product?.packageItems[index]?.note ?? ''}
                        />
                        <RemoveRowButton
                            disabled={packageRows.length === 1}
                            label="Удалить компонент"
                            onClick={() => onRemovePackageItem(rowId)}
                        />
                    </div>
                ))}
            </div>
        </StepPanel>
    );
}


function MediaStep({
    product,
    galleryRows,
    primaryImageRowId,
    uploadingField,
    onUploadFile,
    onAddImage,
    onPrimaryImageChange,
    onRemoveImage,
}: {
    product: AdminProduct | null;
    galleryRows: string[];
    primaryImageRowId: string;
    uploadingField: string | null;
    onUploadFile: (
        file: File,
        kind: 'product-image' | 'catalog-pdf',
        targetFieldName: string,
        imageSequence?: number,
    ) => Promise<void>;
    onAddImage: () => void;
    onPrimaryImageChange: (rowId: string) => void;
    onRemoveImage: (rowId: string) => void;
}) {
    return (
        <StepPanel title="Медиа">
            <DynamicRowsHeader title="Галерея изображений товара" onAdd={onAddImage} />
            <div className="space-y-3">
                {galleryRows.map((rowId, index) => {
                    const isOnlyImage = galleryRows.length === 1;

                    return (
                        <div
                            key={rowId}
                            className="grid gap-3 rounded-2xl bg-grey/20 p-4 lg:grid-cols-[1fr_1fr_120px_130px_120px_44px]"
                        >
                            <input
                                className={inputClassName}
                                name={`images.${index}.url`}
                                placeholder="URL изображения"
                                defaultValue={product?.images[index]?.url ?? ''}
                                maxLength={191}
                            />
                            <input
                                className={inputClassName}
                                name={`images.${index}.altText`}
                                placeholder="Alt-текст"
                                defaultValue={product?.images[index]?.altText ?? ''}
                                maxLength={191}
                            />
                            <input
                                className={inputClassName}
                                name={`images.${index}.sortOrder`}
                                placeholder="0"
                                defaultValue={product?.images[index]?.sortOrder ?? ''}
                                type="number"
                                min="0"
                            />
                            <label className="flex items-center gap-2 rounded-[8px] border border-grey/80 bg-white px-4 py-3 text-sm text-black">
                                <input
                                    name={`images.${index}.isPrimary`}
                                    type="checkbox"
                                    checked={isOnlyImage || primaryImageRowId === rowId}
                                    disabled={isOnlyImage}
                                    onChange={() => onPrimaryImageChange(rowId)}
                                />
                                Основное
                            </label>
                            <UploadButton
                                accept="image/jpeg,image/png,image/webp,image/gif"
                                disabled={uploadingField !== null}
                                isUploading={uploadingField === `images.${index}.url`}
                                label="Загрузить"
                                onFileSelect={(file) =>
                                    onUploadFile(
                                        file,
                                        'product-image',
                                        `images.${index}.url`,
                                        index + 1,
                                    )
                                }
                            />
                            <RemoveRowButton
                                disabled={galleryRows.length === 1}
                                label="Удалить изображение"
                                onClick={() => onRemoveImage(rowId)}
                            />
                        </div>
                    );
                })}
            </div>
        </StepPanel>
    );
}

function DocsStep({
    product,
    documentRows,
    uploadingField,
    onUploadFile,
    onAddDocument,
    onRemoveDocument,
}: {
    product: AdminProduct | null;
    documentRows: string[];
    uploadingField: string | null;
    onUploadFile: (
        file: File,
        kind: 'product-image' | 'catalog-pdf',
        targetFieldName: string,
        imageSequence?: number,
    ) => Promise<void>;
    onAddDocument: () => void;
    onRemoveDocument: (rowId: string) => void;
}) {
    return (
        <StepPanel title="Документация">
            <input type="hidden" name="datasheetUrl" defaultValue={product?.datasheetUrl ?? ''} />
            <DynamicRowsHeader title="Документы товара" onAdd={onAddDocument} />
            <div className="space-y-3">
                {documentRows.map((rowId, index) => {
                    const document = product?.documents[index];

                    return (
                        <div
                            key={rowId}
                            className="grid gap-3 rounded-2xl bg-grey/20 p-4 lg:grid-cols-[1fr_1fr_100px_140px_44px]"
                        >
                            <input
                                className={inputClassName}
                                name={`documents.${index}.title`}
                                placeholder="Название документа"
                                defaultValue={document?.title ?? ''}
                                maxLength={191}
                            />
                            <input
                                className={inputClassName}
                                name={`documents.${index}.url`}
                                placeholder="/pdf/product-datasheet.pdf или https://..."
                                defaultValue={document?.url ?? ''}
                                maxLength={191}
                            />
                            <input
                                className={inputClassName}
                                name={`documents.${index}.sortOrder`}
                                placeholder="0"
                                defaultValue={document?.sortOrder ?? ''}
                                type="number"
                                min="0"
                            />
                            <input
                                type="hidden"
                                name={`documents.${index}.fileName`}
                                defaultValue={document?.fileName ?? ''}
                            />
                            <input
                                type="hidden"
                                name={`documents.${index}.mimeType`}
                                defaultValue={document?.mimeType ?? 'application/pdf'}
                            />
                            <input
                                type="hidden"
                                name={`documents.${index}.size`}
                                defaultValue={document?.size ?? ''}
                            />
                            <input
                                type="hidden"
                                name={`documents.${index}.storageKey`}
                                defaultValue={document?.storageKey ?? ''}
                            />
                            <UploadButton
                                accept="application/pdf"
                                disabled={uploadingField !== null}
                                isUploading={uploadingField === `documents.${index}.url`}
                                label="Загрузить PDF"
                                onFileSelect={(file) =>
                                    onUploadFile(file, 'catalog-pdf', `documents.${index}.url`)
                                }
                            />
                            <RemoveRowButton
                                disabled={documentRows.length === 1}
                                label="Удалить документ"
                                onClick={() => onRemoveDocument(rowId)}
                            />
                        </div>
                    );
                })}
            </div>
        </StepPanel>
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

function StepPanel({ title, children }: { title: string; children: ReactNode }) {
    return (
        <div className="space-y-5">
            <h2 className="text-xl font-semibold text-black">{title}</h2>
            {children}
        </div>
    );
}

function DynamicRowsHeader({ title, onAdd }: { title: string; onAdd: () => void }) {
    return (
        <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
            <h4 className="text-base font-semibold text-black">{title}</h4>
            <button
                type="button"
                onClick={onAdd}
                className="inline-flex items-center gap-2 rounded-[8px] border border-grey/80 px-4 py-2 text-sm font-semibold text-black"
            >
                <Plus className="size-4" aria-hidden="true" />
                Добавить строку
            </button>
        </div>
    );
}

function RemoveRowButton({
    disabled,
    label,
    onClick,
}: {
    disabled: boolean;
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            aria-label={label}
            onClick={onClick}
            disabled={disabled}
            className="flex size-11 items-center justify-center rounded-[8px] border border-grey/80 bg-white text-dark-grey transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-40"
        >
            <Trash2 className="size-4" aria-hidden="true" />
        </button>
    );
}

function createRowId() {
    return Math.random().toString(36).slice(2);
}

function getInitialSpecRows(product: AdminProduct | null) {
    return product?.specs.length ? product.specs.map(() => createRowId()) : [createRowId()];
}

function getInitialImageRows(product: AdminProduct | null) {
    return product?.images.length ? product.images.map(() => createRowId()) : [createRowId()];
}

function getInitialDocumentRows(product: AdminProduct | null) {
    return product?.documents.length ? product.documents.map(() => createRowId()) : [createRowId()];
}

function getInitialPackageRows(product: AdminProduct | null) {
    return product?.packageItems.length
        ? product.packageItems.map(() => createRowId())
        : [createRowId()];
}

function getInitialPrimaryImageRowId(product: AdminProduct | null, imageRows: string[]) {
    const primaryImageIndex = product?.images.findIndex((image) => image.isPrimary) ?? -1;

    return imageRows[primaryImageIndex >= 0 ? primaryImageIndex : 0] ?? '';
}

function validateUploadFile(kind: 'product-image' | 'catalog-pdf', file: File) {
    if (kind === 'product-image') {
        const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

        if (!allowedImageTypes.includes(file.type)) {
            return 'Загрузите изображение в формате JPEG, PNG, WebP или GIF.';
        }

        if (file.size > maxProductImageSize) {
            return 'Изображение товара должно быть не больше 8 МБ.';
        }
    }

    if (kind === 'catalog-pdf') {
        if (file.type !== 'application/pdf') {
            return 'Загрузите PDF-файл.';
        }

        if (file.size > maxCatalogPdfSize) {
            return 'PDF-документ должен быть не больше 30 МБ.';
        }
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

async function uploadFileThroughServer(
    file: File,
    payload: {
        kind: 'product-image' | 'catalog-pdf';
        brandSlug?: string;
        seriesSlug?: string;
        productSlug?: string;
        imageSequence?: number;
    },
) {
    const formData = new FormData();

    formData.set('kind', payload.kind);
    formData.set('file', file);

    if (payload.brandSlug) formData.set('brandSlug', payload.brandSlug);
    if (payload.seriesSlug) formData.set('seriesSlug', payload.seriesSlug);
    if (payload.productSlug) formData.set('productSlug', payload.productSlug);
    if (payload.imageSequence) formData.set('imageSequence', String(payload.imageSequence));

    const response = await fetch('/api/admin/storage/upload', {
        method: 'POST',
        body: formData,
    });

    return parseUploadResponse(response);
}

function applyPrimaryImageSelection(
    formData: FormData,
    imageRows: string[],
    primaryImageRowId: string,
) {
    if (!imageRows.length) {
        formData.set('imageUrl', '');
        return;
    }

    const selectedImageIndex =
        imageRows.length === 1 ? 0 : Math.max(imageRows.indexOf(primaryImageRowId), 0);

    imageRows.forEach((_, index) => {
        formData.delete(`images.${index}.isPrimary`);
    });

    formData.set(`images.${selectedImageIndex}.isPrimary`, 'on');
    formData.set('imageUrl', getStringFormValue(formData, `images.${selectedImageIndex}.url`));
}

function getProductImageUploadContext(
    formData: FormData,
    brands: Array<{ id: number; name: string; slug: string }>,
    series: Array<{ id: number; name: string; slug: string }>,
    imageSequence?: number,
): ProductImageUploadContext {
    const productSlug = getStringFormValue(formData, 'slug');
    const brandId = Number(getStringFormValue(formData, 'brandId'));
    const seriesId = Number(getStringFormValue(formData, 'seriesId'));
    const brand = brands.find((item) => item.id === brandId);
    const productSeries = series.find((item) => item.id === seriesId);

    if (!productSlug) {
        return { error: 'Укажите slug товара перед загрузкой изображения.' };
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(productSlug)) {
        return { error: 'Slug товара должен содержать латиницу, цифры и дефисы.' };
    }

    if (!brand) {
        return { error: 'Выберите бренд перед загрузкой изображения.' };
    }

    if (!productSeries) {
        return { error: 'Выберите серию перед загрузкой изображения.' };
    }

    return {
        brandSlug: brand.slug,
        seriesSlug: productSeries.slug,
        productSlug,
        imageSequence: imageSequence && imageSequence > 0 ? imageSequence : 1,
    };
}

function getCatalogDocumentUploadContext(
    formData: FormData,
    brands: Array<{ id: number; name: string; slug: string }>,
    series: Array<{ id: number; name: string; slug: string }>,
): CatalogDocumentUploadContext {
    const brandId = Number(getStringFormValue(formData, 'brandId'));
    const seriesId = Number(getStringFormValue(formData, 'seriesId'));
    const brand = brands.find((item) => item.id === brandId);
    const productSeries = series.find((item) => item.id === seriesId);

    if (!brand) {
        return { error: 'Выберите бренд перед загрузкой документа.' };
    }

    if (!productSeries) {
        return { error: 'Выберите серию перед загрузкой документа.' };
    }

    return {
        brandSlug: brand.slug,
        seriesSlug: productSeries.slug,
    };
}

function getStringFormValue(formData: FormData, fieldName: string) {
    const value = formData.get(fieldName);

    return typeof value === 'string' ? value.trim() : '';
}

function fillUploadedDocumentMetadata(
    targetFieldName: string,
    file: File,
    uploadResult: { key?: string; contentType?: string; size?: number },
) {
    const match = targetFieldName.match(/^documents\.(\d+)\.url$/);

    if (!match) return;

    const [, index] = match;
    const fields = {
        title: file.name.replace(/\.[^.]+$/, ''),
        fileName: file.name,
        mimeType: uploadResult.contentType || file.type || 'application/pdf',
        size: String(uploadResult.size ?? file.size),
        storageKey: uploadResult.key || '',
    };

    for (const [fieldName, value] of Object.entries(fields)) {
        const input = document.querySelector<HTMLInputElement>(
            `input[name="documents.${index}.${fieldName}"]`,
        );

        if (!input) continue;
        if (fieldName === 'title' && input.value.trim()) continue;

        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
    }
}

function collectDynamicRows(formData: FormData, groupName: string, fields: string[]) {
    const rows = new Map<string, Record<string, FormDataEntryValue>>();

    for (const [key, value] of formData.entries()) {
        const [group, index, field] = key.split('.');

        if (group !== groupName || !index || !field || !fields.includes(field)) {
            continue;
        }

        rows.set(index, {
            ...(rows.get(index) || {}),
            [field]: value,
        });
    }

    return Array.from(rows.entries())
        .sort(([left], [right]) => Number(left) - Number(right))
        .map(([, row]) => row);
}
