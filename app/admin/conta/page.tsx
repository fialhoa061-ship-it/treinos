import { redirect } from 'next/navigation';

// a antiga tela "Conta" virou "Perfil"
export default function Conta() {
  redirect('/admin/perfil');
}
