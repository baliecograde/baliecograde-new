import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { connection } from 'next/server';
import { AdminDashboardPage } from '@/components/admin/AdminDashboardPage';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { hasAdminRole } from '@/lib/scan-validation';

export default function AdminPage() {
  return <Suspense fallback={<main className="p-8">Memeriksa sesi admin…</main>}><AdminContent /></Suspense>;
}
async function AdminContent() {
  await connection();
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect('/admin-login');
  if (!hasAdminRole(data.user.app_metadata)) redirect('/admin-login?error=forbidden');
  return <AdminDashboardPage />;
}
