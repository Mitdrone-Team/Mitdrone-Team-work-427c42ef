'use client';

import { useAuth } from '@mitdrone/auth';
import { getErrorMessage, useSubmitBusinessQuote } from '@mitdrone/sdk';
import {
  Button,
  Calendar,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  toast,
} from '@mitdrone/ui';
import { formatMoney } from '@mitdrone/utils';
import { differenceInCalendarDays, format } from 'date-fns';
import { useState } from 'react';

import { rentalQuote } from '@/lib/rental';

import { Price } from './price';

import type { Product } from '@mitdrone/types';
import type { DateRange } from 'react-day-picker';

/** Rental booking mock: sends a request to the seller through the business quote endpoint. */
export function RentalRequest({
  product,
  availability: _availability,
}: {
  product: Product;
  availability?: unknown;
}) {
  const { user } = useAuth();
  const rental = product.rental;
  const [open, setOpen] = useState(false);
  const [range, setRange] = useState<DateRange | undefined>();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const submit = useSubmitBusinessQuote();
  if (!rental) return null;

  const days = range?.from && range.to ? differenceInCalendarDays(range.to, range.from) + 1 : 0;
  const quote = days > 0 ? rentalQuote(rental, days) : null;
  const contactName = user?.name ?? name;
  const contactEmail = user?.email ?? email;
  const ready = Boolean(quote && contactName.length >= 2 && /\S+@\S+\.\S+/.test(contactEmail));

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-3 text-sm">
        {[
          ['Daily', rental.daily],
          ['Weekly', rental.weekly],
          ['Monthly', rental.monthly],
        ].map(([label, price]) =>
          price ? (
            <div key={String(label)} className="rounded-lg border p-3">
              <dt className="text-muted-foreground">{String(label)}</dt>
              <dd className="font-semibold">
                <Price price={typeof price === 'object' ? price : rental.daily} />
              </dd>
            </div>
          ) : null,
        )}
      </dl>
      <p className="text-muted-foreground text-sm">
        Refundable deposit: <strong>{formatMoney(rental.deposit)}</strong>. Minimum {rental.minDays}{' '}
        day{rental.minDays > 1 ? 's' : ''}.
      </p>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="lg">Request to rent</Button>
        </DialogTrigger>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Rent {product.title.replace(/^Rental: /, '')}</DialogTitle>
            <DialogDescription>
              Pick your dates. The seller will confirm availability.
            </DialogDescription>
          </DialogHeader>
          <Calendar
            mode="range"
            selected={range}
            onSelect={setRange}
            disabled={{ before: new Date() }}
            numberOfMonths={1}
            className="mx-auto"
          />
          {quote && range?.from && range.to ? (
            <p className="bg-accent rounded-lg px-3 py-2 text-sm" role="status">
              {format(range.from, 'd MMM')} to {format(range.to, 'd MMM yyyy')} · {quote.breakdown}{' '}
              · <strong>{formatMoney(quote.total)}</strong> + deposit
            </p>
          ) : null}
          {!user ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="rent-name">Your name</Label>
                <Input
                  id="rent-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="rent-email">Email</Label>
                <Input
                  id="rent-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              disabled={!ready}
              loading={submit.isPending}
              onClick={() =>
                submit.mutate(
                  {
                    name: contactName,
                    email: contactEmail,
                    topic: 'rental',
                    message: `Rental request for ${product.title}: ${days} days (${quote?.breakdown ?? ''}).`,
                  },
                  {
                    onSuccess: () => {
                      toast.success('Rental request sent', {
                        description: 'The seller will reply by email.',
                      });
                      setOpen(false);
                    },
                    onError: (error) => toast.error(getErrorMessage(error)),
                  },
                )
              }
            >
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
