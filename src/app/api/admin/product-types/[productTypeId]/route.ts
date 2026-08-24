import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
    code: z.string().trim().min(2).max(64).regex(/^[A-Z][A-Z0-9_]*$/),
    name: z.string().trim().min(2).max(191),
    isActive: z.boolean(),
    sortOrder: z.coerce.number().int().min(0),
});

function id(value: string) { const parsed = Number(value); return Number.isInteger(parsed) && parsed > 0 ? parsed : null; }

export async function PATCH(request: Request, context: { params: Promise<{ productTypeId: string }> }) {
    if (!(await getCurrentStaffUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const productTypeId = id((await context.params).productTypeId);
    if (!productTypeId) return NextResponse.json({ error: 'Некорректный идентификатор.' }, { status: 400 });
    const current = await prisma.productType.findUnique({ where: { id: productTypeId } });
    if (!current) return NextResponse.json({ error: 'Тип не найден.' }, { status: 404 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    const productType = await prisma.productType.update({
        where: { id: productTypeId },
        data: parsed.data,
    });
    return NextResponse.json({ productType });
}

export async function DELETE(_request: Request, context: { params: Promise<{ productTypeId: string }> }) {
    if (!(await getCurrentStaffUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const productTypeId = id((await context.params).productTypeId);
    if (!productTypeId) return NextResponse.json({ error: 'Некорректный идентификатор.' }, { status: 400 });
    const current = await prisma.productType.findUnique({ where: { id: productTypeId }, include: { _count: { select: { products: true } } } });
    if (!current) return NextResponse.json({ error: 'Тип не найден.' }, { status: 404 });
    if (current._count.products) return NextResponse.json({ error: 'Тип используется товарами.' }, { status: 409 });
    await prisma.productType.delete({ where: { id: productTypeId } });
    return NextResponse.json({ ok: true });
}
