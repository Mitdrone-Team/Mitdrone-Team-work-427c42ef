'use client';

import { useAuth } from '@mitdrone/auth';
import {
  getErrorMessage,
  useBackendInventory,
  useUpdateStock,
  useVendorInventory,
} from '@mitdrone/sdk';
import {
  Badge,
  DataTable,
  DataTableColumnHeader,
  ErrorState,
  Input,
  Label,
  PageHeader,
  Switch,
  toast,
} from '@mitdrone/ui';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

import { useDebouncedValue } from '@/lib/hooks';
import { useUrlState } from '@/lib/url';

import type { Product } from '@mitdrone/types';
import type { ColumnDef } from '@tanstack/react-table';

/** Saves on blur or Enter. The table updates instantly and rolls back if the API rejects it. */
function StockEditor({ product, vendorId }: { product: Product; vendorId: string }) {
  const update = useUpdateStock(vendorId);
  const [value, setValue] = useState(String(product.inventory.quantity));
  useEffect(() => setValue(String(product.inventory.quantity)), [product.inventory.quantity]);
  const commit = () => {
    const quantity = Number(value);
    if (!Number.isInteger(quantity) || quantity < 0) {
      setValue(String(product.inventory.quantity));
      return toast.error('Enter a whole number, 0 or more');
    }
    if (quantity === product.inventory.quantity) return;
    update.mutate(
      { productId: product.id, quantity },
      {
        onSuccess: () => toast.success('Stock updated'),
        onError: (e) => toast.error(getErrorMessage(e)),
      },
    );
  };
  return (
    <Input
      aria-label={`Stock for ${product.title}`}
      inputMode="numeric"
      className="h-9 w-24"
      value={value}
      onChange={(e) => setValue(e.target.value.replace(/\D/g, ''))}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
    />
  );
}

export function InventoryTable({
  useBackend = false,
}: {
  /** When true, fetch assets from backend endpoints instead of mock seller API. */
  useBackend?: boolean;
}) {
  const { user } = useAuth();
  const v = user?.vendorId;
  const url = useUrlState();
  const [search, setSearch] = useState(url.get('q') ?? '');
  const debounced = useDebouncedValue(search, 350);
  const lowStock = url.get('lowStock') === 'true';
  useEffect(() => {
    if ((url.get('q') ?? '') !== debounced) url.set({ q: debounced || null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the debounced text
  }, [debounced]);

  const backend = useBackendInventory(v ?? '', {
    page: url.page,
    limit: 15,
  });
  const mock = useVendorInventory(v, {
    page: url.page,
    pageSize: 15,
    ...(lowStock ? { lowStock: true } : {}),
    ...(url.get('q') ? { q: url.get('q') as string } : {}),
  });
  const inventory = useBackend && v
    ? {
        data: (backend.data as unknown as { data: Product[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }) ?? {
          data: [],
          meta: { page: 1, pageSize: 15, total: 0, totalPages: 1 },
        },
        isPending: backend.isPending,
        isError: backend.isError,
        error: backend.error as Error | null,
        refetch: backend.refetch,
      }
    : mock;

  const columns = useMemo<ColumnDef<Product>[]>(
    () => [
      {
        id: 'product',
        accessorFn: (p) => p.title,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Product" />,
        cell: ({ row }) => (
          <Link
            href={`/products/${row.original.id}/edit`}
            className="line-clamp-2 min-w-[200px] font-medium hover:underline"
          >
            {row.original.title}
          </Link>
        ),
      },
      {
        id: 'sku',
        header: 'SKU',
        accessorFn: (p) => p.inventory.sku,
        cell: ({ row }) => <span className="font-mono text-xs">{row.original.inventory.sku}</span>,
      },
      {
        id: 'stock',
        accessorFn: (p) => p.inventory.quantity,
        header: ({ column }) => <DataTableColumnHeader column={column} title="In stock" />,
        cell: ({ row }) => <StockEditor product={row.original} vendorId={v ?? ''} />,
      },
      { id: 'threshold', header: 'Alert at', accessorFn: (p) => p.inventory.lowStockThreshold },
      {
        id: 'level',
        header: 'Level',
        cell: ({ row }) => {
          const { quantity, lowStockThreshold } = row.original.inventory;
          return quantity === 0 ? (
            <Badge variant="destructive">Out of stock</Badge>
          ) : quantity <= lowStockThreshold ? (
            <Badge variant="warning">Low</Badge>
          ) : (
            <Badge variant="success">Healthy</Badge>
          );
        },
      },
    ],
    [v],
  );

  if (inventory.isError)
    return (
      <ErrorState
        description={getErrorMessage(inventory.error)}
        onRetry={() => inventory.refetch()}
      />
    );
  return (
    <>
      <PageHeader
        title="Inventory"
        description="Update stock levels. Changes save when you leave the field."
      />
      <DataTable
        columns={columns}
        data={inventory.data?.data ?? []}
        isLoading={inventory.isPending}
        searchable={false}
        getRowId={(p) => p.id}
        emptyTitle={lowStock ? 'No low-stock products' : 'No products yet'}
        serverPagination={{
          page: inventory.data?.meta.page ?? url.page,
          pageSize: 15,
          total: inventory.data?.meta.total ?? 0,
          onPageChange: (page) => url.set({ page }),
        }}
        toolbar={
          <div className="flex flex-1 flex-wrap items-center gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search
                className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2"
                aria-hidden="true"
              />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or SKU"
                aria-label="Search inventory"
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="low"
                checked={lowStock}
                onCheckedChange={(c) => url.set({ lowStock: c ? 'true' : null })}
              />
              <Label htmlFor="low" className="font-normal">
                Low stock only
              </Label>
            </div>
          </div>
        }
      />
    </>
  );
}
