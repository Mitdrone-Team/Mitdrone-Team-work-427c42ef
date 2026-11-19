'use client';

import {
  getErrorMessage,
  useBackendAssetCalendar,
  useBackendBlockAsset,
  useBackendCreateAsset,
  useBackendReleaseBlock,
  useBackendUpdateAsset,
} from '@mitdrone/sdk';
import { AssetStatus } from '@mitdrone/types';
import {
  Button,
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  toast,
} from '@mitdrone/ui';
import { CalendarDays, MoreHorizontal, Plus, ShieldOff, ShieldPlus, Wrench } from 'lucide-react';
import { useState } from 'react';

export interface AssetRow {
  id: string;
  title: string;
  serialNumber: string;
  status: string;
  conditionNote: string;
  version: number;
}

function toIso(value: string): string {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

export function AssetActions({ orgId, asset }: { orgId: string; asset: AssetRow }) {
  const update = useBackendUpdateAsset(orgId, asset.id);
  const block = useBackendBlockAsset(orgId, asset.id);
  const [dialog, setDialog] = useState<'status' | 'block' | 'release' | 'calendar'>();

  const [status, setStatus] = useState<string>(
    AssetStatus.includes(asset.status as (typeof AssetStatus)[number]) ? asset.status : 'AVAILABLE',
  );
  const [conditionNote, setConditionNote] = useState(asset.conditionNote);
  const [reason, setReason] = useState('');

  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockId, setBlockId] = useState('');
  const [range, setRange] = useState<{ startsAt: string; endsAt: string }>();

  const release = useBackendReleaseBlock(orgId, asset.id, blockId);
  const calendar = useBackendAssetCalendar(orgId, asset.id, range ?? { startsAt: '', endsAt: '' });

  const runUpdate = async () => {
    try {
      await update.mutateAsync({
        expectedVersion: asset.version,
        status: status as (typeof AssetStatus)[number],
        conditionNote,
        reason,
      });
      toast.success('Asset updated');
      setDialog(undefined);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const runBlock = async () => {
    try {
      await block.mutateAsync({ startsAt: toIso(startsAt), endsAt: toIso(endsAt), reason: blockReason });
      toast.success('Asset blocked');
      setDialog(undefined);
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const runRelease = async () => {
    try {
      await release.mutateAsync();
      toast.success('Block released');
      setDialog(undefined);
      setBlockId('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Manage ${asset.title}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setDialog('status')}>
            <Wrench /> Update status
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('block')}>
            <ShieldOff /> Block dates
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setDialog('release')}>
            <ShieldPlus /> Release block
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setDialog('calendar')}>
            <CalendarDays /> View calendar
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={dialog === 'status'} onOpenChange={(o) => !o && setDialog(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update asset status</DialogTitle>
            <DialogDescription>Serial {asset.serialNumber || asset.id}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="asset-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="asset-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AssetStatus.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-condition">Condition note</Label>
              <Input
                id="asset-condition"
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="asset-reason">Reason</Label>
              <Input id="asset-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(undefined)}>
              Cancel
            </Button>
            <Button loading={update.isPending} onClick={() => void runUpdate()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'block'} onOpenChange={(o) => !o && setDialog(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block asset dates</DialogTitle>
            <DialogDescription>Hide this asset from bookings for a period.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="block-start">Starts</Label>
              <Input
                id="block-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-end">Ends</Label>
              <Input
                id="block-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="block-reason">Reason</Label>
              <Input
                id="block-reason"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(undefined)}>
              Cancel
            </Button>
            <Button
              loading={block.isPending}
              disabled={!startsAt || !endsAt || !blockReason}
              onClick={() => void runBlock()}
            >
              Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'release'} onOpenChange={(o) => !o && setDialog(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Release a block</DialogTitle>
            <DialogDescription>Enter the block identifier to remove it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="block-id">Block ID</Label>
            <Input id="block-id" value={blockId} onChange={(e) => setBlockId(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(undefined)}>
              Cancel
            </Button>
            <Button loading={release.isPending} disabled={!blockId} onClick={() => void runRelease()}>
              Release
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'calendar'} onOpenChange={(o) => !o && setDialog(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asset calendar</DialogTitle>
            <DialogDescription>Check availability for a date range.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="cal-start">From</Label>
                <Input
                  id="cal-start"
                  type="datetime-local"
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cal-end">To</Label>
                <Input
                  id="cal-end"
                  type="datetime-local"
                  value={endsAt}
                  onChange={(e) => setEndsAt(e.target.value)}
                />
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={!startsAt || !endsAt}
              onClick={() => setRange({ startsAt: toIso(startsAt), endsAt: toIso(endsAt) })}
            >
              Load
            </Button>
            {range ? (
              calendar.isPending ? (
                <Skeleton className="h-24 w-full" />
              ) : (
                <pre className="bg-muted max-h-56 overflow-auto rounded-md p-3 text-xs">
                  {calendar.isError ? getErrorMessage(calendar.error) : JSON.stringify(calendar.data, null, 2)}
                </pre>
              )
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(undefined)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function CreateAssetButton({ orgId }: { orgId: string }) {
  const create = useBackendCreateAsset(orgId);
  const [open, setOpen] = useState(false);
  const [productId, setProductId] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [conditionNote, setConditionNote] = useState('');
  const [rentalOfferId, setRentalOfferId] = useState('');
  const [saleOfferId, setSaleOfferId] = useState('');

  const submit = async () => {
    try {
      await create.mutateAsync({
        productId,
        serialNumber,
        conditionNote,
        ...(rentalOfferId ? { rentalOfferId } : {}),
        ...(saleOfferId ? { saleOfferId } : {}),
      });
      toast.success('Asset added');
      setOpen(false);
      setProductId('');
      setSerialNumber('');
      setConditionNote('');
      setRentalOfferId('');
      setSaleOfferId('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus /> Add asset
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add a rental asset</DialogTitle>
            <DialogDescription>Register a physical unit for rent.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="a-product">Product ID</Label>
              <Input id="a-product" value={productId} onChange={(e) => setProductId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-serial">Serial number</Label>
              <Input
                id="a-serial"
                value={serialNumber}
                onChange={(e) => setSerialNumber(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a-condition">Condition note</Label>
              <Input
                id="a-condition"
                value={conditionNote}
                onChange={(e) => setConditionNote(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label htmlFor="a-rental">Rental offer ID (optional)</Label>
                <Input
                  id="a-rental"
                  value={rentalOfferId}
                  onChange={(e) => setRentalOfferId(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="a-sale">Sale offer ID (optional)</Label>
                <Input id="a-sale" value={saleOfferId} onChange={(e) => setSaleOfferId(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              loading={create.isPending}
              disabled={!productId || !serialNumber}
              onClick={() => void submit()}
            >
              Add asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
