import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const optionalText = z.string().trim().max(191).optional().nullable();
const optionalLongText = z.string().trim().max(2000).optional().nullable();

const companyProfileSchema = z.object({
    fullName: z.string().trim().min(1, 'Полное наименование обязательно').max(191),
    shortName: optionalText,
    inn: z
        .string()
        .trim()
        .min(10, 'ИНН должен содержать минимум 10 цифр')
        .max(12, 'ИНН должен содержать не больше 12 цифр')
        .regex(/^\d+$/, 'ИНН должен содержать только цифры'),
    kpp: optionalText,
    ogrn: optionalText,
    legalAddress: z.string().trim().min(1, 'Юридический адрес обязателен').max(2000),
    actualAddress: optionalLongText,
    postalAddress: optionalLongText,
    email: z.string().trim().email('Некорректный email').max(191).optional().or(z.literal('')),
    phone: optionalText,
    website: optionalText,
    directorName: optionalText,
    accountantName: optionalText,
    basis: optionalText,
    isActive: z.boolean().default(true),
});

function nullable(value: string | null | undefined) {
    return value && value.length > 0 ? value : null;
}

function toCompanyProfileData(data: z.infer<typeof companyProfileSchema>) {
    return {
        fullName: data.fullName,
        shortName: nullable(data.shortName),
        inn: data.inn,
        kpp: nullable(data.kpp),
        ogrn: nullable(data.ogrn),
        legalAddress: data.legalAddress,
        actualAddress: nullable(data.actualAddress),
        postalAddress: nullable(data.postalAddress),
        email: nullable(data.email),
        phone: nullable(data.phone),
        website: nullable(data.website),
        directorName: nullable(data.directorName),
        accountantName: nullable(data.accountantName),
        basis: nullable(data.basis),
        isActive: data.isActive,
    };
}

async function parseRequest(request: Request) {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return { error: NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) };
    }

    const parsed = companyProfileSchema.safeParse(payload);

    if (!parsed.success) {
        return {
            error: NextResponse.json(
                { error: parsed.error.issues[0]?.message || 'Некорректные данные компании' },
                { status: 400 },
            ),
        };
    }

    return { data: toCompanyProfileData(parsed.data) };
}

export async function POST(request: Request) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parseRequest(request);

    if (parsed.error) return parsed.error;

    try {
        const companyProfile = await prisma.companyProfile.create({
            data: parsed.data,
        });

        return NextResponse.json({ companyProfile }, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Компания с таким ИНН уже существует.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to create company profile';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}

export async function PATCH(request: Request) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = await parseRequest(request);

    if (parsed.error) return parsed.error;

    const currentProfile = await prisma.companyProfile.findFirst({
        orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
        select: { id: true },
    });

    if (!currentProfile) {
        return NextResponse.json({ error: 'Профиль компании не найден.' }, { status: 404 });
    }

    try {
        const companyProfile = await prisma.companyProfile.update({
            where: { id: currentProfile.id },
            data: parsed.data,
        });

        return NextResponse.json({ companyProfile });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Компания с таким ИНН уже существует.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to update company profile';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
