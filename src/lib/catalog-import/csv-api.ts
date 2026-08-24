import { NextResponse } from 'next/server';
import { catalogImportConfig } from '@/config/catalogImport';
import { catalogImportSelect, requireCatalogImportUser, safeImportError, serializeImport } from './api';
import { saveCatalogImportFile } from './file-storage';
import { buildCatalogCsvImportPlan } from './csv-service';
import { hashCatalogImportFile } from './service';
import { prisma } from '@/lib/prisma';

export async function handleCatalogCsvUpload(request: Request, mode: 'PRICE' | 'STOCK') {
    const user = await requireCatalogImportUser(mode);
    if (user instanceof NextResponse) return user;
    let formData: FormData;
    try { formData = await request.formData(); } catch { return NextResponse.json({ error: 'Некорректные multipart-данные.' }, { status: 400 }); }
    const file = formData.get('file');
    if (!(file instanceof File)) return NextResponse.json({ error: 'Выберите CSV-файл.' }, { status: 400 });
    if (!file.name.toLowerCase().endsWith('.csv')) return NextResponse.json({ error: 'Допускаются только файлы .csv.' }, { status: 400 });
    if (!catalogImportConfig.csvMimeTypes.has(file.type)) return NextResponse.json({ error: 'Некорректный MIME-тип CSV-файла.' }, { status: 400 });
    if (file.size <= 0 || file.size > catalogImportConfig.csvMaxFileSize) return NextResponse.json({ error: 'Размер CSV должен быть от 1 байта до 5 МБ.' }, { status: 400 });
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileHash = hashCatalogImportFile(buffer);
    const storageKey = await saveCatalogImportFile(buffer, 'csv');
    const duplicate = await prisma.catalogImport.findFirst({ where: { fileHash, mode }, orderBy: { createdAt: 'desc' }, select: { id: true } });
    const record = await prisma.catalogImport.create({ data: { fileName: file.name.slice(0, 191), fileSize: file.size, fileHash, storageKey, mode, uploadedById: user.id, duplicateOfId: duplicate?.id, status: 'VALIDATING' }, select: { id: true } });
    try {
        const plan = await buildCatalogCsvImportPlan(buffer, mode);
        if (plan.errors.length) await prisma.catalogImportError.createMany({ data: plan.errors.map((error) => ({ importId: record.id, ...error })) });
        const saved = await prisma.catalogImport.update({ where: { id: record.id }, data: { status: plan.errors.length ? 'FAILED' : 'READY', totalRows: plan.totalRows, createdCount: 0, updatedCount: plan.updatedCount, unchangedCount: plan.unchangedCount, errorCount: plan.errors.length, errorMessage: plan.errors.length ? 'Исправьте ошибки файла и загрузите его повторно.' : null, completedAt: plan.errors.length ? new Date() : null }, select: { ...catalogImportSelect, errors: { orderBy: { rowNumber: 'asc' }, take: 100, select: { id: true, sheet: true, rowNumber: true, sku: true, field: true, sourceValue: true, message: true } } } });
        return NextResponse.json({ import: { ...serializeImport(saved), changes: plan.changes, warnings: plan.warnings.slice(0, 100) } }, { status: 201 });
    } catch (error) {
        const message = safeImportError(error);
        await prisma.catalogImport.update({ where: { id: record.id }, data: { status: 'FAILED', errorMessage: message, completedAt: new Date() } });
        return NextResponse.json({ error: message, importId: record.id }, { status: 400 });
    }
}
