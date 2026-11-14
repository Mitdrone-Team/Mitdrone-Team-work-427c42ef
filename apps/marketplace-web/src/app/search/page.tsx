import { Badge } from '@mitdrone/ui';
import Link from 'next/link';
import { Suspense } from 'react';

import { ListingSkeleton } from '@/components/listing/listing-skeleton';
import { ProductListing } from '@/components/listing/product-listing';
import { getSearch } from '@/lib/data';

import type { SearchParams } from '@/lib/query';
import type { Metadata } from 'next';

type Props = { searchParams: Promise<SearchParams> };
const term = (sp: SearchParams) => (Array.isArray(sp['q']) ? sp['q'][0] : sp['q'])?.trim() ?? '';

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const q = term(await searchParams);
  return { title: q ? `Search: ${q}` : 'Search', robots: { index: false } };
}

export default async function SearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const q = term(sp);
  if (!q)
    return (
      <div className="container py-16 text-center">
        <h1 className="text-2xl font-semibold">Search Mitdrone</h1>
        <p className="text-muted-foreground mt-2">
          Search drones, accessories, services and operators using the box above.
        </p>
      </div>
    );
  const results = await getSearch(q);
  const extras = [
    {
      label: 'Categories',
      items: results.categories.map((c) => ({
        key: c.id,
        text: c.name,
        href: `/categories/${c.slug}`,
      })),
    },
    {
      label: 'Services',
      items: results.services.map((s) => ({
        key: s.id,
        text: s.title,
        href: `/services/${s.slug}`,
      })),
    },
    {
      label: 'Sellers',
      items: results.vendors.map((v) => ({ key: v.id, text: v.name, href: `/vendors/${v.slug}` })),
    },
    {
      label: 'Manufacturers',
      items: results.manufacturers.map((m) => ({
        key: m.id,
        text: m.name,
        href: `/manufacturers/${m.slug}`,
      })),
    },
  ].filter((g) => g.items.length > 0);
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ProductListing
        searchParams={sp}
        title={`Search results for “${q}”`}
        backend
        breadcrumb={
          extras.length ? (
            <div className="bg-muted/40 mb-6 space-y-3 rounded-xl border p-4">
              {extras.map((g) => (
                <div key={g.label} className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground w-28 text-xs font-semibold uppercase tracking-wide">
                    {g.label}
                  </span>
                  {g.items.map((i) => (
                    <Link key={i.key} href={i.href}>
                      <Badge variant="outline" className="hover:bg-accent">
                        {i.text}
                      </Badge>
                    </Link>
                  ))}
                </div>
              ))}
            </div>
          ) : null
        }
      />
    </Suspense>
  );
}
