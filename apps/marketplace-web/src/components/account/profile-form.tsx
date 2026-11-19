'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { ChangePasswordForm, useAuth } from '@mitdrone/auth';
import { api, getErrorMessage, useUpdateProfile } from '@mitdrone/sdk';
import { Button, Form, Input, Label, toast } from '@mitdrone/ui';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { RootError, TextField } from '@/components/forms/fields';
import { applyApiError } from '@/lib/forms';

const schema = z.object({
  name: z.string().min(2, 'Enter your full name'),
  phone: z.string().optional(),
});

export function ProfileForm() {
  const { user, reloadUser, logout } = useAuth();
  const update = useUpdateProfile();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: user?.name ?? '', phone: user?.phone ?? '' },
  });
  return (
    <div className="max-w-xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
        <p className="text-muted-foreground text-sm">
          Keep your details up to date so sellers can reach you.
        </p>
      </header>
      <Form {...form}>
        <form
          className="bg-card space-y-4 rounded-xl border p-5"
          noValidate
          onSubmit={form.handleSubmit(async (values) => {
            try {
              await update.mutateAsync({
                name: values.name,
                ...(values.phone ? { phone: values.phone } : {}),
              });
              await reloadUser();
              toast.success('Profile updated');
            } catch (e) {
              applyApiError(form, e);
            }
          })}
        >
          <RootError message={form.formState.errors.root?.message} />
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user?.email ?? ''} readOnly disabled />
          </div>
          <TextField control={form.control} name="name" label="Full name" autoComplete="name" />
          <TextField
            control={form.control}
            name="phone"
            label="Phone"
            type="tel"
            autoComplete="tel"
          />
          <Button type="submit" loading={form.formState.isSubmitting}>
            Save changes
          </Button>
        </form>
      </Form>
      <ChangePasswordForm />
      <section className="bg-card space-y-3 rounded-xl border p-5">
        <div>
          <h2 className="font-semibold">Sessions</h2>
          <p className="text-muted-foreground text-sm">
            Sign out of every device where you are currently signed in, including this one.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={async () => {
            try {
              await api.auth.logoutAll();
            } catch (e) {
              toast.error(getErrorMessage(e));
              return;
            }
            await logout();
            toast.success('Signed out of all devices');
          }}
        >
          Sign out of all devices
        </Button>
      </section>
    </div>
  );
}
