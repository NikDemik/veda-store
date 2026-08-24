"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { User } from 'lucide-react';
import { signOut, useSession } from 'next-auth/react';

export default function AccountMenu() {
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { data: session, status } = useSession();
  const organizationName = session?.user?.organizationName ?? '';
  const badgeLetter =
    organizationName.trim().charAt(0).toUpperCase() ||
    session?.user?.email?.charAt(0).toUpperCase() ||
    'U';

  useEffect(() => {
    function handleClick(event: MouseEvent) {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsAccountMenuOpen(false);
      }
    }

    if (isAccountMenuOpen) {
      document.addEventListener('mousedown', handleClick);
    }

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isAccountMenuOpen]);

  if (status !== 'authenticated') {
      return (
          <Link
              href="/auth/login"
              aria-label="Вход в личный кабинет"
              className="flex items-center gap-2 text-black dark:text-white hover:text-accent dark:hover:text-accent"
          >
              <span className="hidden lg:block">Вход</span>
              <User size={18} aria-hidden="true" />
          </Link>
      );
  }

  return (
      <div ref={menuRef} className="relative flex items-center gap-2">
          <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={isAccountMenuOpen}
              aria-label="Открыть меню аккаунта"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/30 dark:border-white/30 bg-black/10 dark:bg-white/10 text-sm font-semibold text-black dark:text-white hover-accent"
              // className="flex h-8 w-8 items-center justify-center rounded-full border border-white/20 text-xs text-white/80 hover:bg-white/10"
              onClick={() => setIsAccountMenuOpen((prev) => !prev)}
          >
              {badgeLetter}
          </button>
          {isAccountMenuOpen && (
              <div
                  className="absolute right-0 top-11 z-50 w-40 rounded-xl border border-black/20 dark:border-white/20 bg-white/80 dark:bg-black/80 p-2 text-sm text-black dark:text-white shadow-lg backdrop-blur"
                  role="menu"
              >
                  <Link
                      href="/account"
                      className="block rounded-lg px-3 py-2 hover:bg-white/10 hover-accent"
                      role="menuitem"
                      onClick={() => setIsAccountMenuOpen(false)}
                  >
                      Профиль
                  </Link>
                  <button
                      type="button"
                      className="block w-full rounded-lg px-3 py-2 text-left hover:bg-white/10 hover-accent"
                      role="menuitem"
                      onClick={() => {
                          setIsAccountMenuOpen(false);
                          signOut({ callbackUrl: '/' });
                      }}
                  >
                      Выход
                  </button>
              </div>
          )}
      </div>
  );
}
