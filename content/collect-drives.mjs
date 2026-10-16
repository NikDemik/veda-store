import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { isExcludedCatalogDocument } from '../src/config/catalogDocumentPolicy.mjs';

// Run from any directory: node content/collect-drives.mjs [--refresh]
const root = path.dirname(fileURLToPath(import.meta.url));
const origin = 'https://drives.ru';
const categoryUrl = `${origin}/category/veda/`;
const vfdUrl = `${categoryUrl}preobrazovateli-chastoty-veda-vfd/`;
const refresh = process.argv.includes('--refresh');
const discoverOnly = process.argv.includes('--discover-only');
const collectedAt = new Date().toISOString();
const report = { collectedAt, source: categoryUrl, series: [], errors: [], warnings: [] };
const assetJobs = new Map();
let activeRequests = 0;
const requestQueue = [];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const save = async (file, value) => {
  const target = path.join(root, file);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
async function request(url) {
  if (new URL(url).origin !== origin) throw new Error(`Unexpected source host: ${url}`);
  if (activeRequests >= 4) await new Promise(resolve => requestQueue.push(resolve));
  activeRequests++;
  try {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: { 'User-Agent': 'VEDA-catalog-content-collector/1.0', Accept: '*/*' },
        signal: AbortSignal.timeout(900_000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
      const expectedBytes = Number(response.headers.get('content-length') ?? 0);
      if (expectedBytes > 50_000_000) console.log(`Downloading large archive: ${decodeURIComponent(new URL(url).pathname.split('/').at(-1))} (${expectedBytes} bytes)`);
      const bytes = Buffer.from(await response.arrayBuffer());
      const length = response.headers.get('content-length');
      if (!bytes.length || (length && !response.headers.get('content-encoding') && bytes.length !== Number(length))) {
        throw new Error(`Incomplete response: ${url}`);
      }
      return { bytes, contentType: response.headers.get('content-type') ?? '' };
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise(resolve => setTimeout(resolve, attempt * 1000));
    }
  }
  } finally {
    activeRequests--;
    requestQueue.shift()?.();
  }
}
async function html(url) {
  const file = `raw/pages/${hash(url).slice(0, 20)}.html`;
  if (!refresh) {
    try { return { html: await readFile(path.join(root, file), 'utf8'), file }; } catch {}
  }
  const response = await request(url);
  if (!response.contentType.includes('text/html')) throw new Error(`Expected HTML: ${url}`);
  const text = response.bytes.toString('utf8');
  await save(file, text);
  return { html: text, file };
}
function validAsset(bytes, ext, contentType) {
  if (/text\/html/i.test(contentType)) return false;
  if (!ext) return bytes.subarray(0, 2).toString() === 'PK' || bytes.subarray(0, 4).toString() === 'Rar!' || /^\s*%PDF-/.test(bytes.subarray(0, 1024).toString('latin1'));
  // Some manufacturer PDFs contain a leading ASCII space; preserve original bytes.
  if (ext === '.pdf') return /^\s*%PDF-/.test(bytes.subarray(0, 1024).toString('latin1'));
  if (ext === '.zip') return bytes.subarray(0, 2).toString() === 'PK';
  if (ext === '.rar') return bytes.subarray(0, 4).toString() === 'Rar!';
  if (ext === '.png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (['.jpg', '.jpeg'].includes(ext)) return bytes[0] === 255 && bytes[1] === 216;
  return /^image\//i.test(contentType);
}
function asset(url, kind) {
  if (assetJobs.has(url)) return assetJobs.get(url);
  const job = (async () => {
    const name = decodeURIComponent(new URL(url).pathname.split('/').at(-1))
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_');
    const ext = path.extname(name).toLowerCase();
    let localPath = `assets/${kind}/${hash(url).slice(0, 12)}-${name}`;
    let target = path.join(root, localPath);
    const metaFile = `${target}.json`;
    if (!refresh) {
      try {
        const meta = JSON.parse(await readFile(metaFile, 'utf8'));
        const bytes = await readFile(path.join(root, meta.localPath));
        if (meta.sourceUrl === url && meta.sha256 === hash(bytes) && validAsset(bytes, ext, meta.contentType)) return meta;
      } catch {}
    }
    const { bytes, contentType } = await request(url);
    if (!validAsset(bytes, ext, contentType)) throw new Error(`Invalid ${ext} signature: ${url}`);
    if (!ext) {
      localPath += bytes.subarray(0, 2).toString() === 'PK' ? '.zip' : bytes.subarray(0, 4).toString() === 'Rar!' ? '.rar' : '.pdf';
      target = path.join(root, localPath);
    }
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
    const meta = { sourceUrl: url, localPath, bytes: bytes.length, sha256: hash(bytes), contentType, downloadedAt: collectedAt };
    await writeFile(metaFile, `${JSON.stringify(meta, null, 2)}\n`, 'utf8');
    console.log(`Downloaded ${kind}: ${name} (${bytes.length} bytes)`);
    return meta;
  })().catch(error => {
    report.errors.push({ url, stage: 'asset', message: error.message });
    return { sourceUrl: url, localPath: null, error: error.message };
  });
  assetJobs.set(url, job);
  return job;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ javaScriptEnabled: false });
