// carregando (professor): esqueleto no formato das telas, dentro do layout (barra de abas visível)
export default function Loading() {
  return (
    <div className="skel" role="status" aria-label="Carregando">
      <div className="sk sk-title" />
      <div className="sk sk-sub" />
      {[0, 1, 2, 3].map(i => <div key={i} className="sk sk-row" />)}
    </div>
  );
}
