import 'dotenv/config';
import assert from 'node:assert/strict';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '@prisma/client';

const databaseUrl = new URL(process.env.DATABASE_URL);
const prisma = new PrismaClient({ adapter: new PrismaMariaDb({ host: databaseUrl.hostname, port: databaseUrl.port ? Number(databaseUrl.port) : 3306, user: decodeURIComponent(databaseUrl.username), password: decodeURIComponent(databaseUrl.password), database: databaseUrl.pathname.replace(/^\//, ''), allowPublicKeyRetrieval: true }) });
async function main() {
    const staff = await prisma.staffUser.findFirst({ where: { isActive: true }, select: { id: true } });
    assert.ok(staff, 'Для проверки нужен активный StaffUser.');
    const marker = `verify-${Date.now()}`;
    const catalogImport = await prisma.catalogImport.create({ data: { fileName: 'verify.xlsx', fileSize: 4, fileHash: marker, storageKey: `${marker}.xlsx`, uploadedById: staff.id, status: 'FAILED', errorCount: 1, errors: { create: { sheet: 'Products', rowNumber: 2, sku: 'VERIFY', field: 'price', sourceValue: '-1', message: 'Проверочная ошибка' } } }, include: { errors: true } });
    assert.equal(catalogImport.errors.length, 1);
    await prisma.catalogImport.delete({ where: { id: catalogImport.id } });
    assert.equal(await prisma.catalogImportError.count({ where: { importId: catalogImport.id } }), 0, 'Ошибки должны удаляться каскадно.');
    console.log('Catalog import database schema verified.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
