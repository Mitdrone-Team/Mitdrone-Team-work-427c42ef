'use client';

import { useAuth } from '@mitdrone/auth';
import {
  getErrorMessage,
  useBackendOrders,
  useBulkOrders,
  useVendorOrders,
} from '@mitdrone/sdk';
import {
  Button,
  ConfirmDialog,
  DataTable,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  ErrorState,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
  toast,
} from '@mitdrone/ui';
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from '@mitdrone/utils';
import { MoreHorizontal, Printer, Search, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useDebouncedValue } from '@/lib/hooks';
import { useUrlState } from '@/lib/url';

import type { Order, OrderStatus } from '@mitdrone/types';
import type { ColumnDef } from '@tanstack/react-table';

export function OrdersTable({
  useBackend = false,
}: {
  /** When true, fetch orders from backend endpoints instead of mock seller API. */
  useBackend?: boolean;
}) {
  const { user } = useAuth();
  const v = user?.vendorId;
  const url = useUrlState();
  const [search, setSearch] = useState(url.get('q') ?? '');
  const debounced = useDebouncedValue(search, 350);
  const status = url.get('status');
  useEffect(() => {
    if ((url.get('q') ?? '') !== debounced) url.set({ q: debounced || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debounced]);

  const backend = useBackendOrders({ page: url.page, limit: 10 });
  const mock = useVendorOrders(v, {
    page: url.page,
    pageSize: 10,
    ...(status ? { status: status as OrderStatus } : {}),
    ...(url.get('q') ? { q: url.get('q') as string } : {}),
  });
  const orders = useBackend && v
    ? {
        data: (backend.data as unknown as { data: Order[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }) ?? { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } },
        isPending: backend.isPending,
        isError: backend.isError,
        error: backend.error as Error | null,
        refetch: backend.refetch,
      }
    : mock;
  const bulk = useBulkOrders(v ?? '');
  const [cancelIds, setCancelIds] = useState<{ ids: string[]; done: () => void }>();

  const columns = useMemo<ColumnDef<Order>[]>(
    () => [
      {
        accessorKey: 'number',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Order" />,
        cell: ({ row }) => (
          <Link href={`/orders/${row.original.id}`} className="font-medium hover:underline">
            {row.original.number}
          </Link>
        ),
      },
      {
        id: 'customer',
        accessorFn: (o) => o.customerName,
        header: 'Customer',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.customerName}</p>
            <p className="text-muted-foreground text-xs">{row.original.customerEmail}</p>
          </div>
        ),
      },
      {
        id: 'date',
        accessorFn: (o) => o.createdAt,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Date" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'items',
        header: 'Items',
        accessorFn: (o) => o.items.reduce((s, i) => s + i.quantity, 0),
      },
      {
        id: 'total',
        accessorFn: (o) => o.total.amount,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
        cell: ({ row }) => formatMoney(row.original.total),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Actions for order ${row.original.number}`}
              >
                <MoreHorizontal />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <Link href={`/orders/${row.original.id}`}>View order</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href={`/orders/packing-slips?ids=${row.original.id}`}>
                  <Printer /> Print packing slip
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      },
    ],
    [],
  );

  if (orders.isError)
    return (
      <ErrorState description={getErrorMessage(orders.error)} onRetry={() => orders.refetch()} />
    );

  return (
    <>
      <PageHeader
        title="Orders"
        description="Fulfil orders, update status and print packing slips."
      />
      <DataTable
        columns={columns}
        data={orders.data?.data ?? []}
        isLoading={orders.isPending}
        searchable={false}
        enableSelection
        getRowId={(o) => o.id}
        onRowClick={undefined}
        emptyTitle="No orders found"
        emptyDescription="Orders from customers appear here."
        serverPagination={{
          page: orders.data?.meta.page ?? url.page,
          pageSize: 10,
          total: orders.data?.meta.total ?? 0,
          onPageChange: (page) => url.set({ page }),
        }}
        toolbar={
          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search order, name or email"
                aria-label="Search orders"
                className="pl-9"
              />
            </div>
            <Select
              value={status ?? 'all'}
              onValueChange={(val) => url.set({ status: val === 'all' ? null : val })}
            >
              <SelectTrigger aria-label="Filter by status" className="w-[170px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {Object.entries(ORDER_STATUS_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
        bulkActions={(rows, clear) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              loading={bulk.isPending}
              onClick={() =>
                bulk.mutate(
                  { ids: rows.map((r) => r.id), action: 'process' },
                  {
                    onSuccess: (r) => {
                      toast.success(
                        `${r.updated} order${r.updated === 1 ? '' : 's'} moved to processing`,
                        r.failed.length
                          ? { description: `Skipped: ${r.failed.join(', ')} (not ready)` }
                          : undefined,
                      );
                      clear();
                    },
                    onError: (e) => toast.error(getErrorMessage(e)),
                  },
                )
              }
            >
              Start processing
            </Button>
            <Button size="sm" variant="outline" asChild>
              <Link href={`/orders/packing-slips?ids=${rows.map((r) => r.id).join(',')}`}>
                <Printer /> Print packing slips
              </Link>
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setCancelIds({ ids: rows.map((r) => r.id), done: clear })}
            >
              <XCircle /> Cancel
            </Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(cancelIds)}
        onOpenChange={(o) => !o && setCancelIds(undefined)}
        destructive
        title={`Cancel ${cancelIds?.ids.length ?? 0} order${cancelIds?.ids.length === 1 ? '' : 's'}?`}
        description="Customers will be notified. Orders that already shipped cannot be cancelled and will be skipped."
        confirmLabel="Cancel orders"
        onConfirm={async () => {
          if (!cancelIds) return;
          try {
            const r = await bulk.mutateAsync({ ids: cancelIds.ids, action: 'cancel' });
            toast.success(
              `${r.updated} cancelled`,
              r.failed.length ? { description: `Skipped: ${r.failed.join(', ')}` } : undefined,
            );
            cancelIds.done();
          } catch (e) {
            toast.error(getErrorMessage(e));
          }
        }}
      />
    </>
  );
}
