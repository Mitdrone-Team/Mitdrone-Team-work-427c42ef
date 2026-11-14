'use client';

import { api, getErrorMessage, useAdminOrders, useBackendOrders } from '@mitdrone/sdk';
import {
  DataTable,
  DataTableColumnHeader,
  ErrorState,
  PageHeader,
  StatusBadge,
} from '@mitdrone/ui';
import { formatDate, formatMoney, ORDER_STATUS_LABELS } from '@mitdrone/utils';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import { ExportMenu } from '@/components/common/export-menu';
import { FilterBar } from '@/components/common/filter-bar';
import { useUrlState } from '@/lib/url';

import type { Order, OrderStatus } from '@mitdrone/types';
import type { ColumnDef } from '@tanstack/react-table';

const columns: ColumnDef<Order>[] = [
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
  { id: 'vendors', header: 'Sellers', accessorFn: (o) => o.vendorIds.length },
  {
    id: 'total',
    accessorFn: (o) => o.total.amount,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Total" />,
    cell: ({ row }) => formatMoney(row.original.total),
  },
  {
    id: 'commission',
    accessorFn: (o) => o.commission.amount,
    header: 'Commission',
    cell: ({ row }) => formatMoney(row.original.commission),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
];

export function OrdersTable({
  useBackend = false,
}: {
  /** When true, fetch orders from backend endpoints instead of mock admin API. */
  useBackend?: boolean;
}) {
  const url = useUrlState();
  const router = useRouter();
  const status = url.get('status') as OrderStatus | undefined;
  const q = url.get('q');
  const filters = { ...(status ? { status } : {}), ...(q ? { q } : {}) };
  const backend = useBackendOrders({ page: url.page, limit: 10 });
  const mock = useAdminOrders({ page: url.page, pageSize: 10, ...filters });
  const list = useBackend
    ? {
        data: (backend.data as unknown as { data: Order[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }) ?? {
          data: [],
          meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        },
        isPending: backend.isPending,
        isError: backend.isError,
        error: backend.error as Error | null,
        refetch: backend.refetch,
      }
    : mock;
  if (list.isError)
    return <ErrorState description={getErrorMessage(list.error)} onRetry={() => list.refetch()} />;
  return (
    <>
      <PageHeader
        title="Orders"
        description="Every order on the platform. Open one to refund or review disputes."
        actions={
          <ExportMenu
            entity="orders"
            title="Mitdrone orders"
            fetchData={async () => {
              const all = await api.admin.orders({ ...filters, pageSize: 100 });
              return {
                headers: [
                  'Order',
                  'Customer',
                  'Email',
                  'Date',
                  'Status',
                  'Total (NGN)',
                  'Commission (NGN)',
                ],
                rows: all.data.map((o) => [
                  o.number,
                  o.customerName,
                  o.customerEmail,
                  formatDate(o.createdAt),
                  o.status,
                  o.total.amount / 100,
                  o.commission.amount / 100,
                ]),
              };
            }}
          />
        }
      />
      <DataTable
        columns={columns}
        data={list.data?.data ?? []}
        isLoading={list.isPending}
        searchable={false}
        getRowId={(o) => o.id}
        onRowClick={(o) => router.push(`/orders/${o.id}`)}
        emptyTitle="No orders match these filters"
        serverPagination={{
          page: list.data?.meta.page ?? url.page,
          pageSize: 10,
          total: list.data?.meta.total ?? 0,
          onPageChange: (page) => url.set({ page }),
        }}
        toolbar={
          <FilterBar
            searchPlaceholder="Search order, name or email"
            filters={[
              { param: 'status', label: 'Status', options: Object.entries(ORDER_STATUS_LABELS) },
            ]}
          />
        }
      />
    </>
  );
}
