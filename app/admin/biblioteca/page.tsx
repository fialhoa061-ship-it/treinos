import { rows, sql } from '@/lib/db';
import { Act } from '../ui';
import { deleteLibrary, saveLibrary } from '../actions';

export default async function Biblioteca({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const list = await rows(sql()`select * from exercise_library order by name`);
  return (
    <>
      {m && <p className="flash">{m}</p>}
      <h1>Biblioteca de exercícios</h1>
      <form action={saveLibrary} className="card">
        <div className="row">
          <label>Nome <input name="name" required /></label>
          <label>URL do vídeo <input name="video_url" /></label>
        </div>
        <label>Observações padrão <textarea name="notes" rows={2} /></label>
        <button>Adicionar</button>
      </form>
      {list.map(r => (
        <details className="card" key={r.id}>
          <summary>{r.name}</summary>
          <form action={saveLibrary}>
            <input type="hidden" name="id" value={r.id} />
            <div className="row">
              <label>Nome <input name="name" required defaultValue={r.name} /></label>
              <label>URL do vídeo <input name="video_url" defaultValue={r.video_url ?? ''} /></label>
            </div>
            <label>Observações padrão <textarea name="notes" rows={2} defaultValue={r.notes ?? ''} /></label>
            <button>Salvar</button>
          </form>
          <Act action={deleteLibrary} fields={{ id: r.id }} label="Excluir" cls="danger" confirm="Excluir da biblioteca? (treinos existentes não mudam)" />
        </details>
      ))}
    </>
  );
}
