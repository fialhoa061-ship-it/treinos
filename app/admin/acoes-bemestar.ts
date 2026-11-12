'use server';

import { redirect } from 'next/navigation';
import { rows, sql } from '@/lib/db';
import { requireAdmin } from '@/lib/auth';
import { KINDS, type Kind } from '@/lib/jogo';

const str = (f: FormData, k: string, max = 255) => String(f.get(k) ?? '').trim().slice(0, max);
const int = (f: FormData, k: string) => Number(f.get(k) ?? 0) | 0;
const dia = (f: FormData, k: string): string | null => { const v = str(f, k, 10); return /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v)) ? v : null; };
const go = (path: string, msg = ''): never => redirect(msg ? `${path}?m=${encodeURIComponent(msg)}` : path);
const dieta = (sid: number, msg = '') => go(`/admin/alunos/${sid}/dieta`, msg);
const metas = (sid: number, msg = '') => go(`/admin/alunos/${sid}/metas`, msg);

// aluno só vale se for do professor logado
const mine = async (uid: number, sid: number) => (await rows(sql()`select 1 from students where id=${sid} and owner_id=${uid}`)).length > 0;
// refeição só vale se for de um aluno do professor logado; devolve o aluno
async function mealOwner(uid: number, mealId: number): Promise<number> {
  const [r] = await rows(sql()`select m.student_id from diet_meals m join students s on s.id = m.student_id where m.id=${mealId} and s.owner_id=${uid}`);
  if (!r) return go('/admin', 'Refeição não encontrada');
  return r.student_id as number;
}

// ---------------- dieta ----------------
export async function saveDietNotes(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id');
  if (!(await mine(uid, sid))) return go('/admin', 'Aluno não encontrado');
  await sql()`update students set diet_notes=${str(f, 'notes', 3000) || null} where id=${sid} and owner_id=${uid}`;
  dieta(sid, 'Orientações salvas');
}

const PADRAO: [string, string][] = [['Café da manhã', '07:00'], ['Lanche da manhã', '10:00'], ['Almoço', '12:30'], ['Lanche da tarde', '16:00'], ['Jantar', '19:30'], ['Ceia', '21:30']];

export async function addDefaultMeals(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id');
  if (!(await mine(uid, sid))) return go('/admin', 'Aluno não encontrado');
  const s = sql();
  if (!(await rows(s`select 1 from diet_meals where student_id=${sid}`)).length) {
    await s.transaction(PADRAO.map(([n, h], i) => s`insert into diet_meals (student_id, name, time_hint, position) values (${sid}, ${n}, ${h}, ${i + 1})`));
  }
  dieta(sid, 'Refeições criadas');
}

export async function saveMeal(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), sid = int(f, 'student_id'), name = str(f, 'name', 60);
  if (!(await mine(uid, sid))) return go('/admin', 'Aluno não encontrado');
  if (!name) return dieta(sid, 'Dê um nome à refeição');
  const hora = str(f, 'time_hint', 20) || null, s = sql();
  if (id) await s`update diet_meals set name=${name}, time_hint=${hora} where id=${id} and student_id=${sid}`;
  else await s`insert into diet_meals (student_id, name, time_hint, position)
    values (${sid}, ${name}, ${hora}, (select coalesce(max(position),0)+1 from diet_meals where student_id=${sid}))`;
  dieta(sid, 'Refeição salva');
}

export async function deleteMeal(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), sid = await mealOwner(uid, id);
  await sql()`delete from diet_meals where id=${id}`;
  dieta(sid, 'Refeição removida');
}

export async function moveMeal(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), d = int(f, 'dir') < 0 ? -1 : 1, sid = await mealOwner(uid, id);
  await sql()`
    with ord as (select id, row_number() over (order by position, id) rn from diet_meals where student_id=${sid}),
         t as (select rn from ord where id=${id})
    update diet_meals m set position = case when o.id=${id} then (select rn from t)+${d} when o.rn=(select rn from t)+${d} then (select rn from t) else o.rn end
    from ord o where m.id=o.id`;
  dieta(sid);
}

