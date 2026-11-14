'use client';

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';

import { AuthController, type AuthControllerOptions } from './controller';
import { AuthContext, buildAuthValue } from './use-auth';

export interface AuthProviderProps extends AuthControllerOptions {
  children: ReactNode;
  /** Inject a controller (tests). */
  controller?: AuthController;
}

export function AuthProvider({ children, controller, ...options }: AuthProviderProps) {
  const [ctrl] = useState(() => controller ?? new AuthController(options));
  const state = useSyncExternalStore(ctrl.subscribe, ctrl.getSnapshot, ctrl.getServerSnapshot);

  // Do this for the controller React kept, rather than in its constructor: Strict Mode may
  // invoke state initializers twice and discard one controller instance.
  ctrl.bindApiClient();

  useEffect(() => {
    ctrl.attach();
    void ctrl.restore();
    return ctrl.detach;
  }, [ctrl]);

  const value = useMemo(
    () =>
      buildAuthValue(state, {
        login: ctrl.login,
        register: async (input) => {
          await ctrl.register(input);
        },
        logout: ctrl.logout,
        reloadUser: async () => {
          await ctrl.reloadUser();
        },
        restore: async () => {
          await ctrl.restore();
        },
      }),
    [state, ctrl],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
