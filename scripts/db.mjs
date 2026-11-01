// Uso: node --env-file=.env.local scripts/db.mjs schema
//      SEED_EMAIL=... SEED_PASSWORD=... node --env-file=.env.local scripts/db.mjs seed
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomInt } from 'node:crypto';
import { readFileSync } from 'node:fs';

const sql = neon(process.env.DATABASE_URL);

const WORKOUTS = [
  ['A', 'Glúteo (força)', [
    ['Elevação pélvica com barra', 4, '6–8', '2–3 min', 'Fazer 2 séries de aquecimento antes. Segurar 1 s no topo, empurrar com os calcanhares.'],
    ['Stiff com barra', 3, '8–10', '2 min', 'Joelhos levemente flexionados, quadril vai para trás, barra rente às pernas.'],
    ['Búlgaro com tronco inclinado à frente', 3, '8–10 cada perna', '90 s', null],
    ['Mesa flexora', 3, '10–12', '90 s', null],
    ['Cadeira abdutora', 3, '15–20', '60 s', 'Última série até a falha, tronco inclinado à frente.']]],
  ['B', 'Superiores', [
    ['Puxada na frente', 3, '8–10', '90 s', null],
    ['Desenvolvimento com halteres', 3, '8–10', '90 s', null],
    ['Remada baixa', 3, '10–12', '90 s', null],
    ['Elevação lateral', 4, '12–15', '60 s', 'Cotovelos levemente flexionados, subir até a altura do ombro.'],
    ['Tríceps corda', 3, '10–12', '60 s', null],
    ['Rosca direta', 3, '10–12', '60 s', null],
    ['Tríceps francês com halter', 2, '12–15', '60 s', null]]],
  ['C', 'Quadríceps e glúteo', [
    ['Agachamento (Smith ou livre)', 4, '6–8', '2–3 min', 'Fazer 2 séries de aquecimento antes.'],
    ['Leg press 45° com pés altos', 3, '10–12', '2 min', null],
    ['Passada andando ou afundo', 3, '10 cada perna', '90 s', null],
    ['Cadeira extensora', 3, '12–15', '60 s', 'Drop-set na última série: ao falhar, reduzir 30% da carga e continuar.'],
    ['Coice na polia', 3, '12–15 cada perna', '60 s', null]]],
  ['D', 'Glúteo (volume) e braço', [
    ['Elevação pélvica unilateral ou na máquina', 3, '10–12', '90 s', null],
    ['Hiperextensão com foco em glúteo', 3, '12–15', '60 s', 'Costas levemente arredondadas, pés virados para fora.'],
    ['Abdução na polia em pé', 3, '15', '60 s', null],
    ['Rosca martelo + tríceps banco (bi-set)', 3, '12', '60 s', 'Fazer um em seguida do outro e descansar só no final.'],
    ['Elevação lateral', 3, '15', '60 s', null]]],
];
const NOTES = 'Nível intermediário. Intensidade RIR 1–2 (terminar a série sentindo que faria só mais 1–2 repetições). Descer em 2–3 s, subir com força, segurar 1 s no topo nos exercícios de glúteo. Progressão: bateu o topo da faixa em todas as séries → +1–2 kg e volta ao início da faixa. Ciclo de 4 semanas: 3 de progressão + 1 de deload (metade das séries, mesma carga). Fazer 4x por semana (ex.: seg, ter, qui, sex).';

const cmd = process.argv[2];
if (cmd === 'schema') {
  const stmts = readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8').split(';').map(s => s.trim()).filter(Boolean);
  for (const s of stmts) await sql.query(s);
  console.log('schema ok');
} else if (cmd === 'seed') {
  const { SEED_EMAIL, SEED_PASSWORD } = process.env;
  if (!SEED_EMAIL || !SEED_PASSWORD) throw new Error('Defina SEED_EMAIL e SEED_PASSWORD');
  const hash = await bcrypt.hash(SEED_PASSWORD, 10);
  await sql`insert into users (email, password_hash) values (${SEED_EMAIL}, ${hash}) on conflict (email) do update set password_hash = excluded.password_hash`;
  const [st] = await sql`insert into students (name, weight_kg, height_m, goal, notes, access_code)
    values ('Mãe', 62.8, 1.49, 'Fortalecer coxa, ganhar glúteo, definir braço (recomposição corporal)', ${NOTES}, ${String(randomInt(1_000_000)).padStart(6, '0')}) returning id, access_code`;
  for (const [i, [name, focus, exs]] of WORKOUTS.entries()) {
    const [w] = await sql`insert into workouts (student_id, name, focus, position) values (${st.id}, ${name}, ${focus}, ${i + 1}) returning id`;
    for (const [p, [en, sets, reps, rest, notes]] of exs.entries()) {
      await sql`insert into workout_exercises (workout_id, name, sets, reps, rest, notes, position) values (${w.id}, ${en}, ${sets}, ${reps}, ${rest}, ${notes}, ${p + 1})`;
      await sql`insert into exercise_library (name, notes) values (${en}, ${notes}) on conflict (name) do nothing`;
    }
  }
  console.log('seed ok. código da Mãe:', st.access_code);
} else console.log('uso: schema | seed');
