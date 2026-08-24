import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hashIpAddress, normalizeIpAddress } from '@/lib/ip-address';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const consentSchema = z.object({
    eventId: z.string().uuid(),
    action: z.enum(['accept-all', 'decline', 'custom']),
    categories: z.object({
        necessary: z.literal(true),
        functional: z.boolean(),
        analytical: z.boolean(),
        marketing: z.boolean(),
    }),
    version: z.string().trim().min(1).max(32),
});

function getClientIp(request: Request) {
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

    return (
        request.headers.get('cf-connecting-ip')?.trim() ||
        request.headers.get('x-real-ip')?.trim() ||
        forwardedFor ||
        null
    );
}

export async function POST(request: Request) {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = consentSchema.safeParse(payload);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Некорректные данные согласия' }, { status: 400 });
    }

    const ip = getClientIp(request);
    const normalizedIp = ip ? normalizeIpAddress(ip) : null;
    const hashSecret = process.env.COOKIE_CONSENT_HASH_SECRET || process.env.AUTH_SECRET;

    if (!normalizedIp || !hashSecret) {
        console.error('Cookie consent logging is not configured');
        return NextResponse.json({ error: 'Consent logging unavailable' }, { status: 503 });
    }

    const ipHash = hashIpAddress(normalizedIp, hashSecret);
    const { eventId, action, categories, version } = parsed.data;

    await prisma.cookieConsentLog.upsert({
        where: { eventId },
        update: {},
        create: {
            eventId,
            ipHash,
            action,
            necessary: categories.necessary,
            functional: categories.functional,
            analytical: categories.analytical,
            marketing: categories.marketing,
            policyVersion: version,
        },
    });

    return NextResponse.json({ logged: true }, { status: 201 });
}
