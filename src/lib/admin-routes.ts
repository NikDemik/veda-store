export const ADMIN_PUBLIC_PATH = process.env.NEXT_PUBLIC_ADMIN_PUBLIC_PATH || '/control-7f3a9c1e';
export const ADMIN_LOGIN_PATH = `${ADMIN_PUBLIC_PATH}/login`;

export function isAdminPublicPath(pathname: string) {
    return pathname === ADMIN_PUBLIC_PATH || pathname.startsWith(`${ADMIN_PUBLIC_PATH}/`);
}

export function toInternalAdminPath(pathname: string) {
    return `/admin${pathname.slice(ADMIN_PUBLIC_PATH.length) || ''}`;
}
