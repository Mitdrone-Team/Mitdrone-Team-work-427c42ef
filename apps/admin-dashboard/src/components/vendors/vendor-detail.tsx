'use client';

import { useAuth } from '@mitdrone/auth';
import {
  getErrorMessage,
  useAdminVendor,
  useBackendOrganization,
  useBackendOrgReviewDecision,
  useBackendOrgSuspend,
} from '@mitdrone/sdk';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ErrorState,
  KpiCard,
  PageHeader,
  Skeleton,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@mitdrone/ui';
import { formatDate, formatDateTime, formatMoney } from '@mitdrone/utils';
import { BadgeCheck, FileCheck2, Package, ReceiptText, ShoppingBag, Wallet } from 'lucide-react';
import Link from 'next/link';

import { ACTION_LABELS, availableActions, useVendorActions } from './vendor-actions';

import type { AdminVendorDetail, Money, VendorStatus } from '@mitdrone/types';

const DOC_LABELS: Record<string, string> = {
  cac_certificate: 'CAC certificate',
  government_id: 'Government ID',
  proof_of_address: 'Proof of address',
  ncaa_permit: 'NCAA permit',
  tax_id: 'Tax ID',
};

interface BackendVendorStats {
  revenue: Money;
  orders: number;
  products: number;
  conversionRate: number;
  pendingPayout: Money;
}

interface BackendOwner {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt?: string;
}

interface BackendProduct {
  id: string;
  title: string;
  status: string;
  price: Money;
  inventory: { quantity: number };
}

interface BackendOrderSummary {
  id: string;
  number: string;
  customerName: string;
  status: string;
  total: Money;
}

interface BackendPayout {
  id: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  amount: Money;
}

interface BackendVendor {
  id: string;
  slug: string;
  name: string;
  type: string;
  status: string;
  description: string;
  email: string;
  phone?: string;
  website?: string;
  city: string;
  state: string;
  country: string;
  verified: boolean;
  rating: number;
  reviewCount: number;
  commissionRate: number;
  shipping: { handlingDays: number };
  returnPolicy: string;
  kycStatus: string;
  createdAt: string;
}

interface BackendVendorDetail {
  vendor: BackendVendor;
  stats: BackendVendorStats;
  kyc: BackendKyc | null;
  owner: BackendOwner | null;
  products: BackendProduct[];
  recentOrders: BackendOrderSummary[];
  payouts: BackendPayout[];
}

interface BackendKyc {
  id: string;
  vendorId: string;
  status: string;
  legalName: string;
  registrationNumber?: string;
  documents: BackendKycDocument[];
  reviewedBy?: string;
  reviewedAt?: string;
  rejectionReason?: string;
}

interface BackendKycDocument {
  type: string;
  fileName: string;
  url: string;
  uploadedAt: string;
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children || '–'}</dd>
    </div>
  );
}

