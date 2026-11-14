import { ProductsTable } from '@/components/products/products-table';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Products' };

export default function ProductsPage() {
  return <ProductsTable useBackend />;
}
