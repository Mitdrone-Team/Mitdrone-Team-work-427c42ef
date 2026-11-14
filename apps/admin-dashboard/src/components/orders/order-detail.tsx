'use client';

import { useAuth } from '@mitdrone/auth';
import type { Money } from '@mitdrone/types';
import {
  getErrorMessage,
  useAdminOrder,
  useBackendCancelOrder,
  useBackendOrder,
  useRefundOrder,
} from '@mitdrone/sdk';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  ErrorState,
  PageHeader,
  ReasonDialog,
  Skeleton,
  StatusBadge,
  toast,
} from '@mitdrone/ui';
import { formatDateTime, formatMoney } from '@mitdrone/utils';

import { Undo2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const REFUNDABLE = ['paid', 'processing', 'shipped', 'delivered', 'completed'];

interface BackendOrderItem {
  id: string;
  productId: string;
  variantId?: string;
  vendorId: string;
  title: string;
  imageUrl?: string;
  sku: string;
  quantity: number;
  unitPrice: Money;
  total: Money;
}

interface BackendOrderTimelineEvent {
  status: string;
  at: string;
  note?: string;
}

interface BackendAddress {
  line1: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  phone?: string;
}

interface BackendOrder {
  id: string;
  number: string;
  customerName: string;
  customerEmail: string;
  status: string;
  createdAt: string;
  items: BackendOrderItem[];
  shippingAddress: BackendAddress;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  total: Money;
  commission: Money;
  paymentId?: string;
  timeline: BackendOrderTimelineEvent[];
}

interface BackendPayment {
  brand?: string;
  last4?: string;
  status?: string;
  providerReference?: string;
}

interface BackendDispute {
  id: string;
  reason: string;
  status: string;
}

interface BackendOrderResponse {
  order: BackendOrder;
  payment?: BackendPayment;
  disputes: BackendDispute[];
}

export function OrderDetail({
  id,
  useBackend = false,
}: {
  id: string;
  /** When true, fetch order from backend endpoints instead of mock admin API. */
  useBackend?: boolean;
}) {
  const { can } = useAuth();
  const backendOrder = useBackendOrder(id);
  const mockOrder = useAdminOrder(id);
  const q = useBackend ? backendOrder : mockOrder;
  const refund = useRefundOrder();
  const cancelOrder = useBackendCancelOrder(id);
  const [open, setOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  if (q.isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  if (q.isError)
    return (
      <ErrorState
        title="We could not load this order"
        description={getErrorMessage(q.error)}
        onRetry={() => q.refetch()}
      />
    );
  const qData = q.data as unknown as BackendOrderResponse;
  const order = qData.order;
  const payment = qData.payment;
  const disputes = qData.disputes ?? [];
  const canRefund =
    can('admin.write') && REFUNDABLE.includes(order.status) && Boolean(order.paymentId);

  return (
    <>
      <PageHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            {canRefund ? (
              <Button variant="outline" className="text-destructive" onClick={() => setOpen(true)}>
                <Undo2 /> Refund order
              </Button>
            ) : null}
            {useBackend ? (
              <Button
                variant="outline"
                className="text-destructive"
                onClick={() => setCancelOpen(true)}
                disabled={order.status === 'cancelled' || order.status === 'refunded'}
              >
                Cancel order
              </Button>
            ) : null}
          </>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {order.items.map((i) => (
                  <li key={i.id} className="flex items-center gap-4 py-3">
                    <span className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-md">
                      {i.imageUrl ? (
                        <Image src={i.imageUrl} alt="" fill sizes="56px" className="object-cover" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-medium">{i.title}</p>
                      <p className="text-muted-foreground text-xs">
                        SKU {i.sku} · Qty {i.quantity} × {formatMoney(i.unitPrice)}
                      </p>
                    </div>
                    <p className="font-medium">{formatMoney(i.total)}</p>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                {(
                  [
                    ['Subtotal', order.subtotal],
                    ['Shipping', order.shipping],
                    ['VAT', order.tax],
                  ] as const
                ).map(([l, m]) => (
                  <div key={l} className="flex justify-between">
                    <dt className="text-muted-foreground">{l}</dt>
                    <dd>{formatMoney(m)}</dd>
                  </div>
                ))}
                {order.discount.amount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount</dt>
                    <dd>-{formatMoney(order.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(order.total)}</dd>
                </div>
                <div className="text-muted-foreground flex justify-between">
                  <dt>Platform commission</dt>
                  <dd>{formatMoney(order.commission)}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {[...order.timeline].reverse().map((t) => (
                  <li key={`${t.status}-${t.at}`} className="flex items-start gap-3 text-sm">
                    <span className="bg-primary mt-1.5 size-2 rounded-full" aria-hidden="true" />
                    <span>
                      <StatusBadge status={t.status} />{' '}
                      <span className="text-muted-foreground">{formatDateTime(t.at)}</span>
                      {t.note ? (
                        <span className="text-muted-foreground block">{t.note}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">{order.customerName}</p>
              <p className="text-muted-foreground">{order.customerEmail}</p>
              <address className="text-muted-foreground pt-2 not-italic">
                {order.shippingAddress.line1}
                <br />
                {order.shippingAddress.city}, {order.shippingAddress.state}
                <br />
                {order.shippingAddress.phone}
              </address>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {payment ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="capitalize">
                      {payment.brand} •••• {payment.last4}
                    </span>
                    <StatusBadge status={payment.status ?? ''} />
                  </div>
                  <p className="text-muted-foreground font-mono text-xs">
                    {payment.providerReference}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground">No payment recorded.</p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              {disputes.length === 0 ? (
                <p className="text-muted-foreground text-sm">No disputes on this order.</p>
              ) : (
                <ul className="space-y-2">
                  {disputes.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/disputes/${d.id}`}
                        className="hover:text-primary flex items-center justify-between text-sm"
                      >
                        <span className="capitalize">{d.reason.replace(/_/g, ' ')}</span>
                        <StatusBadge status={d.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      <ReasonDialog
        open={open}
        onOpenChange={setOpen}
        title={`Refund order ${order.number}?`}
        description={`${formatMoney(order.total)} is returned to the customer. The reason is saved in the audit log.`}
        confirmLabel="Refund order"
        destructive
        onConfirm={async (reason) => {
          await refund
            .mutateAsync({ id: order.id, reason })
            .then(() => toast.success(`Order ${order.number} refunded`))
            .catch((e) => toast.error(getErrorMessage(e)));
        }}
      />
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        destructive
        title={`Cancel order ${order.number}?`}
        description="The customer will be notified and the order cannot be restored."
        confirmLabel="Cancel order"
        onConfirm={async () => {
          await cancelOrder.mutateAsync().then(() => toast.success(`Order ${order.number} cancelled`)).catch((e) => toast.error(getErrorMessage(e)));
        }}
      />
    </>
  );
}
