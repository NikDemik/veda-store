import { NextResponse } from 'next/server';
import { catalogImportSelect, parseImportId, requireCatalogImportUser, serializeImport } from '@/lib/catalog-import/api';
import { prisma } from '@/lib/prisma';

export async function GET(_request: Request, context: { params: Promise<{ importId: string }> }) {
    const user = await requireCatalogImportUser('STOCK');
    if (user instanceof NextResponse) return user;
    const id = parseImportId((await context.params).importId);
    if (!id) return NextResponse.json({ error: 'Некорректный ID импорта.' }, { status: 400 });
    const item = await prisma.catalogImport.findUnique({ where: { id }, select: { ...catalogImportSelect, errors: { orderBy: [{ sheet: 'asc' }, { rowNumber: 'asc' }], take: 100, select: { id: true, sheet: true, rowNumber: true, sku: true, field: true, sourceValue: true, message: true } } } });
    if (!item) return NextResponse.json({ error: 'Импорт не найден.' }, { status: 404 });
    const modeUser = await requireCatalogImportUser(item.mode);
    if (modeUser instanceof NextResponse) return modeUser;
    return NextResponse.json({ import: serializeImport(item) });
}
