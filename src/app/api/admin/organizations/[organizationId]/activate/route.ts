import { NextResponse } from 'next/server';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

function parseOrganizationId(value: string) {
    const organizationId = Number(value);

    return Number.isInteger(organizationId) && organizationId > 0 ? organizationId : null;
}

export async function PATCH(
    _request: Request,
    context: { params: Promise<{ organizationId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { organizationId: rawOrganizationId } = await context.params;
    const organizationId = parseOrganizationId(rawOrganizationId);

    if (!organizationId) {
        return NextResponse.json({ error: 'Invalid organization id' }, { status: 400 });
    }

    const organization = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { id: true },
    });

    if (!organization) {
        return NextResponse.json({ error: 'Организация не найдена.' }, { status: 404 });
    }

    await prisma.$transaction([
        prisma.organization.update({
            where: { id: organization.id },
            data: { isActive: true },
        }),
        prisma.user.updateMany({
            where: { organizationId: organization.id },
            data: { isActive: true },
        }),
    ]);

    return NextResponse.json({ ok: true });
}
