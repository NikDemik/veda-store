'use client';

import { FormEvent, Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LockKeyhole, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ADMIN_PUBLIC_PATH } from '@/lib/admin-routes';

function AdminLoginForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const rawCallbackUrl = searchParams.get('callbackUrl');
    const callbackUrl = rawCallbackUrl?.startsWith(ADMIN_PUBLIC_PATH)
        ? rawCallbackUrl
        : ADMIN_PUBLIC_PATH;

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsSubmitting(true);

        try {
            const response = await fetch('/api/admin/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                setError('Неверный email или пароль');
                return;
            }

            router.push(callbackUrl);
            router.refresh();
        } catch {
            setError('Не удалось выполнить вход');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <main className="w-full bg-white py-12 dark:bg-black">
            <div className="mx-auto flex w-full max-w-md items-center">
                <section className="w-full rounded-xl bg-white p-6 shadow-shadow-main sm:p-10">
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex size-11 items-center justify-center rounded-lg bg-accent text-white">
                            <LockKeyhole className="size-5" aria-hidden="true" />
                        </div>
                        <div>
                            <h2 className="text-black dark:text-white leading-tight">
                                Админ-панель
                            </h2>
                            <p className="mt-1 text-sm text-dark-grey">Вход для сотрудников</p>
                        </div>
                    </div>

                    <form className="space-y-5" onSubmit={handleSubmit}>
                        <label className="block">
                            <span className="text-sm font-medium text-black">Email</span>
                            <input
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                                type="email"
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                autoComplete="email"
                                required
                            />
                        </label>

                        <label className="block">
                            <span className="text-sm font-medium text-black">Пароль</span>
                            <input
                                className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                                type="password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                autoComplete="current-password"
                                required
                            />
                        </label>

                        {error ? (
                            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                                {error}
                            </p>
                        ) : null}

                        <Button type="submit" disabled={isSubmitting}>
                            <LogIn className="size-4" aria-hidden="true" />
                            {isSubmitting ? 'Вход...' : 'Войти'}
                        </Button>
                    </form>
                    <p className="mt-6 text-dark-grey">
                        Нет аккаунта? Обратитесь к администратору для создания аккаунта
                        {/* <Link
                            className="font-semibold text-accent"
                            href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                        >
                            Обратитесь к администратору для создания аккаунта
                        </Link> */}
                    </p>
                </section>
            </div>
        </main>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense
            fallback={
                <main className="w-full bg-white py-12 dark:bg-black">
                    <div className="mx-auto flex w-full max-w-md items-center">
                        <section className="w-full rounded-xl bg-white p-6 shadow-shadow-main sm:p-10">
                            <p className="text-sm text-dark-grey">Загрузка...</p>
                        </section>
                    </div>
                </main>
            }
        >
            <AdminLoginForm />
        </Suspense>
    );
}
