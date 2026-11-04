import { rows, sql } from '@/lib/db';
import Icon from '../../Icon';
import { Act, Flash, Top } from '../ui';
import { deleteLibrary, saveLibrary } from '../actions';

function LibFields({ r = {} }: { r?: { name?: string; video_url?: string | null; notes?: string | null } }) {
  return (
    <>
      <label className="field"><span>Nome</span><input name="name" required defaultValue={r.name} /></label>
      <label className="field"><span>Link do vídeo</span><input name="video_url" type="url" inputMode="url" placeholder="https://youtube.com/…" defaultValue={r.video_url ?? ''} /></label>
      <label className="field"><span>Observações padrão</span><textarea name="notes" rows={2} defaultValue={r.notes ?? ''} /></label>
    </>
  );
}

export default async function Biblioteca({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const list = await rows(sql()`select * from exercise_library order by name`);
  return (
    <>
      <Flash m={m} />
      <Top title="Biblioteca" sub={`${list.length} ${list.length === 1 ? 'exercício salvo' : 'exercícios salvos'} para usar nos treinos`} />

      <details className="add">
        <summary><Icon name="plus" size={18} />Novo exercício</summary>
        <div className="body">
          <form action={saveLibrary} className="form"><LibFields /><button className="btn primary">Adicionar à biblioteca</button></form>
        </div>
      </details>

      <div className="list">
        {list.map(r => (
          <details className="exr" key={r.id}>
            <summary>
              <span className="dot"><Icon name={r.video_url ? 'play' : 'dumbbell'} size={20} /></span>
              <span className="grow"><b>{r.name}</b><small>{r.video_url ? 'Com vídeo' : 'Sem vídeo'}{r.notes ? ' · com observações' : ''}</small></span>
              <span className="ibtn sq"><Icon name="right" size={16} /></span>
            </summary>
            <div className="body">
              <form action={saveLibrary} className="form">
                <input type="hidden" name="id" value={r.id} />
                <LibFields r={r} />
                <button className="btn primary">Salvar</button>
              </form>
              <Act action={deleteLibrary} fields={{ id: r.id }} cls="btn danger" label={<><Icon name="trash" size={18} />Excluir da biblioteca</>} confirm="Excluir da biblioteca? (os treinos já montados não mudam)" />
            </div>
          </details>
        ))}
      </div>
    </>
  );
}
