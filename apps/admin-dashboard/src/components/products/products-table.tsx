'use client';

import { useAuth } from '@mitdrone/auth';
import {
  api,
  getErrorMessage,
  useAdminProducts,
  useApproveProduct,
  useBackendCreateProduct,
  useBackendGetCheckoutTerms,
  useBackendOfferQueue,
  useBackendPutCheckoutTerms,
  useBackendReviewOffer,
  useDeleteProductAdmin,
  useFlagProduct,
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
  ReasonDialog,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
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

type AdminOfferRow = Product & { version: number };

function adminOfferStatus(status: unknown): ProductStatus {
  switch (String(status ?? '').toUpperCase()) {
    case 'PUBLISHED':
      return 'active';
    case 'SUBMITTED':
      return 'pending_review';
    case 'REJECTED':
      return 'flagged';
    case 'ARCHIVED':
      return 'archived';
    default:
      return 'draft';
  }
}

/** Normalize an undocumented backend offer into the admin `Product` shape. */
function normalizeAdminOffer(raw: unknown): AdminOfferRow {
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
  const now = new Date().toISOString();
  return {
    id: String(o.id ?? prod.id ?? ''),
    slug: String(o.slug ?? prod.slug ?? o.id ?? ''),
    title: String(prod.title ?? prod.name ?? o.title ?? 'Untitled offer'),
    description: '',
    shortDescription: '',
    kind: 'drone',
    listingType: 'sale',
    condition: 'new',
    status: adminOfferStatus(o.status),
    vendorId: String(prod.vendorId ?? ''),
    brand: String(prod.brand ?? ''),
    categoryIds: [],
    images,
    price: { amount, currency: String(o.currency ?? prod.currency ?? 'NGN') as 'NGN' | 'USD' | 'GBP' | 'EUR' },
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

function CreateProductButton() {
  const create = useBackendCreateProduct();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        New product
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create catalog product</DialogTitle>
            <DialogDescription>Creates a base product record by name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="new-product-name">Product name</Label>
            <Input id="new-product-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={create.isPending}
              disabled={!name}
              onClick={async () => {
                try {
                  await create.mutateAsync({ name });
                  toast.success('Product created');
                  setOpen(false);
                  setName('');
                } catch (e) {
                  toast.error(getErrorMessage(e));
                }
              }}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function CheckoutTermsDialog({ offer, open, onOpenChange }: { offer: AdminOfferRow; open: boolean; onOpenChange: (o: boolean) => void }) {
  const existing = useBackendGetCheckoutTerms(open ? offer.id : undefined);
  const save = useBackendPutCheckoutTerms(offer.id);
  const [enabled, setEnabled] = useState('true');
  const [taxBps, setTaxBps] = useState('750');
  const [taxRounding, setTaxRounding] = useState<'HALF_UP' | 'UP' | 'DOWN'>('HALF_UP');
  const [deliveryFee, setDeliveryFee] = useState('0');
  const [deposit, setDeposit] = useState('0');
  const [approvalRef, setApprovalRef] = useState('');
  const [expectedVersion, setExpectedVersion] = useState('1');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Checkout terms — {offer.title}</DialogTitle>
          <DialogDescription>Configure tax, delivery and deposit for this offer.</DialogDescription>
        </DialogHeader>
        {existing.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="ct-enabled">Enabled</Label>
                <Select value={enabled} onValueChange={setEnabled}>
                  <SelectTrigger id="ct-enabled">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Enabled</SelectItem>
                    <SelectItem value="false">Disabled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-rounding">Tax rounding</Label>
                <Select value={taxRounding} onValueChange={(v) => setTaxRounding(v as typeof taxRounding)}>
                  <SelectTrigger id="ct-rounding">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HALF_UP">Half up</SelectItem>
                    <SelectItem value="UP">Up</SelectItem>
                    <SelectItem value="DOWN">Down</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-tax">Tax basis points</Label>
                <Input id="ct-tax" inputMode="numeric" value={taxBps} onChange={(e) => setTaxBps(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-expected">Expected version</Label>
                <Input id="ct-expected" inputMode="numeric" value={expectedVersion} onChange={(e) => setExpectedVersion(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-delivery">Delivery fee (minor)</Label>
                <Input id="ct-delivery" inputMode="numeric" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value.replace(/\D/g, ''))} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ct-deposit">Deposit (minor)</Label>
                <Input id="ct-deposit" inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ct-ref">Approval reference</Label>
              <Input id="ct-ref" value={approvalRef} onChange={(e) => setApprovalRef(e.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            loading={save.isPending}
            onClick={async () => {
              try {
                await save.mutateAsync({
                  enabled: enabled === 'true',
                  expectedOfferVersion: offer.version,
                  expectedVersion: Number(expectedVersion) || 1,
                  taxBasisPoints: Number(taxBps) || 0,
                  taxRounding,
                  deliveryFeeMinor: deliveryFee || '0',
                  depositMinor: deposit || '0',
                  approvalReference: approvalRef,
                });
                toast.success('Checkout terms saved');
                onOpenChange(false);
              } catch (e) {
                toast.error(getErrorMessage(e));
              }
            }}
          >
            Save terms
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AdminOfferActions({ offer }: { offer: AdminOfferRow }) {
  const review = useBackendReviewOffer();
  const [terms, setTerms] = useState(false);
  const [reject, setReject] = useState(false);
  const [reason, setReason] = useState('');

  const decide = async (decision: 'APPROVE' | 'REJECT') => {
    try {
      await review.mutateAsync({
        id: offer.id,
        body: { expectedVersion: offer.version, reason: decision === 'REJECT' ? reason : '', decision },
      });
      toast.success(decision === 'APPROVE' ? 'Offer approved' : 'Offer rejected');
      setReject(false);
      setReason('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Moderate ${offer.title}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {offer.status !== 'active' ? (
            <DropdownMenuItem disabled={review.isPending} onSelect={() => void decide('APPROVE')}>
              <CheckCircle2 /> Approve
            </DropdownMenuItem>
          ) : null}
          {offer.status !== 'flagged' ? (
            <DropdownMenuItem onSelect={() => setReject(true)}>
              <Flag /> Reject
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setTerms(true)}>Checkout terms</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <CheckoutTermsDialog offer={offer} open={terms} onOpenChange={setTerms} />
      <ReasonDialog
        open={reject}
        onOpenChange={setReject}
        title={`Reject “${offer.title}”?`}
        description="The seller will see this reason."
        confirmLabel="Reject offer"
        destructive
        onConfirm={async (r) => {
          setReason(r);
          try {
            await review.mutateAsync({
              id: offer.id,
              body: { expectedVersion: offer.version, reason: r, decision: 'REJECT' },
            });
            toast.success('Offer rejected');
          } catch (e) {
            toast.error(getErrorMessage(e));
          }
        }}
      />
    </>
  );
}
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
  const rawBackend = backendQueue.data as
    | { data?: unknown[]; meta?: { page: number; pageSize: number; total: number; totalPages: number } }
    | undefined;
  const list = useBackend
    ? {
        data: {
          data: (rawBackend?.data ?? []).map(normalizeAdminOffer),
          meta: rawBackend?.meta ?? { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        },
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
          if (!write) return <span className="sr-only">Read only</span>;
          if (useBackend) return <AdminOfferActions offer={p as AdminOfferRow} />;
          return (
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
          );
        },
      },
    ],
    [write, useBackend],
  );

  if (list.isError)
    return <ErrorState description={getErrorMessage(list.error)} onRetry={() => list.refetch()} />;

  return (
    <>
      <PageHeader
        title="Product moderation"
        description="Approve new listings, flag suspicious ones and remove violations."
        actions={
          <div className="flex items-center gap-2">
            {useBackend && write ? <CreateProductButton /> : null}
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
          </div>
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
