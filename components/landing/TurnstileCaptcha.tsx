'use client';

import Script from 'next/script';
import { useEffect, useRef, useState } from 'react';

interface TurnstileWidgetOptions {
  sitekey: string;
  callback: (token: string) => void;
  'expired-callback': () => void;
  'error-callback': () => void;
  theme: 'auto';
}

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileWidgetOptions) => string;
      remove: (widgetId: string) => void;
    };
  }
}

interface TurnstileCaptchaProps {
  onToken: (token: string | null) => void;
  resetNonce: number;
}

export function TurnstileCaptcha({ onToken, resetNonce }: TurnstileCaptchaProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const [scriptReady, setScriptReady] = useState(false);
  const [widgetError, setWidgetError] = useState(false);

  useEffect(() => { onTokenRef.current = onToken; }, [onToken]);

  useEffect(() => {
    if (!siteKey || !scriptReady || !containerRef.current || !window.turnstile || widgetIdRef.current) return;
    widgetIdRef.current = window.turnstile.render(containerRef.current, {
      sitekey: siteKey,
      theme: 'auto',
      callback: (token) => onTokenRef.current(token),
      'expired-callback': () => onTokenRef.current(null),
      'error-callback': () => {
        setWidgetError(true);
        onTokenRef.current(null);
      },
    });
    return () => {
      if (widgetIdRef.current && window.turnstile) window.turnstile.remove(widgetIdRef.current);
      widgetIdRef.current = null;
    };
  }, [scriptReady, siteKey, resetNonce]);

  if (!siteKey) {
    return <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">Verifikasi keamanan belum dikonfigurasi.</p>;
  }

  return (
    <div className="mt-3 rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <p className="mb-2 text-sm text-slate-600 dark:text-slate-300">Verifikasi singkat diperlukan untuk membuat sesi scan tamu.</p>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setWidgetError(true)}
      />
      <div ref={containerRef} />
      {widgetError && <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">Verifikasi gagal dimuat. Muat ulang halaman lalu coba lagi.</p>}
    </div>
  );
}
