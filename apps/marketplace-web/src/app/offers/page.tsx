import { Suspense } from 'react';

import { ListingSkeleton } from '@/components/listing/listing-skeleton';
import { ProductListing } from '@/components/listing/product-listing';

import type { SearchParams } from '@/lib/query';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Offers and deals',
  description: 'Deals of the week on drones and accessories.',
};

export default async function OffersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ProductListing
        searchParams={await searchParams}
        title="Deals of the Week"
        description="Limited-time prices from verified sellers. When they are gone, they are gone."
        fixed={{ deal: true }}
        offers="SALE"
      />
    </Suspense>
  );
}
