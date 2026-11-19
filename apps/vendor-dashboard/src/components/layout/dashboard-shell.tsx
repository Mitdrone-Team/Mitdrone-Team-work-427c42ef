'use client';

import { ROLE_LABELS, RequireAuth, useAuth } from '@mitdrone/auth';
import { api, useVendorSettings } from '@mitdrone/sdk';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Skeleton,
  StatusBadge,
  ThemeToggle,
  cn,
  toast,
} from '@mitdrone/ui';
import { initials } from '@mitdrone/utils';
import {
  BarChart3,
  Boxes,
  CalendarClock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  ShoppingBag,
  Wallet,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Suspense, type ReactNode, useEffect, useState } from 'react';

import { env } from '@/lib/env';
import { useSidebarStore } from '@/stores/sidebar';

import { Brand } from './brand';

export const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/products', label: 'Products', icon: Package },
  { href: '/orders', label: 'Orders', icon: ShoppingBag },
  { href: '/inventory', label: 'Inventory', icon: Boxes },
  { href: '/payouts', label: 'Payouts', icon: Wallet },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/services', label: 'Services', icon: Wrench },
  { href: '/rentals', label: 'Rentals', icon: CalendarClock },
  { href: '/settings', label: 'Settings', icon: Settings },
] as const;

function SidebarNav({
  collapsed = false,
  onNavigate,
}: {
  collapsed?: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <nav aria-label="Main">
      <ul className="space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                title={collapsed ? label : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  active
                    ? 'bg-accent text-accent-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  collapsed && 'justify-center px-2',
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                <span className={cn(collapsed && 'sr-only')}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const BANNERS: Record<string, string> = {
  draft: 'Finish setting up your store to start selling.',
  not_started: 'Finish setting up your store to start selling.',
  pending_review: 'Your store is under review. We usually respond within two business days.',
  rejected: 'Your verification was not approved. Review the feedback and resubmit.',
  suspended: 'Your store is suspended. Contact Mitdrone support.',
};

function Chrome({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const { collapsed, toggleCollapsed, mobileOpen, setMobileOpen } = useSidebarStore();
  const vendor = useVendorSettings(user?.vendorId).data;
  const [backendHealth, setBackendHealth] = useState<{ status?: string; service?: string } | undefined>(undefined);

  useEffect(() => {
    let active = true;
    api.backend.health.live().then((h) => {
      if (active) setBackendHealth(h);
    }).catch(() => {
      if (active) setBackendHealth(undefined);
    });
    return () => { active = false; };
  }, []);

  const banner = vendor && vendor.status !== 'approved' ? BANNERS[vendor.status] : undefined;

  return (
    <div className="bg-muted/30 min-h-screen">
      <aside
        className={cn(
          'bg-background fixed inset-y-0 left-0 z-30 hidden flex-col border-r p-3 transition-[width] lg:flex print:hidden',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div className={cn('flex h-12 items-center', collapsed ? 'justify-center' : 'px-2')}>
          <Brand compact={collapsed} />
        </div>
        <div className="mt-4 flex-1 overflow-y-auto">
          <SidebarNav collapsed={collapsed} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground justify-start"
          onClick={toggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen />
          ) : (
            <>
              <PanelLeftClose /> Collapse
            </>
          )}
        </Button>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-72">
          <SheetHeader>
            <SheetTitle>Seller Hub</SheetTitle>
          </SheetHeader>
          <SidebarNav onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div
        className={cn('transition-[padding]', collapsed ? 'lg:pl-16' : 'lg:pl-60', 'print:pl-0')}
      >
        <header className="bg-background/95 sticky top-0 z-20 flex h-14 items-center gap-3 border-b px-4 backdrop-blur print:hidden">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open menu"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium">
              {vendor?.name ?? <Skeleton className="h-5 w-32" />}
            </span>
            {vendor ? <StatusBadge status={vendor.status} /> : null}
            {backendHealth ? (
              <Badge
                variant={backendHealth.status === 'ok' ? 'default' : 'destructive'}
              >
                {backendHealth.service} backend · {backendHealth.status}
              </Badge>
            ) : null}
          </div>
          <div className="ml-auto flex items-center gap-1">
            {vendor?.status === 'approved' ? (
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <a
                  href={`${env.NEXT_PUBLIC_MARKETPLACE_URL}/vendors/${vendor.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View store <ExternalLink />
                </a>
              </Button>
            ) : null}
            <ThemeToggle />
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full"
                    aria-label="Account menu"
                  >
                    <Avatar className="size-8">
                      <AvatarFallback>{initials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <span className="block truncate">{user.name}</span>
                    <span className="text-muted-foreground block text-xs font-normal">
                      {ROLE_LABELS[user.role]}
                    </span>
                  </DropdownMenuLabel>
                  <DropdownMenuItem asChild>
                    <Link href="/settings">
                      <Settings /> Settings
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onSelect={async () => {
                      try {
                        await logout();
                        toast.success('Signed out');
                        router.push('/login');
                      } catch {
                        toast.error('Could not sign out. Please try again.');
                      }
                    }}
                  >
                    <LogOut /> Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </header>
        {banner ? (
          <div
            role="status"
            className="bg-warning/10 flex flex-wrap items-center gap-3 border-b px-4 py-2.5 text-sm print:hidden"
          >
            <span className="flex-1">{banner}</span>
            {vendor?.status !== 'suspended' ? (
              <Button asChild size="sm" variant="outline">
                <Link href="/onboarding">
                  {vendor?.status === 'pending_review' ? 'View status' : 'Continue setup'}
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto max-w-7xl space-y-6 p-4 outline-none sm:p-6 print:p-0"
        >
          <Suspense fallback={<Skeleton className="h-64 w-full" />}>{children}</Suspense>
        </main>
      </div>
    </div>
  );
}

export function DashboardShell({ children }: { children: ReactNode }) {
  return (
    <RequireAuth
      roles={['vendor_owner', 'vendor_staff']}
      fallback={
        <div className="p-6">
          <Skeleton className="h-96 w-full" />
        </div>
      }
    >
      <Chrome>{children}</Chrome>
    </RequireAuth>
  );
}
