import { redirect } from 'next/navigation';
import { getStudent, isAdmin } from '@/lib/auth';
import LoginForm from './LoginForm';
import Shell, { loginViewport } from './Shell';

export const metadata = { title: 'Entrar' };
export const viewport = loginViewport;

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  if (await getStudent()) redirect('/treino'); // aluno já logado (30 dias) vai direto ao treino
  return <Shell><LoginForm /></Shell>;
}
