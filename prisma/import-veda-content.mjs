import 'dotenv/config';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { Prisma, PrismaClient } from '@prisma/client';
import { S3Client, HeadObjectCommand, PutObjectCommand, CreateMultipartUploadCommand, UploadPartCommand, CompleteMultipartUploadCommand, AbortMultipartUploadCommand } from '@aws-sdk/client-s3';
import { vedaImportCategories, vedaImportProductTypes, vedaImportAttributes, vedaImportLoadModes, vedaImportPanelSkus } from '../src/data/catalog/veda-import.mjs';
import { removeExcludedCatalogDocuments } from '../src/config/catalogDocumentPolicy.mjs';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const contentRoot = path.join(projectRoot, 'content');
const reportRoot = path.join(projectRoot, 'storage/catalog-imports');
const hash = (value) => createHash('sha256').update(value).digest('hex');
const decimal = (value) => new Prisma.Decimal(value);
const seriesSlug = (id) => id.toLowerCase();

export function parseSourceNumber(value) {
    if (typeof value !== 'string') return null;
    const clean = value.trim().replace(/[\s\u00a0\u202f]/g, '');
    return /^-?\d+(?:[.,]\d+)?$/.test(clean) ? decimal(clean.replace(',', '.')) : null;
}

export function parseSourcePrice(price, vatRate = 22) {
    const raw = price?.raw?.trim() ?? '';
    if (!raw || raw === 'Товар закончился') return null;
    assert.equal(price.currency, 'RUB', 'Unexpected source currency');
    const net = parseSourceNumber(raw.replace(/(?:₽|руб\.?)\s*$/u, ''));
    assert.ok(net?.isPositive(), `Unrecognized source price: ${raw}`);
    assert.equal(price.tax, 'без НДС', 'Source tax basis must be explicit');
    return net.mul(decimal(100).add(vatRate)).div(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP);
}

export function parseSourceAvailability(text) {
    if (text.includes('Архивный продукт')) return { availability: 'DISCONTINUED', stockQty: 0 };
    if (text.includes('временно недоступен')) return { availability: 'OUT_OF_STOCK', stockQty: 0 };
    if (text.includes('Под заказ')) return { availability: 'BACKORDER', stockQty: 0 };
    const remainder = text.match(/Осталось\s+(\d+)\s+шт\./);
    if (remainder) return { availability: 'IN_STOCK', stockQty: Number(remainder[1]) };
    if (text.includes('На складе в Москве')) return { availability: 'IN_STOCK', stockQty: 0 };
    throw new Error(`Unrecognized source availability: ${text}`);
}

function characteristic(product, names) {
    const candidates = product.characteristics.filter((c) => (Array.isArray(names) ? names : [names]).includes(c.name));
    const values = [...new Set(candidates.map((c) => c.value))];
    return values.length === 1 ? values[0] : null;
}

