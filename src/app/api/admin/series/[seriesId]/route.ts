import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

function parseSeriesId(value: string) {
    const seriesId = Number(value);

    return Number.isInteger(seriesId) && seriesId > 0 ? seriesId : null;
}

const seriesSchema = z.object({
    name: z.string().trim().min(1, 'Название серии обязательно').max(191),
    slug: z
        .string()
        .trim()
        .min(1, 'Slug серии обязателен')
        .max(191)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug должен содержать латиницу, цифры и дефисы'),
    description: z.string().trim().max(1000).optional().nullable(),
});

export async function PATCH(
    request: Request,
    context: { params: Promise<{ seriesId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seriesId: rawSeriesId } = await context.params;
    const seriesId = parseSeriesId(rawSeriesId);

    if (!seriesId) {
        return NextResponse.json({ error: 'Invalid series id' }, { status: 400 });
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = seriesSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные данные серии' },
            { status: 400 },
        );
    }

    const series = await prisma.series.findUnique({
        where: { id: seriesId },
        select: { id: true },
    });

    if (!series) {
        return NextResponse.json({ error: 'Серия не найдена.' }, { status: 404 });
    }

    const { name, slug, description } = parsed.data;

    try {
        const updatedSeries = await prisma.series.update({
            where: { id: seriesId },
            data: {
                name,
                slug,
                description: description || null,
            },
            select: {
                id: true,
                name: true,
                slug: true,
                description: true,
            },
        });

        return NextResponse.json({ series: updatedSeries });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Серия с таким slug уже существует.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to update series';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ seriesId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { seriesId: rawSeriesId } = await context.params;
    const seriesId = parseSeriesId(rawSeriesId);

    if (!seriesId) {
        return NextResponse.json({ error: 'Invalid series id' }, { status: 400 });
    }

    const series = await prisma.series.findUnique({
        where: { id: seriesId },
        select: { id: true },
    });

    if (!series) {
        return NextResponse.json({ error: 'Серия не найдена.' }, { status: 404 });
    }

    try {
        await prisma.series.delete({
            where: { id: series.id },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete series';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
