import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

function getImportDirectory() {
    return path.join(process.cwd(), 'storage', 'catalog-imports');
}

export async function saveCatalogImportFile(buffer: Buffer, extension: 'xlsx' | 'csv' = 'xlsx') {
    const directory = getImportDirectory();
    await fs.mkdir(directory, { recursive: true });
    const storageKey = `${randomUUID()}.${extension}`;
    await fs.writeFile(path.join(directory, storageKey), buffer, { flag: 'wx' });
    return storageKey;
}

export async function readCatalogImportFile(storageKey: string) {
    if (!/^[a-f0-9-]+\.(xlsx|csv)$/i.test(storageKey)) throw new Error('Некорректный ключ файла импорта.');
    return fs.readFile(path.join(getImportDirectory(), storageKey));
}

export async function deleteCatalogImportFile(storageKey: string) {
    if (!/^[a-f0-9-]+\.(xlsx|csv)$/i.test(storageKey)) return;
    await fs.rm(path.join(getImportDirectory(), storageKey), { force: true });
}
