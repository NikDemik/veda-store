import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) throw new Error('DATABASE_URL is not set');

const databaseUrl = new URL(connectionString);
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

const productTypes = [
    ['BUSBAR_BODY', 'Корпус шинопровода'],
    ['JOINT_COVER', 'Стыковая крышка'],
    ['CONNECT_TERMINAL', 'Соединительная клемма'],
    ['SLIDING_SUSPENSION', 'Скользящий подвес'],
    ['FIXED_SUSPENSION', 'Фиксирующий подвес'],
    ['CURRENT_COLLECTOR', 'Токосъёмник'],
    ['COLLECTOR_GRIP', 'Захват токосъёмника'],
    ['END_CAP', 'Концевая крышка'],
    ['POWER_FEED', 'Подвод питания'],
    ['POWER_TERMINAL', 'Клемма ввода питания'],
    ['LINEAR_POWER_FEED', 'Линейный подвод питания'],
    ['INSULATING_SECTION', 'Изолирующая секция'],
    ['SEALING_TAPE', 'Уплотнительная лента'],
    ['PACKAGE_COMPONENT', 'Компонент комплекта'],
];

const attributeDefinitions = [
    ['rated_current_a', 'Номинальный ток', 'NUMBER', 'А', true, 10],
    ['rated_voltage_v', 'Номинальное напряжение', 'NUMBER', 'В', true, 20],
    ['poles', 'Количество полюсов', 'NUMBER', null, true, 30],
    ['conductor_section_mm2', 'Сечение проводника', 'NUMBER', 'мм²', false, 40],
    ['section_length_m', 'Длина секции', 'NUMBER', 'м', false, 50],
    ['resistance_ohm_km', 'Сопротивление', 'NUMBER', 'Ω/км', false, 60],
    ['leakage_distance_mm', 'Расстояние утечки', 'NUMBER', 'мм', false, 70],
    ['cable_section_mm2', 'Сечение кабеля', 'NUMBER', 'мм²', false, 80],
    ['phase_spacing_mm', 'Межфазное расстояние', 'NUMBER', 'мм', false, 90],
    ['section_mm2', 'Сечение', 'NUMBER', 'мм²', false, 100],
];

const specCodeByName = new Map([
    ['количество полюсов', 'poles'],
    ['количество шин', 'poles'],
    ['сопротивление', 'resistance_ohm_km'],
    ['сечение проводника', 'conductor_section_mm2'],
    ['расст. утечки', 'leakage_distance_mm'],
    ['сечение кабеля', 'cable_section_mm2'],
    ['межфазное расстояние', 'phase_spacing_mm'],
    ['сечение', 'section_mm2'],
]);

const bodies = [
    { sku: '560814-А', model: 'HFP56-4-8/35', current: 35, section: 8, price: 2125, stock: 1048 },
    { sku: '561014-A', model: 'HFP56-4-10/50', current: 50, section: 10, price: 2279, stock: 1048 },
    { sku: '561214-A', model: 'HFP56-4-12/65', current: 65, section: 12, price: 2525, stock: 1048 },
    { sku: '561514-A', model: 'HFP56-4-15/80', current: 80, section: 15, price: 2898, stock: 1048 },
    { sku: '562024', model: 'HFP56-4-20/100', current: 100, section: 20, price: 3476, stock: 1048 },
    { sku: '562524', model: 'HFP56-4-25/120', current: 120, section: 25, price: 4280, stock: 1048 },
    { sku: '563524', model: 'HFP56-4-35/140', current: 140, section: 35, price: 5477, stock: 1048 },
    { sku: '565024', model: 'HFP56-4-50/170', current: 170, section: 50, price: 8107, stock: 1048 },
    { sku: '567024', model: 'HFP56-4-70/210', current: 210, section: 70, price: 10686, stock: 524 },
    { sku: '568034', model: 'HFP56-4-80/240', current: 240, section: 80, price: 13426, stock: 524 },
];

const accessories = [
    { sku: '563401', article: '56LJ-45', name: 'Стыковая крышка HFP56 56LJ-45', price: 366, stock: 1086, type: 'JOINT_COVER' },
    { sku: '563912', article: '56DJ-4', name: 'Скользящий подвес HFP56 56DJ-4', price: 222, stock: 3120, type: 'SLIDING_SUSPENSION' },
    { sku: '563902', article: '56DJ-3', name: 'Фиксирующий подвес HFP56 56DJ-3', price: 292, stock: 300, type: 'FIXED_SUSPENSION' },
    { sku: '560003', article: '56JT-140A', name: 'Соединительная клемма HFP56 56JT-140A', price: 319, stock: 2296, type: 'CONNECT_TERMINAL' },
    { sku: '560006', article: '56JT-210A', name: 'Соединительная клемма HFP56 56JT-210A', price: 421, stock: 1772, type: 'CONNECT_TERMINAL' },
    { sku: '560008', article: '56JT-240A', name: 'Соединительная клемма HFP56 56JT-240A', price: 647, stock: 574, type: 'CONNECT_TERMINAL' },
];




