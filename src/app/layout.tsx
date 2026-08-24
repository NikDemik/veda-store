import type { Metadata } from 'next';
import Script from 'next/script';
import '@/styles/globals.css';
import { CartProvider } from '@/components/cart/cart-context';
import AuthSessionProvider from '@/components/auth/session-provider';
import CookieConsent from '@/components/base/CookieConsent';
import { defaultDescription, siteName } from '@/lib/metadata';

export const metadata: Metadata = {
    title: {
        default: siteName,
        template: `%s | ${siteName}`,
    },
    description: defaultDescription,
    applicationName: siteName,
    icons: {
        icon: [
            {
                url: '/favicon.svg',
                type: 'image/svg+xml',
            },
        ],
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="ru" suppressHydrationWarning>
            <body className="antialiased">
                <Script id="theme-init" strategy="beforeInteractive">
                    {`
                        (function () {
                            try {
                                var storedTheme = localStorage.getItem('theme');
                                var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                var theme = storedTheme === 'light' || storedTheme === 'dark'
                                    ? storedTheme
                                    : (prefersDark ? 'dark' : 'light');
                                document.documentElement.classList.toggle('dark', theme === 'dark');
                                document.documentElement.style.colorScheme = theme;
                            } catch (_) {}
                        })();
                    `}
                </Script>
                <AuthSessionProvider>
                    <CartProvider>{children}</CartProvider>
                </AuthSessionProvider>
                <CookieConsent />
            </body>
        </html>
    );
}
