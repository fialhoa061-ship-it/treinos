import Link from 'next/link';
import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { ALERTAS, imc, validade, type Alerta } from '@/lib/util';
import Icon from '../../Icon';
import { Flash, Top, initials } from '../ui';

export default async function Alunos({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const uid = await requireAdmin();
  const list = await rows(sql()`
    select s.id, s.name, s.weight_kg, s.height_m, to_char(s.plan_until, 'YYYY-MM-DD') as plan,
      (select count(*)::int from workouts w where w.student_id = s.id) as treinos,
      (select max(finished_at) from sessions se where se.student_id = s.id) as ultimo,
      -- sintomas relatados nos últimos 7 dias (retorno do aluno ao finalizar)
      (select array_agg(distinct a) from sessions se, unnest(se.alerts) a
        where se.student_id = s.id and se.finished_at > now() - interval '7 days') as alertas,
      (select max(finished_at) from sessions se where se.student_id = s.id and se.alerts is not null
        and se.finished_at > now() - interval '7 days') as alerta_em
    from students s where s.owner_id = ${uid} order by s.name`);
  const atencao = list.filter(r => r.alertas?.length).sort((a, b) => +new Date(b.alerta_em) - +new Date(a.alerta_em));
  const nomes = (l: Alerta[]) => l.map(a => ALERTAS[a] ?? a).join(', ');
  const ativos = list.filter(r => r.ultimo && Date.now() - new Date(r.ultimo).getTime() < 7 * 86400_000).length;

  return (
    <>
      <Flash m={m} />
      <Top title="Alunos" sub={list.length ? `${list.length} ${list.length === 1 ? 'aluno' : 'alunos'} · ${ativos} treinaram nos últimos 7 dias` : 'Comece cadastrando o primeiro aluno'}>
      </Top>

      {atencao.length > 0 && (
        <section className="attn" aria-labelledby="attn-t">
          <h2 id="attn-t"><Icon name="info" size={18} />Atenção: sintomas relatados nos últimos 7 dias</h2>
          {atencao.map(r => (
            <Link key={r.id} href={`/admin/alunos/${r.id}#retorno`}><b>{r.name}</b><span>{nomes(r.alertas)} · {quando(new Date(r.alerta_em))}</span></Link>
          ))}
        </section>
      )}

      {list.length ? (
        <div className="list">
          {list.map(r => {
            const bmi = imc(r.weight_kg, r.height_m);
            const info = [`${r.treinos} ${r.treinos === 1 ? 'treino' : 'treinos'}`, bmi && `IMC ${bmi}`].filter(Boolean).join(' · ');
            return (
              <Link className="item" key={r.id} href={`/admin/alunos/${r.id}`}>
                <span className="avatar">{initials(r.name)}</span>
                <span className="grow"><b>{r.name}</b><small>{info}</small>{r.alertas?.length > 0 && <span className="alert-tag" style={{ marginTop: 6 }}><Icon name="info" size={13} />{nomes(r.alertas)}</span>}
                  {(() => { const v = validade(r.plan); return v && (v.vencido || v.perto) ? <span className={v.vencido ? "alert-tag" : "tag blue"} style={{ marginTop: 6, marginLeft: 4, minHeight: 24, fontSize: ".75rem" }}><Icon name="calendar" size={13} />{v.vencido ? "Treino vencido" : v.dias === 0 ? "Trocar hoje" : `Trocar em ${v.dias}d`}</span> : null; })()}</span>
                <span className="end">{r.ultimo ? quando(new Date(r.ultimo)) : 'Sem treino'}<Icon name="right" size={18} /></span>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="panel empty">
          <span className="dot"><Icon name="users" size={28} /></span>
          <h2>Nenhum aluno ainda</h2>
          <p>Cadastre um aluno para montar os treinos e enviar o código de acesso pelo WhatsApp.</p>
          <Link className="btn primary" href="/admin/novo"><Icon name="plus" size={18} />Cadastrar aluno</Link>
        </div>
      )}
    </>
  );
}

/** "Hoje", "Ontem", "3 dias", "12/10" (horário de Brasília). */
function quando(d: Date): string {
  const dia = (x: Date) => x.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const diff = Math.round((Date.parse(dia(new Date())) - Date.parse(dia(d))) / 86400_000);
  if (diff <= 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  if (diff < 7) return `${diff} dias`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' });
}
