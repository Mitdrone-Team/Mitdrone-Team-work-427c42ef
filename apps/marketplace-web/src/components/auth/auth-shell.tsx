'use client';

import { GuestOnly } from '@mitdrone/auth';
import { Skeleton } from '@mitdrone/ui';
import Image from 'next/image';
import Link from 'next/link';

import { Logo } from '@/components/layout/logo';

import type { ReactNode } from 'react';

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="container flex h-20 items-center">
        <Logo />
      </header>
      <div className="container grid min-h-[calc(100vh-5rem)] items-center gap-10 py-6 lg:grid-cols-2 lg:gap-16 lg:py-10">
        <div className="relative h-[220px] overflow-hidden rounded-3xl bg-muted lg:h-auto lg:min-h-[620px]">
          <Image
            src="/hero-drone.jpg"
            alt="Drone ready for flight"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-8 text-white">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/80">
              Mitdrone Marketplace
            </p>
            <h2 className="mt-2 max-w-lg text-3xl font-semibold tracking-tight">
              Your next flight starts here.
            </h2>
          </div>
        </div>
        <div className="mx-auto w-full max-w-md py-8">
          <GuestOnly redirectTo="/account" fallback={<Skeleton className="h-64 w-full" />}>
            {children}
          </GuestOnly>
          <p className="text-muted-foreground mt-6 text-center text-xs">
            <Link href="/" className="hover:text-foreground">Return to the marketplace</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
