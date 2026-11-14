import { OrderDetail } from '@/components/orders/order-detail';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Order' };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  return <OrderDetail id={(await params).id} useBackend />;
}
