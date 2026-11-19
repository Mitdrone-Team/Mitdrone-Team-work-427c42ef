import { VendorApplicationForm } from '@/components/organizations/apply-form';

import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Vendor application', robots: { index: false } };

export default async function VendorApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org } = await searchParams;
  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Become a vendor</h1>
        <p className="text-muted-foreground">
          Submit your business details for review. We will email you when a decision is made.
        </p>
      </header>
      <VendorApplicationForm resubmitOrgId={org} />
    </div>
  );
}
