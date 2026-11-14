'use client';

import { createContext, useContext } from 'react';

import { can, type Permission } from './roles';

import type { AuthState } from './controller';
import type { LoginRequest, RegisterRequest, Role, User } from '@mitdrone/types';

export interface AuthContextValue extends AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  /** True while the initial session restoration is in flight. Mutations should not fire while restoring. */
  isRestoring: boolean;
  login: (credentials: LoginRequest) => Promise<User>;
  register: (input: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-fetches the backend session, e.g. after a profile change. */
  reloadUser: () => Promise<void>;
  /** Waits for initial session restoration to complete before proceeding. */
  restore: () => Promise<void>;
  hasRole: (roles: Role | readonly Role[]) => boolean;
  can: (permission: Permission) => boolean;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside <AuthProvider>');
  return value;
}

/** Convenience for vendor pages: the vendor id every vendor API call must carry. */
export function useVendorId(): string | undefined {
  return useAuth().user?.vendorId;
}

export const buildAuthValue = (
  state: AuthState,
  actions: Pick<
    AuthContextValue,
    'login' | 'register' | 'logout' | 'reloadUser' | 'restore'
  >,
): AuthContextValue => ({
  ...state,
  ...actions,
  isAuthenticated: state.status === 'authenticated',
  isLoading: state.status === 'loading',
  isRestoring: state.isRestoring,
  hasRole: (roles) =>
    !!state.user &&
    (Array.isArray(roles) ? roles.includes(state.user.role) : roles === state.user.role),
  can: (permission) => can(state.user?.role, permission),
});
