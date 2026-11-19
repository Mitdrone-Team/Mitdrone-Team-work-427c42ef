import { ServiceProviderApplicationForm } from '@/components/organizations/apply-form';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Service provider application',
  robots: { index: false },
};

export default async function ProviderApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org } = await searchParams;
  return (
    <div className="container max-w-3xl space-y-6 py-10">
      <header className="space-y-1">
        <h1 className="text-3xl font-semibold tracking-tight">Become a service provider</h1>
        <p className="text-muted-foreground">
          Offer drone services to buyers. Submit your details for review.
        </p>
      </header>
      <ServiceProviderApplicationForm resubmitOrgId={org} />
    </div>
  );
}
