import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';
import { isExcludedCatalogDocument } from '../src/config/catalogDocumentPolicy.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
const json = async file => JSON.parse(await readFile(path.join(root, file), 'utf8'));
const sha256 = value => createHash('sha256').update(value).digest('hex');
const index = await json('products/index.json');
assert.equal(new Set(index.map(item => item.sku)).size, index.length, 'Duplicate SKU files in index');
const report = await json('collection-report.json');
assert.equal(report.errors.length, 0, 'Collection has download or parsing errors');
const checkedAssets = new Set();
const checkedSources = new Set();
const summary = { verifiedAt: new Date().toISOString(), products: 0, characteristics: 0, uniqueAssets: 0, series: {}, checks: [] };
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ javaScriptEnabled: false });
  await page.route('**/*', route => route.abort());
  for (const item of index) {
    const bytes = await readFile(path.join(root, item.file));
    assert.notEqual(bytes.subarray(0, 3).toString('hex'), 'efbbbf', `UTF-8 BOM: ${item.file}`);
    const primary = JSON.parse(bytes.toString('utf8'));
    assert(!/Рљ|Рџ|РЅ|Р°|Рµ|Рё|Рѕ|СЃ|С‚|СЊ|С‹|СЂ|СЏ|вЂ|В«|В»|пїЅ|�/.test(bytes.toString('utf8')), `Encoding: ${item.sku}`);
    for (const product of [primary, ...(primary.sourceVariants ?? [])]) {
      assert.equal(product.sku, item.sku);
      assert.equal(product.model, product.characteristics.find(c => c.name === 'Типовой код')?.value ?? null, `Model differs from source: ${item.sku}`);
      const source = await readFile(path.join(root, product.source.rawHtml), 'utf8');
      assert.equal(sha256(source), product.source.sha256);
      await page.setContent(source, { waitUntil: 'domcontentloaded' });
      const expected = await page.evaluate(() => {
        const clean = value => (value ?? '').replace(/\s+/g, ' ').trim();
        return {
          sku: clean(document.querySelector('.product__code span')?.textContent),
          rows: [...document.querySelectorAll('#features .features-two-val__block')].map(e => ({
            name: clean(e.querySelector('.features-two-val__name')?.textContent),
            value: clean(e.querySelector('.features-two-val__value')?.textContent),
          })),
          images: [...document.querySelectorAll('.p-images__slider-item[href]')].filter(e => !/\/dummy\d*\./i.test(e.getAttribute('href'))).map(e => new URL(e.getAttribute('href'), 'https://drives.ru').href),
          documents: [...document.querySelectorAll('#documents .document-block[href]')].map(e => new URL(e.getAttribute('href'), 'https://drives.ru').href),
        };
      });
      assert.equal(product.sku, expected.sku);
      assert.deepEqual(product.characteristics, expected.rows, `Lost or changed characteristics: ${item.sku}`);
      assert.deepEqual(product.images.filter(i => !i.inheritedFrom).map(i => i.sourceUrl), expected.images);
      for (const url of expected.documents.filter(sourceUrl => !isExcludedCatalogDocument({ sourceUrl }))) assert(product.documents.some(d => d.sourceUrl === url), `Missing document: ${url}`);
      assert(!product.documents.some(isExcludedCatalogDocument), `Excluded document: ${item.sku}`);
      for (const asset of [...product.images, ...product.documents]) {
        assert(asset.localPath && !asset.error, `Failed asset: ${asset.sourceUrl}`);
        assert(!asset.localPath.includes('..') && !path.isAbsolute(asset.localPath));
        if (checkedAssets.has(asset.localPath)) continue;
        const content = await readFile(path.join(root, asset.localPath));
        assert.equal(content.length, asset.bytes);
        assert.equal(sha256(content), asset.sha256, `Checksum: ${asset.localPath}`);
        checkedAssets.add(asset.localPath);
      }
      summary.characteristics += product.characteristics.length;
      checkedSources.add(product.source.url);
    }
    summary.products++;
    for (const id of item.seriesIds ?? [primary.seriesId]) summary.series[id] = (summary.series[id] ?? 0) + 1;
  }
  for (const series of report.series) {
    assert.equal(series.discovered, series.collected);
    assert.equal(series.uniqueProducts ?? series.collected, summary.series[series.id]);
    const data = await json(`series/${series.id}.json`);
    assert(!data.documents.some(isExcludedCatalogDocument), `Excluded series document: ${series.id}`);
    assert.equal(data.products.length, series.collected);
    for (const url of data.products) assert(checkedSources.has(url), `Missing source page: ${url}`);
    for (const image of data.images) {
      const bytes = await readFile(path.join(root, image.localPath));
      assert.equal(sha256(bytes), image.sha256);
      checkedAssets.add(image.localPath);
    }
  }
  summary.uniqueAssets = checkedAssets.size;
  summary.sourcePages = checkedSources.size;
  summary.documents = [...checkedAssets].filter(file => file.startsWith('assets/documents/')).length;
  summary.images = [...checkedAssets].filter(file => file.startsWith('assets/images/')).length;
  summary.warnings = {};
  for (const item of report.warnings) for (const warning of item.warnings) {
    summary.warnings[warning.type] = (summary.warnings[warning.type] ?? 0) + 1;
  }
  summary.excludedDocuments = ['VEDA CST'];
  summary.checks = ['All discovered products collected', 'All characteristic rows match saved source HTML', 'All gallery images and permitted product documents included', 'VEDA CST excluded from catalog data', 'Asset sizes and SHA-256 verified', 'UTF-8 without BOM or mojibake'];
  await writeFile(path.join(root, 'verification-report.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
  const inventory = [
    '# Собранные серии VEDA VF', '',
    `Уникальных артикулов: ${summary.products}. Строк характеристик: ${summary.characteristics}.`,
    `Документов/архивов: ${summary.documents}. Изображений по уникальным URL: ${summary.images}.`, '',
    '| Серия / исполнение | Страниц найдено | Страниц собрано | Уникальных артикулов |', '| --- | ---: | ---: | ---: |',
    ...report.series.map(series => `| ${series.id} | ${series.discovered} | ${series.collected} | ${series.uniqueProducts ?? series.collected} |`), '',
    'Все характеристики сверены с сохранёнными HTML; размеры и SHA-256 файлов проверены.', '',
    'Документы VEDA CST исключены из каталога по запросу пользователя.', '',
    '## Особенности источника', '',
    ...Object.entries(summary.warnings).map(([type, count]) => `- ${type}: ${count}`), '',
    '`no-product-image`: у артикула нет своего фото; доступное изображение серии явно помечено полем inheritedFrom.',
    '`title-model-mismatch`: название карточки и поле «Типовой код» различаются.',
    '`duplicate-characteristic`: в источнике повторяется название характеристики.', '',
    '`duplicate-sku-source`: артикул опубликован на разных страницах; дополнительные снимки сохранены в sourceVariants.', '',
    '`no-characteristics`: в исходной карточке характеристики не опубликованы; значения не дополнялись вручную.', '',
    `Последняя успешная проверка: ${summary.verifiedAt}.`, '',
  ].join('\n');
  await writeFile(path.join(root, 'inventory.md'), inventory, 'utf8');
  console.log(JSON.stringify(summary, null, 2));
} finally { await browser.close(); }
