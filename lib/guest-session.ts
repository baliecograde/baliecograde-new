'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

export class GuestSessionError extends Error {
  constructor(readonly code: 'CAPTCHA_REQUIRED' | 'CAPTCHA_FAILED' | 'SESSION_INVALID') {
    super(code);
    this.name = 'GuestSessionError';
  }
}

/** Ensures browser auth has a cookie-backed session; the server validates it again. */
export async function ensureScanSession(supabase: SupabaseClient, captchaToken?: string) {
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw new GuestSessionError('SESSION_INVALID');

  if (sessionData.session) {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw new GuestSessionError('SESSION_INVALID');
    return data.user;
  }

  if (!captchaToken) throw new GuestSessionError('CAPTCHA_REQUIRED');
  const { data, error } = await supabase.auth.signInAnonymously({ options: { captchaToken } });
  if (error || !data.user) throw new GuestSessionError('CAPTCHA_FAILED');
  return data.user;
}
