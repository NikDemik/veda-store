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

function parseCategoryId(value: string) {
    const categoryId = Number(value);

    return Number.isInteger(categoryId) && categoryId > 0 ? categoryId : null;
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

async function ensureNoParentCycle(categoryId: number, parentId: number | null | undefined) {
    if (!parentId) return true;
    if (parentId === categoryId) return false;

    let currentParentId: number | null = parentId;

    while (currentParentId) {
        const parent: { id: number; parentId: number | null } | null = await prisma.category.findUnique({
            where: { id: currentParentId },
            select: { id: true, parentId: true },
        });

        if (!parent) return null;
        if (parent.parentId === categoryId) return false;

        currentParentId = parent.parentId;
    }

    return true;
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ categoryId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId: rawCategoryId } = await context.params;
    const categoryId = parseCategoryId(rawCategoryId);

    if (!categoryId) {
        return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
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

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
    });

    if (!category) {
        return NextResponse.json({ error: 'Категория не найдена.' }, { status: 404 });
    }

    const { name, slug, parentId, imageUrl, description } = parsed.data;
    const parentCheck = await ensureNoParentCycle(categoryId, parentId);

    if (parentCheck === null) {
        return NextResponse.json({ error: 'Родительская категория не найдена.' }, { status: 404 });
    }

    if (!parentCheck) {
        return NextResponse.json(
            { error: 'Нельзя назначить категорию родителем самой себе или своему потомку.' },
            { status: 400 },
        );
    }

    try {
        const updatedCategory = await prisma.category.update({
            where: { id: categoryId },
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

        return NextResponse.json({ category: updatedCategory });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Категория с таким slug уже существует.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to update category';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ categoryId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categoryId: rawCategoryId } = await context.params;
    const categoryId = parseCategoryId(rawCategoryId);

    if (!categoryId) {
        return NextResponse.json({ error: 'Invalid category id' }, { status: 400 });
    }

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: { id: true },
    });

    if (!category) {
        return NextResponse.json({ error: 'Категория не найдена.' }, { status: 404 });
    }

    try {
        await prisma.category.delete({
            where: { id: category.id },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json(
                { error: 'Нельзя удалить категорию, к которой привязаны товары.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to delete category';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
