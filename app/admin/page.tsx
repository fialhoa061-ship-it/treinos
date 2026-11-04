import Link from 'next/link';
import { rows, sql } from '@/lib/db';
import { imc } from '@/lib/util';
import Icon from '../Icon';
import { Flash, Top, initials } from './ui';

export default async function Alunos({ searchParams }: { searchParams: Promise<{ m?: string }> }) {
  const { m } = await searchParams;
  const list = await rows(sql()`
    select s.id, s.name, s.weight_kg, s.height_m,
      (select count(*)::int from workouts w where w.student_id = s.id) as treinos,
      (select max(finished_at) from sessions se where se.student_id = s.id) as ultimo
    from students s order by s.name`);
  const ativos = list.filter(r => r.ultimo && Date.now() - new Date(r.ultimo).getTime() < 7 * 86400_000).length;

  return (
    <>
      <Flash m={m} />
      <Top title="Alunos" sub={list.length ? `${list.length} ${list.length === 1 ? 'aluno' : 'alunos'} · ${ativos} treinaram nos últimos 7 dias` : 'Comece cadastrando o primeiro aluno'}>
      </Top>

      {list.length ? (
        <div className="list">
          {list.map(r => {
            const bmi = imc(r.weight_kg, r.height_m);
            const info = [`${r.treinos} ${r.treinos === 1 ? 'treino' : 'treinos'}`, bmi && `IMC ${bmi}`].filter(Boolean).join(' · ');
            return (
              <Link className="item" key={r.id} href={`/admin/alunos/${r.id}`}>
                <span className="avatar">{initials(r.name)}</span>
                <span className="grow"><b>{r.name}</b><small>{info}</small></span>
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
