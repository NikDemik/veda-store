import 'dotenv/config';
import path from 'node:path';
import process from 'node:process';
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

const workbookPath = path.resolve(process.cwd(), 'docs', 'Anneng.xlsx');

const productTypeDefinitions = new Map([
    ['Секция', ['BUSBAR_BODY', 'Корпус шинопровода']],
    ['Токосъемник', ['CURRENT_COLLECTOR', 'Токосъёмник']],
    ['Щетка', ['COLLECTOR_BRUSH', 'Щётка токосъёмника']],
    ['Захват токосъёмника', ['COLLECTOR_GRIP', 'Захват токосъёмника']],
    ['Крышка стыковая', ['JOINT_COVER', 'Стыковая крышка']],
    ['Подвес скользящий', ['SLIDING_SUSPENSION', 'Скользящий подвес']],
    ['Подвес фиксирующий', ['FIXED_SUSPENSION', 'Фиксирующий подвес']],
    ['Клемма соединительная', ['CONNECT_TERMINAL', 'Соединительная клемма']],
    ['Подвод питания', ['POWER_FEED', 'Подвод питания']],
    ['Клемма ввода питания', ['POWER_TERMINAL', 'Клемма ввода питания']],
    ['Крышка концевая', ['END_CAP', 'Концевая крышка']],
    ['Подвод питания линейный', ['LINEAR_POWER_FEED', 'Линейный подвод питания']],
    ['Уплотнительная лента', ['SEALING_TAPE', 'Уплотнительная лента']],
    ['Изолирующая секция', ['INSULATING_SECTION', 'Изолирующая секция']],
]);

function unwrapCellValue(value) {
    if (value && typeof value === 'object') {
        if ('result' in value) return unwrapCellValue(value.result);
        if ('error' in value) return null;
        if ('text' in value) return value.text;
        if ('hyperlink' in value) return value.hyperlink;
        if (Array.isArray(value.richText)) return value.richText.map((item) => item.text).join('');
    }
    return value;
}

function textValue(value) {
    const unwrapped = unwrapCellValue(value);
    if (unwrapped === null || unwrapped === undefined) return null;
    const text = String(unwrapped).trim();
    return text || null;
}

