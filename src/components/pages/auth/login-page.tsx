'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';

function LoginForm() {
    const searchParams = useSearchParams();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const callbackUrl = searchParams.get('callbackUrl') || '/catalog';

    async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);
        setIsLoading(true);

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
            callbackUrl,
        });

        setIsLoading(false);

        if (!result || result.error) {
            setError('Неверный email или пароль');
            return;
        }

        if (result.url) {
            window.location.href = result.url;
        }
    }

    return (
        <div className="w-full bg-white py-12 dark:bg-black">
            <div className="mx-auto w-full max-w-md rounded-xl border border-border bg-white p-10 shadow-shadow-main dark:bg-black">
                <h2 className="text-black dark:text-white">Вход</h2>
                <p className="mt-1 text-dark-grey">Введите ваши данные для входа</p>

                <form className="mt-6 space-y-4" onSubmit={onSubmit}>
                    <label className="block">
                        <span className="text-black dark:text-white">Email</span>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            autoComplete="email"
                            className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                            placeholder="email@company.ru"
                        />
                    </label>

                    <label className="block">
                        <span className="text-black dark:text-white">Пароль</span>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(event) => setPassword(event.target.value)}
                            autoComplete="current-password"
                            className="mt-2 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-accent dark:bg-black dark:text-white"
                            placeholder="••••••••"
                        />
                    </label>

                    {error && <p className="text-sm text-red-600">{error}</p>}

                    <Button type="submit" disabled={isLoading} variant="default" size="default">
                        {isLoading ? 'Входим...' : 'Войти'}
                    </Button>
                </form>

                <p className="mt-6 text-dark-grey">
                    Нет аккаунта?{' '}
                    <Link
                        className="font-semibold text-accent"
                        href={`/auth/register?callbackUrl=${encodeURIComponent(callbackUrl)}`}
                    >
                        Зарегистрироваться
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={null}>
            <LoginForm />
        </Suspense>
    );
}
