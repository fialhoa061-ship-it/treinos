import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { logout } from '../login/actions';

export const metadata = { title: 'Admin', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return (
    <div className="admin">
      <main>
        <nav className="top">
          <Link className="btn" href="/admin">Alunos</Link>
          <Link className="btn" href="/admin/biblioteca">Biblioteca</Link>
          <Link className="btn" href="/admin/backup">Backup</Link>
          <form action={logout} className="inline"><button>Sair</button></form>
        </nav>
        {children}
      </main>
    </div>
  );
}
