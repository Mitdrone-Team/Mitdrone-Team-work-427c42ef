import { OrderDetail } from '@/components/account/order-detail';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Order details' };

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ placed?: string }>;
}) {
  const [{ id }, { placed }] = await Promise.all([params, searchParams]);
  return <OrderDetail id={id} placed={placed === '1'} useBackend />;
}
