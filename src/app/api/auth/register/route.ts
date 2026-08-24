import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { hash } from 'bcryptjs';
import { prisma } from '@/lib/prisma';

const optionalAddressField = z.string().trim().nullable().optional();

// Zod схема для структуры адреса
const AddressStructureSchema = z.object({
    postalCode: optionalAddressField,
    region: optionalAddressField,
    regionType: optionalAddressField,
    area: optionalAddressField,
    city: optionalAddressField,
    cityType: optionalAddressField,
    settlement: optionalAddressField,
    settlementType: optionalAddressField,
    street: optionalAddressField,
    streetType: optionalAddressField,
    house: optionalAddressField,
    block: optionalAddressField,
    flat: optionalAddressField,
    fiasId: optionalAddressField,
    kladrId: optionalAddressField,
}).nullable().optional();

const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    organizationFullName: z.string().min(1),
    organizationType: z.enum(['OOO', 'AO', 'IP', 'OTHER']).default('OOO'),
    organizationInn: z.string().trim().min(1),
    organizationKpp: z.string().trim().optional(),
    organizationShortName: z.string().min(1).optional(),
    organizationFullAddress: z.string().min(1),
    phone: z.string().min(1).optional(),
    addressStructure: AddressStructureSchema,
});

// function parseLegalAddress(value: string) {
//     const parts = value
//         .split(',')
//         .map((part) => part.trim())
//         .filter(Boolean);

//     if (parts.length >= 2) {
//         return {
//             postalCode: parts[0],
//             region: parts[1],
//             city: parts[2],
//             street: parts.slice(3).join(', '),
//         };
//     }

//     const fallback = parts[0] ?? value;
//     return { postalCode: fallback, region: fallback, city: fallback, street: fallback };
// }

export async function POST(request: Request) {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = registerSchema.safeParse(payload);
    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid payload', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const data = parsed.data;
    const email = data.email.toLowerCase();
    const passwordHash = await hash(data.password, 12);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const organization = await tx.organization.create({
                data: {
                    fullName: data.organizationFullName,
                    shortName: data.organizationShortName ?? null,
                    type: data.organizationType,
                    inn: data.organizationInn,
                    kpp: data.organizationKpp || null,
                },
                select: { id: true },
            });

            await tx.address.create({
                data: {
                    organizationId: organization.id,
                    label: 'Юридический адрес',
                    country: 'RU',
                    fullAddress: data.organizationFullAddress ?? null,
                    region: parsed.data.addressStructure?.region,
                    city: parsed.data.addressStructure?.city ?? '',
                    street: parsed.data.addressStructure?.street ?? '',
                    house: parsed.data.addressStructure?.house ?? null,
                    building: parsed.data.addressStructure?.block ?? null,
                    flat: parsed.data.addressStructure?.flat ?? null,
                    postalCode: parsed.data.addressStructure?.postalCode,
                    isLegal: true,
                    isShipping: false,
                    isPrimary: true,
                },
                select: { id: true },
            });

            const user = await tx.user.create({
                data: {
                    organizationId: organization.id,
                    email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    phone: data.phone ?? null,
                    role: 'OWNER',
                    passwordHash,
                },
                select: {
                    id: true,
                    email: true,
                    firstName: true,
                    lastName: true,
                    role: true,
                    organizationId: true,
                },
            });

            return { organizationId: organization.id, user };
        });

        return NextResponse.json(result, { status: 201 });
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return NextResponse.json(
                    { error: 'Введеный Email или ИНН уже зарегистрирован' },
                    { status: 409 },
                );
            }
        }

        const message = error instanceof Error ? error.message : 'Failed to register';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
