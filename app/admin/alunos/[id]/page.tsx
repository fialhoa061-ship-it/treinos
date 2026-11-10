import Link from 'next/link';
import { notFound } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ALERTAS, ESFORCO, imc, validade, type Alerta } from '@/lib/util';
import Icon from '../../../Icon';
import { Act, Flash, Top, initials } from '../../ui';
import { AccessCode, ExerciseForm } from '../../Client';
import { StudentFields } from '../../fields';
import Avaliacao, { type Av } from '../../Avaliacao';
import { applyTemplate, saveAsTemplate } from '../../acoes-modelos';
import { deleteExercise, deleteStudent, deleteWorkout, duplicateWorkout, moveExercise, moveWorkout, newAccessCode, saveExercise, savePlanUntil, saveStudent, saveWorkout } from '../../actions';

const kg = (v: unknown) => (v == null ? '—' : `${Number(v).toLocaleString('pt-BR')} kg`);
const m = (v: unknown) => (v == null ? '—' : `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} m`);

export default async function Aluno({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ m?: string }> }) {
  const { id: raw } = await params;
  const { m: msg } = await searchParams;
  const id = Number(raw);
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) notFound();
  const uid = await requireAdmin();
  const s = sql();
  const [st] = await rows(s`select * from students where id=${id} and owner_id=${uid}`);
  if (!st) notFound();

  const [workouts, exercises, others, library, [{ sessoes }], retornos, avs, [{ hoje, plan }], modelos] = await Promise.all([
    rows(s`select * from workouts where student_id=${id} order by position, id`),
    rows(s`select e.* from workout_exercises e join workouts w on w.id=e.workout_id where w.student_id=${id} order by e.position, e.id`),
    rows(s`select id, name from students where id<>${id} and owner_id=${uid} order by name`),
    rows(s`select name, video_url, notes, category from exercise_library order by category nulls last, name`),
    rows(s`select count(*)::int as sessoes from sessions where student_id=${id}`),
    // retorno do aluno nos últimos treinos (esforço, sintomas, comentário)
    rows(s`select to_char(se.finished_at at time zone 'America/Sao_Paulo', 'DD/MM') as d, w.name as w, w.focus,
      se.effort, se.alerts, se.comment
      from sessions se join workouts w on w.id = se.workout_id
      where se.student_id=${id} order by se.finished_at desc limit 8`),
    rows(s`select id, to_char(measured_on, 'YYYY-MM-DD') as d, weight_kg, body_fat, waist_cm, hip_cm, chest_cm, arm_cm, thigh_cm, notes
      from assessments where student_id=${id} order by measured_on, id`),
    rows(s`select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as hoje, to_char(plan_until, 'YYYY-MM-DD') as plan from students where id=${id}`),
    // modelos do professor e prontos (sem dono)
    rows(s`select t.id, t.name, (t.owner_id is not null) as meu, (select count(*)::int from template_workouts tw where tw.template_id = t.id) as n
      from templates t where t.owner_id = ${uid} or t.owner_id is null order by (t.owner_id is null), t.name`),
  ]);
  const val = validade(plan);
  const bmi = imc(st.weight_kg, st.height_m);

  return (
    <>
      <Flash m={msg} />
      <Top title={st.name} sub={[bmi && `IMC ${bmi}`, st.age && `${st.age} anos`].filter(Boolean).join(' · ') || 'Aluno'} back="/admin/alunos">
        <span className="avatar lg">{initials(st.name)}</span>
      </Top>

      <section className="panel">
        {st.goal ? <p>{st.goal}</p> : <p className="muted">Sem objetivo cadastrado.</p>}
        <div className="trio">
          <div><span>Peso</span><b>{kg(st.weight_kg)}</b></div>
          <div><span>Altura</span><b>{m(st.height_m)}</b></div>
          <div><span>Treinos feitos</span><b>{sessoes}</b></div>
        </div>
        <Link className="opt" href={`/admin/historico/${id}`}>
          <span>Histórico de cargas</span><span className="ibtn sq"><Icon name="right" size={16} /></span>
        </Link>
        <details>
          <summary className="opt"><span>Editar dados do aluno</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
          <form action={saveStudent} className="form" style={{ paddingTop: 4 }}>
            <input type="hidden" name="id" value={id} />
            <StudentFields st={st} />
            <button className="btn primary">Salvar alterações</button>
          </form>
        </details>
      </section>

      <Avaliacao sid={id} avs={avs as Av[]} hoje={hoje} />

      <AccessCode code={st.access_code} name={st.name}
        regenerate={<Act action={newAccessCode} fields={{ id }} cls="btn soft"
          label={<><Icon name="refresh" size={18} />{st.access_code ? 'Novo código' : 'Gerar código'}</>}
          confirm={st.access_code ? 'O código antigo deixará de funcionar e o aluno será desconectado. Continuar?' : undefined} />} />

      {retornos.length > 0 && (
        <section className="panel" id="retorno" aria-labelledby="ret-t">
          <div className="panel-h"><h2 id="ret-t">Retorno dos treinos</h2><span className="muted" style={{ fontSize: '.84rem' }}>últimos {retornos.length}</span></div>
          <div className="fbk">
            {retornos.map((r, i) => (
              <div key={i} className={r.alerts?.length ? 'fbk-row warn' : 'fbk-row'}>
                <span className="fbk-d">{r.d}</span>
                <span className="fbk-w">Treino {r.w}{r.focus ? ` · ${r.focus}` : ''}</span>
                <span className="fbk-e" title={r.effort != null ? ESFORCO[r.effort] : 'Esforço não informado'}>{r.effort != null ? <>{r.effort}<small>/10</small></> : <small>sem nota</small>}</span>
                {(r.alerts?.length > 0 || r.comment) && (
                  <span className="fbk-x">
                    {(r.alerts ?? []).map((a: Alerta) => <span key={a} className="alert-tag"><Icon name="info" size={13} />{ALERTAS[a] ?? a}</span>)}
                    {r.comment && <q>{r.comment}</q>}
                  </span>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="section-t"><h2>Treinos</h2><span>{workouts.length} {workouts.length === 1 ? 'treino' : 'treinos'}</span></div>

      <form action={savePlanUntil} className={val?.vencido ? 'panel tight plan warn' : 'panel tight plan'}>
        <input type="hidden" name="id" value={id} />
        <span className="dot"><Icon name="calendar" size={20} /></span>
        <label className="grow">
          <b>{val ? val.texto : 'Validade do treino'}</b>
          <small>{val ? 'Data planejada para trocar a ficha' : 'Defina quando trocar a ficha deste aluno'}</small>
          <input type="date" name="plan_until" defaultValue={plan ?? ''} aria-label="Data de troca do treino" />
        </label>
        <button className="btn sm">Salvar</button>
      </form>

      {workouts.map(w => {
        const exs = exercises.filter(e => e.workout_id === w.id);
        return (
          <section className="panel tight wo" key={w.id} aria-label={`Treino ${w.name}`}>
            <div className="wo-h">
              <span className="num">{w.name}</span>
              <div className="grow">
                <h3>{w.focus || `Treino ${w.name}`}</h3>
                <small>{exs.length} {exs.length === 1 ? 'exercício' : 'exercícios'} · {exs.reduce((a, x) => a + Number(x.sets), 0)} séries</small>
              </div>
              <div className="tools">
                <Act action={moveWorkout} fields={{ id: w.id, student_id: id, dir: -1 }} cls="ibtn sq" title="Mover para cima" label={<Icon name="up" size={16} />} />
                <Act action={moveWorkout} fields={{ id: w.id, student_id: id, dir: 1 }} cls="ibtn sq" title="Mover para baixo" label={<Icon name="down" size={16} />} />
              </div>
            </div>

            <div className="list">
              {exs.map((x, i) => (
                <details className="exr" key={x.id}>
                  <summary>
                    <span className="num">{i + 1}</span>
                    <span className="grow"><b>{x.name}</b><small>{x.sets} × {x.reps} · descanso {x.rest}</small></span>
                    <span className="ibtn sq"><Icon name="right" size={16} /></span>
                  </summary>
                  <div className="body">
                    <ExerciseForm action={saveExercise} workoutId={w.id} ex={x} label="Salvar exercício" />
                    <div className="actions">
                      <Act action={moveExercise} fields={{ id: x.id, workout_id: w.id, dir: -1 }} cls="btn sm" label={<><Icon name="up" size={16} />Subir</>} />
                      <Act action={moveExercise} fields={{ id: x.id, workout_id: w.id, dir: 1 }} cls="btn sm" label={<><Icon name="down" size={16} />Descer</>} />
                      <Act action={deleteExercise} fields={{ id: x.id, workout_id: w.id }} cls="btn sm danger" label={<><Icon name="trash" size={16} />Excluir</>} confirm={`Excluir “${x.name}”?`} />
                    </div>
                  </div>
                </details>
              ))}
              <details className="add">
                <summary><Icon name="plus" size={18} />Adicionar exercício</summary>
                <div className="body"><ExerciseForm action={saveExercise} workoutId={w.id} library={library as never} label="Adicionar ao treino" /></div>
              </details>
            </div>

            <details>
              <summary className="opt"><span>Editar, duplicar ou excluir treino</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
              <div className="form" style={{ paddingBottom: 6 }}>
                <form action={saveWorkout} className="form">
                  <input type="hidden" name="id" value={w.id} /><input type="hidden" name="student_id" value={id} />
                  <div className="grid2" style={{ gridTemplateColumns: '1fr 2fr' }}>
                    <label className="field"><span>Treino</span><input name="name" required maxLength={20} defaultValue={w.name} /></label>
                    <label className="field"><span>Foco</span><input name="focus" placeholder="Ex.: peito e tríceps" defaultValue={w.focus ?? ''} /></label>
                  </div>
                  <button className="btn">Salvar treino</button>
                </form>
                {others.length > 0 && (
                  <form action={duplicateWorkout} className="form">
                    <input type="hidden" name="id" value={w.id} />
                    <label className="field"><span>Duplicar para outro aluno</span>
                      <select name="to_student">{others.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select>
                    </label>
                    <button className="btn"><Icon name="copyPlus" size={18} />Duplicar treino {w.name}</button>
                  </form>
                )}
                <Act action={deleteWorkout} fields={{ id: w.id, student_id: id }} cls="btn danger" label={<><Icon name="trash" size={18} />Excluir treino {w.name}</>} confirm={`Excluir o treino ${w.name} e o histórico dele?`} />
              </div>
            </details>
          </section>
        );
      })}

      <details className="add">
        <summary><Icon name="plus" size={18} />Novo treino</summary>
        <div className="body">
          <form action={saveWorkout} className="form">
            <input type="hidden" name="student_id" value={id} />
            <div className="grid2" style={{ gridTemplateColumns: '1fr 2fr' }}>
              <label className="field"><span>Nome</span><input name="name" required maxLength={20} placeholder={String.fromCharCode(65 + Math.min(workouts.length, 25))} /></label>
              <label className="field"><span>Foco</span><input name="focus" placeholder="Ex.: pernas" /></label>
            </div>
            <button className="btn primary">Criar treino</button>
          </form>
        </div>
      </details>

      <section className="panel tight" aria-label="Modelos de ficha">
        <details>
          <summary className="opt" style={{ borderTop: 0 }}><span><Icon name="layers" size={18} /> Aplicar modelo de ficha</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
          {modelos.length ? (
            <form action={applyTemplate} className="form" style={{ paddingBottom: 6 }}>
              <input type="hidden" name="student_id" value={id} />
              <label className="field"><span>Modelo</span>
                <select name="template_id" required defaultValue="">
                  <option value="" disabled>Escolher modelo</option>
                  {modelos.some(t => t.meu) && <optgroup label="Meus modelos">{modelos.filter(t => t.meu).map(t => <option key={t.id} value={t.id}>{t.name} ({t.n} treinos)</option>)}</optgroup>}
                  <optgroup label="Modelos prontos">{modelos.filter(t => !t.meu).map(t => <option key={t.id} value={t.id}>{t.name} ({t.n} treinos)</option>)}</optgroup>
                </select>
              </label>
              <p className="muted" style={{ fontSize: '.85rem' }}>Os treinos do modelo entram depois dos que {st.name.split(' ')[0]} já tem. Depois é só ajustar cargas e exercícios.</p>
              <button className="btn primary"><Icon name="copyPlus" size={18} />Aplicar modelo</button>
            </form>
          ) : <p className="muted" style={{ padding: '4px 4px 10px' }}>Nenhum modelo disponível ainda.</p>}
        </details>
        {workouts.length > 0 && (
          <details>
            <summary className="opt"><span><Icon name="download" size={18} /> Salvar ficha como modelo</span><span className="ibtn sq"><Icon name="right" size={16} /></span></summary>
            <form action={saveAsTemplate} className="form" style={{ paddingBottom: 6 }}>
              <input type="hidden" name="student_id" value={id} />
              <label className="field"><span>Nome do modelo</span><input name="name" required maxLength={80} placeholder="Ex.: Hipertrofia iniciante A/B/C" /></label>
              <label className="field"><span>Descrição (opcional)</span><input name="description" maxLength={300} placeholder="Ex.: 3x por semana" /></label>
              <button className="btn">Salvar como modelo</button>
            </form>
          </details>
        )}
      </section>

      <section className={st.delete_requested_at ? 'panel tight pn warn' : 'panel tight pn'} id="privacidade" aria-labelledby="priv-t">
        <h2 id="priv-t"><Icon name="info" size={18} />Dados e privacidade</h2>
        {st.delete_requested_at && (
          <p className="pn-nota" style={{ color: 'var(--danger)', fontWeight: 700 }}>
            {st.name.split(' ')[0]} pediu a exclusão dos dados em {new Date(st.delete_requested_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}. Pela LGPD, exclua o cadastro abaixo (se precisar, baixe os dados antes).
          </p>
        )}
        <div className="pn-list">
          <div className="pn-row">
            <span className="dot" style={{ width: 40, height: 40 }}><Icon name={st.consent_at ? 'check' : 'clock'} size={18} /></span>
            <span className="grow">
              <b>{st.consent_at ? 'Termo aceito' : 'Termo ainda não aceito'}</b>
              <small>{st.consent_at
                ? `${new Date(st.consent_at).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })} · versão ${st.consent_version}${st.consent_guardian ? ` · autorizado por ${st.consent_guardian} (responsável)` : ''}`
                : 'O aluno aceita no primeiro acesso com o código'}</small>
            </span>
          </div>
        </div>
        <a className="opt" href={`/admin/alunos/${id}/dados`} download><span>Baixar dados do aluno (JSON)</span><span className="ibtn sq"><Icon name="download" size={16} /></span></a>
      </section>

      <Act action={deleteStudent} fields={{ id }} cls="btn danger block" label={<><Icon name="trash" size={18} />Excluir aluno e todos os dados</>} confirm={`Excluir ${st.name} e todo o histórico? Isso não pode ser desfeito.`} />
    </>
  );
}
