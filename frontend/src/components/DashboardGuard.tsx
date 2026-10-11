import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getAuthenticatedUser } from '@/lib/auth/server-auth';
import { canAccessPage } from '@/lib/auth/roles';

export default async function DashboardGuard({ module, children }: { module: string; children: React.ReactNode }) {
  const user = await getAuthenticatedUser(new Request('http://localhost/dashboard', { headers: { cookie: (await cookies()).toString() } }));
  if (!user) redirect(`/login?redirect=${encodeURIComponent(module === 'dashboard' ? '/dashboard' : `/dashboard/${module}`)}`);
  if (!canAccessPage(user.role, module)) redirect('/dashboard?denied=1');
  return <>{children}</>;
}
