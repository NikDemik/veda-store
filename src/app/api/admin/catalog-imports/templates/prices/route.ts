import { NextResponse } from 'next/server';
import { requireCatalogImportUser } from '@/lib/catalog-import/api';
import { createCatalogCsvTemplate } from '@/lib/catalog-import/csv-service';
export async function GET() { const user = await requireCatalogImportUser('PRICE'); if (user instanceof NextResponse) return user; return new NextResponse(createCatalogCsvTemplate('PRICE'), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="price_update.csv"', 'Cache-Control': 'private, no-store' } }); }
