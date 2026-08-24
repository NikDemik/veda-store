import { NextResponse } from 'next/server';
import { z } from 'zod';
import { notifyContactLeadCreated } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const leadSchema = z.object({
    name: z.string().trim().min(1, 'Укажите имя').max(191),
    phone: z.string().trim().min(6, 'Укажите телефон').max(191),
    email: z.string().trim().email('Укажите корректный email').max(191),
    message: z.string().trim().max(2000).optional().nullable(),
    source: z.string().trim().max(191).optional().nullable(),
    consent: z.boolean().refine((value) => value, {
        message: 'Необходимо согласие на обработку персональных данных',
    }),
});

function nullable(value: string | null | undefined) {
    return value && value.length > 0 ? value : null;
}

export async function POST(request: Request) {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = leadSchema.safeParse(payload);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0]?.message || 'Некорректные данные заявки' },
            { status: 400 },
        );
    }

    const lead = await prisma.contactLead.create({
        data: {
            name: parsed.data.name,
            phone: parsed.data.phone,
            email: parsed.data.email,
            message: nullable(parsed.data.message),
            source: nullable(parsed.data.source) || 'contacts',
            consent: parsed.data.consent,
            status: 'NEW',
        },
    });

    await notifyContactLeadCreated(lead);

    return NextResponse.json({ lead: { id: lead.id, status: lead.status } }, { status: 201 });
}
