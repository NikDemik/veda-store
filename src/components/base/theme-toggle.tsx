'use client';

import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

function getPreferredTheme(): Theme {
    if (typeof window === 'undefined') {
        return 'light';
    }

    const storedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (storedTheme === 'light' || storedTheme === 'dark') {
        return storedTheme;
    }

    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
}

export default function ThemeToggle() {
    const [theme, setTheme] = useState<Theme>('light');

    useEffect(() => {
        const preferredTheme = getPreferredTheme();

        setTheme(preferredTheme);
        applyTheme(preferredTheme);
    }, []);

    const toggleTheme = () => {
        setTheme((currentTheme) => {
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';

            window.localStorage.setItem(STORAGE_KEY, nextTheme);
            applyTheme(nextTheme);

            return nextTheme;
        });
    };

    const isDark = theme === 'dark';
    const label = isDark ? 'Включить светлую тему' : 'Включить темную тему';

    return (
        <button
            type="button"
            className="inline-flex size-9 items-center justify-center rounded-[8px]  text-black transition-colors  hover:text-accent focus:outline-none focus:ring-2 focus:ring-accent"
            aria-label={label}
            title={label}
            onClick={toggleTheme}
        >
            {isDark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
    );
}
