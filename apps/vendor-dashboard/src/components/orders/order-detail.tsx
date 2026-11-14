'use client';

import { useAuth } from '@mitdrone/auth';
import {
  getErrorMessage,
  useBackendCancelOrder,
  useBackendOrder,
  useUpdateOrderStatus,
  useVendorOrder,
} from '@mitdrone/sdk';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  ErrorState,
  Input,
  Label,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  StatusBadge,
  toast,
} from '@mitdrone/ui';
import { formatDateTime, formatMoney } from '@mitdrone/utils';
import { Printer } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import { CARRIERS, NEXT_ACTIONS } from './status-actions';

import type { Money, OrderStatus } from '@mitdrone/types';

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
  id: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
}

interface BackendOrder {
  id: string;
  number: string;
  status: OrderStatus;
  createdAt: string;
  items: BackendOrderItem[];
  customerName: string;
  customerEmail: string;
  shippingAddress: BackendAddress;
  total: Money;
  subtotal: Money;
  shipping: Money;
  tax: Money;
  discount: Money;
  commission: Money;
  timeline: BackendOrderTimelineEvent[];
  trackingNumber?: string;
  carrier?: string;
}

export function OrderDetail({
  id,
  useBackend = false,
}: {
  id: string;
  /** When true, fetch order from backend endpoints instead of mock seller API. */
  useBackend?: boolean;
}) {
  const { user } = useAuth();
  const v = user?.vendorId ?? '';
  const backendOrder = useBackendOrder(id);
  const mockOrder = useVendorOrder(v, id);
  const { data: orderRaw, isPending, isError, error, refetch } = useBackend
    ? backendOrder
    : mockOrder;
  const order = orderRaw as unknown as BackendOrder;
  const cancelOrder = useBackendCancelOrder(id);
  const update = useUpdateOrderStatus(v);
  const [ship, setShip] = useState(false);
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier] = useState(CARRIERS[0] ?? '');
  const [openCancel, setOpenCancel] = useState(false);

  if (isPending)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-96 w-full" />
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

  const move = (status: OrderStatus, extra: { trackingNumber?: string; carrier?: string } = {}) =>
    update
      .mutateAsync({ orderId: order.id, status, ...extra })
      .then(() => toast.success(`Order ${order.number} is now ${status}`))
      .catch((e) => toast.error(getErrorMessage(e)));

  return (
    <>
      <PageHeader
        title={`Order ${order.number}`}
        description={`Placed ${formatDateTime(order.createdAt)}`}
        actions={
          <>
            <StatusBadge status={order.status} />
            <Button asChild variant="outline">
              <Link href={`/orders/packing-slips?ids=${order.id}`}>
                <Printer /> Packing slip
              </Link>
            </Button>
          </>
        }
      />

      {NEXT_ACTIONS[order.status].length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Next step</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {NEXT_ACTIONS[order.status].map((a) => (
              <Button
                key={a.status}
                variant={a.destructive ? 'outline' : 'default'}
                className={a.destructive ? 'text-destructive' : undefined}
                loading={update.isPending && update.variables?.status === a.status}
                onClick={() =>
                  a.needsTracking
                    ? setShip(true)
                    : a.destructive
                      ? setOpenCancel(true)
                      : void move(a.status)
                }
              >
                {a.label}
              </Button>
            ))}
          </CardContent>
        </Card>
      ) : null}

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
                    ['Shipping share', order.shipping],
                    ['VAT share', order.tax],
                  ] as const
                ).map(([l, m]) => (
                  <div key={l} className="flex justify-between">
                    <dt className="text-muted-foreground">{l}</dt>
                    <dd>{formatMoney(m)}</dd>
                  </div>
                ))}
                {order.discount.amount > 0 ? (
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Discount share</dt>
                    <dd>-{formatMoney(order.discount)}</dd>
                  </div>
                ) : null}
                <div className="flex justify-between font-semibold">
                  <dt>Total</dt>
                  <dd>{formatMoney(order.total)}</dd>
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
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Ship to</CardTitle>
            </CardHeader>
            <CardContent>
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
                <p className="mt-3 text-sm">
                  Tracking <strong>{order.trackingNumber}</strong>
                  {order.carrier ? ` · ${order.carrier}` : ''}
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={ship} onOpenChange={setShip}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as shipped</DialogTitle>
            <DialogDescription>
              Add tracking so the customer can follow the delivery.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="carrier">Carrier</Label>
              <Select value={carrier} onValueChange={setCarrier}>
                <SelectTrigger id="carrier">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tracking">Tracking number</Label>
              <Input id="tracking" value={tracking} onChange={(e) => setTracking(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShip(false)}>
              Cancel
            </Button>
            <Button
              disabled={tracking.trim().length < 3}
              loading={update.isPending}
              onClick={async () => {
                await move('shipped', { trackingNumber: tracking.trim(), carrier });
                setShip(false);
              }}
            >
              Mark as shipped
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={openCancel}
        onOpenChange={setOpenCancel}
        destructive
        title={`Cancel order ${order.number}?`}
        description="The customer will be notified and the order cannot be restored."
        confirmLabel="Cancel order"
        onConfirm={async () => {
          if (useBackend) {
            await cancelOrder.mutateAsync();
          } else {
            await move('cancelled');
          }
        }}
      />
    </>
  );
}
