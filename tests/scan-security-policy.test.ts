import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ensureScanSession, GuestSessionError } from '../lib/guest-session';
import { isSameOriginRequest } from '../lib/request-origin';
import {
  decideExistingScan,
  hasValidatedScanIdentity,
  mayIssueScanImageUrl,
  scanBelongsToUser,
} from '../lib/scan-access';

const now = Date.parse('2026-11-05T12:00:00.000Z');
const row = (userId: string | null, status: 'pending' | 'completed' | 'failed', createdAt = new Date(now).toISOString()) => ({
  user_id: userId,
  analysis_status: status,
  created_at: createdAt,
});

test('scan identity is required and image access is owner/admin only', () => {
  assert.equal(hasValidatedScanIdentity(null), false);
  assert.equal(hasValidatedScanIdentity({ userId: 'owner-a' }), true);
  assert.equal(scanBelongsToUser(row('owner-a', 'completed'), 'owner-a'), true);
  assert.equal(scanBelongsToUser(row('owner-a', 'completed'), 'owner-b'), false);
  assert.equal(mayIssueScanImageUrl(row('owner-a', 'completed'), 'owner-b', false), false);
  assert.equal(mayIssueScanImageUrl(row('owner-a', 'completed'), 'admin', true), true);
});

test('idempotency decisions disclose nothing to another identity and do not re-run pending or failed work', () => {
  assert.equal(decideExistingScan(row('owner-a', 'completed'), 'owner-b', now, 180_000), 'foreign');
  assert.equal(decideExistingScan(row('owner-a', 'completed'), 'owner-a', now, 180_000), 'completed');
  assert.equal(decideExistingScan(row('owner-a', 'pending'), 'owner-a', now, 180_000), 'pending');
  assert.equal(decideExistingScan(row('owner-a', 'failed'), 'owner-a', now, 180_000), 'failed');
  assert.equal(decideExistingScan(row('owner-a', 'pending', new Date(now - 181_000).toISOString()), 'owner-a', now, 180_000), 'stale_pending');
});

test('guest session is created without CAPTCHA and Auth errors are reported safely', async () => {
  const guest = { id: 'guest-1', is_anonymous: true };
  let signInCalls = 0;
  const successClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async (...args: unknown[]) => {
        signInCalls += 1;
        assert.equal(args.length, 0);
        return { data: { user: guest }, error: null };
      },
    },
  } as never;
  assert.deepEqual(await ensureScanSession(successClient), guest);
  assert.equal(signInCalls, 1);

  const failedClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInAnonymously: async () => ({ data: { user: null }, error: new Error('Auth rejected') }),
    },
  } as never;
  await assert.rejects(() => ensureScanSession(failedClient), (error: unknown) =>
    error instanceof GuestSessionError && error.code === 'GUEST_SESSION_FAILED');
});

test('existing browser session is validated with getUser before use', async () => {
  let getUserCalls = 0;
  const invalidSession = {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 'opaque' } }, error: null }),
      getUser: async () => { getUserCalls += 1; return { data: { user: null }, error: new Error('expired') }; },
    },
  } as never;
  await assert.rejects(() => ensureScanSession(invalidSession), (error: unknown) =>
    error instanceof GuestSessionError && error.code === 'SESSION_INVALID');
  assert.equal(getUserCalls, 1);
});

test('cookie-authenticated mutation requires an exact same-origin Origin header', () => {
  assert.equal(isSameOriginRequest(new Request('http://localhost:3000/api/auth/login', { headers: { origin: 'http://localhost:3000' } })), true);
  assert.equal(isSameOriginRequest(new Request('http://localhost:3000/api/auth/login', { headers: { origin: 'http://localhost:3001' } })), false);
  assert.equal(isSameOriginRequest(new Request('https://app.example/api/scans', { headers: { origin: 'https://app.example' } })), true);
  assert.equal(isSameOriginRequest(new Request('https://app.example/api/scans', { headers: { origin: 'https://attacker.example' } })), false);
  assert.equal(isSameOriginRequest(new Request('https://app.example/api/scans')), false);
  assert.equal(isSameOriginRequest(new Request('https://app.example/api/scans', { headers: { origin: 'null' } })), false);
});
