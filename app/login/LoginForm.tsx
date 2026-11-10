'use client';

import { useActionState, useState } from 'react';
import { login, requestReset, studentLogin } from './actions';

type View = 'start' | 'aluno' | 'prof' | 'forgot';

const Arrow = () => (
  <span className="lp-arrow" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
  </span>
);

export default function LoginForm({ aviso }: { aviso?: string }) {
  const [view, setView] = useState<View>('start');
  const [showPw, setShowPw] = useState(false);
  const [err, action, pending] = useActionState(login, '');
  const [codeErr, codeAction, codePending] = useActionState(studentLogin, '');
  const [resetMsg, resetAction, resetPending] = useActionState(requestReset, '');
  const resetOk = resetMsg.startsWith('ok:');
  // foco automático só com mouse (computador): no celular abriria o teclado e cobriria o formulário
  const auto = typeof window !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches;
  const [code, setCode] = useState('');

  const head = {
    start: ['Seu treino começa aqui', 'O treino montado pelo seu professor, com séries, cargas e descanso, direto no celular.'],
    aluno: ['Acesso do aluno', 'Digite o código de 6 números que o seu professor passou.'],
    prof: ['Área do professor', 'Entre com seu e-mail e senha.'],
    forgot: ['Esqueci minha senha', 'Digite o e-mail do professor. Enviamos um link para criar uma senha nova.'],
  }[view];

  return (
    <main className="lp-sheet" data-view={view}>
      <span className="lp-handle" aria-hidden="true" />
      {aviso && view === 'start' && <p className="lp-ok" role="status" style={{ marginBottom: 16 }}>{aviso}</p>}
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
      {view === 'start' && <a className="lp-switch lp-priv" href="/privacidade">Privacidade</a>}

      {view === 'aluno' && (
        <form action={codeAction} className="lp-form" key="aluno">
          {codeErr && <p className="lp-err" role="alert">{codeErr}</p>}
          {/* um campo real (invisível) sobre 6 caixas: teclado numérico, colar e preenchimento por SMS continuam funcionando */}
          <label className="lp-otp">
            <span className="sr">Código de acesso de 6 números</span>
            <input name="code" value={code} onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required autoFocus={auto} enterKeyHint="go" />
            <span className="lp-otp-boxes" aria-hidden="true">
              {Array.from({ length: 6 }, (_, i) => (
                <i key={i} className={i === Math.min(code.length, 5) ? 'cur' : code[i] ? 'on' : ''}>{code[i] ?? ''}</i>
              ))}
            </span>
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
            <input type="email" name="email" placeholder="E-mail" autoComplete="username" required autoFocus={auto} enterKeyHint="next" />
          </label>
          <label className="lp-field">
            <span className="sr">Senha</span>
            <input type={showPw ? 'text' : 'password'} name="password" placeholder="Senha" autoComplete="current-password" required enterKeyHint="go" />
            <button type="button" className="lp-eye" aria-label={showPw ? 'Ocultar senha' : 'Mostrar senha'} onClick={() => setShowPw(v => !v)}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" />{!showPw && <path d="M4 4l16 16" />}
              </svg>
            </button>
          </label>
          <button className="lp-main" disabled={pending}>{pending ? 'Entrando…' : 'Entrar'}<Arrow /></button>
          <div className="lp-links">
            <button type="button" className="lp-switch" onClick={() => setView('forgot')}>Esqueci minha senha</button>
            <button type="button" className="lp-switch" onClick={() => setView('aluno')}>Sou aluno</button>
          </div>
        </form>
      )}

      {view === 'forgot' && (
        resetOk ? (
          <div className="lp-form" key="forgot-ok">
            <p className="lp-ok" role="status">{resetMsg.slice(3)}</p>
            <button type="button" className="lp-main" onClick={() => setView('prof')}>Voltar ao login<Arrow /></button>
          </div>
        ) : (
          <form action={resetAction} className="lp-form" key="forgot">
            {resetMsg && <p className="lp-err" role="alert">{resetMsg}</p>}
            <label className="lp-field">
              <span className="sr">E-mail do professor</span>
              <input type="email" name="email" placeholder="E-mail" autoComplete="username" required autoFocus={auto} enterKeyHint="send" />
            </label>
            <button className="lp-main" disabled={resetPending}>{resetPending ? 'Enviando…' : 'Enviar link'}<Arrow /></button>
            <button type="button" className="lp-switch" onClick={() => setView('prof')}>Voltar ao login</button>
          </form>
        )
      )}
    </main>
  );
}
