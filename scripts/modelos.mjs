// Modelos de ficha prontos (sem dono: visíveis para todos os professores).
// Uso: node --env-file=.env.local scripts/modelos.mjs
// - Cria cada modelo que ainda não existe (pelo nome). Não altera modelos já criados.
// - Exercícios copiam link de vídeo e observações da biblioteca (rode scripts/biblioteca.mjs antes).
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

// [nome, descrição, [[treino, foco, [[exercício da biblioteca, séries, repetições, descanso]]]]]
const M = [
  ['Idoso iniciante (A/B)', '2 a 3x por semana, alternando A e B. Força, equilíbrio e autonomia no dia a dia.', [
    ['A', 'Força e equilíbrio', [
      ['Marcha estacionária com apoio', 1, '2 min', '60 s'],
      ['Sentar e levantar da cadeira', 2, '10–12', '90 s'],
      ['Remada sentado com elástico', 2, '12', '90 s'],
      ['Flexão de braço na parede', 2, '10', '90 s'],
      ['Panturrilha em pé com apoio', 2, '12', '60 s'],
      ['Equilíbrio em um pé com apoio', 2, '20–30 s cada perna', '60 s'],
    ]],
    ['B', 'Mobilidade e funcional', [
      ['Extensão de joelho sentado', 2, '12 cada perna', '60 s'],
      ['Desenvolvimento sentado com halteres leves', 2, '10–12', '90 s'],
      ['Abdução de quadril em pé com apoio', 2, '12 cada perna', '60 s'],
      ['Caminhada calcanhar-ponta (em linha)', 2, '10 passos', '60 s'],
      ['Alcance funcional (inclinar à frente)', 2, '8', '60 s'],
      ['Alongamento sentado na cadeira', 1, '5 min', '—'],
    ]],
  ]],
  ['Cardiopata: condicionamento leve (A/B)', 'Somente com liberação médica. Intensidade leve a moderada, sem prender o ar.', [
    ['A', 'Aeróbio + força leve', [
      ['Aquecimento articular leve (5–10 min)', 1, '5–10 min', '—'],
      ['Bicicleta ergométrica leve', 1, '15–20 min', '2 min'],
      ['Leg press com carga leve', 2, '12–15', '90 s'],
      ['Remada sentado na máquina leve', 2, '12–15', '90 s'],
      ['Supino na máquina leve', 2, '12–15', '90 s'],
      ['Volta à calma e alongamento (5–10 min)', 1, '5–10 min', '—'],
    ]],
    ['B', 'Caminhada + circuito leve', [
      ['Aquecimento articular leve (5–10 min)', 1, '5–10 min', '—'],
      ['Caminhada leve na esteira', 1, '20 min', '2 min'],
      ['Cadeira extensora com carga leve', 2, '12–15', '90 s'],
      ['Puxada na frente leve', 2, '12–15', '90 s'],
      ['Exercícios com elástico em circuito leve', 1, '6–8 min', '2 min'],
      ['Respiração diafragmática', 1, '2–3 min', '—'],
    ]],
  ]],
  ['Obesidade: baixo impacto (A/B)', '3x por semana. Sem saltos, preservando joelhos e coluna; aumente a duração antes da intensidade.', [
    ['A', 'Cardio + inferiores', [
      ['Caminhada na esteira com inclinação leve', 1, '15–20 min', '2 min'],
      ['Agachamento na cadeira (sentar e levantar)', 3, '10–12', '90 s'],
      ['Leg press 45° leve', 3, '12', '90 s'],
      ['Flexão na parede ou inclinada no banco', 3, '10', '60 s'],
      ['Prancha na parede ou inclinada', 3, '20–30 s', '60 s'],
    ]],
    ['B', 'Cardio + superiores', [
      ['Elíptico para iniciantes', 1, '15 min', '2 min'],
      ['Remada na máquina para iniciantes', 3, '12', '90 s'],
      ['Puxada na frente para iniciantes', 3, '12', '90 s'],
      ['Circuito de baixo impacto sem salto', 2, '4 min', '2 min'],
      ['Marcha com elevação de joelhos', 3, '40 s', '40 s'],
    ]],
  ]],
  ['Adolescente: base (A/B)', 'A partir de 12–13 anos, com supervisão. Técnica antes da carga.', [
    ['A', 'Força com peso do corpo + agilidade', [
      ['Escada de agilidade', 3, '30 s', '60 s'],
      ['Agachamento com peso do corpo', 3, '12', '60 s'],
      ['Flexão de braço inclinada no banco', 3, '10', '60 s'],
      ['Remada invertida na barra baixa', 3, '8–10', '90 s'],
      ['Ponte de glúteo com uma perna', 2, '10 cada perna', '60 s'],
      ['Prancha com toque no ombro', 3, '10 cada lado', '60 s'],
    ]],
    ['B', 'Técnica + potência', [
      ['Saltos com aterrissagem controlada', 3, '5', '90 s'],
      ['Dobradiça de quadril com bastão', 2, '10', '60 s'],
      ['Passada sem carga', 3, '8 cada perna', '60 s'],
      ['Supino com halteres leves', 3, '12', '90 s'],
      ['Puxada na frente com carga leve', 3, '12', '90 s'],
      ['Arremesso de medicine ball no peito', 3, '8', '60 s'],
    ]],
  ]],
];

const lib = new Map((await sql`select name, video_url, notes from exercise_library`).map(r => [r.name, r]));
const faltando = M.flatMap(([, , ws]) => ws.flatMap(([, , ex]) => ex.map(e => e[0]))).filter(n => !lib.has(n));
if (faltando.length) throw new Error('Exercícios fora da biblioteca: ' + [...new Set(faltando)].join(', '));

let criados = 0;
for (const [nome, desc, treinos] of M) {
  if ((await sql`select 1 from templates where owner_id is null and name = ${nome}`).length) continue;
  const [t] = await sql`insert into templates (owner_id, name, description) values (null, ${nome}, ${desc}) returning id`;
  for (const [i, [w, foco, ex]] of treinos.entries()) {
    const [tw] = await sql`insert into template_workouts (template_id, name, focus, position) values (${t.id}, ${w}, ${foco}, ${i + 1}) returning id`;
    for (const [j, [n, series, reps, desc]] of ex.entries()) {
      const l = lib.get(n);
      await sql`insert into template_exercises (template_workout_id, name, sets, reps, rest, notes, video_url, position)
        values (${tw.id}, ${n}, ${series}, ${reps}, ${desc}, ${l.notes}, ${l.video_url}, ${j + 1})`;
    }
  }
  criados++;
}
const [{ n }] = await sql`select count(*)::int as n from templates where owner_id is null`;
console.log(`${M.length} na lista · ${criados} criados · modelos prontos no total: ${n}`);
