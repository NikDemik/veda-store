import { handleCatalogCsvUpload } from '@/lib/catalog-import/csv-api';
export const runtime = 'nodejs';
export async function POST(request: Request) { return handleCatalogCsvUpload(request, 'STOCK'); }
