import { NextResponse } from 'next/server';
import { requireCatalogImportUser } from '@/lib/catalog-import/api';
import { createCatalogCsvTemplate } from '@/lib/catalog-import/csv-service';
export async function GET() { const user = await requireCatalogImportUser('STOCK'); if (user instanceof NextResponse) return user; return new NextResponse(createCatalogCsvTemplate('STOCK'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="stock_update.csv"', 'Cache-Control': 'private, no-store' } }); }
