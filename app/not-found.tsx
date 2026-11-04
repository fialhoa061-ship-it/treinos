import Link from 'next/link';
import Icon from './Icon';

export default function NotFound() {
  return (
    <div className="app">
      <main className="screen">
        <div className="panel empty state">
          <span className="dot"><Icon name="search" size={28} /></span>
          <h1>Página não encontrada</h1>
          <p>Este endereço não existe ou foi removido. Volte ao início para continuar.</p>
          <div className="state-actions"><Link className="btn primary block" href="/">Voltar ao início</Link></div>
        </div>
      </main>
    </div>
  );
}
