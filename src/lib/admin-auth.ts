import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

const ADMIN_SESSION_COOKIE = 'admin_session';
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type AdminSessionPayload = {
    staffUserId: number;
    email: string;
    role: string;
    expiresAt: number;
};

function getSessionSecret() {
    const secret = process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET;

    if (secret) return secret;

    if (process.env.NODE_ENV === 'production') {
        throw new Error('AUTH_SECRET or NEXTAUTH_SECRET is required for admin sessions in production.');
    }

    return 'development-admin-session-secret';
}

function toBase64Url(value: string) {
    return Buffer.from(value).toString('base64url');
}

function fromBase64Url(value: string) {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(value: string) {
    return createHmac('sha256', getSessionSecret()).update(value).digest('base64url');
}

export function createAdminSessionToken(payload: Omit<AdminSessionPayload, 'expiresAt'>) {
    const body = toBase64Url(
        JSON.stringify({
            ...payload,
            expiresAt: Date.now() + SESSION_TTL_SECONDS * 1000,
        }),
    );

    return `${body}.${sign(body)}`;
}

function parseAdminSessionToken(token?: string): AdminSessionPayload | null {
    if (!token) return null;

    const [body, signature] = token.split('.');
    if (!body || !signature) return null;

    const expectedSignature = sign(body);
    const signatureBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);

    if (
        signatureBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedBuffer)
    ) {
        return null;
    }

    try {
        const payload = JSON.parse(fromBase64Url(body)) as AdminSessionPayload;
        if (!payload.staffUserId || payload.expiresAt < Date.now()) return null;
        return payload;
    } catch {
        return null;
    }
}

export function getAdminSessionCookieOptions() {
    return {
        name: ADMIN_SESSION_COOKIE,
        httpOnly: true,
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        path: '/',
        maxAge: SESSION_TTL_SECONDS,
        priority: 'high' as const,
    };
}

export async function getCurrentStaffUser() {
    const cookieStore = await cookies();
    const payload = parseAdminSessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

    if (!payload) return null;

    return prisma.staffUser.findFirst({
        where: {
            id: payload.staffUserId,
            email: payload.email,
            isActive: true,
        },
        select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
        },
    });
}

export { ADMIN_SESSION_COOKIE };
