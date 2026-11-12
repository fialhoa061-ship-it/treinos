import { rows, sql } from './db';
import type { IconName } from '@/app/Icon';

/** Metas, desafios, sequência e conquistas de um aluno. Tudo é calculado na hora a partir dos treinos, da dieta e das avaliações. */

export const KINDS = {
  weight: { titulo: 'Peso alvo', unidade: 'kg', meta: true },
  sessions_week: { titulo: 'Treinos por semana', unidade: 'treinos', meta: true },
  sessions: { titulo: 'Treinos no período', unidade: 'treinos', meta: false },
  diet_days: { titulo: 'Dias com a dieta completa', unidade: 'dias', meta: false },
} as const;
export type Kind = keyof typeof KINDS;

export type Meta = {
  id: number; kind: Kind; title: string; target: number; atual: number; pct: number; feita: boolean;
  fim: string | null; dias: number | null; vencida: boolean; detalhe: string;
};
export type Conquista = { id: string; titulo: string; texto: string; icon: IconName; ok: boolean };
export type Jogo = {
  hoje: string; streak: number; melhorSequencia: number; alvoSemana: number; treinos: number; semana: number;
  dietaCompletos: number; refeicoesHoje: number; refeicoes: number; metas: Meta[]; desafios: Meta[]; conquistas: Conquista[];
};

const dia = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** Segunda-feira da semana de uma data 'YYYY-MM-DD'. */
const segunda = (d: string) => { const t = Date.parse(d + 'T00:00:00Z'); return dia(t - ((new Date(t).getUTCDay() + 6) % 7) * 86400_000); };
const addDias = (d: string, n: number) => dia(Date.parse(d + 'T00:00:00Z') + n * 86400_000);
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const br = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

