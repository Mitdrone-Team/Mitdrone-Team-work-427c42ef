'use client';

import { useAuth } from '@mitdrone/auth';
import {
  api,
  getErrorMessage,
  useAdminProducts,
  useApproveProduct,
  useBackendOfferQueue,
  useBackendReviewOffer,
  useDeleteProductAdmin,
  useFlagProduct,
} from '@mitdrone/sdk';
import {
  Button,
  ConfirmDialog,
  DataTable,
  DataTableColumnHeader,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  ErrorState,
  PageHeader,
  ReasonDialog,
  StatusBadge,
  toast,
} from '@mitdrone/ui';
import { formatDate, formatMoney } from '@mitdrone/utils';
import { CheckCircle2, Flag, MoreHorizontal, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useState } from 'react';

import { ExportMenu } from '@/components/common/export-menu';
import { FilterBar } from '@/components/common/filter-bar';
import { useUrlState } from '@/lib/url';

import type { Product, ProductStatus } from '@mitdrone/types';
import type { ColumnDef } from '@tanstack/react-table';

const STATUSES: [ProductStatus, string][] = [
  ['pending_review', 'Pending review'],
  ['active', 'Active'],
  ['flagged', 'Flagged'],
  ['archived', 'Archived'],
  ['draft', 'Draft'],
];
type Pending =
  | { kind: 'flag'; product: Product }
  | { kind: 'delete'; products: Product[]; done?: () => void }
  | { kind: 'approve'; products: Product[]; done?: () => void };

