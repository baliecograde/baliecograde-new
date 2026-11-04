import { NextResponse, type NextRequest } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { hasAdminRole } from '@/lib/scan-validation';
export async function POST(request: NextRequest) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 }); }
  if (!body || typeof body !== 'object' || !('email' in body) || !('password' in body) ||
      typeof body.email !== 'string' || typeof body.password !== 'string' ||
      body.email.length > 320 || body.password.length > 1024) {
    return NextResponse.json({ error: { code: 'INVALID_BODY' } }, { status: 400 });
  }
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email: body.email, password: body.password });
  if (error || !data.user) return NextResponse.json({ error: { code: 'LOGIN_FAILED' } }, { status: 401 });
  if (!hasAdminRole(data.user.app_metadata)) {
    await supabase.auth.signOut();
    return NextResponse.json({ error: { code: 'FORBIDDEN' } }, { status: 403 });
  }
  return NextResponse.json({ data: { user: { id: data.user.id, email: data.user.email } } });
}
