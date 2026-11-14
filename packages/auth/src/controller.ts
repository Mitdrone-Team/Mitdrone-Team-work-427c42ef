import { api, ApiClientError, configureApiClient, isApiError, type ClientConfig } from '@mitdrone/sdk';

import type { LoginRequest, RegisterRequest, Role, User } from '@mitdrone/types';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';
export interface AuthState {
  status: AuthStatus;
  user: User | null;
  /** True while the initial session restoration is in flight. */
  isRestoring: boolean;
}

export interface AuthControllerOptions {
  /** @deprecated Cookie sessions are shared according to backend cookie scope. */
  storageKey?: string;
  /** Enables the mock server's in-memory bearer token compatibility. Never enable for production. */
  mockMode?: boolean;
  /** Roles allowed to sign in to this app. */
  allowedRoles?: readonly Role[];
  /** Called when the backend session is no longer valid. */
  onSessionExpired?: () => void;
}

const SERVER_STATE: AuthState = { status: 'loading', user: null, isRestoring: true };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUser(value: unknown): value is User {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.email === 'string' &&
    typeof value.name === 'string' &&
    typeof value.role === 'string' &&
    typeof value.status === 'string' &&
    typeof value.emailVerified === 'boolean'
  );
}

/** Extract a CSRF token from an auth response payload, if the backend includes one. */
function extractCsrfToken(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  const candidate =
    typeof payload.csrfToken === 'string'
      ? payload.csrfToken
      : isRecord(payload.session) && typeof payload.session.csrfToken === 'string'
        ? payload.session.csrfToken
        : null;
  return candidate || null;
}

function sessionUser(payload: unknown): User {
  const candidate = isRecord(payload) && 'user' in payload ? payload.user : payload;
  if (!isUser(candidate)) {
    throw new ApiClientError({
      status: 502,
      code: 'invalid_session_response',
      message: 'The backend session response does not contain a supported user record.',
    });
  }
  return candidate;
}

/** Cookie-backed session manager. The HTTP-only session cookie is never read by JavaScript. */
export class AuthController {
  private state: AuthState = { status: 'loading', user: null, isRestoring: true };
  private listeners = new Set<() => void>();
  private readonly allowedRoles: readonly Role[] | undefined;
  private readonly onSessionExpired: (() => void) | undefined;
  private readonly mockMode: boolean;
  private mockAccessToken: string | null = null;
  private csrfToken: string | null = null;
  private restoring: Promise<void> | null = null;

  constructor(options: AuthControllerOptions = {}) {
    this.allowedRoles = options.allowedRoles;
    this.onSessionExpired = options.onSessionExpired;
    this.mockMode = options.mockMode ?? false;
  }

  bindApiClient(): void {
    const config: Partial<ClientConfig> = {
      onAuthFailure: () => this.expire(),
      ...(this.mockMode ? { getAccessToken: () => this.mockAccessToken } : {}),
    };
    // Only override getCsrfToken once the backend has issued one. Before that,
    // any previously configured value (e.g. in tests) is preserved.
    if (this.csrfToken) {
      config.getCsrfToken = () => this.csrfToken;
    }
    configureApiClient(config);
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = (): AuthState => this.state;
  getServerSnapshot = (): AuthState => SERVER_STATE;

  attach = (): void => undefined;
  detach = (): void => undefined;

  restore = (): Promise<void> => {
    this.restoring ??= (async () => {
      this.setState({ ...this.state, isRestoring: true });
      try {
        await this.reloadUser();
      } catch (error) {
        if (isApiError(error) && error.status === 401) {
          this.setUnauthenticated();
          return;
        }
        this.setUnauthenticated();
        if (isApiError(error) && error.status !== 0) throw error;
      } finally {
        this.setState({ ...this.state, isRestoring: false });
      }
    })();
    return this.restoring;
  };

  login = async (credentials: LoginRequest): Promise<User> => {
    // Wait for any in-flight restoration to complete before issuing a new login,
    // so concurrent initialization cannot race with the login mutation.
    if (this.restoring) await this.restoring;
    const response = await api.auth.login(credentials);
    if (isRecord(response)) {
      const token = extractCsrfToken(response);
      if (token) {
        this.csrfToken = token;
        configureApiClient({ getCsrfToken: () => this.csrfToken });
      }
    }
    if (this.mockMode && isRecord(response) && isRecord(response.tokens)) {
      this.mockAccessToken =
        typeof response.tokens.accessToken === 'string' ? response.tokens.accessToken : null;
      configureApiClient({ getAccessToken: () => this.mockAccessToken });
    }
    return this.reloadUser();
  };

  register = async (input: RegisterRequest): Promise<void> => {
    await api.auth.register(input);
  };

  logout = async (): Promise<void> => {
    // Attempt backend logout only if we have a CSRF token to send.
    if (this.csrfToken) {
      try {
        await api.auth.logout();
      } catch {
        // Best-effort: clear local state regardless of backend result.
      }
    }
    this.mockAccessToken = null;
    const hadToken = this.csrfToken !== null;
    this.csrfToken = null;
    configureApiClient({
      getAccessToken: undefined,
      ...(hadToken ? { getCsrfToken: () => null } : {}),
    });
    this.setUnauthenticated();
  };

  reloadUser = async (): Promise<User> => {
    try {
      const response = await api.auth.session();
      if (isRecord(response)) {
        const token = extractCsrfToken(response);
        if (token) {
          this.csrfToken = token;
          configureApiClient({ getCsrfToken: () => this.csrfToken });
        }
      }
      const user = sessionUser(response);
      this.assertAllowed(user);
      this.setState({ status: 'authenticated', user, isRestoring: false });
      return user;
    } catch (error) {
      if (isApiError(error) && error.status === 401) this.expire();
      throw error;
    }
  };

  private assertAllowed(user: User): void {
    if (this.allowedRoles && !this.allowedRoles.includes(user.role)) {
      throw new ApiClientError({
        status: 403,
        code: 'wrong_app',
        message: 'This account cannot sign in here. Use the right app for your account type.',
      });
    }
  }

  private expire(): void {
    const wasAuthenticated = this.state.status === 'authenticated';
    this.csrfToken = null;
    this.mockAccessToken = null;
    this.setUnauthenticated();
    if (wasAuthenticated) this.onSessionExpired?.();
  }

  private setUnauthenticated(): void {
    this.setState({ status: 'unauthenticated', user: null, isRestoring: false });
  }

  private setState(next: AuthState): void {
    if (
      this.state.status === next.status &&
      this.state.user === next.user &&
      this.state.isRestoring === next.isRestoring
    )
      return;
    this.state = next;
    this.listeners.forEach((listener) => listener());
  }
}
