import { Suspense } from 'react';

import { ListingSkeleton } from '@/components/listing/listing-skeleton';
import { ProductListing } from '@/components/listing/product-listing';

import type { SearchParams } from '@/lib/query';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Shop drones, equipment, spare parts, payloads and accessories.',
};

export default async function ShopPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ProductListing
        searchParams={await searchParams}
        title="Shop"
        description="Where to go when you already know what you want to buy."
        fixed={{ listingType: 'sale' }}
        backend
      />
    </Suspense>
  );
}