function numberValue(value) {
    const unwrapped = unwrapCellValue(value);
    if (typeof unwrapped === 'number' && Number.isFinite(unwrapped)) return unwrapped;
    if (typeof unwrapped !== 'string') return null;
    const parsed = Number(unwrapped.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

function slugPart(value) {
    return value
        .toLowerCase()
        .replaceAll('а', 'a')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
}

function normalizedCodeKey(value) {
    return value.toUpperCase().replace(/[АВСЕНКМОРТХ]/g, (letter) => ({
        А: 'A', В: 'B', С: 'C', Е: 'E', Н: 'H', К: 'K', М: 'M', О: 'O', Р: 'P', Т: 'T', Х: 'X',
    })[letter]);
}

function inferType(typeName, productName) {
    if (typeName && productTypeDefinitions.has(typeName)) return productTypeDefinitions.get(typeName);
    const name = productName.toLowerCase();
    if (name.includes('токосъёмник') || name.includes('токосъемник')) return productTypeDefinitions.get('Токосъемник');
    if (name.includes('щетк') || name.includes('щётк')) return productTypeDefinitions.get('Щетка');
    return ['ACCESSORY', 'Комплектующее'];
}

function extractCurrent(productName) {
    const match = productName.match(/(\d+)\s*[аa](?![a-zа-я])/i);
    return match ? Number(match[1]) : null;
}

function extractPoles(productName) {
    const match = productName.match(/(\d+)\s*(?:жил(?:а|ы)?|полюс(?:а|ов)?)/i);
    return match ? Number(match[1]) : null;
}

function categorySlugForSeries(seriesName) {
    return seriesName.startsWith('HFP')
        ? 'trollejnyj-shinoprovod'
        : 'izolirovannye-kontaktnye-relsy-monotrollejnyj';
}

async function main() {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(workbookPath);
    const sourceSheet = workbook.getWorksheet('Основная');
    const priceSheet = workbook.getWorksheet('Прайс');
    if (!sourceSheet || !priceSheet) throw new Error('В Anneng.xlsx отсутствуют листы «Основная» или «Прайс».');

    const fallbackPrices = new Map();
    priceSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const code = textValue(row.getCell(1).value);
        const retailPrice = numberValue(row.getCell(7).value);
        if (code && retailPrice !== null) fallbackPrices.set(normalizedCodeKey(code), retailPrice);
    });

    const rows = [];
    sourceSheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        if (numberValue(row.getCell(1).value) === null) return;
        const code = textValue(row.getCell(3).value);
        const name = textValue(row.getCell(4).value);
        if (!code || !name) return;
        rows.push({
            rowNumber,
            code,
            barcode: textValue(row.getCell(2).value),
            name,
            fullName: textValue(row.getCell(5).value),
            brand: textValue(row.getCell(6).value) || 'Anneng',
            series: textValue(row.getCell(7).value),
            model: textValue(row.getCell(8).value),
            stockQty: Math.max(0, Math.trunc(numberValue(row.getCell(9).value) || 0)),
            unit: textValue(row.getCell(10).value),
            purchasePrice: numberValue(row.getCell(11).value),
            price: numberValue(row.getCell(12).value) ?? fallbackPrices.get(normalizedCodeKey(code)) ?? null,
            sourceCategory: textValue(row.getCell(13).value),
            sourceType: textValue(row.getCell(14).value),
            imageUrl: textValue(row.getCell(15).value),
        });
    });

    const codes = new Set();
    for (const row of rows) {
        if (codes.has(row.code)) throw new Error(`Дублирующийся код ${row.code}, строка ${row.rowNumber}.`);
        if (!row.series) throw new Error(`Не указана серия для кода ${row.code}, строка ${row.rowNumber}.`);
        if (!['м', 'шт'].includes(row.unit)) throw new Error(`Неизвестная единица «${row.unit}» для ${row.code}.`);
        codes.add(row.code);
    }

    const categoryBySlug = new Map();
    for (const definition of [
        {
            slug: 'trollejnyj-shinoprovod',
            name: 'Троллейный шинопровод',
        },
        {
            slug: 'izolirovannye-kontaktnye-relsy-monotrollejnyj',
            name: 'Изолированные контактные рельсы (монотроллей)',
        },
    ]) {
        const category = await prisma.category.upsert({
            where: { slug: definition.slug },
            update: { name: definition.name },
            create: definition,
        });
        categoryBySlug.set(definition.slug, category);
    }
    const unitByCode = new Map();
    for (const definition of [
        { code: 'm', name: 'Метр', shortName: 'м', sortOrder: 10 },
        { code: 'pcs', name: 'Штука', shortName: 'шт.', sortOrder: 20 },
    ]) {
        const unit = await prisma.unitMeasure.upsert({
            where: { code: definition.code },
            update: { ...definition, isActive: true },
            create: definition,
        });
        unitByCode.set(definition.code, unit);
    }

    const attributeIds = new Map();
    for (const definition of [
        { code: 'rated_current_a', name: 'Номинальный ток', unit: 'А', sortOrder: 10 },
        { code: 'poles', name: 'Количество полюсов', unit: null, sortOrder: 30 },
    ]) {
        const attribute = await prisma.attributeDefinition.upsert({
            where: { code: definition.code },
            update: { name: definition.name, dataType: 'NUMBER', unit: definition.unit, isFilterable: true, sortOrder: definition.sortOrder },
            create: { ...definition, dataType: 'NUMBER', isFilterable: true },
        });
        attributeIds.set(definition.code, attribute.id);
    }

    const brandByName = new Map();
    const seriesByName = new Map();
    const typeByCode = new Map();
    let created = 0;
    let updated = 0;
    let drafts = 0;
    const draftCodes = [];

    for (const row of rows) {
        let brand = brandByName.get(row.brand);
        if (!brand) {
            brand = await prisma.brand.upsert({
                where: { slug: slugPart(row.brand) },
                update: { name: row.brand },
                create: { name: row.brand, slug: slugPart(row.brand) },
            });
            brandByName.set(row.brand, brand);
        }
        let series = seriesByName.get(row.series);
        if (!series) {
            series = await prisma.series.upsert({
                where: { slug: slugPart(row.series) },
                update: { name: row.series },
                create: { name: row.series, slug: slugPart(row.series) },
            });
            seriesByName.set(row.series, series);
        }
        const [typeCode, typeName] = inferType(row.sourceType, row.name);
        let productType = typeByCode.get(typeCode);
        if (!productType) {
            productType = await prisma.productType.upsert({
                where: { code: typeCode },
                update: { name: typeName },
                create: { code: typeCode, name: typeName },
            });
            typeByCode.set(typeCode, productType);
        }

        const existing = await prisma.product.findUnique({ where: { sku: row.code }, select: { id: true, slug: true } });
        const currentA = extractCurrent(row.name);
        const price = row.price ?? 0;
        const status = row.price === null ? 'DRAFT' : 'ACTIVE';
        if (status === 'DRAFT') {
            drafts += 1;
            draftCodes.push(row.code);
        }
        const productData = {
            categoryId: categoryBySlug.get(categorySlugForSeries(row.series)).id,
            brandId: brand.id,
            seriesId: series.id,
            productTypeId: productType.id,
            unitMeasureId: unitByCode.get(row.unit === 'м' ? 'm' : 'pcs').id,
            sku: row.code,
            article: row.code,
            model: row.model,
            barcode: row.barcode,
            name: row.name,
            description: row.fullName || row.name,
            status,
            availability: row.stockQty > 0 ? 'IN_STOCK' : 'BACKORDER',
            price,
            purchasePrice: row.purchasePrice,
            stockQty: row.stockQty,
            currentA: currentA === null ? null : String(currentA),
            ...(row.imageUrl ? { imageUrl: row.imageUrl } : {}),
        };

        const product = existing
            ? await prisma.product.update({ where: { id: existing.id }, data: productData })
            : await prisma.product.create({
                  data: { ...productData, slug: `anneng-${slugPart(row.code)}` },
              });
        existing ? updated++ : created++;

        for (const [attributeCode, value] of [
            ['rated_current_a', currentA],
            ['poles', extractPoles(row.name)],
        ]) {
            if (value === null) continue;
            const attributeId = attributeIds.get(attributeCode);
            await prisma.productAttributeValue.upsert({
                where: { productId_attributeId: { productId: product.id, attributeId } },
                update: { numberValue: value, textValue: null, booleanValue: null },
                create: { productId: product.id, attributeId, numberValue: value },
            });
        }
    }

    console.log(
        JSON.stringify(
            { sourceRows: rows.length, created, updated, drafts, draftCodes, series: [...seriesByName.keys()] },
            null,
            2,
        ),
    );
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
