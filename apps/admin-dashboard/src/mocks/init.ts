import { configureApiClient } from '@mitdrone/sdk';

import { env } from '@/lib/env';

/**
 * Handle API calls directly with the mock routes. A browser service worker only controls its
 * own origin, while the API URL normally points at localhost:4000, so it cannot reliably mock
 * those cross-origin requests.
 */
if (typeof window !== 'undefined' && env.NEXT_PUBLIC_ENABLE_MOCKS === 'true') {
  configureApiClient({
    fetch: async (input, init) => {
      const { mockFetch } = await import('@mitdrone/mocks/fetch');
      return mockFetch(input, init);
    },
  });
}
