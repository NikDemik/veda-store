import { NextResponse } from 'next/server';
import { requireCatalogImportUser } from '@/lib/catalog-import/api';
import { createCatalogImportTemplate } from '@/lib/catalog-import/template';

export const runtime = 'nodejs';

export async function GET() {
    const user = await requireCatalogImportUser();
    if (user instanceof NextResponse) return user;
    try {
        const buffer = await createCatalogImportTemplate();
        return new NextResponse(buffer, { headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'Content-Disposition': 'attachment; filename="pricat.xlsx"', 'Cache-Control': 'private, no-store' } });
    } catch {
        return NextResponse.json({ error: 'Шаблон импорта не найден.' }, { status: 404 });
    }
}
