'use client';

import { useActionState, useState } from 'react';
import { login, studentLogin } from './actions';

type View = 'start' | 'aluno' | 'prof';

const Arrow = () => (
  <span className="lp-arrow" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  </span>
);

export default function LoginForm() {
  const [view, setView] = useState<View>('start');
  const [showPw, setShowPw] = useState(false);
  const [err, action, pending] = useActionState(login, '');
  const [codeErr, codeAction, codePending] = useActionState(studentLogin, '');

  const head = {
    start: ['Seu treino começa aqui', 'O treino montado pelo seu professor, com séries, cargas e descanso, direto no celular.'],
    aluno: ['Acesso do aluno', 'Digite o código de 6 números que o seu professor passou.'],
    prof: ['Área do professor', 'Entre com seu e-mail e senha.'],
  }[view];

  return (
    <main className="lp-sheet" data-view={view}>
      <span className="lp-handle" aria-hidden="true" />
      <div className="lp-head">
        {view !== 'start' && (
          <button type="button" className="lp-back" aria-label="Voltar" onClick={() => setView('start')}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7" /></svg>
          </button>
        )}
        <div>
          <h1>{head[0]}</h1>
          <p>{head[1]}</p>
        </div>
      </div>

      {view === 'start' && (
        <div className="lp-choice" key="start">
          <button type="button" className="lp-main" onClick={() => setView('aluno')}>Sou aluno<Arrow /></button>
          <button type="button" className="lp-ghost" onClick={() => setView('prof')}>ou Professor</button>
        </div>
      )}

      {view === 'aluno' && (
        <form action={codeAction} className="lp-form" key="aluno">
          {codeErr && <p className="lp-err" role="alert">{codeErr}</p>}
          <label className="lp-field">
            <span className="sr">Código de acesso</span>
            <input name="code" className="lp-code" placeholder="000000" inputMode="numeric" pattern="[0-9]{6}" maxLength={6}
              autoComplete="one-time-code" required autoFocus />
          </label>
          <button className="lp-main" disabled={codePending}>{codePending ? 'Entrando…' : 'Entrar'}<Arrow /></button>
          <button type="button" className="lp-switch" onClick={() => setView('prof')}>Sou professor</button>
        </form>
      )}

      {view === 'prof' && (
        <form action={action} className="lp-form" key="prof">
          {err && <p className="lp-err" role="alert">{err}</p>}
          <label className="lp-field">
            <span className="sr">E-mail</span>
            <input type="email" name="email" placeholder="E-mail" autoComplete="username" required autoFocus />
          </label>
          <label className="lp-field">
            <span className="sr">Senha</span>
            <input type={showPw ? 'text' : 'password'} name="password" placeholder="Senha" autoComplete="current-password" required />
            <button type="button" className="lp-eye" aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPw(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{!showPw && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </label>
          <button className="lp-main" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}<Arrow /></button>
          <button type="button" className="lp-switch" onClick={() => setView('aluno')}>Sou aluno</button>
        </form>
      )}
    </main>
  );
}
