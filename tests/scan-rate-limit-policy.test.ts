import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mayBypassScanRateLimits } from '../lib/scan-rate-limit-policy';

const devProject = 'https://baliecograde-dev.supabase.co';
const productionProject = 'https://grvrrlgguaelbyjvvdyr.supabase.co';

test('rate-limit bypass is limited to local development with a non-production project and no Redis', () => {
  assert.equal(mayBypassScanRateLimits('development', undefined, undefined, devProject), true);
  assert.equal(mayBypassScanRateLimits('development', undefined, undefined, 'http://127.0.0.1:54321'), true);
  assert.equal(mayBypassScanRateLimits('development', undefined, undefined, 'https://untrusted.example'), false);
  assert.equal(mayBypassScanRateLimits('production', undefined, undefined, devProject), false);
  assert.equal(mayBypassScanRateLimits('development', undefined, undefined, productionProject), false);
  assert.equal(mayBypassScanRateLimits('development', 'https://redis.example', undefined, devProject), false);
  assert.equal(mayBypassScanRateLimits('development', undefined, 'token', devProject), false);
  assert.equal(mayBypassScanRateLimits('development', undefined, undefined, undefined), false);
});
