import { ProductTable } from '@/components/products/product-table';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Products' };

export default function ProductsPage() {
  return <ProductTable useBackend />;
}
