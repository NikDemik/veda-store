import 'dotenv/config';
import assert from 'node:assert/strict';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const databaseUrl = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({
    adapter: new PrismaMariaDb({
        host: databaseUrl.hostname,
        port: databaseUrl.port ? Number(databaseUrl.port) : 3306,
        user: decodeURIComponent(databaseUrl.username),
        password: decodeURIComponent(databaseUrl.password),
        database: databaseUrl.pathname.replace(/^\//, ''),
        allowPublicKeyRetrieval: true,
    }),
});

function value(cellValue) {
    if (cellValue && typeof cellValue === 'object') {
        if ('result' in cellValue) return value(cellValue.result);
        if ('text' in cellValue) return cellValue.text;
    }
    return cellValue;
}

function textValue(cellValue) {
    const result = value(cellValue);
    return result === null || result === undefined ? null : String(result).trim() || null;
}

function numberValue(cellValue) {
    const result = value(cellValue);
    if (typeof result === 'number' && Number.isFinite(result)) return result;
    if (typeof result !== 'string') return null;
    const parsed = Number(result.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(path.resolve(process.cwd(), 'docs', 'Anneng.xlsx'));
    const sheet = workbook.getWorksheet('Основная');
    assert(sheet, 'Лист «Основная» не найден.');

    const sourceRows = [];
    sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1 || numberValue(row.getCell(1).value) === null) return;
        const sku = textValue(row.getCell(3).value);
        if (sku) sourceRows.push({
            sku,
            series: textValue(row.getCell(7).value),
            model: textValue(row.getCell(8).value),
            stockQty: Math.max(0, Math.trunc(numberValue(row.getCell(9).value) || 0)),
            unit: textValue(row.getCell(10).value),
        });
    });

    assert(sourceRows.length > 0, 'Anneng.xlsx does not contain product rows.');
    const products = await prisma.product.findMany({
        where: { sku: { in: sourceRows.map((row) => row.sku) } },
        select: { sku: true, model: true, stockQty: true, series: { select: { name: true } }, unitMeasure: { select: { code: true } } },
    });
    assert.equal(products.length, sourceRows.length, 'Не все позиции из Anneng.xlsx найдены в БД.');
    const productsBySku = new Map(products.map((product) => [product.sku, product]));
    for (const row of sourceRows) {
        const product = productsBySku.get(row.sku);
        assert(product, `Товар ${row.sku} отсутствует.`);
        assert.equal(product.series?.name, row.series, `Серия ${row.sku}`);
        assert.equal(product.model, row.model, `Модель ${row.sku}`);
        assert.equal(product.stockQty, row.stockQty, `Остаток ${row.sku}`);
        assert.equal(product.unitMeasure?.code, row.unit === 'м' ? 'm' : 'pcs', `Единица ${row.sku}`);
    }

    const draftProducts = await prisma.product.findMany({
        where: { sku: { in: sourceRows.map((row) => row.sku) }, status: 'DRAFT' },
        select: { sku: true },
    });
    console.log(
        `Anneng.xlsx import verified: ${sourceRows.length} products, ${new Set(sourceRows.map((row) => row.series)).size} series, ${draftProducts.length} drafts.`,
    );
} finally {
    await prisma.$disconnect();
}