export async function saveItem(f: FormData) {
  const uid = await requireAdmin();
  const id = int(f, 'id'), mealId = int(f, 'meal_id'), sid = await mealOwner(uid, mealId), food = str(f, 'food', 120);
  if (!food) return dieta(sid, 'Escreva o alimento');
  const qtd = str(f, 'quantity', 60) || null, obs = str(f, 'notes', 200) || null, s = sql();
  if (id) await s`update diet_items set food=${food}, quantity=${qtd}, notes=${obs} where id=${id} and meal_id=${mealId}`;
  else await s`insert into diet_items (meal_id, food, quantity, notes, position)
    values (${mealId}, ${food}, ${qtd}, ${obs}, (select coalesce(max(position),0)+1 from diet_items where meal_id=${mealId}))`;
  dieta(sid, 'Alimento salvo');
}

export async function deleteItem(f: FormData) {
  const uid = await requireAdmin();
  const mealId = int(f, 'meal_id'), sid = await mealOwner(uid, mealId);
  await sql()`delete from diet_items where id=${int(f, 'id')} and meal_id=${mealId}`;
  dieta(sid, 'Alimento removido');
}

// ---------------- metas e desafios ----------------
const FAIXA: Record<Kind, [number, number]> = { weight: [20, 300], sessions_week: [1, 7], sessions: [1, 300], diet_days: [1, 366] };

export async function saveGoal(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id'), kind = str(f, 'kind', 20) as Kind;
  if (!(await mine(uid, sid))) return go('/admin', 'Aluno não encontrado');
  if (!(kind in KINDS)) return metas(sid, 'Escolha o tipo');
  const alvo = Number(str(f, 'target', 10).replace(',', '.'));
  const [lo, hi] = FAIXA[kind];
  if (!Number.isFinite(alvo) || alvo < lo || alvo > hi) return metas(sid, `Alvo inválido: use um valor entre ${lo} e ${hi}`);
  const fim = KINDS[kind].meta ? null : dia(f, 'ends_on');
  const todos = f.get('all_students') === 'on' && !KINDS[kind].meta; // desafio para todos os alunos do professor
  const s = sql();

  const titulo = str(f, 'title', 80) || ({
    weight: `Chegar a ${alvo} kg`,
    sessions_week: `${alvo} treinos por semana`,
    sessions: `${alvo} treinos${fim ? ` até ${fim.split('-').reverse().slice(0, 2).join('/')}` : ''}`,
    diet_days: `${alvo} dias com a dieta completa`,
  } satisfies Record<Kind, string>)[kind];

  // meta de peso mede o caminho já andado: guarda o peso de hoje como ponto de partida
  const [p] = kind === 'weight'
    ? await rows(s`select coalesce((select weight_kg from assessments where student_id=${sid} and weight_kg is not null order by measured_on desc, id desc limit 1), weight_kg)::float as w from students where id=${sid}`)
    : [];
  if (kind === 'weight' && p?.w == null) return metas(sid, 'Cadastre o peso do aluno antes de criar a meta de peso');
  if (kind === 'sessions_week') await s`delete from goals where student_id=${sid} and kind='sessions_week'`; // uma meta semanal por aluno

  const alunos = todos ? (await rows(s`select id from students where owner_id=${uid}`)).map(r => r.id as number) : [sid];
  await s.transaction(alunos.map(a => s`insert into goals (student_id, kind, title, target, start_value, starts_on, ends_on)
    values (${a}, ${kind}, ${titulo}, ${alvo}, ${kind === 'weight' ? p.w : null}, (now() at time zone 'America/Sao_Paulo')::date, ${fim})`));
  metas(sid, todos ? `Desafio criado para ${alunos.length} ${alunos.length === 1 ? 'aluno' : 'alunos'}` : 'Salvo');
}

export async function deleteGoal(f: FormData) {
  const uid = await requireAdmin();
  const sid = int(f, 'student_id');
  if (!(await mine(uid, sid))) return go('/admin', 'Aluno não encontrado');
  await sql()`delete from goals where id=${int(f, 'id')} and student_id=${sid}`;
  metas(sid, 'Removido');
}
