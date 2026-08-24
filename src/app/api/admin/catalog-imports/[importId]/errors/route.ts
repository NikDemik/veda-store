import { NextResponse } from 'next/server';
import { parseImportId, requireCatalogImportUser } from '@/lib/catalog-import/api';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, context: { params: Promise<{ importId: string }> }) {
    const user = await requireCatalogImportUser('STOCK');
    if (user instanceof NextResponse) return user;
    const id = parseImportId((await context.params).importId);
    if (!id) return NextResponse.json({ error: 'Некорректный ID импорта.' }, { status: 400 });
    const item = await prisma.catalogImport.findUnique({ where: { id }, select: { mode: true } });
    if (!item) return NextResponse.json({ error: 'Импорт не найден.' }, { status: 404 });
    const modeUser = await requireCatalogImportUser(item.mode);
    if (modeUser instanceof NextResponse) return modeUser;
    const errors = await prisma.catalogImportError.findMany({ where: { importId: id }, orderBy: [{ sheet: 'asc' }, { rowNumber: 'asc' }], select: { id: true, sheet: true, rowNumber: true, sku: true, field: true, sourceValue: true, message: true } });
    if (new URL(request.url).searchParams.get('format') !== 'csv') return NextResponse.json({ errors });
    const rows = [['sheet', 'row', 'sku', 'field', 'source_value', 'message'], ...errors.map((error) => [error.sheet, String(error.rowNumber), error.sku ?? '', error.field ?? '', error.sourceValue ?? '', error.message])];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`;
    return new NextResponse(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="catalog-import-${id}-errors.csv"` } });
}

function csvCell(value: string) {
    const safe = /^[=+\-@]/.test(value) ? `'${value}` : value;
    return `"${safe.replaceAll('"', '""')}"`;
}
