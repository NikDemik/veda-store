import { NextResponse } from 'next/server';
import { parseImportId, requireCatalogImportUser, safeImportError } from '@/lib/catalog-import/api';
import { readCatalogImportFile } from '@/lib/catalog-import/file-storage';
import { applyCatalogImportPlan, buildCatalogImportPlan, hashCatalogImportFile } from '@/lib/catalog-import/service';
import { applyCatalogCsvImportPlan, buildCatalogCsvImportPlan } from '@/lib/catalog-import/csv-service';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

export async function POST(_request: Request, context: { params: Promise<{ importId: string }> }) {
    const user = await requireCatalogImportUser('STOCK');
    if (user instanceof NextResponse) return user;
    const id = parseImportId((await context.params).importId);
    if (!id) return NextResponse.json({ error: 'Некорректный ID импорта.' }, { status: 400 });

    const importMode = await prisma.catalogImport.findUnique({ where: { id }, select: { mode: true } });
    if (!importMode) return NextResponse.json({ error: 'Импорт не найден.' }, { status: 404 });
    const modeUser = await requireCatalogImportUser(importMode.mode);
    if (modeUser instanceof NextResponse) return modeUser;

    try {
        await prisma.$transaction(async (tx) => {
            const current = await tx.catalogImport.findUnique({ where: { id }, select: { status: true, errorCount: true } });
            if (!current) throw new ImportConflict('Импорт не найден.', 404);
            if (current.status !== 'READY' || current.errorCount > 0) throw new ImportConflict('Применить можно только проверенный импорт без ошибок.', 409);
            const active = await tx.catalogImport.count({ where: { status: 'PROCESSING' } });
            if (active) throw new ImportConflict('Другой импорт номенклатуры уже выполняется.', 409);
            const claimed = await tx.catalogImport.updateMany({ where: { id, status: 'READY' }, data: { status: 'PROCESSING', startedAt: new Date(), errorMessage: null } });
            if (claimed.count !== 1) throw new ImportConflict('Состояние импорта изменилось. Обновите страницу.', 409);
        }, { isolationLevel: 'Serializable' });
    } catch (error) {
        if (error instanceof ImportConflict) return NextResponse.json({ error: error.message }, { status: error.status });
        return NextResponse.json({ error: safeImportError(error) }, { status: 409 });
    }

    try {
        const item = await prisma.catalogImport.findUniqueOrThrow({ where: { id }, select: { storageKey: true, fileHash: true, mode: true } });
        const buffer = await readCatalogImportFile(item.storageKey);
        if (hashCatalogImportFile(buffer) !== item.fileHash) throw new Error('Исходный файл импорта изменён.');
        const plan = item.mode === 'FULL'
            ? await buildCatalogImportPlan(buffer)
            : await buildCatalogCsvImportPlan(buffer, item.mode);
        if (plan.errors.length) {
            await prisma.$transaction([
                prisma.catalogImportError.deleteMany({ where: { importId: id } }),
                prisma.catalogImportError.createMany({ data: plan.errors.map((error) => ({ importId: id, ...error })) }),
                prisma.catalogImport.update({ where: { id }, data: { status: 'FAILED', errorCount: plan.errors.length, errorMessage: 'Повторная проверка обнаружила ошибки.', completedAt: new Date() } }),
            ]);
            return NextResponse.json({ error: 'Перед применением обнаружены ошибки. Загрузите исправленный файл.' }, { status: 409 });
        }
        if ('products' in plan) await applyCatalogImportPlan(plan);
        else await applyCatalogCsvImportPlan(plan);
        const completed = await prisma.catalogImport.update({ where: { id }, data: { status: 'COMPLETED', totalRows: plan.totalRows, createdCount: plan.createdCount, updatedCount: plan.updatedCount, unchangedCount: plan.unchangedCount, errorCount: 0, completedAt: new Date() }, select: { id: true, status: true, createdCount: true, updatedCount: true, unchangedCount: true, completedAt: true } });
        return NextResponse.json({ import: completed });
    } catch (error) {
        const message = safeImportError(error);
        await prisma.catalogImport.update({ where: { id }, data: { status: 'FAILED', errorMessage: message, completedAt: new Date() } });
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

class ImportConflict extends Error {
    constructor(message: string, readonly status: number) { super(message); }
}
