import { rows, sql } from './db';
import type { IconName } from '@/app/Icon';

/** Metas, desafios, sequência, nível e conquistas de um aluno. Tudo é calculado na hora a partir dos treinos, da dieta, da água e das avaliações. */

export const KINDS = {
  weight: { titulo: 'Peso alvo', unidade: 'kg', meta: true },
  sessions_week: { titulo: 'Treinos por semana', unidade: 'treinos', meta: true },
  sessions: { titulo: 'Treinos no período', unidade: 'treinos', meta: false },
  diet_days: { titulo: 'Dias com a dieta completa', unidade: 'dias', meta: false },
  water_days: { titulo: 'Dias batendo a meta de água', unidade: 'dias', meta: false },
} as const;
export type Kind = keyof typeof KINDS;
/** Tipos que o próprio aluno pode usar nas metas pessoais (sempre com prazo). */
export const KINDS_ALUNO = ['sessions', 'diet_days', 'water_days'] as const satisfies readonly Kind[];

// pontos de experiência: o aluno vê essa tabela em "Como ganhar XP"
export const XP = { treino: 20, refeicao: 3, dietaDia: 10, agua: 5, desafio: 50, conquista: 25 } as const;
const NIVEIS: [number, string][] = [[1, 'Iniciante'], [2, 'Aquecendo'], [3, 'Em ritmo'], [5, 'Dedicado'], [8, 'Atleta'], [12, 'Elite'], [20, 'Lenda']];

export type Meta = {
  id: number; kind: Kind; title: string; target: number; atual: number; pct: number; feita: boolean; pessoal: boolean;
  fim: string | null; dias: number | null; vencida: boolean; detalhe: string;
};
export type Conquista = { id: string; titulo: string; texto: string; icon: IconName; ok: boolean; atual: number; alvo: number };
export type Dia = { d: string; letra: string; hoje: boolean; futuro: boolean; treino: boolean; dieta: number | null; agua: boolean };
export type Nivel = { n: number; nome: string; xp: number; noNivel: number; proximo: number; pct: number };
export type Desafio = { titulo: string; texto: string; icon: IconName; atual: number; alvo: number; pct: number; feito: boolean; diasRestantes: number };
export type Recorde = { ex: string; melhor: number; primeiro: number; quando: string };
export type Jogo = {
  hoje: string; streak: number; melhorSequencia: number; alvoSemana: number; treinos: number; semana: number;
  dietaCompletos: number; refeicoesHoje: number; refeicoes: number; refeicoesFeitas: number;
  aguaHoje: number; aguaMeta: number; aguaDias: number;
  nivel: Nivel; semanaDias: Dia[]; desafio: Desafio; desafiosFeitos: number; recordes: Recorde[];
  metas: Meta[]; desafios: Meta[]; pessoais: Meta[]; conquistas: Conquista[];
};

const dia = (ms: number) => new Date(ms).toISOString().slice(0, 10);
/** Segunda-feira da semana de uma data 'YYYY-MM-DD'. */
const segunda = (d: string) => { const t = Date.parse(d + 'T00:00:00Z'); return dia(t - ((new Date(t).getUTCDay() + 6) % 7) * 86400_000); };
const addDias = (d: string, n: number) => dia(Date.parse(d + 'T00:00:00Z') + n * 86400_000);
const diasDaSemana = (w: string) => Array.from({ length: 7 }, (_, i) => addDias(w, i));
const clamp = (x: number) => Math.min(1, Math.max(0, x));
const br = (n: number) => n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });

/** Nível a partir do XP: cada nível pede 50 XP a mais que o anterior (100, 150, 200…). */
function nivelDe(xp: number): Nivel {
  let n = 1, base = 0, custo = 100;
  while (xp >= base + custo) { base += custo; n++; custo = 100 + 50 * (n - 1); }
  const nome = NIVEIS.filter(([min]) => n >= min).at(-1)![1];
  return { n, nome, xp, noNivel: xp - base, proximo: custo, pct: (xp - base) / custo };
}