export function normalizeProduct(product, indexEntry) {
    const characteristics = product.characteristics;
    assert.ok(Array.isArray(characteristics), `Missing characteristics: ${product.sku}`);
    assert.equal(product.sku, indexEntry.sku);
    assert.ok(/^[A-Za-z0-9-]+$/.test(product.sku), `Unsafe SKU: ${product.sku}`);
    const price = parseSourcePrice(product.price);
    const availability = parseSourceAvailability(product.availability);
    const typeCode = /^Плата расширения/i.test(product.title) ? 'EXPANSION_BOARD' : vedaImportPanelSkus.includes(product.sku) || /пульт оператора/i.test(product.title) ? 'OPERATOR_PANEL' : product.seriesId === 'VF-400' ? 'INVERTER_MODULE' : 'FREQUENCY_CONVERTER';
    const categorySlug = typeCode === 'EXPANSION_BOARD' ? 'platy-rasshireniya-veda' : typeCode === 'OPERATOR_PANEL' ? 'paneli-operatora-veda' : typeCode === 'INVERTER_MODULE' ? 'modulnye-resheniya-vf-400' : 'preobrazovateli-chastoty-veda-vfd';
    const dimensionsRaw = characteristic(product, ['ВхШхГ, мм', 'Габарит, Ш*Г*В (мм)']);
    const dims = dimensionsRaw?.split(/[хx*×]/i).map(parseSourceNumber);
    const dimensions = dims?.length === 3 && dims.every((n) => n?.isPositive())
        ? characteristic(product, 'ВхШхГ, мм') ? { heightMm: dims[0], widthMm: dims[1], depthMm: dims[2] } : { widthMm: dims[0], depthMm: dims[1], heightMm: dims[2] }
        : {};
    const attributes = vedaImportAttributes.flatMap((definition) => {
        const raw = characteristic(product, definition.source);
        if (!raw) return [];
        if (definition.dataType === 'TEXT') return [{ code: definition.code, textValue: raw }];
        const numberValue = parseSourceNumber(raw);
        return numberValue === null ? [] : [{ code: definition.code, numberValue }];
    });
    const operatingRatings = vedaImportLoadModes.flatMap((load) => {
        const powerKw = parseSourceNumber(characteristic(product, load.power));
        const currentA = parseSourceNumber(characteristic(product, load.current));
        return powerKw === null && currentA === null ? [] : [{ mode: load.mode, powerKw, currentA }];
    });
    const power = parseSourceNumber(characteristic(product, 'Выходная мощность, кВт'));
    // Keep the complete primary JSON, including alternate collection contexts.
    // The same URL/hash can occur under more than one series in the source.
    const snapshotsByKey = new Map();
    for (const snapshot of [product, ...(product.sourceVariants ?? [])]) {
        const source = snapshot.source;
        assert.match(source.sha256, /^[a-f0-9]{64}$/);
        const data = { url: source.url, urlHash: hash(source.url), contentHash: source.sha256, collectedAt: new Date(source.collectedAt), payload: snapshot };
        assert.ok(Number.isFinite(data.collectedAt.getTime()));
        const key = `${data.urlHash}:${data.contentHash}`;
        if (!snapshotsByKey.has(key)) snapshotsByKey.set(key, data);
    }
    const sources = [...snapshotsByKey.values()];
    return {
        raw: product, typeCode, categorySlug, attributes, operatingRatings, sources,
        seriesIds: [...new Set(indexEntry.seriesIds)],
        data: {
            sku: product.sku, slug: `veda-${product.sku.toLowerCase()}`, name: product.title,
            model: product.model || null, description: product.description || null,
            status: 'DRAFT', price: price ?? decimal(0), priceOnRequest: price === null,
            vatRate: decimal(22), currency: 'RUB', ...availability,
            isSellable: price !== null && !['DISCONTINUED', 'OUT_OF_STOCK'].includes(availability.availability),
            voltageV: characteristic(product, ['Входное напряжение, В', 'Напряжение, В']),
            currentA: characteristic(product, 'Номинальный выходной ток, А'),
            powerW: power?.mul(1000).toString() ?? null,
            protectionClassIp: characteristic(product, ['Степень защиты', 'Степень защиты корпуса', 'Cтепень защиты корпуса']),
            weightKg: parseSourceNumber(characteristic(product, 'Масса, кг')), ...dimensions,
        },
    };
}

function localAssetPath(asset) {
    const absolute = path.resolve(contentRoot, asset.localPath);
    assert.ok(absolute.startsWith(contentRoot + path.sep), 'Asset path escapes content');
    return absolute;
}

export async function loadCatalog() {
    const index = JSON.parse(await fs.readFile(path.join(contentRoot, 'products/index.json'), 'utf8'));
    assert.equal(new Set(index.map((p) => p.sku)).size, index.length, 'Duplicate SKU in index');
    const series = await Promise.all((await fs.readdir(path.join(contentRoot, 'series'))).filter((f) => f.endsWith('.json')).map(async (f) => removeExcludedCatalogDocuments(JSON.parse(await fs.readFile(path.join(contentRoot, 'series', f), 'utf8'))).cleaned));
    const products = await Promise.all(index.map(async (entry) => {
        const file = path.resolve(contentRoot, entry.file);
        assert.ok(file.startsWith(path.join(contentRoot, 'products') + path.sep), 'Product path escapes content/products');
        return normalizeProduct(removeExcludedCatalogDocuments(JSON.parse(await fs.readFile(file, 'utf8'))).cleaned, entry);
    }));
    const assets = new Map();
    for (const item of [...series, ...products.flatMap((p) => p.sources.map((s) => s.payload))]) {
        for (const asset of [...item.images, ...item.documents]) {
            assert.match(asset.sha256, /^[a-f0-9]{64}$/);
            const previous = assets.get(asset.sha256);
            assert.ok(!previous || previous.bytes === asset.bytes, 'Inconsistent asset hash/size');
            if (!previous) assets.set(asset.sha256, asset);
        }
    }
    const knownSeries = new Set(series.map((s) => s.id));
    for (const product of products) for (const id of product.seriesIds) assert.ok(knownSeries.has(id), `Missing series ${id}`);
    return { products, series, assets };
}

