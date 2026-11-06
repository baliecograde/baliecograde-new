import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
/**
 * POST /api/auth/logout
 * Mengakhiri sesi login admin pada Supabase Auth dan menghapus cookie sesi.
 */
import { isSameOriginRequest } from '@/lib/request-origin';
export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return NextResponse.json({ error: { code: 'ORIGIN_NOT_ALLOWED' } }, { status: 403 });
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ data: { signed_out: true } });
}
