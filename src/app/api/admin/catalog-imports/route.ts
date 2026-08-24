import { NextResponse } from 'next/server';
import { catalogImportConfig } from '@/config/catalogImport';
import { catalogImportSelect, requireCatalogImportUser, safeImportError, serializeImport } from '@/lib/catalog-import/api';
import { saveCatalogImportFile } from '@/lib/catalog-import/file-storage';
import { buildCatalogImportPlan, hashCatalogImportFile } from '@/lib/catalog-import/service';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function GET(request: Request) {
    const url = new URL(request.url);
    const requestedMode = url.searchParams.get('mode');
    const mode = requestedMode === 'PRICE' || requestedMode === 'STOCK' || requestedMode === 'FULL' ? requestedMode : undefined;
    const user = await requireCatalogImportUser(mode ?? 'FULL');
    if (user instanceof NextResponse) return user;
    const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
    const pageSize = 20;
    const [items, total] = await Promise.all([
        prisma.catalogImport.findMany({ where: mode ? { mode } : undefined, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize, select: catalogImportSelect }),
        prisma.catalogImport.count({ where: mode ? { mode } : undefined }),
    ]);
    return NextResponse.json({ items: items.map(serializeImport), page, pageSize, total });
}

export async function POST(request: Request) {
    const user = await requireCatalogImportUser();
    if (user instanceof NextResponse) return user;
    let formData: FormData;
    try { formData = await request.formData(); } catch { return NextResponse.json({ error: 'Некорректные multipart-данные.' }, { status: 400 }); }
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Выберите XLSX-файл.' }, { status: 400 });
    if (!file.name.toLowerCase().endsWith('.xlsx')) return NextResponse.json({ error: 'Допускаются только файлы .xlsx.' }, { status: 400 });
    if (!catalogImportConfig.allowedMimeTypes.has(file.type)) return NextResponse.json({ error: 'Некорректный MIME-тип XLSX-файла.' }, { status: 400 });
    if (file.size <= 0 || file.size > catalogImportConfig.maxFileSize) return NextResponse.json({ error: 'Размер XLSX должен быть от 1 байта до 15 МБ.' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) return NextResponse.json({ error: 'Файл не является XLSX-архивом.' }, { status: 400 });
    const fileHash = hashCatalogImportFile(buffer);
    const storageKey = await saveCatalogImportFile(buffer);
    const duplicate = await prisma.catalogImport.findFirst({ where: { fileHash, mode: 'FULL' }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    const record = await prisma.catalogImport.create({ data: { fileName: file.name.slice(0, 191), fileSize: file.size, fileHash, storageKey, uploadedById: user.id, duplicateOfId: duplicate?.id, status: 'VALIDATING' }, select: { id: true } });
    try {
        const plan = await buildCatalogImportPlan(buffer);
        if (plan.errors.length) await prisma.catalogImportError.createMany({ data: plan.errors.map((error) => ({ importId: record.id, ...error })) });
        const saved = await prisma.catalogImport.update({ where: { id: record.id }, data: { status: plan.errors.length ? 'FAILED' : 'READY', totalRows: plan.totalRows, createdCount: plan.createdCount, updatedCount: plan.updatedCount, unchangedCount: plan.unchangedCount, errorCount: plan.errors.length, errorMessage: plan.errors.length ? 'Исправьте ошибки файла и загрузите его повторно.' : null, completedAt: plan.errors.length ? new Date() : null }, select: { ...catalogImportSelect, errors: { orderBy: [{ sheet: 'asc' }, { rowNumber: 'asc' }], take: 100, select: { id: true, sheet: true, rowNumber: true, sku: true, field: true, sourceValue: true, message: true } } } });
        return NextResponse.json({ import: serializeImport(saved) }, { status: 201 });
    } catch (error) {
        const message = safeImportError(error);
        await prisma.catalogImport.update({ where: { id: record.id }, data: { status: 'FAILED', errorMessage: message, completedAt: new Date() } });
        return NextResponse.json({ error: message, importId: record.id }, { status: 400 });
    }
}
