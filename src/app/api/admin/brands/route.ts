import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const brandSchema = z.object({
    name: z.string().trim().min(1, 'Название бренда обязательно').max(191),
    slug: z
        .string()
        .trim()
        .min(1, 'Slug бренда обязателен')
        .max(191)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug должен содержать латиницу, цифры и дефисы'),
    country: z.string().trim().max(191).optional().nullable(),
});

export async function POST(request: Request) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = brandSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные данные бренда' },
            { status: 400 },
        );
    }

    const { name, slug, country } = parsed.data;

    try {
        const brand = await prisma.brand.create({
            data: {
                name,
                slug,
                country: country || null,
            },
            select: {
                id: true,
                name: true,
                slug: true,
                country: true,
            },
        });

        return NextResponse.json({ brand }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Бренд с таким названием или slug уже существует.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to create brand';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
