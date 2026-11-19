import '@mitdrone/ui/styles.css';
import './globals.css';

import { env } from '@/lib/env';

import { MarketplaceChrome } from './marketplace-chrome';
import { Providers } from './providers';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_APP_URL),
  title: { default: 'Mitdrone | Secure Drone Marketplace', template: '%s | Mitdrone' },
  icons: { icon: '/icon.png' },
  description:
    'Buy, sell, rent and discover verified drones, equipment and drone services in Nigeria and across Africa.',
  openGraph: {
    type: 'website',
    siteName: 'Mitdrone',
    title: 'Mitdrone | Secure Drone Marketplace',
    description: 'Buy, sell, rent and discover verified drones.',
  },
  twitter: { card: 'summary_large_image' },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F7FAFC' },
    { media: '(prefers-color-scheme: dark)', color: '#081522' },
  ],
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="marketplace-theme">
        <a
          href="#main"
          className="bg-background sr-only z-50 rounded-md px-4 py-2 text-sm font-medium focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Skip to content
        </a>
        <Providers>
          <MarketplaceChrome>
            <main id="main" tabIndex={-1} className="outline-none">
              {children}
            </main>
          </MarketplaceChrome>
        </Providers>
      </body>
    </html>
  );
}
