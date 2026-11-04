import Shell, { loginViewport } from '../Shell';
import ResetForm from './ResetForm';

export const metadata = { title: 'Criar nova senha', robots: { index: false } };
export const viewport = loginViewport;

export default async function Redefinir({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <Shell><ResetForm token={typeof t === 'string' ? t.slice(0, 100) : ''} /></Shell>;
}
