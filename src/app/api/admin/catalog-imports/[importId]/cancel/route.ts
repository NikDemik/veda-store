import { NextResponse } from 'next/server';
import { deleteCatalogImportFile } from '@/lib/catalog-import/file-storage';
import { parseImportId, requireCatalogImportUser } from '@/lib/catalog-import/api';
import { prisma } from '@/lib/prisma';

export async function POST(_request: Request, context: { params: Promise<{ importId: string }> }) {
    const user = await requireCatalogImportUser('STOCK');
    if (user instanceof NextResponse) return user;
    const id = parseImportId((await context.params).importId);
    if (!id) return NextResponse.json({ error: 'Некорректный ID импорта.' }, { status: 400 });
    const item = await prisma.catalogImport.findUnique({ where: { id }, select: { status: true, storageKey: true, mode: true } });
    if (!item) return NextResponse.json({ error: 'Импорт не найден.' }, { status: 404 });
    const modeUser = await requireCatalogImportUser(item.mode);
    if (modeUser instanceof NextResponse) return modeUser;
    if (!['UPLOADED', 'VALIDATING', 'READY'].includes(item.status)) return NextResponse.json({ error: 'Этот импорт уже нельзя отменить.' }, { status: 409 });
    await prisma.catalogImport.update({ where: { id }, data: { status: 'CANCELLED', completedAt: new Date() } });
    await deleteCatalogImportFile(item.storageKey);
    return NextResponse.json({ ok: true });
}
