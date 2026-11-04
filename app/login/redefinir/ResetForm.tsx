'use client';

import { useActionState, useState } from 'react';
import { resetPassword } from '../actions';

const Arrow = () => (
  <span className="lp-arrow" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  </span>
);

/** Criar a senha nova a partir do link do e-mail. */
export default function ResetForm({ token }: { token: string }) {
  const [err, action, pending] = useActionState(resetPassword, '');
  const [show, setShow] = useState(false);
  return (
    <main className="lp-sheet">
      <span className="lp-handle" aria-hidden="true" />
      <div className="lp-head"><div>
        <h1>Criar nova senha</h1>
        <p>{token ? 'Escolha uma senha com pelo menos 8 caracteres.' : 'Este link está incompleto. Peça um novo em "Esqueci minha senha".'}</p>
      </div></div>
      {token ? (
        <form action={action} className="lp-form">
          <input type="hidden" name="t" value={token} />
          {err && <p className="lp-err" role="alert">{err}</p>}
          <label className="lp-field">
            <span className="sr">Nova senha</span>
            <input type={show ? 'text' : 'password'} name="password" placeholder="Nova senha" autoComplete="new-password" minLength={8} required enterKeyHint="next" />
            <button type="button" className="lp-eye" aria-label={show ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShow(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{!show && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </label>
          <label className="lp-field">
            <span className="sr">Repita a nova senha</span>
            <input type={show ? 'text' : 'password'} name="confirm" placeholder="Repita a nova senha" autoComplete="new-password" minLength={8} required enterKeyHint="go" />
          </label>
          <button className="lp-main" disabled={pending}>{pending ? 'Salvando…' : 'Salvar senha'}<Arrow /></button>
          <a className="lp-switch" href="/login">Voltar ao login</a>
        </form>
      ) : (
        <div className="lp-form"><a className="lp-main" href="/login">Ir para o login<Arrow /></a></div>
      )}
    </main>
  );
}
