'use client';

import { usePathname } from 'next/navigation';

import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';

import type { ReactNode } from 'react';

export function MarketplaceChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = ['/login', '/register', '/forgot-password'].includes(pathname);

  return (
    <>
      {isAuthPage ? null : <SiteHeader />}
      {children}
      {isAuthPage ? null : <SiteFooter />}
    </>
  );
}
