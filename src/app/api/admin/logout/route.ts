import { NextResponse } from 'next/server';
import { getAdminSessionCookieOptions } from '@/lib/admin-auth';
import { ADMIN_LOGIN_PATH } from '@/lib/admin-routes';

export async function POST(request: Request) {
    const response = NextResponse.redirect(new URL(ADMIN_LOGIN_PATH, request.url), { status: 303 });
    response.cookies.set({
        ...getAdminSessionCookieOptions(),
        value: '',
        maxAge: 0,
    });

    return response;
}
