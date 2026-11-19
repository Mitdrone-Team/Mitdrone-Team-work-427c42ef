'use client';

import {
  getErrorMessage,
  useAdminDashboard,
  useAdminDisputes,
  useAdminPayouts,
  useAdminProducts,
  useAdminVendors,
} from '@mitdrone/sdk';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  KpiCard,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '@mitdrone/ui';
import { formatDate, formatMoney } from '@mitdrone/utils';
import { Banknote, Gavel, ShoppingBag, Store, UserCheck } from 'lucide-react';
import Link from 'next/link';

import { TimeSeriesChart } from '@/components/common/lazy-charts';
import { compactNaira, toNairaSeries } from '@/lib/money';

function BackendBadge({
  backendHealth,
  backendReady,
}: {
  backendHealth?: { status?: string; service?: string } | undefined;
  backendReady?: boolean;
}) {
  if (!backendHealth) return null;
  return (
    <span className="flex items-center gap-1 text-xs text-muted-foreground">
      {backendHealth.service === 'mitdrone-backend' ? '●' : '○'}
      {backendHealth.status === 'ok' ? 'Backend live' : 'Backend degraded'}
      {backendReady === true ? ' · dependencies ready' : backendReady === false ? ' · dependencies unavailable' : null}
    </span>
  );
}

function Attention({
  title,
  count,
  href,
  children,
}: {
  title: string;
  count: number | undefined;
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">
          {title}
          {count !== undefined ? (
            <span className="bg-warning/10 text-warning ml-2 rounded-full px-2 py-0.5 text-xs font-semibold">
              {count}
            </span>
          ) : null}
        </CardTitle>
        <Button asChild variant="link" className="h-auto p-0">
          <Link href={href}>Review</Link>
        </Button>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function Overview({
  backendHealth,
  backendReady,
}: {
  backendHealth?: { status?: string; service?: string } | undefined;
  backendReady?: boolean;
}) {
  const dash = useAdminDashboard();
  const pendingVendors = useAdminVendors({ status: 'pending_review', pageSize: 4 });
  const pendingProducts = useAdminProducts({ status: 'pending_review', pageSize: 4 });
  const disputes = useAdminDisputes({ status: 'open', pageSize: 4 });
  const payouts = useAdminPayouts({ status: 'pending', pageSize: 4 });

  if (dash.isError)
    return <ErrorState description={getErrorMessage(dash.error)} onRetry={() => dash.refetch()} />;
  const empty = (text: string) => <p className="text-muted-foreground text-sm">{text}</p>;
  const loading = <Skeleton className="h-20 w-full" />;

  return (
    <>
      <PageHeader
        title="Platform overview"
        description="How the marketplace is doing and what needs your attention."
        actions={<BackendBadge backendHealth={backendHealth} backendReady={backendReady} />}
      />
      <section aria-label="Key metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="GMV (all time)"
          icon={Banknote}
          value={dash.data ? formatMoney(dash.data.gmv) : '–'}
          loading={dash.isPending}
        />
        <KpiCard
          label="Active vendors"
          icon={Store}
          value={dash.data ? String(dash.data.activeVendors) : '–'}
          loading={dash.isPending}
        />
        <KpiCard
          label="Pending vendors"
          icon={UserCheck}
          value={dash.data ? String(dash.data.pendingVendors) : '–'}
          loading={dash.isPending}
          hint="Awaiting review"
        />
        <KpiCard
          label="Orders"
          icon={ShoppingBag}
          value={dash.data ? String(dash.data.orders) : '–'}
          loading={dash.isPending}
        />
        <KpiCard
          label="Open disputes"
          icon={Gavel}
          value={dash.data ? String(dash.data.openDisputes) : '–'}
          loading={dash.isPending}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Gross merchandise value</CardTitle>
          <CardDescription>Daily GMV, last 30 days</CardDescription>
        </CardHeader>
        <CardContent>
          {dash.isPending ? (
            <Skeleton className="h-72 w-full" />
          ) : (
            <TimeSeriesChart
              ariaLabel="Daily gross merchandise value for the last 30 days"
              data={toNairaSeries(dash.data.gmvSeries, 'gmv')}
              series={[{ key: 'gmv', label: 'GMV' }]}
              valueFormatter={compactNaira}
            />
          )}
        </CardContent>
      </Card>

      <h2 className="text-lg font-semibold">Needs attention</h2>
      <div className="grid gap-6 lg:grid-cols-2">
        <Attention
          title="Vendors awaiting approval"
          count={pendingVendors.data?.meta.total}
          href="/vendors?status=pending_review"
        >
          {!pendingVendors.data ? (
            pendingVendors.isError ? (
              empty('Could not load this list.')
            ) : (
              loading
            )
          ) : pendingVendors.data.data.length ? (
            <ul className="divide-y">
              {pendingVendors.data.data.map((v) => (
                <li key={v.id}>
                  <Link
                    href={`/vendors/${v.id}`}
                    className="hover:text-primary flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="font-medium">{v.name}</span>
                    <span className="text-muted-foreground">{v.city}</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            empty('No vendors waiting.')
          )}
        </Attention>
        <Attention
          title="Products awaiting moderation"
          count={pendingProducts.data?.meta.total}
          href="/products?status=pending_review"
        >
          {!pendingProducts.data ? (
            pendingProducts.isError ? (
              empty('Could not load this list.')
            ) : (
              loading
            )
          ) : pendingProducts.data.data.length ? (
            <ul className="divide-y">
              {pendingProducts.data.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="line-clamp-1 font-medium">{p.title}</span>
                  <span className="text-muted-foreground shrink-0">{p.vendor?.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            empty('Moderation queue is clear.')
          )}
        </Attention>
        <Attention
          title="Open disputes"
          count={disputes.data?.meta.total}
          href="/disputes?status=open"
        >
          {!disputes.data ? (
            disputes.isError ? (
              empty('Could not load this list.')
            ) : (
              loading
            )
          ) : disputes.data.data.length ? (
            <ul className="divide-y">
              {disputes.data.data.map((d) => (
                <li key={d.id}>
                  <Link
                    href={`/disputes/${d.id}`}
                    className="hover:text-primary flex items-center justify-between py-2.5 text-sm"
                  >
                    <span className="font-medium capitalize">{d.reason.replace(/_/g, ' ')}</span>
                    <span className="text-muted-foreground">
                      {formatMoney(d.amount)} · {formatDate(d.createdAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            empty('No open disputes.')
          )}
        </Attention>
        <Attention
          title="Payouts to process"
          count={payouts.data?.meta.total}
          href="/payouts?status=pending"
        >
          {!payouts.data ? (
            payouts.isError ? (
              empty('Could not load this list.')
            ) : (
              loading
            )
          ) : payouts.data.data.length ? (
            <ul className="divide-y">
              {payouts.data.data.map((p) => (
                <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="font-medium">{p.vendorName}</span>
                  <span className="flex items-center gap-2">
                    {formatMoney(p.amount)}
                    <StatusBadge status={p.status} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            empty('No payouts waiting.')
          )}
        </Attention>
      </div>
    </>
  );
}
