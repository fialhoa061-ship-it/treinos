import { rows, sql } from '@/lib/db';
import Link from 'next/link';
import Icon from '../../Icon';
import { Act, Flash, Top } from '../ui';
import { deleteLibrary, saveLibrary } from '../actions';
import { LibrarySearch } from '../Client';

type R = { id?: number; name?: string; video_url?: string | null; notes?: string | null; category?: string | null };

function LibFields({ r = {}, cats }: { r?: R; cats: string[] }) {
  return (
    <>
      <label className="field"><span>Nome</span><input name="name" required defaultValue={r.name} /></label>
      <label className="field"><span>Categoria</span>
        <input name="category" list="lib-cats" placeholder="Ex.: Idosos, Peito, Cardio…" defaultValue={r.category ?? ''} autoComplete="off" />
      </label>
      <label className="field"><span>Link do vídeo</span><input name="video_url" type="url" inputMode="url" placeholder="https://youtube.com/…" defaultValue={r.video_url ?? ''} /></label>
      <label className="field"><span>Observações padrão</span><textarea name="notes" rows={3} defaultValue={r.notes ?? ''} /></label>
      {cats.length > 0 && <datalist id="lib-cats">{cats.map(c => <option key={c} value={c} />)}</datalist>}
    </>
  );
}

export default async function Biblioteca({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const list = await rows(sql()`select * from exercise_library order by category nulls last, name`) as R[];
  const groups = new Map<string, R[]>();
  for (const r of list) { const k = r.category || 'Sem categoria'; (groups.get(k) ?? groups.set(k, []).get(k)!).push(r); }
  const cats = [...groups.keys()].filter(c => c !== 'Sem categoria');

  return (
    <>
      <Flash m={m} />
      <Top title="Biblioteca" sub={`${list.length} exercícios em ${groups.size} ${groups.size === 1 ? 'categoria' : 'categorias'}`} />

      <Link className="item" href="/admin/modelos">
        <span className="dot"><Icon name="layers" size={20} /></span>
        <span className="grow"><b>Modelos de ficha</b><small>Fichas prontas para aplicar a um aluno com um toque</small></span>
        <span className="end"><Icon name="right" size={18} /></span>
      </Link>

      <details className="add">
        <summary><Icon name="plus" size={18} />Novo exercício</summary>
        <div className="body">
          <form action={saveLibrary} className="form"><LibFields cats={cats} /><button className="btn primary">Adicionar à biblioteca</button></form>
        </div>
      </details>

      <LibrarySearch cats={[...groups].map(([c, l]) => [c, l.length] as [string, number])}>
        {[...groups].map(([cat, items]) => (
          <section className="lib-group" key={cat} data-cat={cat}>
            <div className="section-t"><h2>{cat}</h2><span>{items.length}</span></div>
            <div className="list">
              {items.map(r => (
                <details className="exr" key={r.id} data-name={`${r.name} ${cat}`}>
                  <summary>
                    <span className="dot"><Icon name={r.video_url ? 'play' : 'dumbbell'} size={20} /></span>
                    <span className="grow"><b>{r.name}</b><small>{r.video_url ? (/youtube\.com\/results/.test(r.video_url) ? 'Vídeos no YouTube' : 'Com vídeo') : 'Sem vídeo'}{r.notes ? ' · com observações' : ''}</small></span>
                    <span className="ibtn sq"><Icon name="right" size={16} /></span>
                  </summary>
                  <div className="body">
                    <form action={saveLibrary} className="form">
                      <input type="hidden" name="id" value={r.id} />
                      <LibFields r={r} cats={cats} />
                      <button className="btn primary">Salvar</button>
                    </form>
                    {r.video_url && <a className="btn soft" href={r.video_url} target="_blank" rel="noopener"><Icon name="play" size={18} />Abrir vídeo</a>}
                    <Act action={deleteLibrary} fields={{ id: r.id! }} cls="btn danger" label={<><Icon name="trash" size={18} />Excluir da biblioteca</>} confirm="Excluir da biblioteca? (os treinos já montados não mudam)" />
                  </div>
                </details>
              ))}
            </div>
          </section>
        ))}
      </LibrarySearch>
    </>
  );
}
