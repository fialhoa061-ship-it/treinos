import { rows, sql } from './db';

/** Todos os dados de um aluno (LGPD: direito de acesso e portabilidade). Sem o código de acesso. */
export async function dadosDoAluno(sid: number) {
  const s = sql();
  const [aluno] = await rows(s`select id, name as nome, age as idade, weight_kg as peso_kg, height_m as altura_m, goal as objetivo, notes as observacoes,
    plan_until as troca_do_treino, consent_at as termo_aceito_em, consent_version as versao_do_termo, consent_guardian as responsavel,
    delete_requested_at as exclusao_pedida_em from students where id = ${sid}`);
  return {
    app: 'NEXTFIT', tipo: 'dados-do-aluno', gerado_em: new Date().toISOString(),
    aluno,
    avaliacoes: await s`select measured_on as data, weight_kg as peso_kg, body_fat as gordura_pct, waist_cm as cintura_cm, hip_cm as quadril_cm,
      chest_cm as peito_cm, arm_cm as braco_cm, thigh_cm as coxa_cm, notes as observacoes from assessments where student_id = ${sid} order by measured_on`,
    treinos: await s`select w.name as treino, w.focus as foco,
      coalesce((select json_agg(json_build_object('exercicio', e.name, 'series', e.sets, 'repeticoes', e.reps, 'descanso', e.rest, 'observacoes', e.notes) order by e.position)
        from workout_exercises e where e.workout_id = w.id), '[]') as exercicios
      from workouts w where w.student_id = ${sid} order by w.position`,
    treinos_feitos: await s`select se.finished_at as quando, w.name as treino, se.effort as esforco_0_a_10, se.alerts as sintomas, se.comment as comentario,
      coalesce((select json_agg(json_build_object('exercicio', e.name, 'serie', l.set_number, 'carga_kg', l.weight_kg, 'repeticoes', l.reps) order by e.position, l.set_number)
        from set_logs l join workout_exercises e on e.id = l.workout_exercise_id where l.session_id = se.id), '[]') as series
      from sessions se join workouts w on w.id = se.workout_id where se.student_id = ${sid} order by se.finished_at`,
    refeicoes_marcadas: await s`select c.day as dia, m.name as refeicao from diet_checks c join diet_meals m on m.id = c.meal_id where c.student_id = ${sid} order by c.day, m.position`,
    agua: await s`select day as dia, cups as copos_250ml from water_logs where student_id = ${sid} order by day`,
    metas: await s`select title as meta, kind as tipo, target as alvo, starts_on as inicio, ends_on as fim, by_student as criada_pelo_aluno from goals where student_id = ${sid} order by created_at`,
  };
}

export function jsonDownload(data: unknown, nome: string) {
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${nome}-${new Date().toISOString().slice(0, 10)}.json"`,
      'Cache-Control': 'no-store',
    },
  });
}
