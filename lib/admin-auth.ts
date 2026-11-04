import 'server-only';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { hasAdminRole } from '@/lib/scan-validation';
export type AdminGuard = { ok: true; userId: string } | { ok: false; response: NextResponse };
export async function requireAdmin(): Promise<AdminGuard> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { ok: false, response: NextResponse.json({ error: { code: 'UNAUTHENTICATED' } }, { status: 401 }) };
  if (!hasAdminRole(data.user.app_metadata)) return { ok: false, response: NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 }) };
  return { ok: true, userId: data.user.id };
}
