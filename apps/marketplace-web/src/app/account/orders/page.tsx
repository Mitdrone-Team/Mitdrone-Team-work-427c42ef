import { OrdersList } from '@/components/account/orders-list';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Orders' };

export default function OrdersPage() {
  return <OrdersList useBackend />;
}
