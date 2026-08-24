import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const deactivateSchema = z.object({
    password: z.string().min(1),
});

export async function PATCH(request: Request) {
    const session = await auth();

    if (!session?.user?.id || !session.user.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = deactivateSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json({ error: 'Введите пароль от аккаунта.' }, { status: 400 });
    }

    const userId = Number(session.user.id);

    if (!Number.isInteger(userId)) {
        return NextResponse.json({ error: 'Invalid user id' }, { status: 400 });
    }

    const account = await prisma.user.findFirst({
        where: {
            id: userId,
            organizationId: session.user.organizationId,
            isActive: true,
        },
        select: {
            id: true,
            role: true,
            passwordHash: true,
            organizationId: true,
            organization: {
                select: {
                    isActive: true,
                },
            },
        },
    });

    if (!account || !account.organization.isActive) {
        return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.role !== 'OWNER') {
        return NextResponse.json(
            { error: 'Удалить аккаунт может только владелец организации.' },
            { status: 403 },
        );
    }

    if (!account.passwordHash) {
        return NextResponse.json({ error: 'Для аккаунта не задан пароль.' }, { status: 400 });
    }

    const isPasswordValid = await compare(parsed.data.password, account.passwordHash);

    if (!isPasswordValid) {
        return NextResponse.json({ error: 'Неверный пароль.' }, { status: 403 });
    }

    await prisma.$transaction([
        prisma.organization.update({
            where: { id: account.organizationId },
            data: { isActive: false },
        }),
        prisma.user.updateMany({
            where: { organizationId: account.organizationId },
            data: { isActive: false },
        }),
    ]);

    return NextResponse.json({ ok: true });
}
