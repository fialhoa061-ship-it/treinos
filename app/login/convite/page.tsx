import Shell, { loginViewport } from '../Shell';
import ConviteForm from './ConviteForm';

export const metadata = { title: 'Criar conta de professor', robots: { index: false } };
export const viewport = loginViewport;

export default async function Convite({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t } = await searchParams;
  return <Shell><ConviteForm token={typeof t === 'string' ? t.slice(0, 100) : ''} /></Shell>;
}
