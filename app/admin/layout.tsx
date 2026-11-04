import { requireAdmin } from '@/lib/auth';
import { logout } from '../login/actions';
import { TabBar } from './Client';

export const metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="app admin">
      <main className="screen">{children}</main>
      <TabBar logout={logout} />
    </div>
  );
}
