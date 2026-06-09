import { describe, expect, it } from '@jest/globals';
import request from 'supertest';
import { APP_URL } from './utils/constants';

/**
 * Smoke test: verifies the app is reachable (implying AppModule + ThrottlerModule
 * loaded without errors) and, when explicitly opted-in, exercises the 429 path.
 *
 * The 429 test is gated behind RUN_THROTTLE_TEST=true because it requires
 * RATE_LIMIT_MAX to be set very low (e.g. 5) in the test environment — running
 * it against the default 120 limit would be flaky and slow.
 */
describe('Throttler (e2e)', () => {
  const app = APP_URL;

  it('should return 200 on GET / — AppModule with ThrottlerModule is healthy', () => {
    return request(app).get('/').expect(200);
  });

  const runThrottleTest = process.env['RUN_THROTTLE_TEST'] === 'true';

  (runThrottleTest ? it : it.skip)(
    'should return 429 after exceeding RATE_LIMIT_MAX consecutive requests',
    async () => {
      const limit = parseInt(process.env['RATE_LIMIT_MAX'] || '5', 10);
      const endpoint = '/';

      // Fire limit+1 requests sequentially to the same IP.
      let lastStatus = 0;
      for (let i = 0; i <= limit; i++) {
        const res = await request(app).get(endpoint);
        lastStatus = res.status;
        if (res.status === 429) break;
      }

      expect(lastStatus).toBe(429);
    },
  );
});
