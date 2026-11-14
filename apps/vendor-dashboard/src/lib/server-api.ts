import 'server-only';

import { setMockConfig } from '@mitdrone/mocks';
import { mockFetch } from '@mitdrone/mocks/fetch';
import { api, configureApiClient } from '@mitdrone/sdk';

/**
 * Server Components fetch through the same SDK. In mock mode the SDK is given a fetch that calls
 * the mock handlers in-process, so no network, port or global patching is involved. That makes it
 * work identically in `next dev`, `next build` and `next start`.
 *
 * CSRF tokens are managed client-side by the AuthController (in-memory only). Server Components
 * only perform read requests here, so no CSRF token is required on the server.
 */
export async function serverApi(): Promise<typeof api> {
  if (process.env.NEXT_PUBLIC_ENABLE_MOCKS !== 'false') {
    setMockConfig({ latency: false });
    configureApiClient({
      fetch: mockFetch,
    });
  }
  return api;
}
