'use client';

import { AuthProvider } from '@mitdrone/auth';
import { getQueryClient } from '@mitdrone/sdk';
import { ThemeProvider, Toaster, TooltipProvider } from '@mitdrone/ui';
import { QueryClientProvider } from '@tanstack/react-query';

import '@/mocks/init';

import { env } from '@/lib/env';

import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={getQueryClient()}>
        <AuthProvider
          storageKey="mitdrone.vendor"
          allowedRoles={['vendor_owner', 'vendor_staff']}
          mockMode={env.NEXT_PUBLIC_ENABLE_MOCKS === 'true'}
        >
          <TooltipProvider delayDuration={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
