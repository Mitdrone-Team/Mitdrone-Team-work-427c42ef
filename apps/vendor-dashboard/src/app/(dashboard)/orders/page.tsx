import { OrdersTable } from '@/components/orders/orders-table';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Orders' };

export default function OrdersPage() {
  return <OrdersTable useBackend />;
}
