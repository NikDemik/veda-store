import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

function parseUnitMeasureId(value: string) {
    const unitMeasureId = Number(value);

    return Number.isInteger(unitMeasureId) && unitMeasureId > 0 ? unitMeasureId : null;
}

const unitMeasureSchema = z.object({
    name: z.string().trim().min(1, 'Название единицы измерения обязательно').max(191),
    code: z
        .string()
        .trim()
        .min(1, 'Код единицы измерения обязателен')
        .max(191)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Код должен содержать латиницу, цифры и дефисы'),
    shortName: z.string().trim().min(1, 'Краткое обозначение обязательно').max(191),
    isActive: z.boolean().default(true),
    sortOrder: z.coerce.number().int().nonnegative().default(0),
});

export async function PATCH(
    request: Request,
    context: { params: Promise<{ unitMeasureId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { unitMeasureId: rawUnitMeasureId } = await context.params;
    const unitMeasureId = parseUnitMeasureId(rawUnitMeasureId);

    if (!unitMeasureId) {
        return NextResponse.json({ error: 'Invalid unit measure id' }, { status: 400 });
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = unitMeasureSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные данные единицы измерения' },
            { status: 400 },
        );
    }

    const unitMeasure = await prisma.unitMeasure.findUnique({
        where: { id: unitMeasureId },
        select: { id: true },
    });

    if (!unitMeasure) {
        return NextResponse.json({ error: 'Единица измерения не найдена.' }, { status: 404 });
    }

    try {
        const updatedUnitMeasure = await prisma.unitMeasure.update({
            where: { id: unitMeasure.id },
            data: parsed.data,
            select: {
                id: true,
                name: true,
                code: true,
                shortName: true,
                isActive: true,
                sortOrder: true,
            },
        });

        return NextResponse.json({ unitMeasure: updatedUnitMeasure });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Единица измерения с таким кодом уже существует.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to update unit measure';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ unitMeasureId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { unitMeasureId: rawUnitMeasureId } = await context.params;
    const unitMeasureId = parseUnitMeasureId(rawUnitMeasureId);

    if (!unitMeasureId) {
        return NextResponse.json({ error: 'Invalid unit measure id' }, { status: 400 });
    }

    const unitMeasure = await prisma.unitMeasure.findUnique({
        where: { id: unitMeasureId },
        select: { id: true },
    });

    if (!unitMeasure) {
        return NextResponse.json({ error: 'Единица измерения не найдена.' }, { status: 404 });
    }

    try {
        await prisma.unitMeasure.delete({
            where: { id: unitMeasure.id },
        });

        return NextResponse.json({ ok: true });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
            return NextResponse.json(
                { error: 'Нельзя удалить единицу измерения, которая используется в товарах.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to delete unit measure';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
