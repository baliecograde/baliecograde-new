import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

/**
 * POST /api/auth/logout
 * Mengakhiri sesi login admin pada Supabase Auth dan menghapus cookie sesi.
 */
export async function POST() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  return NextResponse.json({ data: { signed_out: true } });
}
