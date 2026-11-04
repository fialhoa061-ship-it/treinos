'use client';

import Erro from './Erro';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div className="app"><Erro error={error} reset={reset} /></div>;
}
