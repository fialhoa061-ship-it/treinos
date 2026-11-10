'use client';

import { useActionState, useState } from 'react';
import { acceptInvite } from '../actions';

const Arrow = () => (
  <span className="lp-arrow" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  </span>
);

/** Professor convidado: nome e senha para criar a conta. */
export default function ConviteForm({ token }: { token: string }) {
  const [err, action, pending] = useActionState(acceptInvite, '');
  const [show, setShow] = useState(false);
  return (
    <main className="lp-sheet">
      <span className="lp-handle" aria-hidden="true" />
      <div className="lp-head"><div>
        <h1>Criar sua conta</h1>
        <p>{token ? 'Você foi convidado para a área do professor. Escolha como quer ser chamado e uma senha.' : 'Este link de convite está incompleto. Peça um novo ao professor responsável.'}</p>
      </div></div>
      {token ? (
        <form action={action} className="lp-form">
          <input type="hidden" name="t" value={token} />
          {err && <p className="lp-err" role="alert">{err}</p>}
          <label className="lp-field">
            <span className="sr">Seu nome</span>
            <input name="name" placeholder="Seu nome" autoComplete="name" required maxLength={80} enterKeyHint="next" />
          </label>
          <label className="lp-field">
            <span className="sr">Senha</span>
            <input type={show ? 'text' : 'password'} name="password" placeholder="Senha (mín. 8 caracteres)" autoComplete="new-password" minLength={8} required enterKeyHint="next" />
            <button type="button" className="lp-eye" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{!show && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </label>
          <label className="lp-field">
            <span className="sr">Repita a senha</span>
            <input type={show ? 'text' : 'password'} name="confirm" placeholder="Repita a senha" autoComplete="new-password" minLength={8} required enterKeyHint="go" />
          </label>
          <button className="lp-main" disabled={pending}>{pending ? 'Criando…' : 'Criar conta'}<Arrow /></button>
          <a className="lp-switch" href="/privacidade">Política de privacidade</a>
        </form>
      ) : (
        <div className="lp-form"><a className="lp-main" href="/login">Ir para o login<Arrow /></a></div>
      )}
    </main>
  );
}