function createPrisma() {
    const url = new URL(process.env.DATABASE_URL);
    return new PrismaClient({ adapter: new PrismaMariaDb({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), allowPublicKeyRetrieval: true, connectionLimit: 5 }) });
}

function storageConfig() {
    for (const name of ['YANDEX_STORAGE_BUCKET', 'YANDEX_STORAGE_ACCESS_KEY_ID', 'YANDEX_STORAGE_SECRET_ACCESS_KEY']) assert.ok(process.env[name], `${name} is required`);
    const endpoint = process.env.YANDEX_STORAGE_ENDPOINT || 'https://storage.yandexcloud.net';
    const bucket = process.env.YANDEX_STORAGE_BUCKET;
    return {
        bucket,
        publicBaseUrl: (process.env.YANDEX_STORAGE_PUBLIC_BASE_URL || `${endpoint}/${bucket}`).replace(/\/+$/, ''),
        client: new S3Client({ endpoint, region: process.env.YANDEX_STORAGE_REGION || 'ru-central1', forcePathStyle: process.env.YANDEX_STORAGE_FORCE_PATH_STYLE === 'true', credentials: { accessKeyId: process.env.YANDEX_STORAGE_ACCESS_KEY_ID, secretAccessKey: process.env.YANDEX_STORAGE_SECRET_ACCESS_KEY } }),
    };
}

function assetMime(asset) {
    const ext = path.extname(asset.localPath).toLowerCase();
    if (ext === '.zip') return 'application/zip';
    if (ext === '.rar') return 'application/vnd.rar';
    if (ext === '.dwg') return 'image/vnd.dwg';
    return asset.contentType || 'application/octet-stream';
}

async function uploadAsset(config, asset) {
    const file = localAssetPath(asset);
    const stat = await fs.stat(file);
    assert.equal(stat.size, asset.bytes, `Asset size mismatch: ${asset.localPath}`);
    const digest = createHash('sha256');
    for await (const chunk of createReadStream(file)) digest.update(chunk);
    assert.equal(digest.digest('hex'), asset.sha256, `Asset hash mismatch: ${asset.localPath}`);
    const key = `catalog/veda/sha256/${asset.sha256}${path.extname(file).toLowerCase()}`;
    const parameters = { Bucket: config.bucket, Key: key };
    let exists = false;
    try {
        const head = await config.client.send(new HeadObjectCommand(parameters));
        assert.equal(head.ContentLength, asset.bytes, 'Existing object has a different size');
        assert.equal(head.Metadata?.sha256, asset.sha256, 'Existing object has a different hash');
        exists = true;
    } catch (error) {
        if (error.$metadata?.httpStatusCode !== 404) throw error;
    }
    const mimeType = assetMime(asset);
    if (!exists) {
        const metadata = { ...parameters, ContentType: mimeType, Metadata: { sha256: asset.sha256 }, CacheControl: 'public, max-age=31536000, immutable' };
        if (asset.bytes <= 64 * 1024 * 1024) {
            await config.client.send(new PutObjectCommand({ ...metadata, Body: createReadStream(file), ContentLength: asset.bytes }));
        } else {
            const started = await config.client.send(new CreateMultipartUploadCommand(metadata));
            assert.ok(started.UploadId);
            const upload = { ...parameters, UploadId: started.UploadId };
            try {
                const parts = [];
                const chunkSize = 16 * 1024 * 1024;
                for (let offset = 0; offset < asset.bytes; offset += chunkSize) {
                    const length = Math.min(chunkSize, asset.bytes - offset);
                    const partNumber = parts.length + 1;
                    const result = await config.client.send(new UploadPartCommand({ ...upload, PartNumber: partNumber, Body: createReadStream(file, { start: offset, end: offset + length - 1 }), ContentLength: length }));
                    parts.push({ PartNumber: partNumber, ETag: result.ETag });
                }
                await config.client.send(new CompleteMultipartUploadCommand({ ...upload, MultipartUpload: { Parts: parts } }));
            } catch (error) {
                await config.client.send(new AbortMultipartUploadCommand(upload)).catch(() => {});
                throw error;
            }
        }
        const head = await config.client.send(new HeadObjectCommand(parameters));
        assert.equal(head.ContentLength, asset.bytes);
        assert.equal(head.Metadata?.sha256, asset.sha256);
    }
    return {
        sha256: asset.sha256, url: `${config.publicBaseUrl}/${key}`, storageKey: key,
        sourceUrl: asset.sourceUrl, fileName: path.basename(file).replace(/^[a-f0-9]{12}-/, ''),
        mimeType, size: asset.bytes, downloadedAt: new Date(asset.downloadedAt),
    };
}

