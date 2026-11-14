'use client';

import { useAuth } from '@mitdrone/auth';
import {
  getErrorMessage,
  useBackendVendorOffers,
  useBulkProducts,
  useDeleteProduct,
  useVendorProducts,
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
import { formatMoney, formatRelative } from '@mitdrone/utils';
import {
  Archive,
  ArchiveRestore,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useDebouncedValue } from '@/lib/hooks';
import { useUrlState } from '@/lib/url';

import type { Product, ProductStatus } from '@mitdrone/types';
import type { ColumnDef } from '@tanstack/react-table';

const STATUSES: [string, string][] = [
  ['', 'All statuses'],
  ['active', 'Active'],
  ['pending_review', 'Pending review'],
  ['flagged', 'Flagged'],
  ['archived', 'Archived'],
  ['draft', 'Draft'],
];
type Confirm = {
  kind: 'delete' | 'archive' | 'activate';
  ids: string[];
  label: string;
  done?: () => void;
};

export function ProductTable({
  backendData,
  vendorId: propVendorId,
  useBackend = false,
}: {
  backendData?: Product[];
  vendorId?: string;
  /** When true, fetch offers from backend endpoints instead of mock seller API. */
  useBackend?: boolean;
}) {
  const { user } = useAuth();
  const v = propVendorId ?? user?.vendorId;
  const url = useUrlState();
  const [search, setSearch] = useState(url.get('q') ?? '');
  const debounced = useDebouncedValue(search, 350);
  const status = url.get('status');
  useEffect(() => {
    if ((url.get('q') ?? '') !== debounced) url.set({ q: debounced || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debounced]);

  const backend = useBackendVendorOffers(v ?? '', { page: url.page, limit: 10 });
  const mock = useVendorProducts(v, {
    page: url.page,
    pageSize: 10,
    ...(status ? { status: status as ProductStatus } : {}),
    ...(url.get('q') ? { q: url.get('q') as string } : {}),
  });
  const products = backendData
    ? { data: backendData, meta: { page: url.page, pageSize: 10, total: backendData.length, totalPages: 1 }, isPending: false, isError: false, error: null, refetch: () => {} }
    : useBackend && v
    ? {
        data: (backend.data as unknown as Product[]) ?? [],
        meta: { page: url.page, pageSize: 10, total: (backend.data as unknown as Product[]).length, totalPages: 1 },
        isPending: backend.isPending,
        isError: backend.isError,
        error: backend.error as Error | null,
        refetch: backend.refetch,
      }
    : mock;
  const bulk = useBulkProducts(v ?? '');
  const del = useDeleteProduct(v ?? '');
  const [confirm, setConfirm] = useState<Confirm>();

  async function runConfirm() {
    if (!confirm) return;
    try {
      if (confirm.kind === 'delete' && confirm.ids.length === 1)
        await del.mutateAsync(confirm.ids[0] ?? '');
      else await bulk.mutateAsync({ ids: confirm.ids, action: confirm.kind });
      toast.success(
        confirm.kind === 'delete'
          ? 'Deleted'
          : confirm.kind === 'archive'
            ? 'Archived'
            : 'Restored for review',
      );
      confirm.done?.();
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  }

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: 'product',
        accessorFn: (p) => p.title,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="flex min-w-[220px] items-center gap-3">
              <span className="bg-muted relative size-12 shrink-0 overflow-hidden rounded-md">
                {p.images[0] ? (
                  <Image src={p.images[0].url} alt="" fill sizes="48px" className="object-cover" />
                ) : null}
              </span>
              <div className="min-w-0">
                <Link
                  href={`/products/${p.id}/edit`}
                  className="line-clamp-1 font-medium hover:underline"
                >
                  {p.title}
                </Link>
                <p className="text-muted-foreground text-xs">SKU {p.inventory.sku}</p>
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
              <p className="text-muted-foreground max-w-[200px] text-xs">
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
        id: 'stock',
        accessorFn: (p) => p.inventory.quantity,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Stock" />,
        cell: ({ row }) => {
          const p = row.original;
          const low = p.inventory.quantity <= p.inventory.lowStockThreshold;
          return (
            <span className={low ? 'text-warning font-semibold' : ''}>
              {p.inventory.quantity}
              {low ? ' (low)' : ''}
            </span>
          );
        },
      },
      {
        accessorKey: 'salesCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Sold" />,
      },
      {
        id: 'updated',
        accessorFn: (p) => p.updatedAt,
        header: 'Updated',
        cell: ({ row }) => (
          <span className="text-muted-foreground whitespace-nowrap">
            {formatRelative(row.original.updatedAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const p = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${p.title}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/products/${p.id}/edit`}>
                    <Pencil /> Edit
                  </Link>
                </DropdownMenuItem>
                {p.status === 'archived' ? (
                  <DropdownMenuItem
                    onSelect={() => setConfirm({ kind: 'activate', ids: [p.id], label: p.title })}
                  >
                    <ArchiveRestore /> Restore
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    onSelect={() => setConfirm({ kind: 'archive', ids: [p.id], label: p.title })}
                  >
                    <Archive /> Archive
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  destructive
                  onSelect={() => setConfirm({ kind: 'delete', ids: [p.id], label: p.title })}
                >
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [],
  );

  let productList: Product[];
  let productMeta: { page: number; pageSize: number; total: number; totalPages: number };
  let productPending: boolean;
  let productError: boolean;

  if (Array.isArray(products)) {
    productList = products;
    productMeta = { page: url.page, pageSize: 10, total: products.length, totalPages: 1 };
    productPending = false;
    productError = false;
  } else {
    const data = products.data;
    if (Array.isArray(data)) {
      productList = data;
      productMeta = { page: url.page, pageSize: 10, total: data.length, totalPages: 1 };
    } else {
      productList = data?.data ?? [];
      productMeta = data?.meta ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 };
    }
    productPending = products.isPending;
    productError = products.isError;
  }

  if (productError)
    return (
      <ErrorState
        description={getErrorMessage((products as { error: Error }).error)}
        onRetry={() => (products as { refetch: () => void }).refetch()}
      />
    );

  return (
    <>
      <PageHeader
        title="Products"
        description="Everything you sell on Mitdrone."
        actions={
          <Button asChild>
            <Link href="/products/new">
              <Plus /> Add product
            </Link>
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={productList}
        isLoading={productPending}
        searchable={false}
        enableSelection
        getRowId={(p) => p.id}
        emptyTitle="No products found"
        emptyDescription={
          status || url.get('q')
            ? 'Try changing the search or status filter.'
            : 'Add your first product to start selling.'
        }
        serverPagination={{
          page: productMeta.page,
          pageSize: 10,
          total: productMeta.total,
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
                placeholder="Search by name, SKU or brand"
                aria-label="Search products"
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
                {STATUSES.map(([value, label]) => (
                  <SelectItem key={value || 'all'} value={value || 'all'}>
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
              onClick={() =>
                setConfirm({
                  kind: 'archive',
                  ids: rows.map((r) => r.id),
                  label: `${rows.length} products`,
                  done: clear,
                })
              }
            >
              <Archive /> Archive
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setConfirm({
                  kind: 'activate',
                  ids: rows.map((r) => r.id),
                  label: `${rows.length} products`,
                  done: clear,
                })
              }
            >
              <ArchiveRestore /> Restore
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() =>
                setConfirm({
                  kind: 'delete',
                  ids: rows.map((r) => r.id),
                  label: `${rows.length} products`,
                  done: clear,
                })
              }
            >
              <Trash2 /> Delete
            </Button>
          </div>
        )}
      />
      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(undefined)}
        destructive={confirm?.kind === 'delete'}
        title={
          confirm?.kind === 'delete'
            ? `Delete ${confirm.label}?`
            : confirm?.kind === 'archive'
              ? `Archive ${confirm?.label}?`
              : `Restore ${confirm?.label}?`
        }
        description={
          confirm?.kind === 'delete'
            ? 'This permanently removes the listing and cannot be undone.'
            : confirm?.kind === 'archive'
              ? 'Archived products are hidden from the storefront. You can restore them later.'
              : 'Restored products go back through review before they appear in the store.'
        }
        confirmLabel={
          confirm?.kind === 'delete'
            ? 'Delete'
            : confirm?.kind === 'archive'
              ? 'Archive'
              : 'Restore'
        }
        onConfirm={runConfirm}
      />
    </>
  );
}
