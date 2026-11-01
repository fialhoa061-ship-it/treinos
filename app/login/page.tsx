import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import LoginForm from './LoginForm';
import './login.css';

export const metadata = { title: 'Entrar' };

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  return (
    <div className="lp">
      <div className="bg" aria-hidden="true">
        <i className="ring a" /><i className="ring b" />
        <i className="streak s1" /><i className="streak s2" /><i className="streak s3" />
      </div>
      <LoginForm />
    </div>
  );
}
