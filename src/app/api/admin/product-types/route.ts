import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const schema = z.object({
    code: z.string().trim().min(2).max(64).regex(/^[A-Z][A-Z0-9_]*$/, 'Код должен быть в формате UPPER_SNAKE_CASE'),
    name: z.string().trim().min(2).max(191),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().min(0).default(0),
});

export async function POST(request: Request) {
    if (!(await getCurrentStaffUser())) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
    try {
        const productType = await prisma.productType.create({ data: parsed.data });
        return NextResponse.json({ productType }, { status: 201 });
    } catch (error) {
        const duplicate = typeof error === 'object' && error && 'code' in error && error.code === 'P2002';
        return NextResponse.json({ error: duplicate ? 'Тип с таким кодом уже существует.' : 'Не удалось создать тип.' }, { status: duplicate ? 409 : 400 });
    }
}
