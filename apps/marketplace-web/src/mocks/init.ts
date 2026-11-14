import { configureApiClient } from '@mitdrone/sdk';

import { env } from '@/lib/env';

/**
 * Starts the MSW service worker in the browser. Every SDK request waits for it, so nothing
 * can reach the (nonexistent) backend before the mocks are registered.
 */
let ready: Promise<void> = Promise.resolve();

if (typeof window !== 'undefined' && env.NEXT_PUBLIC_ENABLE_MOCKS === 'true') {
  ready = import('@mitdrone/mocks/browser')
    .then(({ worker }) => worker.start({ onUnhandledRequest: 'bypass', quiet: true }))
    .then(() => undefined);
  configureApiClient({ fetch: (input, init) => ready.then(() => fetch(input, init)) });
}

export const mocksReady = ready;
