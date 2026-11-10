'use client';

import { useActionState, useState } from 'react';
import Icon from '../Icon';
import { acceptConsent } from './actions';
import { studentLogout } from '../login/actions';

/** Termo de consentimento (LGPD) no primeiro acesso. Menor de 18 anos: o responsável autoriza. */
export default function Termo({ nome, menor: menorConhecido, idadeConhecida }: { nome: string; menor: boolean; idadeConhecida: boolean }) {
  const [err, action, pending] = useActionState(acceptConsent, '');
  const [menor, setMenor] = useState(menorConhecido);
  const first = nome.trim().split(/\s+/)[0] || nome;
  return (
    <main className="screen termo">
      <header className="top">
        <span className="dot"><Icon name="info" size={22} /></span>
        <div className="grow"><h1>Antes de começar, {first}</h1><p>Seus dados e como eles são usados</p></div>
      </header>

      <section className="panel">
        <ul className="termo-list">
          <li><b>O que o app guarda:</b> seu cadastro (nome, idade, peso, altura, objetivo), seus treinos e cargas, o esforço e os sintomas que você informar ao finalizar, e as avaliações físicas.</li>
          <li><b>Para quê:</b> só para o seu professor montar e acompanhar o seu treino com segurança.</li>
          <li><b>Quem vê:</b> somente o seu professor. Nada é vendido nem usado para propaganda.</li>
          <li><b>Seus direitos:</b> baixar seus dados ou pedir a exclusão a qualquer momento, em “Meus dados e privacidade”.</li>
        </ul>
        <a className="opt" href="/privacidade" target="_blank" rel="noopener">
          <span>Ler a política de privacidade completa</span><span className="ibtn sq"><Icon name="right" size={16} /></span>
        </a>
      </section>

      <form action={action} className="panel form">
        {err && <p className="fb-warn termo-err" role="alert"><Icon name="info" size={16} />{err}</p>}

        {!idadeConhecida && (
          <label className="check">
            <input type="checkbox" name="menor" value="1" checked={menor} onChange={e => setMenor(e.target.checked)} />
            <span>Tenho menos de 18 anos</span>
          </label>
        )}
        {idadeConhecida && menor && <input type="hidden" name="menor" value="1" />}

        {menor && (
          <fieldset className="group termo-resp">
            <legend>Autorização do responsável</legend>
            <p className="muted">Como você tem menos de 18 anos, um dos pais ou o responsável legal precisa autorizar. Peça para ele preencher abaixo.</p>
            <label className="field"><span>Nome completo do responsável</span><input name="responsavel" required minLength={3} maxLength={120} autoComplete="off" /></label>
            <label className="check">
              <input type="checkbox" name="aceite_resp" value="1" required />
              <span>Sou o pai, a mãe ou o responsável legal e autorizo o uso dos dados descritos acima para o treino.</span>
            </label>
          </fieldset>
        )}

        <label className="check">
          <input type="checkbox" name="aceite" value="1" required />
          <span>Li e concordo com o uso dos meus dados para o acompanhamento do meu treino, incluindo dados de saúde (peso, medidas e sintomas).</span>
        </label>

        <button className="btn primary block" disabled={pending}>{pending ? 'Salvando…' : <><Icon name="check" size={20} />Concordo e quero começar</>}</button>
      </form>

      <form action={studentLogout} style={{ display: 'flex', justifyContent: 'center' }}>
        <button className="link">Não concordo, sair</button>
      </form>
    </main>
  );
}