// Parse downloaded HTML without executing the source site's scripts or loading trackers.
await page.route('**/*', route => route.abort());
async function parse(url, kind) {
  const source = await html(url);
  await page.setContent(source.html, { waitUntil: 'domcontentloaded' });
  const data = await page.evaluate(({ kind, origin, baseUrl }) => {
    const clean = value => (value ?? '').replace(/\s+/g, ' ').trim();
    const text = selector => clean(document.querySelector(selector)?.textContent);
    const abs = value => new URL(value, baseUrl).href;
    const docLinks = [...document.querySelectorAll('.document-block[href], .series__button-download[href]')].map(e => ({
      title: clean(e.textContent).replace(/^download\s*/, ''), sourceUrl: abs(e.getAttribute('href')),
      group: clean(e.closest('.series__accordion, .document__accordion')?.querySelector('[class*=accordion-title], [class*=accordion-header]')?.textContent),
    }));
    if (kind === 'tree') {
      const node = li => {
        const a = li.querySelector(':scope > a');
        return { name: clean(a?.textContent), sourceUrl: a ? abs(a.getAttribute('href')) : null,
          children: [...li.querySelectorAll(':scope > ul > li')].map(node) };
      };
      const top = [...document.querySelectorAll('.l-menu > li')].find(li => li.querySelector(':scope > a')?.getAttribute('href') === '/category/veda/');
      return top ? node(top) : null;
    }
    const description = document.querySelector(kind === 'product' ? '#description' : '.series__details-text')?.cloneNode(true);
    description?.querySelectorAll('script,style').forEach(e => e.remove());
    const common = { title: text('h1'), description: clean(description?.textContent), descriptionHtml: description?.innerHTML ?? '', documents: docLinks };
    if (kind === 'series') return { ...common,
      products: [...new Set([...document.querySelectorAll('.s-products__name a[href], .products__name a[href]')].map(e => abs(e.getAttribute('href'))))],
      nextPages: [...new Set([...document.querySelectorAll('a[href]')].filter(e => /[?&]page=\d+/.test(e.getAttribute('href'))).map(e => {
        const target = new URL(e.getAttribute('href'), baseUrl);
        return `${target.origin}${target.pathname}?page=${target.searchParams.get('page')}`;
      }))],
      images: [...document.querySelectorAll('.series__image-wrap img')].map(e => ({ sourceUrl: abs(e.getAttribute('data-src') || e.getAttribute('src')), alt: e.getAttribute('alt') })),
    };
    return { ...common, sku: text('.product__code span'),
      characteristics: [...document.querySelectorAll('#features .features-two-val__block')].map(e => ({
        name: clean(e.querySelector('.features-two-val__name')?.textContent),
        value: clean(e.querySelector('.features-two-val__value')?.textContent),
      })),
      images: [...document.querySelectorAll('.p-images__slider-item[href]')].filter(e => !/\/dummy\d*\./i.test(e.getAttribute('href'))).map(e => ({ sourceUrl: abs(e.getAttribute('href')), alt: e.querySelector('img')?.getAttribute('alt') ?? '' })),
      price: { raw: text('.product__pr-price-new'), currency: 'RUB', tax: text('.product__pr-price-vat') },
      availability: text('.product__stocks'),
    };
  }, { kind, origin, baseUrl: url });
  if (Array.isArray(data.documents)) data.documents = data.documents.filter(doc => !isExcludedCatalogDocument(doc));
  return { ...data, source: { url, rawHtml: source.file, sha256: hash(source.html), collectedAt } };
}
async function attachAssets(data, inherited = []) {
  const documents = new Map(inherited.filter(d => !isExcludedCatalogDocument(d)).map(d => [d.sourceUrl, d]));
  const downloaded = await Promise.all(data.documents.filter(doc => !isExcludedCatalogDocument(doc)).map(async doc => ({ ...doc, ...await asset(doc.sourceUrl, 'documents') })));
  for (const doc of downloaded) documents.set(doc.sourceUrl, doc);
  data.documents = [...documents.values()];
  await Promise.all((data.images ?? []).map(async image => Object.assign(image, await asset(image.sourceUrl, 'images'))));
}

