const PRODUCTION_SUPABASE_HOST = 'grvrrlgguaelbyjvvdyr.supabase.co';

/**
 * Disable Redis quotas only for local development against a non-production
 * Supabase project. Production and preview deployments always use Redis.
 */
export function mayBypassScanRateLimits(
  nodeEnv: string | undefined,
  redisUrl: string | undefined,
  redisToken: string | undefined,
  supabaseUrl: string | undefined,
): boolean {
  if (nodeEnv !== 'development' || redisUrl || redisToken || !supabaseUrl) return false;
  try {
    const url = new URL(supabaseUrl);
    const isSupabaseHostedProject = url.protocol === 'https:' && url.hostname.endsWith('.supabase.co');
    const isLocalSupabase = url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname);
    return (isSupabaseHostedProject || isLocalSupabase) && url.hostname !== PRODUCTION_SUPABASE_HOST;
  } catch {
    return false;
  }
}
