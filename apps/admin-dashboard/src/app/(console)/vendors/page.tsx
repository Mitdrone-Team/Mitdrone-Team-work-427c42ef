import { VendorsTable } from '@/components/vendors/vendors-table';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Vendors' };

export default function VendorsPage() {
  return <VendorsTable useBackend />;
}
