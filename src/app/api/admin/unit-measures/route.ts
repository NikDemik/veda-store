import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

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

    const parsed = unitMeasureSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные данные единицы измерения' },
            { status: 400 },
        );
    }

    try {
        const unitMeasure = await prisma.unitMeasure.create({
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

        return NextResponse.json({ unitMeasure }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Единица измерения с таким кодом уже существует.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to create unit measure';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
