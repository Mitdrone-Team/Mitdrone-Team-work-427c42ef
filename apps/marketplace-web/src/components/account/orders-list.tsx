'use client';

import { getErrorMessage, useBackendOrders, useMyOrders } from '@mitdrone/sdk';
import {
  Button,
  EmptyState,
  ErrorState,
  Pagination,
  Skeleton,
  StatusBadge,
  cn,
} from '@mitdrone/ui';
import { formatDate, formatMoney } from '@mitdrone/utils';

import { Package } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import type { Money } from '@mitdrone/types';

const FILTERS = [
  ['', 'All'],
  ['processing', 'Processing'],
  ['shipped', 'Shipped'],
  ['delivered', 'Delivered'],
  ['completed', 'Completed'],
  ['cancelled', 'Cancelled'],
] as const;

interface BackendOrderItem {
  id: string;
  productId: string;
  title: string;
  imageUrl?: string;
}

interface BackendOrder {
  id: string;
  number: string;
  status: string;
  createdAt: string;
  items: BackendOrderItem[];
  total: Money;
}

interface BackendOrdersResponse {
  data: BackendOrder[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export function OrdersList({
  useBackend = false,
}: {
  /** When true, fetch orders from backend endpoints instead of mock account API. */
  useBackend?: boolean;
}) {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const backend = useBackendOrders({ page, limit: 8 });
  const mock = useMyOrders({ page, pageSize: 8, ...(status ? { status } : {}) });
  const orders = useBackend
    ? {
        data: (backend.data as BackendOrdersResponse ?? { data: [], meta: { page: 1, pageSize: 8, total: 0, totalPages: 1 } }),
        isPending: backend.isPending,
        isError: backend.isError,
        error: backend.error as Error | null,
        refetch: backend.refetch,
      }
    : mock;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-muted-foreground text-sm">
          Track and review everything you have bought.
        </p>
      </header>
      <ul className="flex flex-wrap gap-2" aria-label="Filter by status">
        {FILTERS.map(([value, label]) => (
          <li key={label}>
            <button
              type="button"
              aria-pressed={status === value}
              onClick={() => {
                setStatus(value);
                setPage(1);
              }}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                status === value
                  ? 'border-primary bg-accent text-accent-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      {orders.isPending ? (
        <div className="space-y-3">
          {[1, 2, 3].map((n) => (
            <Skeleton key={n} className="h-28 w-full" />
          ))}
        </div>
      ) : orders.isError ? (
        <ErrorState description={getErrorMessage(orders.error)} onRetry={() => orders.refetch()} />
      ) : orders.data.data.length === 0 ? (
        <EmptyState
          icon={Package}
          title="No orders here yet"
          description="When you place an order it will show up here."
          action={
            <Button asChild>
              <Link href="/products">Start shopping</Link>
            </Button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {orders.data.data.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.id}`}
                className="bg-card shadow-soft hover:shadow-card block space-y-3 rounded-xl border p-4 transition-shadow"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold">Order {o.number}</p>
                  <StatusBadge status={o.status} />
                </div>
                <p className="text-muted-foreground text-sm">
                  Placed {formatDate(o.createdAt)} · {o.items.length} item
                  {o.items.length === 1 ? '' : 's'} ·{' '}
                  <span className="text-foreground font-medium">{formatMoney(o.total)}</span>
                </p>
                <div className="flex gap-2">
                  {o.items.slice(0, 4).map((i) => (
                    <span
                      key={i.id}
                      className="bg-muted relative size-12 overflow-hidden rounded-md"
                    >
                      {i.imageUrl ? (
                        <Image
                          src={i.imageUrl}
                          alt={i.title}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      ) : null}
                    </span>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {orders.data ? (
        <Pagination
          page={orders.data.meta.page}
          totalPages={orders.data.meta.totalPages}
          onPageChange={setPage}
        />
      ) : null}
      <p className="sr-only" aria-live="polite">
        {orders.data ? `${orders.data.meta.total} orders` : ''}
      </p>
    </div>
  );
}
