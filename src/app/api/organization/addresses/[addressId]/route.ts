import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type UpdateAddressPayload = {
    fullAddress?: string;
    country?: string | null;
    region?: string | null;
    city?: string | null;
    street?: string | null;
    house?: string | null;
    building?: string | null;
    flat?: string | null;
    postalCode?: string | null;
};

function parseAddressId(value: string) {
    const addressId = Number(value);

    return Number.isInteger(addressId) && addressId > 0 ? addressId : null;
}

function deriveAddressParts(fullAddress: string, payload: UpdateAddressPayload) {
    const normalizedFullAddress = fullAddress.trim();
    const rawParts = normalizedFullAddress
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    const city = payload.city?.trim() || rawParts[0] || normalizedFullAddress;
    const street = payload.street?.trim() || rawParts[1] || normalizedFullAddress;

    return { city, street };
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ addressId: string }> },
) {
    const session = await auth();

    if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { addressId: rawAddressId } = await context.params;
    const addressId = parseAddressId(rawAddressId);

    if (!addressId) {
        return NextResponse.json({ error: 'Invalid address id' }, { status: 400 });
    }

    let payload: UpdateAddressPayload;

    try {
        payload = (await request.json()) as UpdateAddressPayload;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const fullAddress = payload.fullAddress?.trim();

    if (!fullAddress) {
        return NextResponse.json({ error: 'Укажите полный адрес' }, { status: 400 });
    }

    const existingAddress = await prisma.address.findFirst({
        where: {
            id: addressId,
            organizationId: session.user.organizationId,
        },
        select: {
            id: true,
            isLegal: true,
        },
    });

    if (!existingAddress) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    if (existingAddress.isLegal) {
        return NextResponse.json(
            { error: 'Юридический адрес нельзя редактировать в этом разделе' },
            { status: 403 },
        );
    }

    const { city, street } = deriveAddressParts(fullAddress, payload);

    const address = await prisma.address.update({
        where: { id: existingAddress.id },
        data: {
            fullAddress,
            country: payload.country?.trim() || 'RU',
            region: payload.region?.trim() || null,
            city,
            street,
            house: payload.house?.trim() || null,
            building: payload.building?.trim() || null,
            flat: payload.flat?.trim() || null,
            postalCode: payload.postalCode?.trim() || null,
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
            flat: true,
            building: true,
            postalCode: true,
            isLegal: true,
            isShipping: true,
            isPrimary: true,
        },
    });

    return NextResponse.json({ address });
}

export async function DELETE(
    _request: Request,
    context: { params: Promise<{ addressId: string }> },
) {
    const session = await auth();

    if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { addressId: rawAddressId } = await context.params;
    const addressId = parseAddressId(rawAddressId);

    if (!addressId) {
        return NextResponse.json({ error: 'Invalid address id' }, { status: 400 });
    }

    const address = await prisma.address.findFirst({
        where: {
            id: addressId,
            organizationId: session.user.organizationId,
        },
        select: {
            id: true,
            isLegal: true,
        },
    });

    if (!address) {
        return NextResponse.json({ error: 'Address not found' }, { status: 404 });
    }

    if (address.isLegal) {
        return NextResponse.json(
            { error: 'Юридический адрес нельзя удалить в этом разделе' },
            { status: 403 },
        );
    }

    await prisma.address.delete({
        where: { id: address.id },
    });

    return NextResponse.json({ ok: true });
}