function parseNumber(value) {
    if (typeof value !== 'string' || !/^\s*-?\d+(?:[.,]\d+)?\s*$/.test(value)) return null;
    const parsed = Number(value.trim().replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : null;
}

function slugForBody(current) {
    return `trollejnyj-shinoprovod-hfp56-${current}a`;
}

async function upsertNumberValue(productId, attributeId, numberValue) {
    if (numberValue === null) return;
    await prisma.productAttributeValue.upsert({
        where: { productId_attributeId: { productId, attributeId } },
        update: { numberValue, textValue: null, booleanValue: null },
        create: { productId, attributeId, numberValue },
    });
}

async function main() {
    const typeIds = new Map();
    for (const [code, name] of productTypes) {
        const type = await prisma.productType.upsert({ where: { code }, update: { name }, create: { code, name } });
        typeIds.set(code, type.id);
    }

    const attributeIds = new Map();
    for (const [code, name, dataType, unit, isFilterable, sortOrder] of attributeDefinitions) {
        const attribute = await prisma.attributeDefinition.upsert({
            where: { code },
            update: { name, dataType, unit, isFilterable, sortOrder },
            create: { code, name, dataType, unit, isFilterable, sortOrder },
        });
        attributeIds.set(code, attribute.id);
    }

    const existingProducts = await prisma.product.findMany({ include: { specs: true } });
    for (const product of existingProducts) {
        const lowerName = product.name.toLowerCase();
        const inferredType = lowerName.includes('токосъёмник') || lowerName.includes('токосъемник')
            ? 'CURRENT_COLLECTOR'
            : lowerName.includes('шинопровод')
              ? 'BUSBAR_BODY'
              : null;
        if (inferredType && !product.productTypeId) {
            await prisma.product.update({ where: { id: product.id }, data: { productTypeId: typeIds.get(inferredType) } });
        }

        await upsertNumberValue(product.id, attributeIds.get('rated_current_a'), parseNumber(product.currentA));
        await upsertNumberValue(product.id, attributeIds.get('rated_voltage_v'), parseNumber(product.voltageV));
        for (const spec of product.specs) {
            const code = specCodeByName.get(spec.name.trim().toLowerCase());
            if (code) await upsertNumberValue(product.id, attributeIds.get(code), parseNumber(spec.value));
        }
    }

    const category = await prisma.category.findFirstOrThrow({ where: { slug: 'trollejnyj-shinoprovod' } });
    const series = await prisma.series.findFirstOrThrow({ where: { slug: 'hfp56' } });
    const pieceUnit = await prisma.unitMeasure.findFirstOrThrow({ where: { code: 'pcs' } });
    const meterUnit = await prisma.unitMeasure.findFirstOrThrow({ where: { code: 'm' } });
    const existingBody35 = await prisma.product.findFirst({
        where: { seriesId: series.id, currentA: '35', name: { contains: 'HFP56' } },
    });
    const brandId = existingBody35?.brandId ?? null;
    const bodyByCurrent = new Map();

    for (const body of bodies) {
        let product = body.current === 35 ? existingBody35 : null;
        if (!product) {
            product = await prisma.product.findFirst({
                where: { OR: [{ sku: body.sku }, { article: body.model }] },
            });
        }
        if (!product) {
            product = await prisma.product.create({
                data: {
                    categoryId: category.id, brandId, seriesId: series.id,
                    productTypeId: typeIds.get('BUSBAR_BODY'), unitMeasureId: meterUnit.id,
                    sku: body.sku, article: body.model,
                    name: `Троллейный шинопровод HFP56 ${body.current} А, ${body.model}`,
                    slug: slugForBody(body.current),
                    description: `Корпус троллейного шинопровода HFP56 на ${body.current} А, 4 полюса, секция 4 м.`,
                    status: 'ACTIVE', availability: 'IN_STOCK', price: body.price,
                    stockQty: body.stock, currentA: String(body.current), voltageV: '660',
                },
            });
        } else {
            product = await prisma.product.update({
                where: { id: product.id },
                data: {
                    ...(body.current === 35 ? {} : { sku: body.sku }),
                    productTypeId: typeIds.get('BUSBAR_BODY'),
                    unitMeasureId: meterUnit.id,
                    price: body.price,
                    stockQty: body.stock,
                    availability: 'IN_STOCK',
                },
            });
        }
        bodyByCurrent.set(body.current, product);
        await upsertNumberValue(product.id, attributeIds.get('rated_current_a'), body.current);
        await upsertNumberValue(product.id, attributeIds.get('poles'), 4);
        await upsertNumberValue(product.id, attributeIds.get('conductor_section_mm2'), body.section);
        await upsertNumberValue(product.id, attributeIds.get('section_length_m'), 4);
    }


    const accessoryByArticle = new Map();
    for (const accessory of accessories) {
        const product = await prisma.product.upsert({
            where: { sku: accessory.sku },
            update: {
                productTypeId: typeIds.get(accessory.type), unitMeasureId: pieceUnit.id,
                price: accessory.price, stockQty: accessory.stock, availability: 'IN_STOCK',
            },
            create: {
                categoryId: category.id,
                brandId,
                seriesId: series.id,
                productTypeId: typeIds.get(accessory.type),
                unitMeasureId: pieceUnit.id,
                sku: accessory.sku,
                article: accessory.article,
                name: accessory.name,
                slug: accessory.article.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
                description: `${accessory.name}.`,
                status: 'ACTIVE',
                availability: 'IN_STOCK',
                price: accessory.price,
                stockQty: accessory.stock,
            },
        });
        accessoryByArticle.set(accessory.article, product););
        }
    }


    const jointCover = accessoryByArticle.get('56LJ-45');
    const oldBolt = await prisma.product.findUnique({ where: { sku: 'HFP56-BOLT-JOINT-35-100' } });
    await prisma.productPackageItem.deleteMany({ where: { parentProductId: jointCover.id } });
    await prisma.productPackageItem.create({
        data: {
            parentProductId: jointCover.id,
            componentProductId: null,
            itemName: 'Болтовое соединение',
            quantity: 1,
            isIncluded: true,
            note: 'Информационная часть комплекта крышки 56LJ-45; отдельной номенклатурой не является',
        },
    });
    if (oldBolt) await prisma.product.delete({ where: { id: oldBolt.id } });

    console.log(`HFP56 catalog ready: ${bodies.length} bodies, ${accessories.length} accessories.`);
}

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => prisma.$disconnect());
