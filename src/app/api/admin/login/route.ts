import { NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createAdminSessionToken, getAdminSessionCookieOptions } from '@/lib/admin-auth';

const loginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function getClientIp(request: Request) {
    const forwardedFor = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
    const realIp = request.headers.get('x-real-ip')?.trim();

    return forwardedFor || realIp || 'unknown';
}

function getRateLimitKey(request: Request, email: string) {
    return `${getClientIp(request)}:${email}`;
}

function getRateLimitResponse(key: string) {
    const now = Date.now();
    const attempt = loginAttempts.get(key);

    if (!attempt || attempt.resetAt <= now) {
        loginAttempts.delete(key);
        return null;
    }

    if (attempt.count < RATE_LIMIT_MAX_ATTEMPTS) {
        return null;
    }

    const retryAfter = Math.ceil((attempt.resetAt - now) / 1000);

    return NextResponse.json(
        { error: 'Too many login attempts. Try again later.' },
        {
            status: 429,
            headers: {
                'Retry-After': String(retryAfter),
            },
        },
    );
}

function recordFailedLoginAttempt(key: string) {
    const now = Date.now();
    const attempt = loginAttempts.get(key);

    if (!attempt || attempt.resetAt <= now) {
        loginAttempts.set(key, {
            count: 1,
            resetAt: now + RATE_LIMIT_WINDOW_MS,
        });
        return;
    }

    loginAttempts.set(key, {
        count: attempt.count + 1,
        resetAt: attempt.resetAt,
    });
}

function clearLoginAttempts(key: string) {
    loginAttempts.delete(key);
}

export async function POST(request: Request) {
    let payload: unknown;

    try {
        payload = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const parsed = loginSchema.safeParse(payload);
    if (!parsed.success) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 400 });
    }

    const email = parsed.data.email.toLowerCase();
    const rateLimitKey = getRateLimitKey(request, email);
    const rateLimitResponse = getRateLimitResponse(rateLimitKey);

    if (rateLimitResponse) {
        return rateLimitResponse;
    }

    const staffUser = await prisma.staffUser.findUnique({
        where: { email },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            passwordHash: true,
        },
    });

    if (!staffUser?.isActive || !staffUser.passwordHash) {
        recordFailedLoginAttempt(rateLimitKey);
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const isValidPassword = await compare(parsed.data.password, staffUser.passwordHash);
    if (!isValidPassword) {
        recordFailedLoginAttempt(rateLimitKey);
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    clearLoginAttempts(rateLimitKey);

    await prisma.staffUser.update({
        where: { id: staffUser.id },
        data: { lastLoginAt: new Date() },
    });

    const response = NextResponse.json({
        staffUser: {
            id: staffUser.id,
            email: staffUser.email,
            name: `${staffUser.firstName} ${staffUser.lastName}`.trim(),
            role: staffUser.role,
        },
    });

    response.cookies.set({
        ...getAdminSessionCookieOptions(),
        value: createAdminSessionToken({
            staffUserId: staffUser.id,
            email: staffUser.email,
            role: staffUser.role,
        }),
    });

    return response;
}
