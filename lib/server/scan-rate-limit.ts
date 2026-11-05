import 'server-only';
import { createHmac } from 'node:crypto';

const REQUEST_LIMIT_SCRIPT = `
local blocked = 0
local retry_after = 0
for i = 1, #KEYS do
  local limit = tonumber(ARGV[(i - 1) * 2 + 1])
  local ttl = tonumber(ARGV[(i - 1) * 2 + 2])
  local count = redis.call('INCR', KEYS[i])
  if count == 1 then redis.call('EXPIRE', KEYS[i], ttl) end
  local remaining = redis.call('TTL', KEYS[i])
  if count > limit then
    blocked = 1
    if remaining > retry_after then retry_after = remaining end
  end
end
return { blocked, retry_after }
`;

export class RateLimitUnavailableError extends Error {
  constructor() {
    super('RATE_LIMITER_UNAVAILABLE');
    this.name = 'RateLimitUnavailableError';
  }
}

export interface RateLimitDecision {
  allowed: boolean;
  retryAfterSeconds: number;
}

interface WindowRule {
  name: string;
  identity: string;
  windowSeconds: number;
  maxRequests: number;
}

interface RateLimitOptions {
  nowMs?: number;
  fetcher?: typeof fetch;
  redisUrl?: string;
  redisToken?: string;
  ipPerFiveMinutes?: number;
  userPerFiveMinutes?: number;
  userPerDay?: number;
  aiPerUserPerDay?: number;
  aiGlobalPerDay?: number;
}

function positiveInteger(value: string | undefined, fallback: number): number {
  if (value === undefined || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new RateLimitUnavailableError();
  return parsed;
}

function redisConfig(options: RateLimitOptions) {
  const url = options.redisUrl ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = options.redisToken ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new RateLimitUnavailableError();
  let parsed: URL;
  try { parsed = new URL(url); } catch { throw new RateLimitUnavailableError(); }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new RateLimitUnavailableError();
  }
  return { url: parsed.toString().replace(/\/$/, ''), token };
}

function hashIdentifier(identifier: string, token: string): string {
  return createHmac('sha256', token).update(identifier).digest('hex');
}

function bucketKey(name: string, identifier: string, windowSeconds: number, nowMs: number, token: string) {
  const bucket = Math.floor(nowMs / (windowSeconds * 1000));
  return `baliecograde:scan:${name}:${hashIdentifier(identifier, token)}:${bucket}`;
}

async function evaluateFixedWindow(
  rules: WindowRule[],
  options: RateLimitOptions,
): Promise<RateLimitDecision> {
  const { url, token } = redisConfig(options);
  const nowMs = options.nowMs ?? Date.now();
  const keys = rules.map((rule) => bucketKey(rule.name, rule.identity, rule.windowSeconds, nowMs, token));
  const args = rules.flatMap((rule) => [String(rule.maxRequests), String(rule.windowSeconds + 5)]);
  const command = ['EVAL', REQUEST_LIMIT_SCRIPT, String(keys.length), ...keys, ...args];
  let response: Response;
  try {
    response = await (options.fetcher ?? fetch)(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command),
      cache: 'no-store',
      signal: AbortSignal.timeout(1500),
    });
  } catch {
    throw new RateLimitUnavailableError();
  }
  if (!response.ok) throw new RateLimitUnavailableError();

  let payload: { result?: unknown; error?: unknown };
  try { payload = await response.json() as typeof payload; } catch { throw new RateLimitUnavailableError(); }
  if (payload.error || !Array.isArray(payload.result) || payload.result.length < 2) {
    throw new RateLimitUnavailableError();
  }
  const blocked = Number(payload.result[0]);
  const retryAfterSeconds = Number(payload.result[1]);
  if (![0, 1].includes(blocked) || !Number.isFinite(retryAfterSeconds)) {
    throw new RateLimitUnavailableError();
  }
  return { allowed: blocked === 0, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterSeconds)) };
}

export function getTrustedScanClientIp(headers: Headers, isVercel = process.env.VERCEL === '1'): string {
  if (!isVercel) return 'local-development';
  // Vercel overwrites this header at the platform edge. Never trust a client-supplied
  // X-Forwarded-For value when running behind a different proxy configuration.
  const value = headers.get('x-forwarded-for')?.trim();
  const ip = value?.split(',')[0]?.trim();
  if (!ip || ip.length > 64 || /[^0-9a-fA-F:., ]/.test(ip)) throw new RateLimitUnavailableError();
  return ip;
}

export async function consumeScanRequestLimit(
  userId: string,
  clientIp: string,
  options: RateLimitOptions = {},
): Promise<RateLimitDecision> {
  const ipLimit = options.ipPerFiveMinutes ?? positiveInteger(process.env.SCAN_RATE_LIMIT_IP_PER_5_MIN, 20);
  const userLimit = options.userPerFiveMinutes ?? positiveInteger(process.env.SCAN_RATE_LIMIT_USER_PER_5_MIN, 5);
  const dayLimit = options.userPerDay ?? positiveInteger(process.env.SCAN_RATE_LIMIT_USER_PER_DAY, 25);
  const fiveMinutes = 5 * 60;
  const day = 24 * 60 * 60;
  return evaluateFixedWindow([
    { name: 'ip-5m', identity: clientIp, windowSeconds: fiveMinutes, maxRequests: ipLimit },
    { name: 'user-5m', identity: userId, windowSeconds: fiveMinutes, maxRequests: userLimit },
    { name: 'user-day', identity: userId, windowSeconds: day, maxRequests: dayLimit },
  ], options);
}

export async function reserveAiInvocation(
  userId: string,
  options: RateLimitOptions = {},
): Promise<RateLimitDecision> {
  const userLimit = options.aiPerUserPerDay ?? positiveInteger(process.env.SCAN_AI_USER_PER_DAY, 10);
  const globalLimit = options.aiGlobalPerDay ?? positiveInteger(process.env.SCAN_AI_GLOBAL_PER_DAY, 100);
  const day = 24 * 60 * 60;
  return evaluateFixedWindow([
    { name: 'ai-user-day', identity: userId, windowSeconds: day, maxRequests: userLimit },
    { name: 'ai-global-day', identity: 'all-users', windowSeconds: day, maxRequests: globalLimit },
  ], options);
}
