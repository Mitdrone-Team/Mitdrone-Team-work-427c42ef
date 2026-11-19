'use client';

import { useAuth } from '@mitdrone/auth';
import {
  getErrorMessage,
  useBackendAdjustStock,
  useBackendArchiveOffer,
  useBackendConfigureRentalTerms,
  useBackendInitializeStock,
  useBackendRentalTerms,
  useBackendStock,
  useBackendSubmitOffer,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
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

type BackendOfferRow = Product & { version: number };

function offerStatusToProductStatus(status: unknown): ProductStatus {
  switch (String(status ?? '').toUpperCase()) {
    case 'DRAFT':
      return 'draft';
    case 'SUBMITTED':
      return 'pending_review';
    case 'REJECTED':
      return 'flagged';
    case 'PUBLISHED':
      return 'active';
    case 'ARCHIVED':
      return 'archived';
    default:
      return 'draft';
  }
}

/** Normalize an undocumented backend offer row into the vendor `Product` shape. */
function normalizeBackendOfferRow(raw: unknown): BackendOfferRow {
  const o = (raw ?? {}) as Record<string, unknown>;
  const productSrc = o.product && typeof o.product === 'object' ? o.product : o;
  const prod = productSrc as Record<string, unknown>;
  const imagesRaw = Array.isArray(prod.images) ? prod.images : [];
  const images = imagesRaw.map((img) => {
    const r = (img ?? {}) as Record<string, unknown>;
    return { url: String(r.url ?? ''), alt: String(r.alt ?? '') };
  });
  const rawAmount = o.amountMinor ?? prod.amountMinor;
  let amount = Number(prod.price ?? 0);
  if (typeof rawAmount === 'string' && rawAmount.trim() !== '' && !Number.isNaN(Number(rawAmount))) {
    amount = Number(rawAmount) / 100;
  } else if (typeof rawAmount === 'number') {
    amount = rawAmount / 100;
  }
  const mode = String(o.mode ?? prod.mode ?? 'SALE').toUpperCase();
  const now = new Date().toISOString();
  return {
    id: String(o.id ?? prod.id ?? ''),
    slug: String(o.slug ?? prod.slug ?? o.id ?? ''),
    title: String(prod.title ?? prod.name ?? o.title ?? 'Untitled offer'),
    description: String(prod.description ?? ''),
    shortDescription: String(prod.shortDescription ?? ''),
    kind: 'drone',
    listingType: mode === 'RENTAL' ? 'rent' : 'sale',
    condition: 'new',
    status: offerStatusToProductStatus(o.status),
    vendorId: String(o.vendorId ?? prod.vendorId ?? ''),
    brand: String(prod.brand ?? ''),
    categoryIds: [],
    images,
    price: {
      amount,
      currency: String(o.currency ?? prod.currency ?? 'NGN') as 'NGN' | 'USD' | 'GBP' | 'EUR',
    },
    compareAtPrice: undefined,
    rental: undefined,
    variants: [],
    inventory: {
      sku: String(prod.sku ?? ''),
      quantity: Number(prod.quantity ?? 0),
      lowStockThreshold: 5,
      trackInventory: true,
      allowBackorder: false,
    },
    specs: {},
    tags: [],
    rating: 0,
    reviewCount: 0,
    salesCount: 0,
    featured: false,
    createdAt: String(o.createdAt ?? now),
    updatedAt: String(o.updatedAt ?? now),
    version: Number(o.version ?? 1),
  };
}

/** Per-offer backend actions (submit for review / archive) using the offer's version. */
function BackendOfferActions({ orgId, offer }: { orgId: string; offer: BackendOfferRow }) {
  const submit = useBackendSubmitOffer(orgId, offer.id);
  const archive = useBackendArchiveOffer(orgId, offer.id);
  const [pending, setPending] = useState<'submit' | 'archive'>();
  const busy = submit.isPending || archive.isPending;

  const stock = useBackendStock(orgId, offer.id);
  const initStock = useBackendInitializeStock(orgId, offer.id);
  const adjustStock = useBackendAdjustStock(orgId, offer.id);
  const terms = useBackendRentalTerms(orgId, offer.id);
  const saveTerms = useBackendConfigureRentalTerms(orgId, offer.id);

  const [dialog, setDialog] = useState<'stock' | 'terms'>();
  const stockVersion = Number((stock.data as { version?: number } | undefined)?.version ?? 1);
  const hasStock = Boolean(stock.data);
  const termsVersion = Number((terms.data as { version?: number } | undefined)?.version ?? 1);

  const [onHand, setOnHand] = useState('0');
  const [delta, setDelta] = useState('0');
  const [adjustReason, setAdjustReason] = useState('');
  const [prep, setPrep] = useState('0');
  const [buffer, setBuffer] = useState('0');
  const [minDur, setMinDur] = useState('60');
  const [maxDur, setMaxDur] = useState('10080');

  const run = async (kind: 'submit' | 'archive') => {
    setPending(kind);
    try {
      if (kind === 'submit') await submit.mutateAsync({ expectedVersion: offer.version });
      else await archive.mutateAsync({ expectedVersion: offer.version });
      toast.success(kind === 'submit' ? 'Submitted for review' : 'Offer archived');
    } catch (e) {
      toast.error(getErrorMessage(e));
    } finally {
      setPending(undefined);
    }
  };

  const runStock = async () => {
    try {
      if (!hasStock) {
        await initStock.mutateAsync({ kind: 'QUANTITY', initialOnHand: Number(onHand) || 0 });
      } else {
        await adjustStock.mutateAsync({
          expectedVersion: stockVersion,
          delta: Number(delta) || 0,
          reason: adjustReason,
        });
      }
      toast.success('Stock updated');
      setDialog(undefined);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const runTerms = async () => {
    try {
      await saveTerms.mutateAsync({
        preparationMinutes: Number(prep) || 0,
        returnBufferMinutes: Number(buffer) || 0,
        minimumDurationMinutes: Number(minDur) || 1,
        maximumDurationMinutes: Number(maxDur) || 1,
        expectedVersion: termsVersion,
      });
      toast.success('Rental terms saved');
      setDialog(undefined);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${offer.title}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/products/${offer.id}/edit`}>
              <Pencil /> Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('stock')}>Manage stock</DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('terms')}>Rental terms</DropdownMenuItem>
          <DropdownMenuSeparator />
          {offer.status === 'draft' || offer.status === 'flagged' ? (
            <DropdownMenuItem disabled={busy} onSelect={() => void run('submit')}>
              <ArchiveRestore /> Submit for review
            </DropdownMenuItem>
          ) : null}
          {offer.status !== 'archived' ? (
            <DropdownMenuItem disabled={busy} onSelect={() => void run('archive')}>
              <Archive /> Archive
            </DropdownMenuItem>
          ) : null}
          {pending ? (
            <DropdownMenuItem disabled>
              {pending === 'submit' ? 'Submitting…' : 'Archiving…'}
            </DropdownMenuItem>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === 'stock'} onOpenChange={(o) => !o && setDialog(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage stock — {offer.title}</DialogTitle>
            <DialogDescription>
              {hasStock
                ? 'Adjust the on-hand quantity with a reason.'
                : 'Create the stock record for this offer.'}
            </DialogDescription>
          </DialogHeader>
          {stock.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : hasStock ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="stock-delta">Adjustment (+/-)</Label>
                <Input
                  id="stock-delta"
                  inputMode="numeric"
                  value={delta}
                  onChange={(e) => setDelta(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stock-reason">Reason</Label>
                <Input
                  id="stock-reason"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="stock-onhand">Initial on-hand</Label>
              <Input
                id="stock-onhand"
                inputMode="numeric"
                value={onHand}
                onChange={(e) => setOnHand(e.target.value.replace(/\D/g, ''))}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(undefined)}>
              Cancel
            </Button>
            <Button
              loading={initStock.isPending || adjustStock.isPending}
              onClick={() => void runStock()}
            >
              {hasStock ? 'Adjust' : 'Create stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'terms'} onOpenChange={(o) => !o && setDialog(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rental terms — {offer.title}</DialogTitle>
            <DialogDescription>Timing rules applied to rentals of this offer.</DialogDescription>
          </DialogHeader>
          {terms.isPending ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="t-prep">Preparation (min)</Label>
                <Input id="t-prep" inputMode="numeric" value={prep} onChange={(e) => setPrep(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-buffer">Return buffer (min)</Label>
                <Input
                  id="t-buffer"
                  inputMode="numeric"
                  value={buffer}
                  onChange={(e) => setBuffer(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-min">Min duration (min)</Label>
                <Input
                  id="t-min"
                  inputMode="numeric"
                  value={minDur}
                  onChange={(e) => setMinDur(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="t-max">Max duration (min)</Label>
                <Input
                  id="t-max"
                  inputMode="numeric"
                  value={maxDur}
                  onChange={(e) => setMaxDur(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(undefined)}>
              Cancel
            </Button>
            <Button loading={saveTerms.isPending} onClick={() => void runTerms()}>
              Save terms
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

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
    ? (() => {
        const raw = backend.data as unknown as { data?: unknown[]; offers?: unknown[] } | unknown[] | undefined;
        const rowsRaw = Array.isArray(raw) ? raw : (raw?.data ?? raw?.offers ?? []);
        const rows = rowsRaw.map(normalizeBackendOfferRow);
        return {
          data: rows,
          meta: { page: url.page, pageSize: 10, total: rows.length, totalPages: 1 },
          isPending: backend.isPending,
          isError: backend.isError,
          error: backend.error as Error | null,
          refetch: backend.refetch,
        };
      })()
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
          if (useBackend && v) {
            return <BackendOfferActions orgId={v} offer={p as BackendOfferRow} />;
          }
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
    [useBackend, v],
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
