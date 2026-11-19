import { Button } from '@mitdrone/ui';
import { SELLING_STEPS } from '@mitdrone/utils';
import { Building2, Factory, PackageOpen, Recycle, Store } from 'lucide-react';
import Link from 'next/link';

import { env } from '@/lib/env';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sell on Mitdrone',
  description:
    'List your drone, equipment or services and reach verified buyers across Nigeria and Africa.',
};

const PATHS = [
  { id: 'drone', title: 'Sell a Drone', text: 'List your drone for sale.', icon: Store },
  {
    id: 'equipment',
    title: 'Sell Equipment',
    text: 'List accessories, spare parts, equipment and payloads.',
    icon: PackageOpen,
  },
  { id: 'seller', title: 'Become a Seller', text: 'For businesses and dealers.', icon: Building2 },
  {
    id: 'manufacturer',
    title: 'Become a Manufacturer',
    text: 'For drone manufacturers.',
    icon: Factory,
  },
  {
    id: 'used',
    title: 'Sell Used Drones',
    text: 'A special section for pre-owned equipment.',
    icon: Recycle,
  },
];

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;
  return (
    <div className="space-y-14 pb-6">
      <section className="from-accent/70 to-background border-b bg-gradient-to-b">
        <div className="container space-y-5 py-14">
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight sm:text-5xl">
            Sell to verified buyers across Nigeria
          </h1>
          <p className="text-muted-foreground max-w-xl text-lg">
            Create an account, verify yourself, list your product and get paid securely.
          </p>
          {type === 'rent' ? (
            <p role="status" className="bg-card max-w-xl rounded-lg border p-3 text-sm">
              Listing drones for rent is coming soon. Create a seller account now and we will tell
              you when it opens.
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg">
              <a href={`${env.NEXT_PUBLIC_VENDOR_URL}/register`}>List Your Drone</a>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/sell/apply">Apply as a vendor</Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="container space-y-6" aria-labelledby="paths">
        <h2 id="paths" className="text-2xl font-semibold tracking-tight">
          What would you like to sell?
        </h2>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map(({ id, title, text, icon: Icon }) => (
            <li key={id}>
              <a
                href={`${env.NEXT_PUBLIC_VENDOR_URL}/register?type=${id}`}
                className={`bg-card shadow-soft hover:shadow-card flex h-full flex-col gap-2 rounded-xl border p-5 transition-shadow ${type === id ? 'ring-primary ring-2' : ''}`}
              >
                <span className="bg-accent text-accent-foreground flex size-10 items-center justify-center rounded-lg">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="font-semibold">{title}</span>
                <span className="text-muted-foreground text-sm">{text}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>
      <section className="container space-y-6" aria-labelledby="how">
        <div className="flex items-end justify-between">
          <h2 id="how" className="text-2xl font-semibold tracking-tight">
            How selling works
          </h2>
          <Link
            href="/sell/how-it-works"
            className="text-primary text-sm font-medium hover:underline"
          >
            Learn more
          </Link>
        </div>
        <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SELLING_STEPS.map((s, i) => (
            <li key={s.title} className="bg-card flex gap-3 rounded-xl border p-4">
              <span
                className="bg-primary text-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold"
                aria-hidden="true"
              >
                {i + 1}
              </span>
              <span>
                <span className="font-medium">{s.title}</span>
                <span className="text-muted-foreground block text-sm">{s.description}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
