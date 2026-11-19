import { EmptyState } from '@mitdrone/ui';
import { SearchX } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

import { ListingPagination } from '@/components/listing/sort-and-pagination';
import { ServiceCard } from '@/components/services/service-card';
import { getServiceCategories, getServices } from '@/lib/data';

import type { SearchParams } from '@/lib/query';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Drone services',
  description:
    'Find verified drone operators for mapping, surveying, spraying, inspection, photography and more.',
};

const GROUPS = [
  ['drone_services', 'Drone services'],
  ['professional', 'Professional services'],
  ['support', 'Support services'],
] as const;

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k]?.[0] : (sp[k] as string | undefined));
  const category = one('category');
  const state = one('state');
  const page = Math.max(1, Number(one('page')) || 1);
  const [categories, result] = await Promise.all([
    getServiceCategories(),
    getServices({
      page,
      pageSize: 12,
      ...(category ? { category } : {}),
      ...(state ? { state } : {}),
      ...(one('q') ? { q: one('q') } : {}),
    }),
  ]);
  const current = categories.find((c) => c.slug === category);

  return (
    <div className="container space-y-8 py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">
            {current ? current.name : 'Drone services'}
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            {current
              ? current.description
              : 'Find verified operators for any job, from farm mapping to powerline inspection.'}
          </p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link
            href="/services/find"
            className="bg-primary text-primary-foreground rounded-md px-4 py-2 font-medium"
          >
            Guided finder
          </Link>
          <Link href="/services/post-project" className="rounded-md border px-4 py-2 font-medium">
            Post a project
          </Link>
          <Link href="/services/apply" className="rounded-md border px-4 py-2 font-medium">
            Become a provider
          </Link>
        </div>
      </header>
      <nav aria-label="Service categories" className="space-y-3">
        {GROUPS.map(([group, label]) => (
          <div key={group}>
            <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">
              {label}
            </p>
            <ul className="flex flex-wrap gap-2">
              {categories
                .filter((c) => c.group === group)
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/services?category=${c.slug}`}
                      aria-current={c.slug === category ? 'true' : undefined}
                      className={`inline-block rounded-full border px-3 py-1 text-sm ${c.slug === category ? 'border-primary bg-accent text-accent-foreground font-medium' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {c.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </nav>
      <form className="flex flex-wrap items-end gap-3" role="search" aria-label="Filter services">
        {category ? <input type="hidden" name="category" value={category} /> : null}
        <label className="space-y-1 text-sm">
          <span className="font-medium">Coverage state</span>
          <input
            name="state"
            defaultValue={state}
            placeholder="e.g. Kaduna"
            className="border-input bg-background block h-10 w-56 rounded-md border px-3 text-sm"
          />
        </label>
        <button className="hover:bg-accent h-10 rounded-md border px-4 text-sm font-medium">
          Apply
        </button>
      </form>
      {result.data.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No services found"
          description="Try another service or state, or post a project and let operators come to you."
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.data.map((s) => (
            <li key={s.id}>
              <ServiceCard service={s} />
            </li>
          ))}
        </ul>
      )}
      <Suspense fallback={null}>
        <ListingPagination page={result.meta.page} totalPages={result.meta.totalPages} />
      </Suspense>
    </div>
  );
}
