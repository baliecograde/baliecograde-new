'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export class GuestSessionError extends Error {
  constructor(readonly code: 'SESSION_INVALID' | 'GUEST_SESSION_FAILED') {
    super(code);
    this.name = 'GuestSessionError';
  }
}

/** Ensures browser auth has a cookie-backed session; the server validates it again. */
export async function ensureScanSession(supabase: SupabaseClient) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new GuestSessionError('SESSION_INVALID');

  if (sessionData.session) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new GuestSessionError('SESSION_INVALID');
    return data.user;
  }

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.user) throw new GuestSessionError('GUEST_SESSION_FAILED');
  return data.user;
}