function KycPanel({ detail }: { detail: AdminVendorDetail }) {
  const { kyc, vendor } = detail;
  if (!kyc)
    return (
      <p className="text-muted-foreground text-sm">This vendor has not started verification.</p>
    );
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Business verification</CardTitle>
          <StatusBadge status={kyc.status as VendorStatus} />
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Fact label="Legal name">{kyc.legalName}</Fact>
            <Fact label="Registration number">{kyc.registrationNumber}</Fact>
            <Fact label="Reviewed">{kyc.reviewedAt ? formatDateTime(kyc.reviewedAt) : ''}</Fact>
            {kyc.rejectionReason ? (
              <Fact label="Rejection reason">{kyc.rejectionReason}</Fact>
            ) : null}
          </dl>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Documents</CardTitle>
        </CardHeader>
        <CardContent>
          {kyc.documents.length === 0 ? (
            <p className="text-muted-foreground text-sm">No documents uploaded.</p>
          ) : (
            <ul className="divide-y">
              {kyc.documents.map((d) => (
                <li key={d.type} className="flex items-center gap-3 py-3 text-sm">
                  <FileCheck2 className="text-success size-5" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{DOC_LABELS[d.type] ?? d.type}</p>
                    <p className="text-muted-foreground truncate">
                      {d.fileName} · uploaded {formatDate(d.uploadedAt)}
                    </p>
                  </div>
                  <Badge variant="secondary">Demo file</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      {vendor.status === 'pending_review' ? (
        <p role="note" className="bg-accent/40 rounded-lg border p-3 text-sm">
          Check the legal name, registration number and required documents, then approve or reject
          using the buttons above.
        </p>
      ) : null}
    </div>
  );
}

export function VendorDetail({
  id,
  useBackend = false,
}: {
  id: string;
  /** When true, fetch from backend organization endpoints instead of mock admin API. */
  useBackend?: boolean;
}) {
  const { can } = useAuth();
  const backendVendor = useBackendOrganization(id);
  const mockVendor = useAdminVendor(id);
  const q = useBackend ? backendVendor : mockVendor;
  const review = useBackendOrgReviewDecision();
  const suspend = useBackendOrgSuspend();
  const actions = useVendorActions();
  if (q.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (q.isError)
    return (
      <ErrorState
        title="We could not load this vendor"
        description={getErrorMessage(q.error)}
        onRetry={() => q.refetch()}
      />
    );
  const d = q.data as unknown as BackendVendorDetail;
  const v = d.vendor;
  const allowed = can('admin.write') ? availableActions(v as unknown as { status: VendorStatus }) : [];

  return (
    <>
      <PageHeader
        title={v.name}
        description={`${v.city}, ${v.state} · joined ${formatDate(v.createdAt)}`}
        actions={
          <>
            {v.verified ? (
              <Badge variant="success" className="gap-1">
                <BadgeCheck className="size-3" aria-hidden="true" />
                Verified
              </Badge>
            ) : null}
            <StatusBadge status={v.status as VendorStatus} />
            {allowed.map((a) => (
              <Button
                key={a}
                variant={a === 'approve' ? 'default' : 'outline'}
                className={a === 'approve' ? undefined : 'text-destructive'}
                onClick={async () => {
                  if (useBackend) {
                    if (a === 'approve') {
                      await review.mutateAsync({ id, body: { expectedVersion: 1, reason: '', decision: 'APPROVE' } });
                    } else if (a === 'reject') {
                      await review.mutateAsync({ id, body: { expectedVersion: 1, reason: 'Rejected by admin', decision: 'REJECT' } });
                    } else if (a === 'suspend') {
                      await suspend.mutateAsync({ id, body: { expectedVersion: 1, reason: 'Suspended by admin' } });
                    }
                  } else {
                    actions.request(a, v);
                  }
                }}
              >
                {ACTION_LABELS[a]}
              </Button>
            ))}
          </>
        }
      />
      <section aria-label="Vendor metrics" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Lifetime revenue" icon={ReceiptText} value={formatMoney(d.stats.revenue)} />
        <KpiCard label="Orders" icon={ShoppingBag} value={String(d.stats.orders)} />
        <KpiCard label="Products" icon={Package} value={String(d.stats.products)} />
        <KpiCard label="Pending payout" icon={Wallet} value={formatMoney(d.stats.pendingPayout)} />
      </section>

      <Tabs defaultValue={v.status === 'pending_review' ? 'kyc' : 'overview'}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="kyc">KYC</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="divide-y">
                <Fact label="Type">
                  <span className="capitalize">{v.type.replace('_', ' ')}</span>
                </Fact>
                <Fact label="Email">{v.email}</Fact>
                <Fact label="Phone">{v.phone}</Fact>
                <Fact label="Website">{v.website}</Fact>
                <Fact label="Commission rate">{(v.commissionRate * 100).toFixed(1)}%</Fact>
                <Fact label="Rating">
                  {v.reviewCount ? `${v.rating} (${v.reviewCount})` : 'No reviews'}
                </Fact>
                <Fact label="Handling time">{`${v.shipping.handlingDays} business days`}</Fact>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Owner</CardTitle>
            </CardHeader>
            <CardContent>
              {d.owner ? (
                <dl className="divide-y">
                  <Fact label="Name">{d.owner.name}</Fact>
                  <Fact label="Email">{d.owner.email}</Fact>
                  <Fact label="Account">
                    <StatusBadge status={d.owner.status as VendorStatus} />
                  </Fact>
                  <Fact label="Last sign-in">
                    {d.owner.lastLoginAt ? formatDateTime(d.owner.lastLoginAt) : ''}
                  </Fact>
                </dl>
              ) : (
                <p className="text-muted-foreground text-sm">No owner account.</p>
              )}
              <p className="text-muted-foreground mt-4 text-sm">
                <span className="text-foreground font-medium">Return policy:</span>{' '}
                {v.returnPolicy || 'Not set'}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="kyc">
          <KycPanel detail={d as unknown as AdminVendorDetail} />
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardContent className="pt-6">
              {d.products.length === 0 ? (
                <p className="text-muted-foreground text-sm">No products yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.products.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.title}</TableCell>
                        <TableCell>
                          <StatusBadge status={p.status as VendorStatus} />
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(p.price)}</TableCell>
                        <TableCell className="text-right">{p.inventory.quantity}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <Button asChild variant="link" className="mt-3 h-auto p-0">
                <Link href={`/products?vendor=${v.slug}`}>
                  Moderate all of this vendor’s products
                </Link>
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardContent className="pt-6">
              {d.recentOrders.length === 0 ? (
                <p className="text-muted-foreground text-sm">No orders yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.recentOrders.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell>
                          <Link href={`/orders/${o.id}`} className="font-medium hover:underline">
                            {o.number}
                          </Link>
                        </TableCell>
                        <TableCell>{o.customerName}</TableCell>
                        <TableCell>
                          <StatusBadge status={o.status as VendorStatus} />
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(o.total)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card>
            <CardContent className="pt-6">
              {d.payouts.length === 0 ? (
                <p className="text-muted-foreground text-sm">No payouts yet.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Payout</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.payouts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">{p.id}</TableCell>
                        <TableCell>
                          {formatDate(p.periodStart)} to {formatDate(p.periodEnd)}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={p.status} />
                        </TableCell>
                        <TableCell className="text-right">{formatMoney(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {actions.dialogs}
    </>
  );
}