async function uploadAssets(catalog, prisma) {
    const config = storageConfig();
    const entries = [...catalog.assets.values()];
    const rows = new Map();
    let next = 0;
    let completed = 0;
    let failure;
    try {
        await Promise.all(Array.from({ length: 3 }, async () => {
            while (!failure) {
                const asset = entries[next++];
                if (!asset) return;
                try {
                    const data = await uploadAsset(config, asset);
                    const stored = await prisma.$transaction(async (tx) => {
                        const previous = await tx.catalogAsset.findUnique({ where: { sha256: asset.sha256 } });
                        if (previous && previous.url !== data.url) {
                            assert.equal(previous.storageKey, '', 'Existing asset belongs to a different storage location');
                            await tx.productImage.updateMany({ where: { assetId: previous.id }, data: { url: data.url } });
                            await tx.productDocument.updateMany({ where: { assetId: previous.id }, data: { url: data.url, storageKey: data.storageKey } });
                            await tx.product.updateMany({ where: { imageUrl: previous.url }, data: { imageUrl: data.url } });
                            await tx.series.updateMany({ where: { imageUrl: previous.url }, data: { imageUrl: data.url } });
                            await tx.category.updateMany({ where: { imageUrl: previous.url }, data: { imageUrl: data.url } });
                        }
                        return tx.catalogAsset.upsert({ where: { sha256: asset.sha256 }, create: data, update: data });
                    }, { timeout: 30000 });
                    rows.set(asset.sha256, stored);
                    completed += 1;
                    if (completed % 10 === 0 || completed === entries.length) console.log(`Assets: ${completed}/${entries.length}`);
                } catch (error) { failure = error; }
            }
        }));
        if (failure) throw failure;
        return rows;
    } finally { config.client.destroy(); }
}

async function registerSourceAssets(catalog, prisma) {
    const rows = new Map();
    for (const asset of catalog.assets.values()) {
        const url = new URL(asset.sourceUrl);
        assert.equal(url.protocol, 'https:');
        assert.equal(url.hostname, 'drives.ru', 'Unexpected asset source host');
        const data = {
            sha256: asset.sha256, url: asset.sourceUrl, storageKey: '', sourceUrl: asset.sourceUrl,
            fileName: path.basename(asset.localPath).replace(/^[a-f0-9]{12}-/, ''), mimeType: assetMime(asset),
            size: asset.bytes, downloadedAt: new Date(asset.downloadedAt),
        };
        const row = await prisma.catalogAsset.upsert({ where: { sha256: asset.sha256 }, create: data, update: {} });
        rows.set(asset.sha256, row);
    }
    return rows;
}

function uniqueAssets(items) { return [...new Map(items.map((item) => [item.sha256, item])).values()]; }
function documentGroup(value) { return value?.replace(/expand_more/g, '').trim() || null; }

