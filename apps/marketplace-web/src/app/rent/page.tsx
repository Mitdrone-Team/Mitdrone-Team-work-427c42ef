import { Suspense } from 'react';

import { ListingSkeleton } from '@/components/listing/listing-skeleton';
import { ProductListing } from '@/components/listing/product-listing';

import type { SearchParams } from '@/lib/query';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Rent a drone',
  description:
    'Rent consumer, enterprise, agricultural, mapping and camera drones by the day, week or month.',
};

export default async function RentPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return (
    <Suspense fallback={<ListingSkeleton />}>
      <ProductListing
        searchParams={await searchParams}
        title="Rent a Drone"
        description="Daily, weekly or monthly rentals from Mitdrone, verified sellers and verified owners."
        fixed={{ listingType: 'rent' }}
        offers="RENTAL"
        breadcrumb={
          <p role="note" className="bg-accent/40 mb-6 rounded-lg border px-4 py-3 text-sm">
            Own a drone that sits idle? <strong>List Your Drone for Rent</strong> is coming soon.
          </p>
        }
      />
    </Suspense>
  );
}