try {
  const tree = await parse(categoryUrl, 'tree');
  if (!tree.name || !tree.children?.length) throw new Error('Category structure not found');
  await save('catalog-structure.json', tree);
  const vfd = tree.children.find(node => node.sourceUrl === vfdUrl);
  if (!vfd) throw new Error('VEDA VFD category not found');
  const seriesNodes = [...vfd.children.filter(node => /VF-\d+/i.test(node.name)),
    ...tree.children.filter(node => /VF-400/i.test(node.name))];
  const seriesNames = {
    'spetsializirovannyy-preobrazovatel-chastoty-veda-vfd-vf-101-basic-drive-bazovyy-privod-s-funktsiey-sto': 'VF-101-STO',
    'preobrazovatel-chastoty-vedavfd-vf-101-hbc': 'VF-101-HBC',
    'dbc': 'VF-101-DBC', 'vf-101-aqua-drive': 'VF-101-AQUA',
    'vf-500': 'VF-500', 'vf-11': 'VF-11', 'vf-101-basic-drive': 'VF-101-BASIC',
    'vf-51-micro-drive': 'VF-51', 'vfd-vf-302l-lift-drive': 'VF-302L',
    'vf-101-firemode-drive': 'VF-101-FIREMODE', 'vf-302c': 'VF-302C',
    'vf-101-rod-pump-drive-rpd': 'VF-101-RPD',
    'modulnye-resheniya': 'VF-400',
  };
  const index = [];
  for (const node of seriesNodes) {
    const slug = new URL(node.sourceUrl).pathname.split('/').filter(Boolean).at(-1);
    const seriesId = seriesNames[slug];
    if (!seriesId) throw new Error(`Unknown series slug: ${slug}`);
    console.log(`Discovering ${seriesId}: ${node.sourceUrl}`);
    const series = await parse(node.sourceUrl, 'series');
    series.id = seriesId;
    const urls = new Set(series.products);
    const visited = new Set([node.sourceUrl]);
    const queue = [...series.nextPages];
    while (queue.length) {
      const url = queue.shift();
      if (visited.has(url)) continue;
      if (!url.startsWith(node.sourceUrl)) throw new Error(`Unexpected pagination URL: ${url}`);
      visited.add(url);
      const next = await parse(url, 'series');
      next.products.forEach(url => urls.add(url));
      queue.push(...next.nextPages.filter(url => !visited.has(url)));
    }
    if (!urls.size) throw new Error(`No products: ${seriesId}`);
    if (!discoverOnly) await attachAssets(series);
    series.products = [...urls];
    await save(`${discoverOnly ? 'discovery' : 'series'}/${seriesId}.json`, series);
    const result = { id: seriesId, discovered: urls.size, collected: 0, characteristics: {}, pages: [...visited] };
    report.series.push(result);
    console.log(`${seriesId}: discovered ${urls.size} products on ${visited.size} pages`);
    if (discoverOnly) continue;
    for (const url of urls) {
      try {
        const product = await parse(url, 'product');
        if (!/^[A-Z0-9][A-Z0-9._-]+$/i.test(product.sku)) throw new Error(`Incomplete product: ${product.sku || url}`);
        const existing = index.find(item => item.sku === product.sku);
        product.seriesId = seriesId;
        product.categoryPath = node.sourceUrl.startsWith(vfdUrl) ? [tree.name, vfd.name, node.name] : [tree.name, node.name];
        product.model = product.characteristics.find(c => c.name === 'Типовой код')?.value ?? null;
        product.schemaVersion = 1;
        product.warnings = [];
        if (!product.characteristics.length) product.warnings.push({ type: 'no-characteristics', message: 'No characteristics published on the product page.' });
        if (!product.images.length) {
          product.warnings.push({ type: 'no-product-image', message: 'Source has no product photo; series image used when available.' });
          product.images = series.images.map(image => ({ ...image, inheritedFrom: node.sourceUrl }));
        }
        const titleModel = product.title.match(/VF-\d+[A-Z]*-[A-Z0-9-]+/i)?.[0];
        if (titleModel && titleModel !== product.model) product.warnings.push({ type: 'title-model-mismatch', titleModel, characteristicModel: product.model });
        const groups = new Map();
        for (const item of product.characteristics) {
          if (groups.has(item.name)) product.warnings.push({ type: 'duplicate-characteristic', name: item.name, values: [groups.get(item.name), item.value] });
          groups.set(item.name, item.value);
        }
        await attachAssets(product, series.documents.map(d => ({ ...d, inheritedFrom: node.sourceUrl })));
        if (existing) {
          const primary = JSON.parse(await readFile(path.join(root, existing.file), 'utf8'));
          primary.sourceVariants ??= [];
          primary.sourceVariants.push(product);
          await save(existing.file, primary);
          existing.seriesIds = [...new Set([...existing.seriesIds, seriesId])];
          existing.sourceUrls ??= [existing.sourceUrl];
          existing.sourceUrls.push(url);
          report.warnings.push({ sku: product.sku, warnings: [{ type: 'duplicate-sku-source', urls: existing.sourceUrls, models: [existing.model, product.model] }] });
        } else {
          const file = `products/${seriesId}/${product.sku}.json`;
          await save(file, product);
          index.push({ sku: product.sku, model: product.model, seriesId, seriesIds: [seriesId], file, sourceUrl: url, sourceUrls: [url] });
        }
        result.collected++;
        result.characteristics[product.sku] = product.characteristics.length;
        if (product.warnings.length) report.warnings.push({ sku: product.sku, warnings: product.warnings });
        console.log(`${seriesId}: ${product.sku}, ${product.characteristics.length} characteristics, ${product.images.length} images`);
        await save('products/index.json', index);
      } catch (error) {
        report.errors.push({ url, stage: 'product', message: error.message });
        console.error(`Product failed: ${url}: ${error.message}`);
      }
    }
    result.uniqueProducts = index.filter(item => item.seriesIds.includes(seriesId)).length;
    await save('collection-report.json', report);
  }
  if (!discoverOnly) await save('products/index.json', index);
} catch (error) {
  report.errors.push({ stage: 'collection', message: error.message });
} finally {
  await browser.close();
  const assets = await Promise.all(assetJobs.values());
  report.assets = { total: assets.length, downloaded: assets.filter(a => a.localPath).length,
    bytes: assets.reduce((sum, a) => sum + (a.bytes ?? 0), 0) };
  report.completedAt = new Date().toISOString();
  await save(discoverOnly ? 'discovery-report.json' : 'collection-report.json', report);
  console.log(JSON.stringify({ series: report.series.map(({ id, discovered, collected }) => ({ id, discovered, collected })), errors: report.errors, assets: report.assets }, null, 2));
  if (report.errors.length) process.exitCode = 1;
}
