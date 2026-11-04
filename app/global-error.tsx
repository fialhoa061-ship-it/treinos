'use client';

// último recurso: erro no próprio layout raiz (sem CSS do app garantido)
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="pt-BR">
      <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#111214', color: '#f5f6f8', fontFamily: 'system-ui, sans-serif', padding: 24 }}>
        <main style={{ maxWidth: 360, textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.5rem', margin: '0 0 8px' }}>Algo deu errado</h1>
          <p style={{ color: '#a4a6b0', margin: '0 0 24px' }}>Não conseguimos abrir o app agora. Tente de novo.</p>
          <button onClick={() => reset()} style={{ width: '100%', height: 56, border: 0, borderRadius: 999, background: '#2f6bff', color: '#fff', font: 'inherit', fontWeight: 700, cursor: 'pointer' }}>Tentar de novo</button>
        </main>
      </body>
    </html>
  );
}
