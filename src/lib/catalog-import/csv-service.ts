import { catalogCsvHeaders, catalogImportConfig } from '@/config/catalogImport';
import { prisma } from '@/lib/prisma';
import type { CatalogImportChangeDto, CatalogImportErrorDto, CatalogImportMode } from '@/types/catalog-import';
import { issue } from './parse-xlsx';

type CsvMode = Extract<CatalogImportMode, 'PRICE' | 'STOCK'>;
type PriceRow = { rowNumber: number; sku: string; price: number; currency: string };
type StockRow = { rowNumber: number; sku: string; stockQty: number };

export type CatalogCsvImportPlan = {
    mode: CsvMode;
    priceRows: PriceRow[];
    stockRows: StockRow[];
    errors: CatalogImportErrorDto[];
    warnings: CatalogImportErrorDto[];
    changes: CatalogImportChangeDto[];
    totalRows: number;
    createdCount: 0;
    updatedCount: number;
    unchangedCount: number;
};

export async function buildCatalogCsvImportPlan(buffer: Buffer, mode: CsvMode): Promise<CatalogCsvImportPlan> {
    const errors: CatalogImportErrorDto[] = [];
    const warnings: CatalogImportErrorDto[] = [];
    if (buffer.includes(0)) errors.push(issue(sheetName(mode), 1, null, null, null, 'CSV содержит недопустимый NUL-байт.'));
    let text = '';
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, ''); }
    catch { errors.push(issue(sheetName(mode), 1, null, null, null, 'CSV должен быть сохранён в UTF-8.')); }
    const parsed = parseCsv(text, errors, mode);
    const expected = catalogCsvHeaders[mode];
    const headers = parsed[0]?.map((value) => value.trim().toLowerCase()) ?? [];
    validateHeaders(headers, expected, mode, errors);
    const dataRows = parsed.slice(1).filter((row) => row.some((value) => value.trim() !== ''));
    if (!headers.length) errors.push(issue(sheetName(mode), 1, null, null, null, 'В CSV отсутствует строка заголовков.'));
    if (!dataRows.length) errors.push(issue(sheetName(mode), 2, null, null, null, 'CSV не содержит строк данных.'));
    if (dataRows.length > catalogImportConfig.csvMaxRows) errors.push(issue(sheetName(mode), 1, null, null, String(dataRows.length), `В CSV больше ${catalogImportConfig.csvMaxRows} строк.`));

    const priceRows: PriceRow[] = [];
    const stockRows: StockRow[] = [];
    const seen = new Map<string, number>();
    for (let index = 0; index < dataRows.length; index += 1) {
        const rowNumber = index + 2;
        const row = dataRows[index];
        if (row.length !== expected.length) { errors.push(issue(sheetName(mode), rowNumber, row[0]?.trim() || null, null, row.join(','), `Ожидалось ${expected.length} колонок, получено ${row.length}.`)); continue; }
        const sku = row[0].trim();
        if (!sku) { errors.push(issue(sheetName(mode), rowNumber, null, 'sku', row[0], 'SKU обязателен.')); continue; }
        if (sku.length > 191) { errors.push(issue(sheetName(mode), rowNumber, sku, 'sku', sku, 'SKU длиннее 191 символа.')); continue; }
        if (seen.has(sku)) { errors.push(issue(sheetName(mode), rowNumber, sku, 'sku', sku, `SKU уже указан в строке ${seen.get(sku)}.`)); continue; }
        seen.set(sku, rowNumber);
        if (mode === 'PRICE') {
            const rawPrice = row[1].trim();
            const currency = row[2].trim().toUpperCase();
            if (!/^\d+(?:[.,]\d{1,2})?$/.test(rawPrice)) errors.push(issue('Prices', rowNumber, sku, 'price', rawPrice, 'Цена должна быть неотрицательным числом с точностью не более двух знаков.'));
            const price = Number(rawPrice.replace(',', '.'));
            if (!Number.isFinite(price) || price > 9_999_999_999.99) errors.push(issue('Prices', rowNumber, sku, 'price', rawPrice, 'Цена выходит за пределы Decimal(12, 2).'));
            if (!/^[A-Z]{3}$/.test(currency)) errors.push(issue('Prices', rowNumber, sku, 'currency', row[2], 'Валюта должна состоять из трёх латинских букв.'));
            if (/^\d+(?:[.,]\d{1,2})?$/.test(rawPrice) && Number.isFinite(price) && price <= 9_999_999_999.99 && /^[A-Z]{3}$/.test(currency)) {
                priceRows.push({ rowNumber, sku, price, currency });
                if (price === 0) warnings.push(issue('Prices', rowNumber, sku, 'price', rawPrice, 'Цена равна нулю. Проверьте значение перед применением.'));
            }
        } else {
            const rawStock = row[1].trim();
            if (!/^\d+$/.test(rawStock)) errors.push(issue('Stock', rowNumber, sku, 'stock_qty', rawStock, 'Остаток должен быть целым неотрицательным числом.'));
            const stockQty = Number(rawStock);
            if (!Number.isSafeInteger(stockQty) || stockQty > 2_147_483_647) errors.push(issue('Stock', rowNumber, sku, 'stock_qty', rawStock, 'Остаток выходит за допустимый диапазон.'));
            if (/^\d+$/.test(rawStock) && Number.isSafeInteger(stockQty) && stockQty <= 2_147_483_647) stockRows.push({ rowNumber, sku, stockQty });
        }
    }

    const rows = mode === 'PRICE' ? priceRows : stockRows;
    const products = await prisma.product.findMany({ where: { sku: { in: rows.map((row) => row.sku) } }, select: { sku: true, price: true, currency: true, stockQty: true } });
    const productsBySku = new Map(products.map((product) => [product.sku, product]));
    const changes: CatalogImportChangeDto[] = [];
    let updatedCount = 0;
    let unchangedCount = 0;
    for (const row of rows) {
        const product = productsBySku.get(row.sku);
        if (!product) { errors.push(issue(sheetName(mode), row.rowNumber, row.sku, 'sku', row.sku, 'Товар с таким SKU не найден.')); continue; }
        if (mode === 'PRICE' && 'price' in row) {
            const currentPrice = Number(product.price);
            if (currentPrice === row.price && product.currency === row.currency) unchangedCount += 1;
            else { updatedCount += 1; if (changes.length < 100) changes.push({ sku: row.sku, currentPrice, newPrice: row.price, currentCurrency: product.currency, newCurrency: row.currency }); }
        } else if ('stockQty' in row) {
            if (product.stockQty === row.stockQty) unchangedCount += 1;
            else { updatedCount += 1; if (changes.length < 100) changes.push({ sku: row.sku, currentStockQty: product.stockQty, newStockQty: row.stockQty, stockDifference: row.stockQty - product.stockQty }); }
        }
    }
    return { mode, priceRows, stockRows, errors, warnings, changes, totalRows: dataRows.length, createdCount: 0, updatedCount, unchangedCount };
}

