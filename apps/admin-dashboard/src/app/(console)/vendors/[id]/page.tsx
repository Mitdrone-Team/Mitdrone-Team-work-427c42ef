import { VendorDetail } from '@/components/vendors/vendor-detail';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Vendor' };

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  return <VendorDetail id={(await params).id} useBackend />;
}
