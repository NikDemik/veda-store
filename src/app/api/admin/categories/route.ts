import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

function emptyStringToNull(value: unknown) {
    if (typeof value !== 'string') return value;

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

const categorySchema = z.object({
    name: z.string().trim().min(1, 'Название категории обязательно').max(191),
    slug: z
        .string()
        .trim()
        .min(1, 'Slug категории обязателен')
        .max(191)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug должен содержать латиницу, цифры и дефисы'),
    parentId: z.preprocess(
        emptyStringToNull,
        z.coerce.number().int().positive().nullable().optional(),
    ),
    imageUrl: z.preprocess(emptyStringToNull, z.string().trim().max(500).nullable().optional()),
    description: z.preprocess(emptyStringToNull, z.string().trim().max(1000).nullable().optional()),
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

    const parsed = categorySchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные данные категории' },
            { status: 400 },
        );
    }

    const { name, slug, parentId, imageUrl, description } = parsed.data;

    if (parentId) {
        const parent = await prisma.category.findUnique({
            where: { id: parentId },
            select: { id: true },
        });

        if (!parent) {
            return NextResponse.json({ error: 'Родительская категория не найдена.' }, { status: 404 });
        }
    }

    try {
        const category = await prisma.category.create({
            data: {
                name,
                slug,
                parentId: parentId || null,
                imageUrl: imageUrl || null,
                description: description || null,
            },
            select: {
                id: true,
                parentId: true,
                name: true,
                slug: true,
                description: true,
                imageUrl: true,
            },
        });

        return NextResponse.json({ category }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Категория с таким slug уже существует.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to create category';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
