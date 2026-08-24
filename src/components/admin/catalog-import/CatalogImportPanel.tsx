'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, History, LoaderCircle, UploadCloud, X } from 'lucide-react';
import type { CatalogImportDto, CatalogImportMode } from '@/types/catalog-import';
import { cn } from '@/lib/utils';
import { Metric, SectionTitle } from '../admin-ui';

type Props = { onClose: () => void; onApplied: () => void };
const modeConfig = {
    FULL: { label: 'Номенклатура', endpoint: '/api/admin/catalog-imports', template: '/api/admin/catalog-imports/template', accept: '.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', format: 'XLSX', limits: '15 МБ и 10 000 строк', hint: 'Создаёт и полностью обновляет товары по SKU.' },
    PRICE: { label: 'Цены', endpoint: '/api/admin/catalog-imports/prices', template: '/api/admin/catalog-imports/templates/prices', accept: '.csv,text/csv', format: 'CSV', limits: '5 МБ и 50 000 строк', hint: 'Изменяет только розничную цену и валюту.' },
    STOCK: { label: 'Остатки', endpoint: '/api/admin/catalog-imports/stock', template: '/api/admin/catalog-imports/templates/stock', accept: '.csv,text/csv', format: 'CSV', limits: '5 МБ и 50 000 строк', hint: 'Изменяет только абсолютный остаток. Статус наличия не меняется.' },
} satisfies Record<CatalogImportMode, { label: string; endpoint: string; template: string; accept: string; format: string; limits: string; hint: string }>;

export function CatalogImportPanel({ onClose, onApplied }: Props) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [mode, setMode] = useState<CatalogImportMode>('FULL');
    const [history, setHistory] = useState<CatalogImportDto[]>([]);
    const [current, setCurrent] = useState<CatalogImportDto | null>(null);
    const [busy, setBusy] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const config = modeConfig[mode];

    const loadHistory = useCallback(async () => {
        const response = await fetch(`/api/admin/catalog-imports?mode=${mode}`, { cache: 'no-store' });
        if (!response.ok) return;
        const result = await response.json() as { items: CatalogImportDto[] };
        setHistory(result.items);
    }, [mode]);

    useEffect(() => { setCurrent(null); setMessage(null); void loadHistory(); }, [loadHistory]);

    async function upload(file: File) {
        setBusy(true); setMessage(null); setCurrent(null);
        try {
            const formData = new FormData(); formData.set('file', file);
            const response = await fetch(config.endpoint, { method: 'POST', body: formData });
            const result = await response.json() as { import?: CatalogImportDto; error?: string };
            if (!response.ok || !result.import) throw new Error(result.error || 'Не удалось проверить файл.');
            setCurrent(result.import); await loadHistory();
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось проверить файл.'); }
        finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
    }

    async function applyImport() {
        if (!current) return;
        setBusy(true); setMessage(null);
        try {
            const response = await fetch(`/api/admin/catalog-imports/${current.id}/apply`, { method: 'POST' });
            const result = await response.json() as { error?: string };
            if (!response.ok) throw new Error(result.error || 'Не удалось применить импорт.');
            setMessage('Импорт успешно применён.'); await loadHistory(); onApplied();
            const detail = await fetch(`/api/admin/catalog-imports/${current.id}`, { cache: 'no-store' });
            if (detail.ok) setCurrent(((await detail.json()) as { import: CatalogImportDto }).import);
        } catch (error) { setMessage(error instanceof Error ? error.message : 'Не удалось применить импорт.'); }
        finally { setBusy(false); }
    }

    async function cancelImport() {
        if (!current) return;
        setBusy(true);
        const response = await fetch(`/api/admin/catalog-imports/${current.id}/cancel`, { method: 'POST' });
        if (response.ok) { setCurrent(null); setMessage('Импорт отменён.'); await loadHistory(); }
        else setMessage(((await response.json()) as { error?: string }).error || 'Не удалось отменить импорт.');
        setBusy(false);
    }

    return <section className="mt-6 rounded-[1.5rem] border border-accent/20 bg-accent/3 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4"><SectionTitle title="Импорт данных каталога" description="Файл сначала проверяется. База изменяется только после подтверждения." /><button type="button" onClick={onClose} className="rounded-lg p-2 text-dark-grey hover:bg-grey" aria-label="Закрыть импорт"><X className="size-5" /></button></div>
        <div className="mt-5 flex flex-wrap gap-2">{(Object.keys(modeConfig) as CatalogImportMode[]).map((item) => <button key={item} type="button" disabled={busy} onClick={() => setMode(item)} className={cn('rounded-lg px-4 py-2 text-sm font-semibold', mode === item ? 'bg-accent text-white' : 'border border-grey bg-white text-black')}>{modeConfig[item].label}</button>)}</div>
        <p className="mt-3 text-sm text-dark-grey">{config.hint}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm"><a href={config.template} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-grey bg-white px-4 font-semibold"><Download className="size-4" />Скачать шаблон {config.label.toLowerCase()}</a><span className="self-center text-dark-grey">{config.format}, не более {config.limits}</span></div>
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const file = event.dataTransfer.files[0]; if (file) void upload(file); }} className={cn('mt-5 flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-white px-6 text-center transition-colors', dragging ? 'border-accent bg-accent/5' : 'border-grey', busy && 'cursor-wait opacity-70')}>{busy ? <LoaderCircle className="size-8 animate-spin text-accent" /> : <UploadCloud className="size-8 text-accent" />}<span className="mt-3 font-semibold">{busy ? 'Обработка файла…' : `Перетащите ${config.format} сюда или выберите файл`}</span><span className="mt-1 text-sm text-dark-grey">До подтверждения товары не изменяются</span></button>
        <input ref={inputRef} type="file" accept={config.accept} className="sr-only" onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
        {message ? <p className="mt-4 rounded-lg bg-white px-4 py-3 text-sm text-black">{message}</p> : null}
        {current ? <ImportPreview item={current} busy={busy} onApply={() => void applyImport()} onCancel={() => void cancelImport()} /> : null}
        <ImportHistory items={history} />
    </section>;
}

