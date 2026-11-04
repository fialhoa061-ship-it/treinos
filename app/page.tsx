import { redirect } from 'next/navigation';
import { getStudent, isAdmin } from '@/lib/auth';

// entrada do app (o app instalado abre aqui): cada um vai direto para a sua tela
export default async function Home() {
  if (await getStudent()) redirect('/treino');
  if (await isAdmin()) redirect('/admin');
  redirect('/login');
}
