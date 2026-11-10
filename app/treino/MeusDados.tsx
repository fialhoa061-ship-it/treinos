'use client';

import Icon from '../Icon';
import { requestDeletion } from './actions';

/** LGPD para o aluno: baixar os próprios dados, ler a política e pedir a exclusão. */
export default function MeusDados({ exclusaoPedida }: { exclusaoPedida: boolean }) {
  return (
    <details className="panel cal" id="meus-dados" open={exclusaoPedida || undefined}>
      <summary>
        <span className="dot"><Icon name="info" size={22} /></span>
        <span className="grow"><b>Meus dados e privacidade</b><small>Baixar seus dados, política e exclusão</small></span>
        <span className="ibtn sq"><Icon name="right" size={16} /></span>
      </summary>
      <a className="opt" href="/treino/dados" download><span>Baixar meus dados</span><span className="ibtn sq"><Icon name="download" size={16} /></span></a>
      <a className="opt" href="/privacidade"><span>Política de privacidade</span><span className="ibtn sq"><Icon name="right" size={16} /></span></a>
      {exclusaoPedida ? (
        <p className="up" style={{ marginTop: 12 }} role="status"><Icon name="check" size={18} />Pedido de exclusão enviado. Seu professor vai apagar o seu cadastro e todos os seus dados.</p>
      ) : (
        <form action={requestDeletion} onSubmit={e => { if (!confirm('Pedir para apagar todos os seus dados? Seu professor vai excluir o seu cadastro e você perderá o acesso ao treino.')) e.preventDefault(); }}>
          <button className="btn danger block" style={{ marginTop: 12 }}><Icon name="trash" size={18} />Pedir exclusão dos meus dados</button>
        </form>
      )}
    </details>
  );
}
