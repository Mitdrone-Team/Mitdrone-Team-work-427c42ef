import { Button, EmptyState } from '@mitdrone/ui';
import { PackageSearch } from 'lucide-react';
import Link from 'next/link';
import { Suspense, type ReactNode } from 'react';

import { ProductGrid } from '@/components/product/product-card';
import { getBackendCatalogProducts, getCategories, getManufacturers, getProducts, getVendors } from '@/lib/data';
import { parseProductQuery, type SearchParams } from '@/lib/query';

import { ActiveFilters, FiltersPanel, FiltersSheet, type Facets } from './filters-panel';
import { ListingPagination, SortSelect } from './sort-and-pagination';

import type { ProductQuery } from '@mitdrone/sdk';

interface Props {
  searchParams: SearchParams;
  title: string;
  description?: string;
  /** Filters enforced by the page (e.g. the category page). Their facets are hidden. */
  fixed?: Partial<ProductQuery>;
  /** Used when the URL carries no value for that key (e.g. /offers defaults to deals). */
  defaults?: Partial<ProductQuery>;
  breadcrumb?: ReactNode;
  /** When true, fetch results from backend catalog endpoints instead of mock catalog. */
  backend?: boolean;
}

export async function ProductListing({
  searchParams,
  title,
  description,
  fixed = {},
  defaults = {},
  breadcrumb,
  backend = false,
}: Props) {
  const query: ProductQuery = { ...defaults, ...parseProductQuery(searchParams), ...fixed };
  const [result, categories, vendors, manufacturers] = await Promise.all([
    backend ? getBackendCatalogProducts({ page: query.page, limit: query.pageSize }) : getProducts(query),
    getCategories(),
    getVendors({ pageSize: 50 }),
    getManufacturers({ pageSize: 50 }),
  ]);

  const facets: Facets = {
    categories: categories.map((c) => ({ slug: c.slug, name: c.name, group: c.group })),
    vendors: vendors.data.map((v) => ({ slug: v.slug, name: v.name })),
    brands: [...new Set(manufacturers.data.map((m) => m.name))].sort(),
  };
  const hide = Object.keys(fixed).filter((k) => k !== 'page' && k !== 'pageSize');
  const { total, page, totalPages } = result.meta;

  return (
    <div className="container py-8">
      {breadcrumb}
      <header className="mb-6 space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {description ? <p className="text-muted-foreground max-w-2xl">{description}</p> : null}
      </header>
      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <Suspense fallback={null}>
          <aside aria-label="Filters" className="sticky top-40 hidden self-start lg:block">
            <FiltersPanel facets={facets} hide={hide} />
          </aside>
        </Suspense>
        <section aria-label="Results" className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-sm" aria-live="polite">
              {total} {total === 1 ? 'result' : 'results'}
            </p>
            <div className="flex items-center gap-2">
              <Suspense fallback={null}>
                <FiltersSheet facets={facets} hide={hide} />
                <SortSelect />
              </Suspense>
            </div>
          </div>
          <Suspense fallback={null}>
            <ActiveFilters facets={facets} hide={hide} />
          </Suspense>
          {result.data.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              title="No products match your filters"
              description="Try removing a filter or searching for something broader."
              action={
                <Button asChild variant="outline">
                  <Link href="?">Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <ProductGrid products={result.data} />
          )}
          <Suspense fallback={null}>
            <ListingPagination page={page} totalPages={totalPages} />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