export async function jogo(sid: number): Promise<Jogo> {
  const s = sql();
  const [[{ hoje }], sess, [aluno], aval, metas, cargas, refeicoes, checks, agua] = await Promise.all([
    rows(s`select to_char(now() at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as hoje`),
    rows(s`select to_char(finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') as d from sessions where student_id = ${sid}`),
    rows(s`select weight_kg::float as w, water_cups as agua from students where id = ${sid}`),
    rows(s`select weight_kg::float as w from assessments where student_id = ${sid} and weight_kg is not null order by measured_on desc, id desc limit 1`),
    rows(s`select id, kind, title, target::float as target, start_value::float as start, by_student,
        to_char(starts_on, 'YYYY-MM-DD') as ini, to_char(ends_on, 'YYYY-MM-DD') as fim
      from goals where student_id = ${sid} order by created_at, id`),
    // maior carga de cada exercício por treino: primeira, melhor e o dia da melhor (recordes e conquistas de força)
    rows(s`with d as (
        select e.name as ex, se.finished_at, max(sl.weight_kg)::float as w
        from set_logs sl join sessions se on se.id = sl.session_id join workout_exercises e on e.id = sl.workout_exercise_id
        where se.student_id = ${sid} and sl.weight_kg > 0 group by e.name, se.id, se.finished_at)
      select ex, (array_agg(w order by finished_at))[1] as primeiro, max(w) as melhor,
        (array_agg(to_char(finished_at at time zone 'America/Sao_Paulo', 'YYYY-MM-DD') order by w desc, finished_at))[1] as quando
      from d group by ex`),
    rows(s`select count(*)::int as n from diet_meals where student_id = ${sid}`),
    rows(s`select to_char(day, 'YYYY-MM-DD') as d, count(*)::int as n from diet_checks where student_id = ${sid} group by day`),
    rows(s`select to_char(day, 'YYYY-MM-DD') as d, cups from water_logs where student_id = ${sid}`),
  ]);

  // ---- treinos por semana e sequência ----
  const diasTreino = new Set<string>(sess.map(r => r.d));
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

  // ---- dieta e água ----
  const refeicoesN: number = refeicoes[0].n;
  const porDia = new Map<string, number>(checks.map(c => [c.d as string, c.n as number]));
  const completos = new Set(refeicoesN ? checks.filter(c => c.n >= refeicoesN).map(c => c.d as string) : []);
  const refeicoesHoje = porDia.get(hoje) ?? 0;
  const refeicoesFeitas = checks.reduce((t, c) => t + c.n, 0);
  const aguaMeta: number = aluno?.agua ?? 8;
  const aguaOk = new Set<string>(agua.filter(a => a.cups >= aguaMeta).map(a => a.d));
  const aguaHoje: number = agua.find(a => a.d === hoje)?.cups ?? 0;

  // ---- desafio da semana: muda toda segunda-feira, igual para todo mundo que tem os mesmos recursos ----
  const seguidos = (w: string) => { let m = 0, c = 0; for (const d of diasDaSemana(w)) { c = diasTreino.has(d) ? c + 1 : 0; m = Math.max(m, c); } return m; };
  const opcoes: (Omit<Desafio, 'atual' | 'pct' | 'feito' | 'diasRestantes'> & { valor: (w: string) => number })[] = [
    { titulo: 'Semana cheia', texto: `Faça ${alvoSemana} ${alvoSemana === 1 ? 'treino' : 'treinos'} nesta semana`, icon: 'dumbbell', alvo: alvoSemana, valor: w => porSemana.get(w) ?? 0 },
    { titulo: 'Semana hidratada', texto: 'Bata a meta de água em 4 dias', icon: 'droplet', alvo: 4, valor: w => diasDaSemana(w).filter(d => aguaOk.has(d)).length },
    ...(refeicoesN ? [{ titulo: 'Prato na linha', texto: 'Complete todas as refeições em 3 dias', icon: 'utensils' as const, alvo: 3, valor: (w: string) => diasDaSemana(w).filter(d => completos.has(d)).length }] : []),
    { titulo: 'Dois seguidos', texto: 'Treine em 2 dias seguidos', icon: 'zap', alvo: 2, valor: seguidos },
    { titulo: 'Fim de semana ativo', texto: 'Faça um treino no sábado ou no domingo', icon: 'calendar', alvo: 1, valor: w => diasDaSemana(w).slice(5).filter(d => diasTreino.has(d)).length },
    ...(refeicoesN ? [{ titulo: 'Combo perfeito', texto: 'Em um mesmo dia: treino, dieta completa e água', icon: 'star' as const, alvo: 1,
      valor: (w: string) => diasDaSemana(w).filter(d => diasTreino.has(d) && completos.has(d) && aguaOk.has(d)).length }] : []),
  ];
  const desafioDe = (w: string) => opcoes[Math.floor(Date.parse(w + 'T00:00:00Z') / (7 * 86400_000)) % opcoes.length];
  const vale = (x: { valor: (w: string) => number; alvo: number }, w: string) => Math.min(x.valor(w), x.alvo);
  // semanas com alguma atividade: só elas podem ter desafio cumprido
  const ativas = new Set([...diasTreino, ...porDia.keys(), ...agua.map(a => a.d as string)].map(segunda));
  const desafiosFeitos = [...ativas].filter(w => w <= semanaAtual && (() => { const x = desafioDe(w); return vale(x, w) >= x.alvo; })()).length;
  const ds = desafioDe(semanaAtual);
  const dsAtual = vale(ds, semanaAtual);
  const desafio: Desafio = {
    titulo: ds.titulo, texto: ds.texto, icon: ds.icon, alvo: ds.alvo, atual: dsAtual, pct: clamp(dsAtual / ds.alvo), feito: dsAtual >= ds.alvo,
    diasRestantes: Math.round((Date.parse(addDias(semanaAtual, 6)) - Date.parse(hoje)) / 86400_000),
  };

  // ---- metas e desafios do professor e metas pessoais ----
  const peso: number | null = aval[0]?.w ?? aluno?.w ?? null;
  const noPeriodo = (set: Iterable<string>, g: typeof metas[number]) => [...set].filter(d => d >= g.ini && (!g.fim || d <= g.fim)).length;
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
        : noPeriodo(kind === 'diet_days' ? completos : aguaOk, g);
      pct = clamp(valor / g.target);
      detalhe = `${br(valor)} de ${br(g.target)} ${KINDS[kind].unidade}${kind === 'sessions_week' ? ' nesta semana' : ''}`;
    }
    const dias = g.fim ? Math.round((Date.parse(g.fim) - Date.parse(hoje)) / 86400_000) : null;
    return { id: g.id, kind, title: g.title, target: g.target, atual: valor, pct, feita: pct >= 1, pessoal: !!g.by_student, fim: g.fim, dias, vencida: dias !== null && dias < 0 && pct < 1, detalhe };
  };
  const todas = metas.map(calc);

  // ---- recordes e conquistas ----
  const total = sess.length;
  const melhorados = cargas.filter(c => c.primeiro > 0 && c.melhor >= c.primeiro * 1.1).length;
  const maiorSemana = Math.max(0, ...porSemana.values());
  const c = (id: string, titulo: string, texto: string, icon: IconName, valor: number, alvo: number): Conquista =>
    ({ id, titulo, texto, icon, ok: valor >= alvo, atual: Math.min(valor, alvo), alvo });
  const conquistas = [
    c('t1', 'Primeiro treino', 'Finalizou o primeiro treino', 'dumbbell', total, 1),
    c('t10', '10 treinos', 'Dez treinos finalizados', 'dumbbell', total, 10),
    c('t25', '25 treinos', 'Vinte e cinco treinos finalizados', 'dumbbell', total, 25),
    c('t50', '50 treinos', 'Cinquenta treinos finalizados', 'trophy', total, 50),
    c('t100', '100 treinos', 'Cem treinos finalizados', 'trophy', total, 100),
    c('semana', 'Semana completa', `Bateu ${alvoSemana} treinos em uma semana`, 'calendar', maiorSemana, alvoSemana),
    c('seq4', 'Constância', '4 semanas seguidas batendo o alvo', 'flame', melhor, 4),
    c('seq8', 'Imparável', '8 semanas seguidas batendo o alvo', 'flame', melhor, 8),
    c('forte', 'Mais forte', '+10% de carga em um exercício', 'chart', melhorados, 1),
    c('recordista', 'Recordista', '+10% de carga em 5 exercícios', 'medal', melhorados, 5),
    c('dieta1', 'Dia em dia', 'Marcou todas as refeições de um dia', 'utensils', completos.size, 1),
    c('dieta7', 'Dieta na linha', '7 dias com a dieta completa', 'utensils', completos.size, 7),
    c('dieta30', 'Mês no prato', '30 dias com a dieta completa', 'utensils', completos.size, 30),
    c('agua1', 'Hidratado', 'Bateu a meta de água em um dia', 'droplet', aguaOk.size, 1),
    c('agua7', 'Fonte de energia', '7 dias batendo a meta de água', 'droplet', aguaOk.size, 7),
    c('desafio1', 'Desafiante', 'Cumpriu um desafio da semana', 'zap', desafiosFeitos, 1),
    c('desafio5', 'Caçador de desafios', 'Cumpriu 5 desafios da semana', 'star', desafiosFeitos, 5),
  ];

  const xp = total * XP.treino + refeicoesFeitas * XP.refeicao + completos.size * XP.dietaDia + aguaOk.size * XP.agua
    + desafiosFeitos * XP.desafio + conquistas.filter(x => x.ok).length * XP.conquista;

  const semanaDias: Dia[] = diasDaSemana(semanaAtual).map((d, i) => ({
    d, letra: 'STQQSSD'[i], hoje: d === hoje, futuro: d > hoje, treino: diasTreino.has(d),
    dieta: refeicoesN ? Math.min(1, (porDia.get(d) ?? 0) / refeicoesN) : null, agua: aguaOk.has(d),
  }));

  return {
    hoje, streak, melhorSequencia: melhor, alvoSemana, treinos: total, semana: porSemana.get(semanaAtual) ?? 0,
    dietaCompletos: completos.size, refeicoesHoje, refeicoes: refeicoesN, refeicoesFeitas,
    aguaHoje, aguaMeta, aguaDias: aguaOk.size,
    nivel: nivelDe(xp), semanaDias, desafio, desafiosFeitos,
    recordes: cargas.filter(r => r.melhor > 0).sort((a, b) => b.quando.localeCompare(a.quando)).slice(0, 5)
      .map(r => ({ ex: r.ex, melhor: r.melhor, primeiro: r.primeiro, quando: r.quando })),
    metas: todas.filter(m => KINDS[m.kind].meta), desafios: todas.filter(m => !KINDS[m.kind].meta && !m.pessoal), pessoais: todas.filter(m => m.pessoal),
    conquistas,
  };
}
