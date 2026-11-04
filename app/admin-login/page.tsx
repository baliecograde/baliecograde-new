'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
      if (!response.ok) throw new Error('Login gagal atau akun bukan ADMIN.');
      router.push('/admin-dashboard');
    } catch (e) { setError(e instanceof Error ? e.message : 'Login gagal.'); setBusy(false); }
  }
  return <main className="grid min-h-screen place-items-center bg-slate-50 p-4 dark:bg-slate-950"><form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-2xl bg-white p-8 shadow dark:bg-slate-900"><h1 className="text-2xl font-bold">Login Admin</h1><label className="block text-sm">Email<input required type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-lg border p-3 dark:bg-slate-950" /></label><label className="block text-sm">Kata sandi<input required type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-lg border p-3 dark:bg-slate-950" /></label>{error && <p role="alert" className="text-sm text-rose-700">{error}</p>}<button disabled={busy} className="w-full rounded-lg bg-emerald-700 p-3 font-semibold text-white disabled:opacity-50">{busy ? 'Memeriksa…' : 'Masuk'}</button></form></main>;
}
