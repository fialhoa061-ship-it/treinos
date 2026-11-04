'use client';

import Erro from '../Erro';

// dentro do layout do professor: a barra de abas continua disponível
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <Erro error={error} reset={reset} home="/admin" />;
}
