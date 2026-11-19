import { Overview } from '@/components/dashboard/overview';
import { getAdminBackendHealthLive, getAdminBackendHealthReady } from '@/lib/backend-data';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function DashboardPage() {
  const [backendHealth, backendReady] = await Promise.all([
    getAdminBackendHealthLive(),
    getAdminBackendHealthReady(),
  ]);
  return <Overview backendHealth={backendHealth} backendReady={backendReady} />;
}
