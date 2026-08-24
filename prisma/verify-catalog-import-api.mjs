import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import ExcelJS from 'exceljs';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const databaseUrl = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host: databaseUrl.hostname, port: databaseUrl.port ? Number(databaseUrl.port) : 3306, user: decodeURIComponent(databaseUrl.username), password: decodeURIComponent(databaseUrl.password), database: databaseUrl.pathname.replace(/^\//, ''), allowPublicKeyRetrieval: true }) });
const baseUrl = process.env.CATALOG_IMPORT_TEST_URL || 'http://127.0.0.1:3100';
const createdImportIds = [];
let originalProduct = null;

async function main() {
    const unauthorized = await fetch(`${baseUrl}/api/admin/catalog-imports`);
    assert.equal(unauthorized.status, 401);
    const staff = await prisma.staffUser.findFirst({ where: { isActive: true, role: { in: ['SUPERADMIN', 'ADMIN', 'PROCUREMENT'] } }, select: { id: true, email: true, role: true } });
    assert.ok(staff, 'An active staff user with catalog import permission is required.');
    const product = await prisma.product.findFirst({ orderBy: { id: 'asc' }, include: { category: true, brand: true, series: true, productType: true, unitMeasure: true } });
    assert.ok(product?.productType, 'A product with a product type is required.');
    originalProduct = { id: product.id, price: product.price, currency: product.currency, stockQty: product.stockQty, availability: product.availability };
    const cookie = createCookie(staff);
    const workbookBuffer = await createWorkbook(product, cookie);

    const first = await uploadWorkbook(workbookBuffer, cookie, 'verify-catalog-import.xlsx');
    createdImportIds.push(first.id);
    assert.equal(first.status, 'READY', JSON.stringify(first.errors));
    assert.equal(first.errorCount, 0);
    assert.equal(first.createdCount, 0);
    assert.equal(first.updatedCount, 0);
    assert.equal(first.unchangedCount, 1);

    const beforeCount = await prisma.product.count();
    await apply(first.id, cookie);
    assert.equal(await prisma.product.count(), beforeCount, 'Import must not delete products absent from the file.');
    const repeatedApply = await fetch(`${baseUrl}/api/admin/catalog-imports/${first.id}/apply`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(repeatedApply.status, 409);

    const duplicate = await uploadWorkbook(workbookBuffer, cookie, 'verify-catalog-import-copy.xlsx');
    createdImportIds.push(duplicate.id);
    assert.equal(duplicate.duplicateOfId, first.id);
    const cancelled = await fetch(`${baseUrl}/api/admin/catalog-imports/${duplicate.id}/cancel`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(cancelled.status, 200);

    await verifyCsvTemplates(cookie);
    await verifyPriceImport(product, cookie);
    await verifyStockImport(product, cookie);
    console.log('Catalog import API verified: FULL, PRICE and STOCK preview, validation, apply and idempotency.');
}

async function verifyCsvTemplates(cookie) {
    for (const [name, header] of [['prices', 'sku,price,currency'], ['stock', 'sku,stock_qty']]) {
        const response = await fetch(`${baseUrl}/api/admin/catalog-imports/templates/${name}`, { headers: { Cookie: cookie } });
        if (response.status !== 200) assert.fail(await response.text());
        const content = Buffer.from(await response.arrayBuffer()).toString('utf8');
        assert.ok(content.startsWith(`\uFEFF${header}`), `${name} template must have a UTF-8 BOM and the expected header.`);
    }
}

async function verifyPriceImport(product, cookie) {
    const nextPrice = (Number(product.price) + 1).toFixed(2);
    const csv = `\uFEFFsku,price,currency\r\n${product.sku},${nextPrice},${product.currency}\r\n`;
    const preview = await uploadCsv('prices', csv, cookie, 'price-update.csv');
    assert.equal(preview.mode, 'PRICE');
    assert.equal(preview.status, 'READY', JSON.stringify(preview.errors));
    assert.equal(preview.updatedCount, 1);
    assert.equal(preview.changes.length, 1);
    await apply(preview.id, cookie);
    const changed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(Number(changed.price), Number(nextPrice));
    assert.equal(changed.currency, product.currency);
    assert.equal(decimalOrNull(changed.purchasePrice), decimalOrNull(product.purchasePrice));
    assert.equal(decimalOrNull(changed.priceOld), decimalOrNull(product.priceOld));

    const unchanged = await uploadCsv('prices', csv, cookie, 'price-unchanged.csv');
    assert.equal(unchanged.updatedCount, 0);
    assert.equal(unchanged.unchangedCount, 1);
    const unknown = await uploadCsv('prices', 'sku,price,currency\n000UNKNOWN,10.00,RUB\n', cookie, 'price-unknown.csv');
    assert.equal(unknown.status, 'FAILED');
    assert.equal(unknown.errors[0].sku, '000UNKNOWN');
    const invalid = await uploadCsv('prices', `sku,price,currency\n${product.sku},-1,RUB\n`, cookie, 'price-invalid.csv');
    assert.equal(invalid.status, 'FAILED');
}

async function verifyStockImport(product, cookie) {
    const nextStock = product.stockQty + 1;
    const csv = `sku,stock_qty\n${product.sku},${nextStock}\n`;
    const preview = await uploadCsv('stock', csv, cookie, 'stock-update.csv');
    assert.equal(preview.mode, 'STOCK');
    assert.equal(preview.status, 'READY', JSON.stringify(preview.errors));
    assert.equal(preview.updatedCount, 1);
    await apply(preview.id, cookie);
    const changed = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    assert.equal(changed.stockQty, nextStock);
    assert.equal(changed.availability, originalProduct.availability);

    const unchanged = await uploadCsv('stock', csv, cookie, 'stock-unchanged.csv');
    assert.equal(unchanged.updatedCount, 0);
    assert.equal(unchanged.unchangedCount, 1);
    const invalid = await uploadCsv('stock', `sku,stock_qty\n${product.sku},1.5\n`, cookie, 'stock-invalid.csv');
    assert.equal(invalid.status, 'FAILED');
}

async function apply(importId, cookie) {
    const response = await fetch(`${baseUrl}/api/admin/catalog-imports/${importId}/apply`, { method: 'POST', headers: { Cookie: cookie } });
    assert.equal(response.status, 200, await response.text());
}

async function uploadWorkbook(buffer, cookie, fileName) {
    const form = new FormData();
    form.set('file', new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), fileName);
    const response = await fetch(`${baseUrl}/api/admin/catalog-imports`, { method: 'POST', headers: { Cookie: cookie }, body: form });
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    return body.import;
}

async function uploadCsv(kind, content, cookie, fileName) {
    const form = new FormData();
    form.set('file', new Blob([content], { type: 'text/csv' }), fileName);
    const response = await fetch(`${baseUrl}/api/admin/catalog-imports/${kind}`, { method: 'POST', headers: { Cookie: cookie }, body: form });
    const body = await response.json();
    assert.equal(response.status, 201, JSON.stringify(body));
    createdImportIds.push(body.import.id);
    return body.import;
}

async function createWorkbook(product, cookie) {
    const templateResponse = await fetch(`${baseUrl}/api/admin/catalog-imports/template`, { headers: { Cookie: cookie } });
    assert.equal(templateResponse.status, 200);
    const template = new ExcelJS.Workbook();
    await template.xlsx.load(Buffer.from(await templateResponse.arrayBuffer()));
    const sheet = template.getWorksheet('Products');
    const headers = sheet.getRow(1).values.slice(1);
    const values = {
        sku: product.sku, article: product.article, barcode: product.barcode, name: product.name,
        slug: product.slug, description: product.description, category_slug: product.category.slug,
        brand_slug: product.brand?.slug, series_slug: product.series?.slug,
        product_type_code: product.productType.code, unit_code: product.unitMeasure.code,
        model: product.model, seo_title: product.seoTitle, meta_description: product.metaDescription,
        status: product.status, availability: product.availability, vat_rate: Number(product.vatRate),
        price: Number(product.price), purchase_price: product.purchasePrice == null ? null : Number(product.purchasePrice),
        price_old: product.priceOld == null ? null : Number(product.priceOld), currency: product.currency,
        stock_qty: product.stockQty, min_order_qty: product.minOrderQty, step_qty: product.stepQty,
        popularity_weight: product.popularityWeight, lead_time_days: product.leadTimeDays,
        warranty_months: product.warrantyMonths, datasheet_url: product.datasheetUrl, image_url: product.imageUrl,
        weight_kg: product.weightKg == null ? null : Number(product.weightKg), width_mm: product.widthMm == null ? null : Number(product.widthMm),
        height_mm: product.heightMm == null ? null : Number(product.heightMm), depth_mm: product.depthMm == null ? null : Number(product.depthMm),
        voltage_v: product.voltageV, current_a: product.currentA, power_w: product.powerW,
        frequency_hz: product.frequencyHz, protection_class_ip: product.protectionClassIp,
        operating_temp_from_c: product.operatingTempFromC, operating_temp_to_c: product.operatingTempToC,
        is_sellable: product.isSellable,
    };
    sheet.getRow(2).values = headers.map((header) => values[header] ?? null);
    return Buffer.from(await template.xlsx.writeBuffer());
}

function decimalOrNull(value) { return value == null ? null : Number(value); }

function createCookie(staff) {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'development-admin-session-secret';
    const body = Buffer.from(JSON.stringify({ staffUserId: staff.id, email: staff.email, role: staff.role, expiresAt: Date.now() + 3_600_000 })).toString('base64url');
    const signature = createHmac('sha256', secret).update(body).digest('base64url');
    return `admin_session=${body}.${signature}`;
}

async function cleanup() {
    if (originalProduct) await prisma.product.update({ where: { id: originalProduct.id }, data: { price: originalProduct.price, currency: originalProduct.currency, stockQty: originalProduct.stockQty, availability: originalProduct.availability } });
    if (!createdImportIds.length) return;
    const imports = await prisma.catalogImport.findMany({ where: { id: { in: createdImportIds } }, select: { storageKey: true } });
    await prisma.catalogImport.deleteMany({ where: { id: { in: createdImportIds } } });
    for (const item of imports) await fs.rm(path.resolve('storage', 'catalog-imports', item.storageKey), { force: true });
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => { await cleanup(); await prisma.$disconnect(); });
