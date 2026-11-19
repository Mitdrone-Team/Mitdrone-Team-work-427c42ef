'use client';

import {
  getErrorMessage,
  useBackendCheckoutQuote,
  useBackendCreateOrder,
  useBackendCreateReservation,
  useBackendReleaseReservation,
  useBackendReservation,
  useBackendReservations,
} from '@mitdrone/sdk';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  ErrorState,
  Input,
  Label,
  PageHeader,
  Skeleton,
  toast,
} from '@mitdrone/ui';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

function extractItems(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== 'object') return [];
  const rec = raw as Record<string, unknown>;
  for (const key of ['data', 'items', 'reservations']) {
    const v = rec[key];
    if (Array.isArray(v)) return v as Record<string, unknown>[];
  }
  return [];
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : typeof v === 'number' ? String(v) : fallback;
}

/** Read a plausible integer-minor value from an undocumented checkout quote. */
function readQuote(raw: unknown): { termsVersion: string; totalMinor: string; currency: string } {
  const q = (raw ?? {}) as Record<string, unknown>;
  const total = (q.total ?? {}) as Record<string, unknown>;
  const minor =
    q.totalMinor ?? q.amountMinor ?? q.expectedTotalMinor ?? total.amountMinor ?? total.minor ?? '0';
  return {
    termsVersion: str(q.termsVersion ?? q.expectedCheckoutTermsVersion ?? q.checkoutTermsVersion ?? q.version, '1'),
    totalMinor: str(minor, '0'),
    currency: str(q.currency ?? total.currency, 'NGN'),
  };
}

export function ReservationsView() {
  const list = useBackendReservations({ page: 1, limit: 50 });

  const [offerId, setOfferId] = useState('');
  const [offerVersion, setOfferVersion] = useState('1');
  const [quantity, setQuantity] = useState('1');
  const [termsVersion, setTermsVersion] = useState('1');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const create = useBackendCreateReservation();

  const reserve = async () => {
    try {
      await create.mutateAsync({
        body: {
          offerId,
          expectedOfferVersion: Number(offerVersion) || 1,
          quantity: Number(quantity) || 1,
          ...(startsAt ? { startsAt: new Date(startsAt).toISOString() } : {}),
          ...(endsAt ? { endsAt: new Date(endsAt).toISOString() } : {}),
          ...(termsVersion ? { expectedTermsVersion: Number(termsVersion) || 1 } : {}),
        },
      });
      toast.success('Reservation created');
      setOfferId('');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  if (list.isError)
    return <ErrorState description={getErrorMessage(list.error)} onRetry={() => list.refetch()} />;

  const items = extractItems(list.data);

  return (
    <>
      <PageHeader
        title="Reservations"
        description="Hold an offer while you complete checkout, then place the order."
      />

      <Card>
        <CardHeader>
          <CardTitle>Reserve an offer</CardTitle>
          <CardDescription>Creates a temporary hold you can convert into an order.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="offer-id">Offer ID</Label>
              <Input id="offer-id" value={offerId} onChange={(e) => setOfferId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="offer-version">Offer version</Label>
              <Input
                id="offer-version"
                inputMode="numeric"
                value={offerVersion}
                onChange={(e) => setOfferVersion(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty">Quantity</Label>
              <Input
                id="qty"
                inputMode="numeric"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="terms-version">Terms version</Label>
              <Input
                id="terms-version"
                inputMode="numeric"
                value={termsVersion}
                onChange={(e) => setTermsVersion(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-start">Starts (optional)</Label>
              <Input
                id="res-start"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="res-end">Ends (optional)</Label>
              <Input
                id="res-end"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <Button loading={create.isPending} disabled={!offerId} onClick={() => void reserve()}>
            Create reservation
          </Button>
        </CardContent>
      </Card>

      <div className="mt-6 space-y-3">
        {list.isPending ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No reservations yet.</p>
        ) : (
          items.map((r, i) => <ReservationRow key={str(r.id, String(i))} raw={r} />)
        )}
      </div>
    </>
  );
}

function ReservationRow({ raw }: { raw: Record<string, unknown> }) {
  const router = useRouter();
  const id = str(raw.id);
  const status = str(raw.status, 'PENDING');
  const detail = useBackendReservation(id);
  const release = useBackendReleaseReservation(id);
  const createOrder = useBackendCreateOrder();

  const [ordering, setOrdering] = useState(false);
  const quote = useBackendCheckoutQuote(ordering ? id : undefined);
  const q = readQuote(quote.data);
  const [totalMinor, setTotalMinor] = useState('');
  const [currency, setCurrency] = useState('');
  const [termsVersion, setTermsVersion] = useState('');

  const effectiveTotal = totalMinor || q.totalMinor;
  const effectiveCurrency = currency || q.currency;
  const effectiveTerms = termsVersion || q.termsVersion;

  const releaseIt = async () => {
    try {
      await release.mutateAsync();
      toast.success('Reservation released');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  const placeOrder = async () => {
    try {
      await createOrder.mutateAsync({
        body: {
          reservationId: id,
          expectedCheckoutTermsVersion: Number(effectiveTerms) || 1,
          expectedTotalMinor: String(effectiveTotal),
          currency: effectiveCurrency,
        },
      });
      toast.success('Order placed');
      router.push('/account/orders');
    } catch (e) {
      toast.error(getErrorMessage(e));
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">Reservation {id.slice(0, 8) || '—'}</CardTitle>
          <CardDescription>
            Offer {str(raw.offerId, '—')} · created {str(raw.createdAt, '—')}
          </CardDescription>
        </div>
        <Badge variant={status === 'RELEASED' ? 'secondary' : 'success'}>{status}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {ordering ? null : (
            <Button size="sm" onClick={() => setOrdering(true)}>
              Checkout &amp; place order
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="text-destructive"
            loading={release.isPending}
            onClick={() => void releaseIt()}
          >
            Release
          </Button>
        </div>

        {detail.isError ? (
          <div className="flex items-center gap-2">
            <p className="text-destructive text-sm">{getErrorMessage(detail.error)}</p>
            <Button size="sm" variant="outline" onClick={() => void detail.refetch()}>
              Retry
            </Button>
          </div>
        ) : null}

        {detail.data !== undefined ? (
          <pre className="bg-muted max-h-40 overflow-auto rounded-md p-3 text-xs">
            {JSON.stringify(detail.data, null, 2)}
          </pre>
        ) : null}

        {ordering ? (
          <div className="space-y-3 border-t pt-3">
            <p className="text-muted-foreground text-xs">
              Confirm the checkout totals from the quote. Edit if the backend returns a different shape.
            </p>
            {quote.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : quote.isError ? (
              <p className="text-destructive text-sm">{getErrorMessage(quote.error)}</p>
            ) : null}
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`total-${id}`}>Total (minor units)</Label>
                <Input
                  id={`total-${id}`}
                  value={totalMinor}
                  placeholder={q.totalMinor}
                  onChange={(e) => setTotalMinor(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`cur-${id}`}>Currency</Label>
                <Input
                  id={`cur-${id}`}
                  value={currency}
                  placeholder={q.currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`terms-${id}`}>Terms version</Label>
                <Input
                  id={`terms-${id}`}
                  value={termsVersion}
                  placeholder={q.termsVersion}
                  onChange={(e) => setTermsVersion(e.target.value.replace(/\D/g, ''))}
                />
              </div>
            </div>
            <Button loading={createOrder.isPending} onClick={() => void placeOrder()}>
              Place order
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