function ImportPreview({ item, busy, onApply, onCancel }: { item: CatalogImportDto; busy: boolean; onApply: () => void; onCancel: () => void }) {
    const errors = item.errors ?? [];
    const warnings = item.warnings ?? [];
    return <div className="mt-6 rounded-2xl border border-grey bg-white p-5"><div className="flex items-center gap-3">{item.errorCount ? <AlertTriangle className="size-6 text-red-600" /> : <CheckCircle2 className="size-6 text-green-600" />}<div><h3 className="font-semibold">Результат проверки</h3><p className="text-sm text-dark-grey">{item.fileName} · {item.totalRows} строк</p></div></div><div className="mt-4 grid gap-3 sm:grid-cols-3">{item.mode === 'FULL' ? <Metric icon={FileSpreadsheet} label="Новые" value={String(item.createdCount)} /> : null}<Metric icon={FileSpreadsheet} label="Обновятся" value={String(item.updatedCount)} /><Metric icon={CheckCircle2} label="Без изменений" value={String(item.unchangedCount)} /><Metric icon={AlertTriangle} label="Ошибки" value={String(item.errorCount)} /></div>
        {warnings.length ? <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-800"><p className="font-semibold">Предупреждения</p>{warnings.map((warning, index) => <p key={index} className="mt-1">Строка {warning.rowNumber}, SKU {warning.sku}: {warning.message}</p>)}</div> : null}
        {item.changes?.length ? <ChangePreview item={item} /> : null}
        {errors.length ? <div className="mt-5"><div className="flex items-center justify-between gap-3"><h4 className="font-semibold">Ошибки файла</h4><a className="text-sm font-semibold text-accent" href={`/api/admin/catalog-imports/${item.id}/errors?format=csv`}>Скачать CSV</a></div><div className="mt-3 max-h-72 overflow-auto rounded-xl border border-grey"><table className="w-full min-w-180 text-left text-sm"><thead className="sticky top-0 bg-grey"><tr><th className="px-3 py-2">Источник</th><th className="px-3 py-2">Строка</th><th className="px-3 py-2">SKU</th><th className="px-3 py-2">Поле</th><th className="px-3 py-2">Ошибка</th></tr></thead><tbody>{errors.map((error, index) => <tr key={error.id ?? index} className="border-t border-grey"><td className="px-3 py-2">{error.sheet}</td><td className="px-3 py-2">{error.rowNumber}</td><td className="px-3 py-2">{error.sku || '—'}</td><td className="px-3 py-2">{error.field || '—'}</td><td className="px-3 py-2 text-red-700">{error.message}</td></tr>)}</tbody></table></div></div> : null}
        <div className="mt-5 flex flex-wrap justify-end gap-3">{item.status === 'READY' ? <button type="button" disabled={busy} onClick={onCancel} className="rounded-lg border border-grey px-4 py-2 font-semibold">Отменить</button> : null}<button type="button" disabled={busy || item.status !== 'READY' || item.errorCount > 0} onClick={onApply} className="rounded-lg bg-accent px-5 py-2 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Применить импорт</button></div></div>;
}

function ChangePreview({ item }: { item: CatalogImportDto }) {
    return <div className="mt-5"><h4 className="font-semibold">Первые изменения</h4><div className="mt-3 max-h-64 overflow-auto rounded-xl border border-grey"><table className="w-full min-w-160 text-left text-sm"><thead className="sticky top-0 bg-grey"><tr><th className="px-3 py-2">SKU</th>{item.mode === 'PRICE' ? <><th className="px-3 py-2">Текущая цена</th><th className="px-3 py-2">Новая цена</th><th className="px-3 py-2">Валюта</th></> : <><th className="px-3 py-2">Текущий остаток</th><th className="px-3 py-2">Новый остаток</th><th className="px-3 py-2">Разница</th></>}</tr></thead><tbody>{item.changes?.map((change) => <tr key={change.sku} className="border-t border-grey"><td className="px-3 py-2 font-medium">{change.sku}</td>{item.mode === 'PRICE' ? <><td className="px-3 py-2">{change.currentPrice} {change.currentCurrency}</td><td className="px-3 py-2">{change.newPrice} {change.newCurrency}</td><td className="px-3 py-2">{change.currentCurrency} → {change.newCurrency}</td></> : <><td className="px-3 py-2">{change.currentStockQty}</td><td className="px-3 py-2">{change.newStockQty}</td><td className="px-3 py-2">{change.stockDifference && change.stockDifference > 0 ? '+' : ''}{change.stockDifference}</td></>}</tr>)}</tbody></table></div></div>;
}

function ImportHistory({ items }: { items: CatalogImportDto[] }) {
    return <div className="mt-7"><div className="flex items-center gap-2"><History className="size-5 text-accent" /><h3 className="font-semibold">Последние импорты</h3></div><div className="mt-3 overflow-x-auto rounded-xl border border-grey bg-white"><table className="w-full min-w-180 text-left text-sm"><thead className="bg-grey/60 text-xs uppercase text-dark-grey"><tr><th className="px-4 py-3">Файл</th><th className="px-4 py-3">Тип</th><th className="px-4 py-3">Статус</th><th className="px-4 py-3">Обновлено</th><th className="px-4 py-3">Ошибки</th><th className="px-4 py-3">Дата</th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-t border-grey"><td className="px-4 py-3 font-medium">{item.fileName}{item.duplicateOfId ? <span className="ml-2 text-xs text-amber-700">повтор #{item.duplicateOfId}</span> : null}</td><td className="px-4 py-3">{modeConfig[item.mode].label}</td><td className="px-4 py-3">{statusLabel[item.status]}</td><td className="px-4 py-3">{item.updatedCount}</td><td className="px-4 py-3">{item.errorCount}</td><td className="px-4 py-3 text-dark-grey">{new Date(item.createdAt).toLocaleString('ru-RU')}</td></tr>)}{items.length === 0 ? <tr><td colSpan={6} className="px-4 py-6 text-center text-dark-grey">Импортов пока нет.</td></tr> : null}</tbody></table></div></div>;
}

const statusLabel: Record<CatalogImportDto['status'], string> = { UPLOADED: 'Загружен', VALIDATING: 'Проверяется', READY: 'Готов', PROCESSING: 'Применяется', COMPLETED: 'Завершён', FAILED: 'Ошибка', CANCELLED: 'Отменён' };
