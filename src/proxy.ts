import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { isAdminPublicPath, toInternalAdminPath } from '@/lib/admin-routes';

const STATIC_ADMIN_PUBLIC_PATH = '/control-7f3a9c1e';

export const proxy = auth((request) => {
    const { pathname } = request.nextUrl;

    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
        return new Response('Not found', { status: 404 });
    }

    if (
        pathname === STATIC_ADMIN_PUBLIC_PATH ||
        pathname.startsWith(`${STATIC_ADMIN_PUBLIC_PATH}/`)
    ) {
        return NextResponse.next();
    }

    if (isAdminPublicPath(pathname)) {
        const url = request.nextUrl.clone();
        url.pathname = toInternalAdminPath(pathname);
        return NextResponse.rewrite(url);
    }

    return NextResponse.next();
});