export async function jogo(sid: number): Promise<Jogo> {
  const s = sql();
  const [[{ hoje }], sess, [aluno], aval, metas, cargas, refeicoes, checks] = await Promise.all([
    rows(s`select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as hoje`),
    rows(s`select to_char(finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as d from sessions where student_id = ${sid}`),
    rows(s`select weight_kg::float as w from students where id = ${sid}`),
    rows(s`select weight_kg::float as w from assessments where student_id = ${sid} and weight_kg is not null order by measured_on desc, id desc limit 1`),
    rows(s`select id, kind, title, target::float as target, start_value::float as start, to_char(starts_on, 'YYYY-MM-DD') as ini, to_char(ends_on, 'YYYY-MM-DD') as fim
      from goals where student_id = ${sid} order by created_at, id`),
    // maior carga de cada exercício por treino: serve para a conquista "Mais forte"
    rows(s`with d as (
        select e.name as ex, se.finished_at, max(sl.weight_kg)::float as w
        from set_logs sl join sessions se on se.id = sl.session_id join workout_exercises e on e.id = sl.workout_exercise_id
        where se.student_id = ${sid} and sl.weight_kg > 0 group by e.name, se.id, se.finished_at)
      select (array_agg(w order by finished_at))[1] as primeiro, max(w) as melhor from d group by ex`),
    rows(s`select count(*)::int as n from diet_meals where student_id = ${sid}`),
    rows(s`select to_char(day, 'YYYY-MM-DD') as d, count(*)::int as n from diet_checks where student_id = ${sid} group by day`),
  ]);

  // ---- treinos por semana e sequência ----
  const porSemana = new Map<string, number>();
  for (const r of sess) { const w = segunda(r.d); porSemana.set(w, (porSemana.get(w) ?? 0) + 1); }
  const semanaAtual = segunda(hoje);
  const alvoSemana = Math.max(1, Math.round(metas.find(m => m.kind === 'sessions_week')?.target ?? 3));
  const bateu = (w: string) => (porSemana.get(w) ?? 0) >= alvoSemana;
  // sequência: semanas seguidas batendo o alvo. A semana em andamento só conta quando já bateu (não quebra antes de acabar).
  let streak = 0;
  for (let w = bateu(semanaAtual) ? semanaAtual : addDias(semanaAtual, -7); bateu(w); w = addDias(w, -7)) streak++;
  let melhor = 0, atual = 0, prev = '';
  for (const w of [...porSemana.keys()].sort()) {
    atual = bateu(w) ? (prev && addDias(prev, 7) === w ? atual + 1 : 1) : 0;
    if (bateu(w)) prev = w; else prev = '';
    melhor = Math.max(melhor, atual);
  }

  // ---- dieta ----
  const refeicoesN: number = refeicoes[0].n;
  const completos = new Set(refeicoesN ? checks.filter(c => c.n >= refeicoesN).map(c => c.d as string) : []);
  const refeicoesHoje: number = checks.find(c => c.d === hoje)?.n ?? 0;

  // ---- metas e desafios ----
  const peso: number | null = aval[0]?.w ?? aluno?.w ?? null;
  const calc = (g: typeof metas[number]): Meta => {
    const kind = g.kind as Kind;
    let valor = 0, pct = 0, detalhe = '';
    if (kind === 'weight') {
      const ini = g.start ?? peso ?? g.target;
      valor = peso ?? ini;
      pct = ini === g.target ? (valor === g.target ? 1 : 0) : clamp((ini - valor) / (ini - g.target));
      detalhe = `${br(valor)} kg agora · meta ${br(g.target)} kg`;
    } else {
      valor = kind === 'sessions_week' ? porSemana.get(semanaAtual) ?? 0
        : kind === 'sessions' ? sess.filter(r => r.d >= g.ini && (!g.fim || r.d <= g.fim)).length
        : [...completos].filter(d => d >= g.ini && (!g.fim || d <= g.fim)).length;
      pct = clamp(valor / g.target);
      detalhe = `${br(valor)} de ${br(g.target)} ${KINDS[kind].unidade}${kind === 'sessions_week' ? ' nesta semana' : ''}`;
    }
    const dias = g.fim ? Math.round((Date.parse(g.fim) - Date.parse(hoje)) / 86400_000) : null;
    return { id: g.id, kind, title: g.title, target: g.target, atual: valor, pct, feita: pct >= 1, fim: g.fim, dias, vencida: dias !== null && dias < 0 && pct < 1, detalhe };
  };
  const todas = metas.map(calc);

  // ---- conquistas ----
  const total = sess.length;
  const forte = cargas.some(c => c.primeiro > 0 && c.melhor >= c.primeiro * 1.1);
  const semanaCheia = [...porSemana.keys()].some(bateu);
  const c = (id: string, titulo: string, texto: string, icon: IconName, ok: boolean): Conquista => ({ id, titulo, texto, icon, ok });

  return {
    hoje, streak, melhorSequencia: melhor, alvoSemana, treinos: total, semana: porSemana.get(semanaAtual) ?? 0,
    dietaCompletos: completos.size, refeicoesHoje, refeicoes: refeicoesN,
    metas: todas.filter(m => KINDS[m.kind].meta), desafios: todas.filter(m => !KINDS[m.kind].meta),
    conquistas: [
      c('t1', 'Primeiro treino', 'Finalizou o primeiro treino', 'dumbbell', total >= 1),
      c('t10', '10 treinos', 'Dez treinos finalizados', 'dumbbell', total >= 10),
      c('t25', '25 treinos', 'Vinte e cinco treinos finalizados', 'dumbbell', total >= 25),
      c('t50', '50 treinos', 'Cinquenta treinos finalizados', 'trophy', total >= 50),
      c('t100', '100 treinos', 'Cem treinos finalizados', 'trophy', total >= 100),
      c('semana', 'Semana completa', `Bateu ${alvoSemana} treinos em uma semana`, 'calendar', semanaCheia),
      c('seq4', 'Constância', '4 semanas seguidas batendo o alvo', 'flame', melhor >= 4),
      c('forte', 'Mais forte', '+10% de carga em um exercício', 'chart', forte),
      c('dieta1', 'Dia em dia', 'Marcou todas as refeições de um dia', 'utensils', completos.size >= 1),
      c('dieta7', 'Dieta na linha', '7 dias com a dieta completa', 'utensils', completos.size >= 7),
    ],
  };
}
