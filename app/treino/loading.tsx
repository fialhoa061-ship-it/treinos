// carregando (aluno): esqueleto no formato da tela do treino
export default function Loading() {
  return (
    <div className="app">
      <main className="screen skel" role="status" aria-label="Carregando seu treino">
        <div className="sk-head"><div className="sk sk-avatar" /><div><div className="sk sk-title" /><div className="sk sk-sub" /></div></div>
        <div className="sk sk-card" />
        <div className="sk-chips"><div className="sk sk-chip" /><div className="sk sk-chip" /><div className="sk sk-chip" /></div>
        <div className="sk sk-card tall" />
        <div className="sk sk-card tall" />
      </main>
    </div>
  );
}
