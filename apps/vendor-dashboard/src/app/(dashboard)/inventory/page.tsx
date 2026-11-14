import { InventoryTable } from '@/components/inventory/inventory-table';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Inventory' };

export default function InventoryPage() {
  return <InventoryTable useBackend />;
}
