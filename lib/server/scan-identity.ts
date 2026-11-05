import 'server-only';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export interface ScanIdentity {
  userId: string;
  isAnonymous: boolean;
}

/** Validates the cookie-backed user with Supabase Auth; never trusts getSession or the admin key. */
export async function getValidatedScanIdentity(): Promise<ScanIdentity | null> {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { userId: data.user.id, isAnonymous: data.user.is_anonymous === true };
}
