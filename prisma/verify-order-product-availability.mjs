import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the actual route before any pricing, invoice or database writes.
const source = readFileSync(new URL('../src/app/api/orders/route.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const passedGuard = new Error('Reached pricing');
const baseProduct = { id: 1, sku: 'TEST', name: 'Test', price: 100, vatRate: 22, availability: 'IN_STOCK', priceOnRequest: false, status: 'ACTIVE', isSellable: true };
let products = [];
let reads = 0;
const exports = {};
const dependencies = {
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options.status }) } },
    '@prisma/client': { Prisma: { Decimal: class { constructor() { throw passedGuard; } } } },
    '@/auth': { auth: async () => ({ user: { id: '1', organizationId: 1 } }) },
    '@/lib/prisma': {
        prisma: {
            organization: { findUnique: async () => ({ id: 1, deferredPaymentDays: 0 }) },
            product: { findMany: async ({ select }) => {
                for (const key of ['priceOnRequest', 'status', 'isSellable']) assert.equal(select[key], true);
                reads += 1;
                return products;
            } },
        },
    },
    '@/lib/invoices': {},
    '@/lib/notifications': {},
};
runInNewContext(compiled, {
    exports,
    require: (name) => {
        assert.ok(Object.hasOwn(dependencies, name), `Unexpected dependency: ${name}`);
        return dependencies[name];
    },
});
function request() {
    return { json: async () => ({ paymentType: 'BANK_TRANSFER', deliveryType: 'PICKUP', items: products.map((p) => ({ productId: p.id, quantity: 1 })) }) };
}

for (const change of [{ priceOnRequest: true }, { status: 'DRAFT' }, { status: 'ARCHIVED' }, { isSellable: false }]) {
    products = [{ ...baseProduct, ...change }];
    const result = await exports.POST(request());
    assert.equal(result.status, 400);
    assert.ok(result.body.error);
}
products = [{ ...baseProduct }, { ...baseProduct, id: 2, priceOnRequest: true }];
assert.equal((await exports.POST(request())).status, 400, 'Reject the entire mixed cart');
products = [{ ...baseProduct }];
await assert.rejects(exports.POST(request()), (error) => error === passedGuard, 'Eligible products proceed to pricing');
assert.equal(reads, 6);
console.log('Order product availability: 6 route scenarios passed, no database writes.');
