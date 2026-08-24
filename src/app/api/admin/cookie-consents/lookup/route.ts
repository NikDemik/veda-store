import { NextResponse } from 'next/server';
import { z } from 'zod';

import { getCurrentStaffUser } from '@/lib/admin-auth';
import { hashIpAddress, normalizeIpAddress } from '@/lib/ip-address';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

const lookupSchema = z.object({
    ip: z.string().trim().min(2).max(100),
});

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

    const parsed = lookupSchema.safeParse(payload);
    const normalizedIp = parsed.success ? normalizeIpAddress(parsed.data.ip) : null;
    if (!parsed.success || !normalizedIp) {
        return NextResponse.json({ error: 'Введите корректный IPv4- или IPv6-адрес' }, { status: 400 });
    }

    const hashSecret = process.env.COOKIE_CONSENT_HASH_SECRET || process.env.AUTH_SECRET;
    if (!hashSecret) {
        return NextResponse.json({ error: 'Секрет хэширования не настроен' }, { status: 503 });
    }

    const legacyRepresentations = new Set([normalizedIp, parsed.data.ip.trim()]);
    if (normalizedIp.includes('.')) {
        legacyRepresentations.add(`::ffff:${normalizedIp}`);
    }
    const candidateHashes = [...legacyRepresentations].map((ip) =>
        hashIpAddress(ip, hashSecret),
    );

    const logs = await prisma.cookieConsentLog.findMany({
        where: { ipHash: { in: candidateHashes } },
        orderBy: { consentedAt: 'desc' },
        take: 100,
        select: {
            id: true,
            eventId: true,
            action: true,
            necessary: true,
            functional: true,
            analytical: true,
            marketing: true,
            policyVersion: true,
            consentedAt: true,
        },
    });

    return NextResponse.json({ logs });
}