async function createReferences(prisma, catalog, assets) {
    const categoryIds = new Map();
    for (const category of vedaImportCategories) {
        const data = { name: category.name, slug: category.slug, parentId: category.parent ? categoryIds.get(category.parent) : null };
        const row = await prisma.category.upsert({ where: { slug: data.slug }, create: data, update: {} });
        categoryIds.set(data.slug, row.id);
    }
    const brand = await prisma.brand.upsert({ where: { slug: 'veda' }, create: { name: 'VEDA', slug: 'veda' }, update: {} });
    const unit = await prisma.unitMeasure.upsert({ where: { code: 'pcs' }, create: { code: 'pcs', name: 'Штука', shortName: 'шт.' }, update: {} });
    assert.ok(unit.isActive, 'Unit pcs is disabled');
    const typeIds = new Map();
    for (const type of vedaImportProductTypes) {
        const row = await prisma.productType.upsert({ where: { code: type.code }, create: type, update: {} });
        assert.ok(row.isActive, `Product type ${type.code} is disabled`);
        typeIds.set(type.code, row.id);
    }
    const attributeIds = new Map();
    for (const [sortOrder, definition] of vedaImportAttributes.entries()) {
        const { source, ...data } = definition;
        const row = await prisma.attributeDefinition.upsert({ where: { code: data.code }, create: { ...data, isFilterable: true, sortOrder: 100 + sortOrder }, update: {} });
        assert.equal(row.dataType, data.dataType, `Attribute type mismatch: ${data.code}`);
        attributeIds.set(data.code, row.id);
    }
    const family = await prisma.series.upsert({ where: { slug: 'vf-101' }, create: { slug: 'vf-101', name: 'VF-101' }, update: {} });
    const seriesIds = new Map();
    for (const series of catalog.series) {
        const data = { slug: seriesSlug(series.id), name: series.id, description: series.description || null, parentId: series.id.startsWith('VF-101-') ? family.id : null, imageUrl: series.images[0] ? assets.get(series.images[0].sha256).url : null, sourceSnapshot: series };
        const row = await prisma.series.upsert({ where: { slug: data.slug }, create: data, update: {} });
        seriesIds.set(series.id, row.id);
        for (const [sortOrder, document] of uniqueAssets(series.documents).entries()) {
            const assetId = assets.get(document.sha256).id;
            const data = { seriesId: row.id, assetId, title: document.title, group: documentGroup(document.group), sortOrder };
            await prisma.seriesDocument.upsert({ where: { seriesId_assetId: { seriesId: row.id, assetId } }, create: data, update: {} });
        }
        for (const [sortOrder, image] of uniqueAssets(series.images).entries()) {
            const assetId = assets.get(image.sha256).id;
            const data = { seriesId: row.id, assetId, altText: image.alt || series.title, sortOrder };
            await prisma.seriesImage.upsert({ where: { seriesId_assetId: { seriesId: row.id, assetId } }, create: data, update: {} });
        }
    }
    for (const [slug, seriesId] of [['preobrazovateli-chastoty-veda-vfd', 'VF-101-HBC'], ['modulnye-resheniya-vf-400', 'VF-400'], ['paneli-operatora-veda', 'VF-500']]) {
        const series = catalog.series.find((s) => s.id === seriesId);
        if (series?.images[0]) await prisma.category.updateMany({ where: { id: categoryIds.get(slug), imageUrl: null }, data: { imageUrl: assets.get(series.images[0].sha256).url } });
    }
    const sourceSeriesIds = new Map(catalog.series.map((s) => [s.source.url, seriesIds.get(s.id)]));
    return { categoryIds, brandId: brand.id, unitId: unit.id, typeIds, attributeIds, seriesIds, sourceSeriesIds };
}

