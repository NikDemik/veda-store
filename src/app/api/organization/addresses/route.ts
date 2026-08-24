import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

type CreateAddressPayload = {
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

function deriveAddressParts(fullAddress: string, payload: CreateAddressPayload) {
    const normalizedFullAddress = fullAddress.trim();
    const rawParts = normalizedFullAddress
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean);

    const city = payload.city?.trim() || rawParts[0] || normalizedFullAddress;
    const street = payload.street?.trim() || rawParts[1] || normalizedFullAddress;

    return { city, street };
}

export async function GET() {
    const session = await auth();

    if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const addresses = await prisma.address.findMany({
        where: {
            organizationId: session.user.organizationId,
            OR: [{ isShipping: true }, { isLegal: true }],
        },
        orderBy: [{ isPrimary: 'desc' }, { isLegal: 'desc' }, { createdAt: 'asc' }],
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

    return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
    const session = await auth();

    if (!session?.user?.organizationId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let payload: CreateAddressPayload;

    try {
        payload = (await request.json()) as CreateAddressPayload;
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const fullAddress = payload.fullAddress?.trim();

    if (!fullAddress) {
        return NextResponse.json({ error: 'Укажите полный адрес' }, { status: 400 });
    }

    const { city, street } = deriveAddressParts(fullAddress, payload);

    const address = await prisma.address.create({
        data: {
            organizationId: session.user.organizationId,
            label: null,
            fullAddress,
            country: payload.country?.trim() || 'RU',
            region: payload.region?.trim() || null,
            city,
            street,
            house: payload.house?.trim() || null,
            building: payload.building?.trim() || null,
            flat: payload.flat?.trim() || null,
            postalCode: payload.postalCode?.trim() || null,
            isLegal: false,
            isShipping: true,
            isPrimary: false,
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

    return NextResponse.json({ address }, { status: 201 });
}
