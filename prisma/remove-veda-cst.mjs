import 'dotenv/config';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';
import { isExcludedCatalogDocument, removeExcludedCatalogDocuments } from '../src/config/catalogDocumentPolicy.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const apply = process.argv.includes('--apply');
assert.ok(process.argv.slice(2).every((argument) => ['--plan', '--apply'].includes(argument)));
const url = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host: url.hostname, port: Number(url.port || 3306), user: decodeURIComponent(url.username), password: decodeURIComponent(url.password), database: url.pathname.slice(1), allowPublicKeyRetrieval: true }) });
async function jsonFiles(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    return (await Promise.all(entries.map((entry) => entry.isDirectory() ? jsonFiles(path.join(directory, entry.name)) : entry.name.endsWith('.json') ? [path.join(directory, entry.name)] : []))).flat();
}
try {
    const edits = [];
    for (const file of [...await jsonFiles(path.join(root, 'content/products')), ...await jsonFiles(path.join(root, 'content/series'))]) {
        const original = JSON.parse(await fs.readFile(file, 'utf8'));
        const result = removeExcludedCatalogDocuments(original);
        if (result.removed) edits.push({ file, original, ...result });
    }
    const [assets, productDocuments, seriesDocuments, sources, series] = await Promise.all([
        prisma.catalogAsset.findMany(), prisma.productDocument.findMany(), prisma.seriesDocument.findMany(),
        prisma.productSource.findMany({ select: { id: true, payload: true } }),
        prisma.series.findMany({ select: { id: true, sourceSnapshot: true } }),
    ]);
    const assetIds = assets.filter(isExcludedCatalogDocument).map((asset) => asset.id);
    const productIds = productDocuments.filter((document) => isExcludedCatalogDocument(document) || assetIds.includes(document.assetId)).map((document) => document.id);
    const seriesIds = seriesDocuments.filter((document) => isExcludedCatalogDocument(document) || assetIds.includes(document.assetId)).map((document) => document.id);
    const sourceEdits = sources.map((source) => ({ ...source, ...removeExcludedCatalogDocuments(source.payload) })).filter((source) => source.removed);
    const seriesEdits = series.map((item) => ({ ...item, ...removeExcludedCatalogDocuments(item.sourceSnapshot) })).filter((item) => item.removed);
    for (const id of assetIds) {
        assert.ok(!await prisma.productImage.count({ where: { assetId: id } }), 'Excluded document is used as an image');
        assert.ok(!await prisma.seriesImage.count({ where: { assetId: id } }), 'Excluded document is used as a series image');
    }
    const plan = { localJsonFiles: edits.length, localDocumentReferences: edits.reduce((n, edit) => n + edit.removed, 0), productDocuments: productIds.length, seriesDocuments: seriesIds.length, catalogAssets: assetIds.length, productSources: sourceEdits.length, seriesSnapshots: seriesEdits.length };
    console.log(JSON.stringify({ plan, documents: assets.filter((asset) => assetIds.includes(asset.id)).map((asset) => asset.fileName) }, null, 2));
    if (apply) {
        await prisma.$transaction(async (tx) => {
            await tx.productDocument.deleteMany({ where: { id: { in: productIds } } });
            await tx.seriesDocument.deleteMany({ where: { id: { in: seriesIds } } });
            for (const source of sourceEdits) await tx.productSource.update({ where: { id: source.id }, data: { payload: source.cleaned } });
            for (const item of seriesEdits) await tx.series.update({ where: { id: item.id }, data: { sourceSnapshot: item.cleaned } });
            await tx.catalogAsset.deleteMany({ where: { id: { in: assetIds } } });
        }, { timeout: 60000 });
        for (const edit of edits) await fs.writeFile(edit.file, JSON.stringify(edit.cleaned, null, 2) + '\n', 'utf8');
        console.log('VEDA CST removed from catalog data and database snapshots.');
    }
} finally { await prisma.$disconnect(); }
