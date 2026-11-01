'use client';

import { useActionState, useState } from 'react';
import { login } from './actions';
import { tokenFromLink } from '@/lib/util';


export default function LoginForm() {
  const [tab, setTab] = useState<0 | 1>(0);
  const [showPw, setShowPw] = useState(false);
  const [err, action, pending] = useActionState(login, '');
  const [linkErr, setLinkErr] = useState('');

  function openStudent(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const raw = String(new FormData(e.currentTarget).get('link'));
    const t = tokenFromLink(raw);
    setLinkErr(t ? '' : raw.includes('-fitapp-') ? 'Link incompleto: falta parte do código no final. Copie o endereço inteiro.' : 'Link inválido. Confira se copiou o endereço inteiro.');
    if (t) location.href = `/aluno-fitapp-${t}`;
  }

  return (
    <main className="glass">
      <p className="brand">Treinos · Área do professor</p>
      <h1>Entrar</h1>
      <p className="sub">Bem-vindo de volta</p>
      <div className="seg" role="tablist" aria-label="Tipo de acesso" data-on={tab}>
        {['Professor', 'Aluno'].map((t, i) => (
          <button key={t} type="button" role="tab" aria-selected={tab === i} tabIndex={tab === i ? 0 : -1}
            onClick={() => setTab(i as 0 | 1)}
            onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') setTab((1 - i) as 0 | 1); }}>{t}</button>
        ))}
      </div>

      {tab === 0 ? (
        <form action={action}>
          {err && <p className="err" role="alert">{err}</p>}
          <label className="field">
            <input type="email" name="email" placeholder="E-mail" aria-label="E-mail" autoComplete="username" required autoFocus />
            <span className="ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7" /></svg></span>
          </label>
          <label className="field">
            <input type={showPw ? 'text' : 'password'} name="password" placeholder="Senha" aria-label="Senha" autoComplete="current-password" required />
            <button type="button" className="ico" aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPw(v => !v)}>
              <svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{!showPw && <path d="M4 4l16 16" />}</svg>
            </button>
          </label>
          <button className="go" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}</button>
        </form>
      ) : (
        <form onSubmit={openStudent}>
          <p className="hint">Cole o link que o professor enviou para você.</p>
          <label className="field"><input name="link" placeholder="Link do treino" aria-label="Link do treino" autoComplete="off" required /></label>
          {linkErr && <p className="err" role="alert">{linkErr}</p>}
          <button className="go">Abrir treino</button>
        </form>
      )}
    </main>
  );
}
