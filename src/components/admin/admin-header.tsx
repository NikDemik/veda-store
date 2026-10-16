import Link from 'next/link';
import { LayoutDashboard, LogOut, ShieldCheck } from 'lucide-react';
import { ADMIN_LOGIN_PATH, ADMIN_PUBLIC_PATH } from '@/lib/admin-routes';

type AdminHeaderProps = {
    staffUser: {
        firstName: string;
        lastName: string;
        role: string;
    } | null;
};

export function AdminHeader({ staffUser }: AdminHeaderProps) {
    return (
        <header className="w-full border-b border-slate-200 bg-slate-950 text-white">
            <div className="mx-auto flex w-full flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                    <Link
                        href={ADMIN_PUBLIC_PATH}
                        className="flex size-11 items-center justify-center rounded-lg bg-accent text-white"
                        aria-label="Админ-панель"
                    >
                        <ShieldCheck className="size-5" aria-hidden="true" />
                    </Link>
                    <div>
                        <p className="text-base font-semibold leading-tight">
                            Панель управления
                        </p>
                        <p className="text-xs text-white/55">Внутренний контур управления</p>
                    </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <nav className="flex items-center gap-2 text-sm">
                        <Link
                            href={ADMIN_PUBLIC_PATH}
                            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-white/75 transition hover:bg-white/10 hover:text-white"
                        >
                            <LayoutDashboard className="size-4" aria-hidden="true" />
                            Дашборд
                        </Link>
                    </nav>

                    {staffUser ? (
                        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                            <div className="min-w-0 text-right">
                                <p className="truncate text-sm font-medium">
                                    {staffUser.firstName} {staffUser.lastName}
                                </p>
                                <p className="text-xs text-white/50">{staffUser.role}</p>
                            </div>
                            <form action="/api/admin/logout" method="post">
                                <button
                                    type="submit"
                                    className="inline-flex size-9 items-center justify-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
                                    aria-label="Выйти"
                                >
                                    <LogOut className="size-4" aria-hidden="true" />
                                </button>
                            </form>
                        </div>
                    ) : (
                        <Link
                            href={ADMIN_LOGIN_PATH}
                            className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40"
                        >
                            Войти
                        </Link>
                    )}
                </div>
            </div>
        </header>
    );
}