async function createProduct(prisma, product, refs, assets) {
    return prisma.$transaction(async (tx) => {
        const inheritedSeriesId = (asset) => {
            if (!asset.inheritedFrom) return null;
            const seriesId = refs.sourceSeriesIds.get(asset.inheritedFrom);
            assert.ok(seriesId, `Unknown inherited source ${asset.inheritedFrom}`);
            return seriesId;
        };
        const images = uniqueAssets(product.raw.images).map((image, sortOrder) => ({ assetId: assets.get(image.sha256).id, url: assets.get(image.sha256).url, altText: image.alt || product.raw.title, sortOrder, isPrimary: sortOrder === 0, inheritedFromSeriesId: inheritedSeriesId(image) }));
        const documents = uniqueAssets(product.raw.documents).map((document, sortOrder) => {
            const asset = assets.get(document.sha256);
            return { assetId: asset.id, title: document.title, group: documentGroup(document.group), url: asset.url, fileName: asset.fileName, mimeType: asset.mimeType, size: asset.size, storageKey: asset.storageKey, sortOrder, inheritedFromSeriesId: inheritedSeriesId(document) };
        });
        return tx.product.create({
            data: {
                ...product.data, categoryId: refs.categoryIds.get(product.categorySlug), brandId: refs.brandId,
                seriesId: refs.seriesIds.get(product.raw.seriesId), productTypeId: refs.typeIds.get(product.typeCode), unitMeasureId: refs.unitId,
                imageUrl: images[0]?.url || null,
                specs: { create: product.raw.characteristics.map((spec, sortOrder) => ({ name: spec.name, value: spec.value, sortOrder })) },
                attributeValues: { create: product.attributes.map(({ code, ...values }) => ({ attributeId: refs.attributeIds.get(code), ...values })) },
                operatingRatings: { create: product.operatingRatings }, sources: { create: product.sources },
                seriesMemberships: { create: product.seriesIds.map((id) => ({ seriesId: refs.seriesIds.get(id) })) },
                images: { create: images }, documents: { create: documents },
            },
            select: { id: true, sku: true },
        });
    }, { timeout: 30000 });
}

export async function verifyCatalog(prisma, catalog) {
    let sourceCount = 0;
    let specCount = 0;
    let ratingCount = 0;
    const ids = [];
    for (const product of catalog.products) {
        const row = await prisma.product.findUniqueOrThrow({ where: { sku: product.data.sku }, include: { category: true, productType: true, specs: { orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }] }, sources: true, attributeValues: { include: { attribute: true } }, seriesMemberships: { include: { series: true } }, operatingRatings: true, images: { include: { asset: true } }, documents: { include: { asset: true } } } });
        assert.equal(row.status, 'DRAFT');
        assert.equal(row.isSellable, product.data.isSellable);
        assert.equal(row.category.slug, product.categorySlug);
        assert.equal(row.productType.code, product.typeCode);
        assert.equal(row.price.toFixed(2), product.data.price.toFixed(2), `Price mismatch: ${row.sku}`);
        assert.equal(row.priceOnRequest, product.data.priceOnRequest);
        assert.equal(row.vatRate.toNumber(), 22);
        assert.equal(row.model, product.data.model);
        assert.equal(row.availability, product.data.availability);
        assert.equal(row.stockQty, product.data.stockQty);
        assert.deepEqual(row.specs.map((s) => ({ name: s.name, value: s.value })), product.raw.characteristics, `Specs mismatch: ${row.sku}`);
        assert.deepEqual(row.seriesMemberships.map((s) => s.series.slug).sort(), product.seriesIds.map(seriesSlug).sort());
        assert.equal(row.images.length, uniqueAssets(product.raw.images).length);
        assert.equal(row.documents.length, uniqueAssets(product.raw.documents).length);
        for (const [items, expected] of [[row.images, uniqueAssets(product.raw.images)], [row.documents, uniqueAssets(product.raw.documents)]]) {
            assert.deepEqual(items.map((item) => item.asset.sha256).sort(), expected.map((item) => item.sha256).sort());
            for (const item of items) assert.equal(item.url, item.asset.url);
        }
        assert.equal(row.attributeValues.length, product.attributes.length);
        for (const attribute of product.attributes) {
            const stored = row.attributeValues.find((v) => v.attribute.code === attribute.code);
            assert.ok(stored, `Missing attribute: ${row.sku}/${attribute.code}`);
            assert.equal(stored.textValue, attribute.textValue ?? null);
            assert.equal(stored.numberValue?.toString() ?? null, attribute.numberValue?.toString() ?? null);
        }
        for (const source of product.sources) {
            const stored = row.sources.find((s) => s.urlHash === source.urlHash && s.contentHash === source.contentHash);
            assert.ok(stored, `Missing source: ${row.sku}`);
            assert.deepEqual(stored.payload, source.payload);
        }
        for (const rating of product.operatingRatings) {
            const stored = row.operatingRatings.find((r) => r.mode === rating.mode);
            assert.ok(stored, `Missing rating: ${row.sku}/${rating.mode}`);
            assert.equal(stored.powerKw?.toString() ?? null, rating.powerKw?.toString() ?? null);
            assert.equal(stored.currentA?.toString() ?? null, rating.currentA?.toString() ?? null);
        }
        ids.push(row.id);
        sourceCount += product.sources.length;
        specCount += row.specs.length;
        ratingCount += row.operatingRatings.length;
    }
    return { products: ids.length, specs: specCount, sources: sourceCount, operatingRatings: ratingCount, priceOnRequest: catalog.products.filter((p) => p.data.priceOnRequest).length, productIds: ids };
}