export async function applyCatalogCsvImportPlan(plan: CatalogCsvImportPlan) {
    const rows = plan.mode === 'PRICE' ? plan.priceRows : plan.stockRows;
    for (let offset = 0; offset < rows.length; offset += catalogImportConfig.csvBatchSize) {
        const batch = rows.slice(offset, offset + catalogImportConfig.csvBatchSize);
        await prisma.$transaction(batch.map((row) => plan.mode === 'PRICE' && 'price' in row
            ? prisma.product.update({ where: { sku: row.sku }, data: { price: row.price, currency: row.currency }, select: { id: true } })
            : prisma.product.update({ where: { sku: row.sku }, data: { stockQty: 'stockQty' in row ? row.stockQty : 0 }, select: { id: true } })));
    }
}

export function createCatalogCsvTemplate(mode: CsvMode) {
    return Buffer.from(`\uFEFF${catalogCsvHeaders[mode].join(',')}\r\n`, 'utf8');
}

function parseCsv(text: string, errors: CatalogImportErrorDto[], mode: CsvMode) {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = '';
    let quoted = false;
    for (let index = 0; index < text.length; index += 1) {
        const character = text[index];
        if (quoted) {
            if (character === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
            else if (character === '"') quoted = false;
            else field += character;
        } else if (character === '"' && field === '') quoted = true;
        else if (character === ',') { row.push(field); field = ''; }
        else if (character === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
        else if (character !== '\r') field += character;
    }
    if (quoted) errors.push(issue(sheetName(mode), Math.max(1, rows.length + 1), null, null, null, 'В CSV не закрыта кавычка.'));
    if (field !== '' || row.length) { row.push(field); rows.push(row); }
    return rows;
}

function validateHeaders(headers: string[], expected: readonly string[], mode: CsvMode, errors: CatalogImportErrorDto[]) {
    const seen = new Set<string>();
    headers.forEach((header) => { if (!header) errors.push(issue(sheetName(mode), 1, null, null, null, 'Обнаружен пустой заголовок.')); else if (seen.has(header)) errors.push(issue(sheetName(mode), 1, null, header, header, `Заголовок «${header}» указан несколько раз.`)); else seen.add(header); });
    for (const header of expected) if (!headers.includes(header)) errors.push(issue(sheetName(mode), 1, null, header, null, `Отсутствует обязательная колонка «${header}».`));
    for (const header of headers) if (header && !expected.includes(header)) errors.push(issue(sheetName(mode), 1, null, header, header, `Неизвестная колонка «${header}».`));
    if (headers.length !== expected.length || headers.some((header, index) => header !== expected[index])) errors.push(issue(sheetName(mode), 1, null, null, headers.join(','), `Ожидаемый порядок заголовков: ${expected.join(',')}.`));
}

function sheetName(mode: CsvMode) { return mode === 'PRICE' ? 'Prices' : 'Stock'; }
