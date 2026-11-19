'use client';

import { getErrorMessage, useBackendOrder, useMyOrder } from '@mitdrone/sdk';
import { Button, ErrorState, Skeleton, StatusBadge } from '@mitdrone/ui';
import { formatDateTime, formatMoney } from '@mitdrone/utils';
import { CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

import type { Order } from '@mitdrone/types';

function unwrapOrder(raw: unknown): Order | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const record = raw as Record<string, unknown>;
  return (('order' in record ? record.order : record) as Order) ?? undefined;
}

export function OrderDetail({
  id,
  placed,
  useBackend = false,
}: {
  id: string;
  placed: boolean;
  /** When true, fetch the order from backend endpoints instead of the mock API. */
  useBackend?: boolean;
}) {
  const backendOrder = useBackendOrder(id);
  const mockOrder = useMyOrder(id);
  const { data: raw, isPending, isError, error, refetch } = useBackend
    ? backendOrder
    : mockOrder;
  const order = unwrapOrder(raw);
  if (isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  if (isError)
    return (
      <ErrorState
        title="We could not load this order"
        description={getErrorMessage(error)}
        onRetry={() => refetch()}
      />
    );

  if (!order)
    return (
      <ErrorState
        title="We could not load this order"
        description="The order could not be found."
        onRetry={() => refetch()}
      />
    );

  return (
    <div className="space-y-6">
      {placed ? (
        <div role="status" className="bg-success/5 flex items-start gap-3 rounded-xl border p-4">
          <CheckCircle2 className="text-success mt-0.5 size-5" aria-hidden="true" />
          <div>
            <p className="font-semibold">Thank you! Your order is confirmed.</p>
            <p className="text-muted-foreground text-sm">
              We have notified the seller. You will get updates here as it ships.
            </p>
          </div>
        </div>
      ) : null}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/account/orders" className="text-primary text-sm hover:underline">
            All orders
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Order {order.number}</h1>
          <p className="text-muted-foreground text-sm">Placed {formatDateTime(order.createdAt)}</p>
        </div>
        <StatusBadge status={order.status} />
      </header>

      <section aria-labelledby="items-h" className="bg-card rounded-xl border">
        <h2 id="items-h" className="border-b px-4 py-3 font-semibold">
          Items
        </h2>
        <ul className="divide-y">
          {order.items.map((i) => (
            <li key={i.id} className="flex items-center gap-4 p-4">
              <span className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-md">
                {i.imageUrl ? (
                  <Image src={i.imageUrl} alt="" fill sizes="64px" className="object-cover" />
                ) : null}
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium">{i.title}</p>
                <p className="text-muted-foreground text-sm">
                  Qty {i.quantity} × {formatMoney(i.unitPrice)}
                </p>
              </div>
              <p className="font-medium">{formatMoney(i.total)}</p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="ship-h" className="bg-card space-y-2 rounded-xl border p-4">
          <h2 id="ship-h" className="font-semibold">
            Delivery
          </h2>
          <address className="text-muted-foreground text-sm not-italic">
            {order.shippingAddress.fullName}
            <br />
            {order.shippingAddress.line1}
            {order.shippingAddress.line2 ? `, ${order.shippingAddress.line2}` : ''}
            <br />
            {order.shippingAddress.city}, {order.shippingAddress.state}
            <br />
            {order.shippingAddress.phone}
          </address>
          {order.trackingNumber ? (
            <p className="text-sm">
              Tracking: <strong>{order.trackingNumber}</strong>
              {order.carrier ? ` (${order.carrier})` : ''}
            </p>
          ) : (
            <p className="text-muted-foreground text-sm">
              Tracking details appear once the seller ships.
            </p>
          )}
        </section>
        <section aria-labelledby="pay-h" className="bg-card space-y-2 rounded-xl border p-4">
          <h2 id="pay-h" className="font-semibold">
            Payment summary
          </h2>
          <dl className="space-y-1.5 text-sm">
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
                <dd className="text-success">-{formatMoney(order.discount)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <dt>Total</dt>
              <dd>{formatMoney(order.total)}</dd>
            </div>
          </dl>
        </section>
      </div>

      <section aria-labelledby="tl-h" className="bg-card rounded-xl border p-4">
        <h2 id="tl-h" className="mb-3 font-semibold">
          Timeline
        </h2>
        <ol className="space-y-3">
          {[...order.timeline].reverse().map((t) => (
            <li key={`${t.status}-${t.at}`} className="flex items-start gap-3 text-sm">
              <span className="bg-primary mt-1.5 size-2 rounded-full" aria-hidden="true" />
              <span>
                <StatusBadge status={t.status} />{' '}
                <span className="text-muted-foreground">{formatDateTime(t.at)}</span>
                {t.note ? <span className="text-muted-foreground block">{t.note}</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </section>
      <Button asChild variant="outline">
        <Link href="/support/contact-support">Need help with this order?</Link>
      </Button>
    </div>
  );
}
