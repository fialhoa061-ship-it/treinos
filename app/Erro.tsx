'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import Icon from './Icon';

/** Tela de erro no visual do app (usada por app/error.tsx e app/admin/error.tsx). */
export default function Erro({ error, reset, home = '/' }: { error: Error & { digest?: string }; reset: () => void; home?: string }) {
  useEffect(() => { console.error(error); }, [error]);
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;
  return (
    <main className="screen">
      <div className="panel empty state" role="alert">
        <span className="dot warn"><Icon name="info" size={28} /></span>
        <h1>{offline ? 'Sem internet' : 'Algo deu errado'}</h1>
        <p>{offline
          ? 'Não foi possível carregar esta tela sem conexão. Conecte-se e tente de novo.'
          : 'Não conseguimos carregar esta tela agora. Tente de novo; se continuar, aguarde alguns minutos.'}</p>
        <div className="state-actions">
          <button type="button" className="btn primary block" onClick={() => reset()}><Icon name="refresh" size={18} />Tentar de novo</button>
          <Link className="btn soft block" href={home}>Voltar ao início</Link>
        </div>
        {error.digest && <small className="state-code">Código do erro: {error.digest}</small>}
      </div>
    </main>
  );
}
