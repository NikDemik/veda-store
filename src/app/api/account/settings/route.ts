import { NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { hash } from 'bcryptjs';
import { z } from 'zod';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

const settingsSchema = z.object({
    email: z.string().email(),
    firstName: z.string().min(1),
    lastName: z.string().min(1),
    phone: z.string().trim().optional().or(z.literal('')),
    organizationInn: z.string().min(1),
    organizationType: z.enum(['OOO', 'AO', 'IP', 'OTHER']).default('OOO'),
    organizationKpp: z.string().trim().optional().or(z.literal('')),
    organizationFullName: z.string().min(1),
    organizationShortName: z.string().trim().optional().or(z.literal('')),
    organizationFullAddress: z.string().min(1),
    newPassword: z.string().trim().min(8).optional().or(z.literal('')),
});

function deriveAddressParts(fullAddress: string) {
    const normalizedFullAddress = fullAddress.trim();
    const rawParts = normalizedFullAddress
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    return {
        city: rawParts[0] || normalizedFullAddress,
        street: rawParts[1] || normalizedFullAddress,
    };
}

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

    const parsed = settingsSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: 'Invalid payload', details: parsed.error.flatten() },
            { status: 400 },
        );
    }

    const data = parsed.data;
    const userId = Number(session.user.id);
    const organizationId = session.user.organizationId;
    const normalizedEmail = data.email.toLowerCase();
    const normalizedPhone = data.phone?.trim() || null;
    const normalizedOrganizationKpp = data.organizationKpp?.trim() || null;
    const normalizedOrganizationShortName = data.organizationShortName?.trim() || null;
    const normalizedNewPassword = data.newPassword?.trim() || null;
    const normalizedAddress = data.organizationFullAddress.trim();
    const addressParts = deriveAddressParts(normalizedAddress);

    try {
        const result = await prisma.$transaction(async (tx) => {
            const passwordHash = normalizedNewPassword
                ? await hash(normalizedNewPassword, 12)
                : undefined;

            const user = await tx.user.update({
                where: { id: userId },
                data: {
                    email: normalizedEmail,
                    firstName: data.firstName.trim(),
                    lastName: data.lastName.trim(),
                    phone: normalizedPhone,
                    ...(passwordHash ? { passwordHash } : {}),
                },
                select: {
                    email: true,
                    firstName: true,
                    lastName: true,
                    phone: true,
                },
            });

            const organization = await tx.organization.update({
                where: { id: organizationId },
                data: {
                    fullName: data.organizationFullName.trim(),
                    shortName: normalizedOrganizationShortName,
                    type: data.organizationType,
                    inn: data.organizationInn.trim(),
                    kpp: normalizedOrganizationKpp,
                },
                select: {
                    fullName: true,
                    shortName: true,
                    type: true,
                    inn: true,
                    kpp: true,
                },
            });

            const legalAddress = await tx.address.findFirst({
                where: {
                    organizationId,
                    isLegal: true,
                },
                orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
                select: { id: true },
            });

            const addressData = {
                label: 'Юридический адрес',
                fullAddress: normalizedAddress,
                country: 'RU',
                postalCode: null,
                region: null,
                city: addressParts.city,
                street: addressParts.street,
                house: null,
                building: null,
                flat: null,
                isLegal: true,
                isShipping: false,
                isPrimary: true,
            };

            const address = legalAddress
                ? await tx.address.update({
                      where: { id: legalAddress.id },
                      data: addressData,
                      select: {
                          id: true,
                          label: true,
                          fullAddress: true,
                          country: true,
                          region: true,
                          city: true,
                          street: true,
                          house: true,
                          building: true,
                          flat: true,
                          postalCode: true,
                          isLegal: true,
                          isShipping: true,
                          isPrimary: true,
                      },
                  })
                : await tx.address.create({
                      data: {
                          organizationId,
                          ...addressData,
                      },
                      select: {
                          id: true,
                          label: true,
                          fullAddress: true,
                          country: true,
                          region: true,
                          city: true,
                          street: true,
                          house: true,
                          building: true,
                          flat: true,
                          postalCode: true,
                          isLegal: true,
                          isShipping: true,
                          isPrimary: true,
                      },
                  });

            return { user, organization, address };
        });

        return NextResponse.json(result);
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Email или ИНН уже используются.' },
                { status: 409 },
            );
        }

        const message = error instanceof Error ? error.message : 'Failed to update settings';
        return NextResponse.json({ error: message }, { status: 400 });
    }
}
