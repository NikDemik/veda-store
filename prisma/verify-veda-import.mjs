import assert from 'node:assert/strict';
import { loadCatalog, normalizeProduct, parseSourceNumber, parseSourcePrice, parseSourceAvailability } from './import-veda-content.mjs';
import { isExcludedCatalogDocument, removeExcludedCatalogDocuments } from '../src/config/catalogDocumentPolicy.mjs';

assert.ok(isExcludedCatalogDocument({ title: 'VEDA CST 1.8.zip' }));
assert.ok(isExcludedCatalogDocument({ sourceUrl: 'https://drives.ru/VEDA%20CST.pdf' }));
assert.ok(!isExcludedCatalogDocument({ title: 'VEDA VF-400 Руководство.pdf' }));
const policyFixture = removeExcludedCatalogDocuments({ documents: [{ title: 'VEDA CST.zip' }, { title: 'VEDA VF-400.pdf' }], sourceVariants: [{ documents: [{ title: 'Программа VEDA CST. Подключение.pdf' }] }] });
assert.equal(policyFixture.removed, 2);
assert.deepEqual(policyFixture.cleaned, { documents: [{ title: 'VEDA VF-400.pdf' }], sourceVariants: [{ documents: [] }] });

assert.equal(parseSourceNumber('1 234,5').toString(), '1234.5');
assert.equal(parseSourceNumber('380–480'), null);
assert.equal(parseSourceNumber('—'), null);
assert.equal(parseSourcePrice({ raw: '56 963,40 ₽', currency: 'RUB', tax: 'без НДС' }).toFixed(2), '69495.35');
assert.equal(parseSourcePrice({ raw: '' }), null);
assert.equal(parseSourcePrice({ raw: 'Товар закончился' }), null);
assert.throws(() => parseSourcePrice({ raw: '100 ₽', currency: 'RUB', tax: '' }));
assert.deepEqual(parseSourceAvailability('Артикул: TESTНа складе в Москве'), { availability: 'IN_STOCK', stockQty: 0 });
assert.deepEqual(parseSourceAvailability('Артикул: TESTОсталось 3 шт.'), { availability: 'IN_STOCK', stockQty: 3 });
assert.deepEqual(parseSourceAvailability('Артикул: TESTАрхивный продукт'), { availability: 'DISCONTINUED', stockQty: 0 });
assert.throws(() => parseSourceAvailability('Неизвестно'));

const catalog = await loadCatalog();
assert.equal(catalog.products.length, 929);
assert.equal(catalog.assets.size, 201);
for (const product of catalog.products) for (const source of product.sources) assert.equal(removeExcludedCatalogDocuments(source.payload).removed, 0);
for (const series of catalog.series) assert.ok(!series.documents.some(isExcludedCatalogDocument));
assert.equal(catalog.products.filter((p) => p.data.priceOnRequest).length, 24);
assert.equal(catalog.products.reduce((sum, p) => sum + p.sources.length, 0), 952);
assert.equal(catalog.products.filter((p) => p.seriesIds.length > 1).length, 10);
assert.equal(catalog.products.reduce((sum, p) => sum + p.raw.characteristics.length, 0), 16046);
assert.equal(catalog.products.reduce((sum, p) => sum + p.raw.characteristics.length + (p.raw.sourceVariants ?? []).reduce((n, s) => n + s.characteristics.length, 0), 0), 16284);
for (const product of catalog.products) assert.deepEqual(product.sources[0].payload, product.raw, 'The complete primary JSON and alternative contexts must survive');
const inverter = catalog.products.find((p) => p.data.sku === 'ABD0054');
assert.deepEqual(inverter.operatingRatings.map((r) => [r.mode, r.powerKw.toNumber(), r.currentA.toNumber()]), [
    ['HEAVY_DUTY', 315, 308], ['LIGHT_DUTY', 355, 394], ['NO_OVERLOAD', 400, 410],
]);
for (const sku of ['PBN00001', 'PBN00002', 'PBC00011', 'PBC00011RU']) {
    const panel = catalog.products.find((p) => p.data.sku === sku);
    assert.equal(panel.typeCode, 'OPERATOR_PANEL');
}
for (const sku of ['PBC00005', 'PBC00006']) assert.equal(catalog.products.find((p) => p.data.sku === sku).typeCode, 'EXPANSION_BOARD');
const panel = catalog.products.find((p) => p.data.sku === 'PBN00001');
assert.equal(panel.attributes.length, 0);
assert.equal(panel.data.model, null);
assert.equal(panel.raw.characteristics.length, 0);
const unpriced = catalog.products.find((p) => p.data.sku === 'ABN01402');
assert.equal(unpriced.data.priceOnRequest, true);
assert.equal(unpriced.data.isSellable, false);
const duplicateSpecs = catalog.products.find((p) => p.raw.characteristics.filter((s) => s.name === 'Панель оператора').length > 1);
assert.ok(duplicateSpecs);
assert.ok(duplicateSpecs.raw.characteristics.filter((s) => s.name === 'Панель оператора').length > 1);
const dimensionsFixture = { ...panel.raw, characteristics: [{ name: 'ВхШхГ, мм', value: '204х80х155' }] };
const dimensions = normalizeProduct(dimensionsFixture, { sku: panel.data.sku, seriesIds: panel.seriesIds });
assert.equal(dimensions.data.heightMm.toNumber(), 204);
assert.equal(dimensions.data.widthMm.toNumber(), 80);
assert.equal(dimensions.data.depthMm.toNumber(), 155);
const otherDimensions = normalizeProduct({ ...dimensionsFixture, characteristics: [{ name: 'Габарит, Ш*Г*В (мм)', value: '80*155*204' }] }, { sku: panel.data.sku, seriesIds: panel.seriesIds });
assert.equal(otherDimensions.data.heightMm.toNumber(), 204);
assert.equal(otherDimensions.data.widthMm.toNumber(), 80);
assert.equal(otherDimensions.data.depthMm.toNumber(), 155);
assert.ok(catalog.products.every((p) => p.data.status === 'DRAFT'));
console.log('VEDA import normalization and all 929 source records verified.');
