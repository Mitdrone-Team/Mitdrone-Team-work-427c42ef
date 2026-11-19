'use client';

import { RequireAuth } from '@mitdrone/auth';
import { Skeleton, cn } from '@mitdrone/ui';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import type { ReactNode } from 'react';

const NAV = [
  { href: '/account', label: 'Profile' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/reservations', label: 'Reservations' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/referrals', label: 'Referrals' },
  { href: '/account/projects', label: 'My projects' },
];

export function AccountShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <RequireAuth
      roles={['customer']}
      fallback={
        <div className="container py-10">
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <div className="container grid gap-8 py-10 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Account" className="-mx-4 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          <ul className="flex gap-1 lg:flex-col">
            {NAV.map((item) => {
              const active =
                item.href === '/account' ? pathname === '/account' : pathname.startsWith(item.href);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'block whitespace-nowrap rounded-md px-3 py-2 text-sm',
                      active
                        ? 'bg-accent text-accent-foreground font-medium'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="min-w-0">{children}</div>
      </div>
    </RequireAuth>
  );
}
