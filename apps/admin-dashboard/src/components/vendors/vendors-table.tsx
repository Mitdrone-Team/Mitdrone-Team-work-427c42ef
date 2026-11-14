'use client';

import { useAuth } from '@mitdrone/auth';
import {
  api,
  getErrorMessage,
  useAdminVendors,
  useBackendOrganizations,
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
  StatusBadge,
  toast,
} from '@mitdrone/ui';
import { formatDate } from '@mitdrone/utils';
import { BadgeCheck, CheckCircle2, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';

import { ExportMenu } from '@/components/common/export-menu';
import { FilterBar } from '@/components/common/filter-bar';
import { useUrlState } from '@/lib/url';

import {
  ACTION_LABELS,
  availableActions,
  useVendorActions,
  type VendorAction,
} from './vendor-actions';

import type { Vendor, VendorStatus } from '@mitdrone/types';
import type { ColumnDef } from '@tanstack/react-table';

const STATUSES: [VendorStatus, string][] = [
  ['pending_review', 'Pending review'],
  ['approved', 'Approved'],
  ['rejected', 'Rejected'],
  ['suspended', 'Suspended'],
  ['draft', 'Draft'],
];
const TYPES: [string, string][] = [
  ['dealer', 'Dealer'],
  ['manufacturer', 'Manufacturer'],
  ['individual_seller', 'Individual seller'],
  ['service_provider', 'Service provider'],
  ['renter', 'Renter'],
];

export function VendorsTable({
  useBackend = false,
}: {
  /** When true, fetch organizations from backend endpoints instead of mock admin API. */
  useBackend?: boolean;
}) {
  const { can } = useAuth();
  const url = useUrlState();
  const status = url.get('status') as VendorStatus | undefined;
  const type = url.get('type');
  const q = url.get('q');
  const filters = { ...(status ? { status } : {}), ...(type ? { type } : {}), ...(q ? { q } : {}) };
  const vendors = useVendorActions();
  const backend = useBackendOrganizations({ page: url.page, limit: 10 });
  const mock = useAdminVendors({ page: url.page, pageSize: 10, ...filters });
  const list = useBackend
    ? {
        data: (backend.data as unknown as { data: Vendor[]; meta: { page: number; pageSize: number; total: number; totalPages: number } }) ?? {
          data: [],
          meta: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
        },
        isPending: backend.isPending,
        isError: backend.isError,
        error: backend.error as Error | null,
        refetch: backend.refetch,
      }
    : mock;
  const [bulk, setBulk] = useState<{ vendors: Vendor[]; done: () => void }>();
  const write = can('admin.write');

  const columns = useMemo<ColumnDef<Vendor>[]>(
    () => [
      {
        id: 'name',
        accessorFn: (v) => v.name,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Vendor" />,
        cell: ({ row }) => (
          <div className="min-w-[200px]">
            <Link
              href={`/vendors/${row.original.id}`}
              className="flex items-center gap-1 font-medium hover:underline"
            >
              {row.original.name}
              {row.original.verified ? (
                <BadgeCheck className="text-primary size-4" aria-label="Verified" />
              ) : null}
            </Link>
            <p className="text-muted-foreground text-xs">
              {row.original.city}, {row.original.state}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Type',
        cell: ({ row }) => (
          <span className="capitalize">{row.original.type.replace('_', ' ')}</span>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'kycStatus',
        header: 'KYC',
        cell: ({ row }) => <StatusBadge status={row.original.kycStatus} />,
      },
      {
        accessorKey: 'productCount',
        header: ({ column }) => <DataTableColumnHeader column={column} title="Products" />,
      },
      {
        id: 'commission',
        header: 'Commission',
        accessorFn: (v) => v.commissionRate,
        cell: ({ row }) => `${(row.original.commissionRate * 100).toFixed(1)}%`,
      },
      {
        id: 'joined',
        accessorFn: (v) => v.createdAt,
        header: ({ column }) => <DataTableColumnHeader column={column} title="Joined" />,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">{formatDate(row.original.createdAt)}</span>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">Actions</span>,
        cell: ({ row }) => {
          const v = row.original;
          const actions = write ? availableActions(v) : [];
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label={`Actions for ${v.name}`}>
                  <MoreHorizontal />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link href={`/vendors/${v.id}`}>View details</Link>
                </DropdownMenuItem>
                {actions.length ? <DropdownMenuSeparator /> : null}
                {actions.map((a: VendorAction) => (
                  <DropdownMenuItem
                    key={a}
                    destructive={a !== 'approve'}
                    onSelect={() => vendors.request(a, v)}
                  >
                    {ACTION_LABELS[a]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [write, vendors],
  );

  if (list.isError)
    return <ErrorState description={getErrorMessage(list.error)} onRetry={() => list.refetch()} />;

  return (
    <>
      <PageHeader
        title="Vendors"
        description="Review applications, verify KYC and manage sellers."
        actions={
          <ExportMenu
            entity="vendors"
            title="Mitdrone vendors"
            fetchData={async () => {
              const all = await api.admin.vendors({ ...filters, pageSize: 100 });
              return {
                headers: [
                  'Name',
                  'Type',
                  'Status',
                  'KYC',
                  'City',
                  'State',
                  'Products',
                  'Commission %',
                  'Joined',
                ],
                rows: all.data.map((v) => [
                  v.name,
                  v.type,
                  v.status,
                  v.kycStatus,
                  v.city,
                  v.state,
                  v.productCount,
                  v.commissionRate * 100,
                  formatDate(v.createdAt),
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
        enableSelection={write}
        getRowId={(v) => v.id}
        emptyTitle="No vendors match these filters"
        serverPagination={{
          page: list.data?.meta.page ?? url.page,
          pageSize: 10,
          total: list.data?.meta.total ?? 0,
          onPageChange: (page) => url.set({ page }),
        }}
        toolbar={
          <FilterBar
            searchPlaceholder="Search name, email or city"
            filters={[
              { param: 'status', label: 'Status', options: STATUSES },
              { param: 'type', label: 'Type', options: TYPES },
            ]}
          />
        }
        bulkActions={(rows, clear) => {
          const pending = rows.filter((r) => r.status === 'pending_review');
          return (
            <Button
              size="sm"
              disabled={pending.length === 0}
              onClick={() => setBulk({ vendors: pending, done: clear })}
            >
              <CheckCircle2 /> Approve {pending.length || ''} pending
            </Button>
          );
        }}
      />
      {vendors.dialogs}
      <ConfirmDialog
        open={Boolean(bulk)}
        onOpenChange={(o) => !o && setBulk(undefined)}
        title={`Approve ${bulk?.vendors.length ?? 0} vendors?`}
        description="Only vendors awaiting review are approved. Each approval is recorded separately in the audit log."
        confirmLabel="Approve all"
        onConfirm={async () => {
          if (!bulk) return;
          const results = await Promise.allSettled(
            bulk.vendors.map((v) => vendors.approveMutation.mutateAsync(v.id)),
          );
          const ok = results.filter((r) => r.status === 'fulfilled').length;
          toast[ok === results.length ? 'success' : 'warning'](
            `${ok} of ${results.length} approved`,
          );
          bulk.done();
        }}
      />
    </>
  );
}