async function main() {
    const argumentsSet = new Set(process.argv.slice(2));
    for (const argument of argumentsSet) assert.ok(['--plan', '--apply', '--verify', '--upload-assets'].includes(argument), `Unknown argument: ${argument}`);
    assert.ok(['--plan', '--apply', '--verify'].filter((mode) => argumentsSet.has(mode)).length <= 1, 'Choose one mode');
    assert.ok(!argumentsSet.has('--upload-assets') || argumentsSet.has('--apply'), '--upload-assets requires --apply');
    const catalog = await loadCatalog();
    const prisma = createPrisma();
    try {
        if (argumentsSet.has('--verify')) {
            const { productIds, ...result } = await verifyCatalog(prisma, catalog);
            console.log(JSON.stringify({ verified: result }, null, 2));
            return;
        }
        const existing = await prisma.product.findMany({ where: { sku: { in: catalog.products.map((p) => p.data.sku) } }, select: { id: true, sku: true, sources: { select: { urlHash: true, contentHash: true } } } });
        const existingBySku = new Map(existing.map((p) => [p.sku, p]));
        for (const product of catalog.products) {
            const current = existingBySku.get(product.data.sku);
            if (current) assert.ok(product.sources.every((s) => current.sources.some((c) => c.urlHash === s.urlHash && c.contentHash === s.contentHash)), `SKU collision or changed source, refusing overwrite: ${product.data.sku}`);
        }
        const plan = {
            source: 'content/products/index.json', products: catalog.products.length, create: catalog.products.length - existing.length, skip: existing.length,
            status: 'DRAFT', vatRate: 22, series: catalog.series.length, assets: catalog.assets.size,
            assetMode: argumentsSet.has('--upload-assets') ? 'OBJECT_STORAGE' : 'SOURCE_URLS',
            assetBytes: [...catalog.assets.values()].reduce((sum, a) => sum + a.bytes, 0),
            specs: catalog.products.reduce((sum, p) => sum + p.raw.characteristics.length, 0),
            sources: catalog.products.reduce((sum, p) => sum + p.sources.length, 0),
            priceOnRequest: catalog.products.filter((p) => p.data.priceOnRequest).length,
        };
        console.log(JSON.stringify({ plan }, null, 2));
        if (!argumentsSet.has('--apply')) return;
        const assets = argumentsSet.has('--upload-assets') ? await uploadAssets(catalog, prisma) : await registerSourceAssets(catalog, prisma);
        const refs = await createReferences(prisma, catalog, assets);
        let created = 0;
        for (const product of catalog.products) {
            if (existingBySku.has(product.data.sku)) continue;
            await createProduct(prisma, product, refs, assets);
            created += 1;
            if (created % 50 === 0) console.log(`Products created: ${created}/${plan.create}`);
        }
        const verification = await verifyCatalog(prisma, catalog);
        const report = { importedAt: new Date().toISOString(), plan, created, skipped: existing.length, verification };
        await fs.mkdir(reportRoot, { recursive: true });
        await fs.writeFile(path.join(reportRoot, 'veda-content-import-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
        console.log(JSON.stringify({ completed: { ...verification, productIds: undefined }, created, skipped: existing.length }, null, 2));
    } finally { await prisma.$disconnect(); }
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) main().catch((error) => { console.error(error.message); process.exitCode = 1; });
