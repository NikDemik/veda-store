import { LeadStatus } from '@prisma/client';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStaffUser } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

const leadStatuses = Object.values(LeadStatus) as [LeadStatus, ...LeadStatus[]];

const leadStatusSchema = z.object({
    status: z.enum(leadStatuses),
});

function parseLeadId(value: string) {
    const leadId = Number(value);

    return Number.isInteger(leadId) && leadId > 0 ? leadId : null;
}

export async function PATCH(
    request: Request,
    context: { params: Promise<{ leadId: string }> },
) {
    const staffUser = await getCurrentStaffUser();

    if (!staffUser) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { leadId: rawLeadId } = await context.params;
    const leadId = parseLeadId(rawLeadId);

    if (!leadId) {
        return NextResponse.json({ error: 'Invalid lead id' }, { status: 400 });
    }

    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = leadStatusSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректный статус заявки' },
            { status: 400 },
        );
    }

    const lead = await prisma.contactLead.update({
        where: { id: leadId },
        data: { status: parsed.data.status },
        select: { id: true, status: true },
    });

    return NextResponse.json({ lead });
}
