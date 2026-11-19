import { ReservationsView } from '@/components/account/reservations-view';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Reservations', robots: { index: false } };

export default function ReservationsPage() {
  return (
    <div className="container space-y-6 py-10">
      <ReservationsView />
    </div>
  );
}
