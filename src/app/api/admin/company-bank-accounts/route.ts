import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const bankAccountSchema = z.object({
    companyProfileId: z.coerce.number().int().positive('Профиль компании обязателен'),
    bankName: z.string().trim().min(1, 'Наименование банка обязательно').max(191),
    bankAddress: z.string().trim().max(2000).optional().nullable(),
    bik: z
        .string()
        .trim()
        .length(9, 'БИК должен содержать 9 цифр')
        .regex(/^\d+$/, 'БИК должен содержать только цифры'),
    checkingAccount: z
        .string()
        .trim()
        .length(20, 'Расчетный счет должен содержать 20 цифр')
        .regex(/^\d+$/, 'Расчетный счет должен содержать только цифры'),
    correspondentAccount: z
        .string()
        .trim()
        .length(20, 'Корреспондентский счет должен содержать 20 цифр')
        .regex(/^\d+$/, 'Корреспондентский счет должен содержать только цифры'),
    recipientName: z.string().trim().max(191).optional().nullable(),
    isDefault: z.boolean().default(false),
    isActive: z.boolean().default(true),
});

function nullable(value: string | null | undefined) {
    return value && value.length > 0 ? value : null;
}

function toBankAccountData(data: z.infer<typeof bankAccountSchema>) {
    return {
        companyProfileId: data.companyProfileId,
        bankName: data.bankName,
        bankAddress: nullable(data.bankAddress),
        bik: data.bik,
        checkingAccount: data.checkingAccount,
        correspondentAccount: data.correspondentAccount,
        recipientName: nullable(data.recipientName),
        isDefault: data.isDefault,
        isActive: data.isActive,
    };
}

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

    const parsed = bankAccountSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные банковские реквизиты' },
            { status: 400 },
        );
    }

    const data = toBankAccountData(parsed.data);

    try {
        const bankAccount = await prisma.$transaction(async (tx) => {
            const companyProfile = await tx.companyProfile.findUnique({
                where: { id: data.companyProfileId },
                select: { id: true },
            });

            if (!companyProfile) {
                throw new Error('Профиль компании не найден.');
            }

            if (data.isDefault) {
                await tx.companyBankAccount.updateMany({
                    where: { companyProfileId: data.companyProfileId },
                    data: { isDefault: false },
                });
            }

            return tx.companyBankAccount.create({ data });
        });

        return NextResponse.json({ bankAccount }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Расчетный счет уже добавлен для этой компании.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to create company bank account';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