export function ProductsTable({
  useBackend = false,
}: {
  /** When true, fetch from backend offer queue instead of mock admin API. */
  useBackend?: boolean;
}) {
  const { can } = useAuth();
  const url = useUrlState();
  const status = url.get('status') as ProductStatus | undefined;
  const vendor = url.get('vendor');
  const q = url.get('q');
  const filters = {
    ...(status ? { status } : {}),
    ...(vendor ? { vendor } : {}),
    ...(q ? { q } : {}),
  };
  const backendQueue = useBackendOfferQueue();
  const mockList = useAdminProducts({ page: url.page, pageSize: 10, ...filters });
  const list = useBackend
    ? {
        data: (backendQueue.data as { data: unknown[]; meta: { page: number; pageSize: number; total: number; totalPages: number } } ?? { data: [], meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 } }),
        isPending: backendQueue.isPending,
        isError: backendQueue.isError,
        error: backendQueue.error as Error | null,
        refetch: backendQueue.refetch,
      }
    : mockList;
  const approve = useApproveProduct();
  const review = useBackendReviewOffer();
  const flag = useFlagProduct();
  const del = useDeleteProductAdmin();
  const [pending, setPending] = useState<Pending>();
  const write = can('admin.write');
  const fail = (e: unknown) => toast.error(getErrorMessage(e));

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: 'product',
        accessorFn: (p) => p.title,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex min-w-[240px] items-center gap-3">
              <span className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md">
                {p.images[0] ? (
                  <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" />
                ) : null}
              </span>
              <div className="min-w-0">
                <p className="line-clamp-1 font-medium">{p.title}</p>
                <p className="text-muted-foreground text-xs">
                  {p.vendor?.name ?? p.vendorId} · SKU {p.inventory.sku}
                </p>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge status={row.original.status} />
            {row.original.moderationNote ? (
              <p className="text-muted-foreground max-w-[220px] text-xs">
                {row.original.moderationNote}
              </p>
            ) : null}
          </div>
        ),
      },
      {
        id: 'price',
        accessorFn: (p) => p.price.amount,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Price" />,
        cell: ({ row }) => formatMoney(row.original.price),
      },
      {
        id: 'condition',
        header: 'Condition',
        accessorFn: (p) => p.condition,
        cell: ({ row }) => <span className="capitalize">{row.original.condition}</span>,
      },
      {
        id: 'created',
        accessorFn: (p) => p.createdAt,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Listed" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const p = row.original;
          return write ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Moderate ${p.title}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {p.status !== 'active' ? (
                  <DropdownMenuItem onSelect={() => setPending({ kind: 'approve', products: [p] })}>
                    <CheckCircle2 /> Approve
                  </DropdownMenuItem>
                ) : null}
                {p.status !== 'flagged' ? (
                  <DropdownMenuItem onSelect={() => setPending({ kind: 'flag', product: p })}>
                    <Flag /> Flag
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onSelect={() => setPending({ kind: 'delete', products: [p] })}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <span className="sr-only">Read only</span>
          );
        },
      },
    ],
    [write],
  );

  if (list.isError)
    return <ErrorState description={getErrorMessage(list.error)} onRetry={() => list.refetch()} />;

  return (
    <>
      <PageHeader
        title="Product moderation"
        description="Approve new listings, flag suspicious ones and remove violations."
        actions={
          <ExportMenu
            entity="products"
            title="Mitdrone products"
            fetchData={async () => {
              const all = await api.admin.products({ ...filters, pageSize: 100 });
              return {
                headers: [
                  'Title',
                  'Vendor',
                  'Status',
                  'Condition',
                  'Price (NGN)',
                  'Stock',
                  'Listed',
                ],
                rows: all.data.map((p) => [
                  p.title,
                  p.vendor?.name ?? p.vendorId,
                  p.status,
                  p.condition,
                  p.price.amount / 100,
                  p.inventory.quantity,
                  formatDate(p.createdAt),
                ]),
              };
            }}
          />
        }
      />
      <DataTable
        columns={columns}
        data={Array.isArray(list.data?.data) ? (list.data.data as Product[]) : []}
        isLoading={list.isPending}
        searchable={false}
        enableSelection={write}
        getRowId={(p) => p.id}
        emptyTitle="No products match these filters"
        serverPagination={{
          page: list.data?.meta.page ?? url.page,
          pageSize: 10,
          total: list.data?.meta.total ?? 0,
          onPageChange: (page) => url.set({ page }),
        }}
        toolbar={
          <FilterBar
            searchPlaceholder="Search title, brand or SKU"
            filters={[{ param: 'status', label: 'Status', options: STATUSES }]}
          >
            {vendor ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => url.set({ vendor: null })}
                aria-label={`Remove vendor filter ${vendor}`}
              >
                Vendor: {vendor} <X />
              </Button>
            ) : null}
          </FilterBar>
        }
        bulkActions={(rows, clear) => (
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPending({ kind: 'approve', products: rows as Product[], done: clear })}
            >
              <CheckCircle2 /> Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setPending({ kind: 'delete', products: rows as Product[], done: clear })}
            >
              <Trash2 /> Delete
            </Button>
          </div>
        )}
      />
      <ReasonDialog
        open={pending?.kind === 'flag'}
        onOpenChange={(o) => !o && setPending(undefined)}
        title={`Flag “${pending?.kind === 'flag' ? pending.product.title : ''}”?`}
        description="The listing is hidden from the storefront and the seller sees this reason."
        confirmLabel="Flag product"
        destructive
        onConfirm={async (reason) => {
          if (pending?.kind === 'flag')
            await flag
              .mutateAsync({ id: pending.product.id, reason })
              .then(() => toast.success('Product flagged'))
              .catch(fail);
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'approve'}
        onOpenChange={(o) => !o && setPending(undefined)}
        title={`Approve ${pending?.kind === 'approve' ? pending.products.length : 0} product${pending?.kind === 'approve' && pending.products.length === 1 ? '' : 's'}?`}
        description="Approved listings go live on the storefront immediately."
        confirmLabel="Approve"
        onConfirm={async () => {
          if (pending?.kind !== 'approve') return;
          if (useBackend) {
            const r = await Promise.allSettled(
              pending.products.map((p) => review.mutateAsync({ id: p.id, body: { expectedVersion: 1, reason: '', decision: 'APPROVE' } })),
            );
            toast.success(`${r.filter((x) => x.status === 'fulfilled').length} approved`);
            pending.done?.();
          } else {
            const r = await Promise.allSettled(
              pending.products.map((p) => approve.mutateAsync(p.id)),
            );
            toast.success(`${r.filter((x) => x.status === 'fulfilled').length} approved`);
            pending.done?.();
          }
        }}
      />
      <ConfirmDialog
        open={pending?.kind === 'delete'}
        onOpenChange={(o) => !o && setPending(undefined)}
        destructive
        title={`Delete ${pending?.kind === 'delete' ? pending.products.length : 0} product${pending?.kind === 'delete' && pending.products.length === 1 ? '' : 's'}?`}
        description="This permanently removes the listing. It cannot be undone."
        confirmLabel="Delete"
        onConfirm={async () => {
          if (pending?.kind !== 'delete') return;
          const r = await Promise.allSettled(pending.products.map((p) => del.mutateAsync(p.id)));
          toast.success(`${r.filter((x) => x.status === 'fulfilled').length} deleted`);
          pending.done?.();
        }}
      />
    </>
  );
}
