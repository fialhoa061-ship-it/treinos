create table if not exists users (
  id serial primary key,
  email text unique not null,
  password_hash text not null
);
create table if not exists students (
  id serial primary key,
  name text not null,
  weight_kg numeric(5,1),
  height_m numeric(3,2),
  age int,
  goal text,
  notes text,
  access_code text unique
);
create table if not exists workouts (
  id serial primary key,
  student_id int not null references students(id) on delete cascade,
  name text not null,
  focus text,
  position int not null default 0
);
create table if not exists exercise_library (
  id serial primary key,
  name text unique not null,
  video_url text,
  notes text,
  category text
);
alter table exercise_library add column if not exists category text;
create table if not exists workout_exercises (
  id serial primary key,
  workout_id int not null references workouts(id) on delete cascade,
  name text not null,
  sets int not null default 3,
  reps text not null default '10',
  rest text not null default '90 s',
  notes text,
  video_url text,
  position int not null default 0
);
create table if not exists sessions (
  id serial primary key,
  student_id int not null references students(id) on delete cascade,
  workout_id int not null references workouts(id) on delete cascade,
  finished_at timestamptz not null default now()
);
create index if not exists sessions_student_idx on sessions (student_id, finished_at);
-- retorno do aluno ao finalizar: esforço percebido (0–10), sintomas e comentário
alter table sessions add column if not exists effort smallint;
alter table sessions add column if not exists alerts text[];
alter table sessions add column if not exists comment text;
create table if not exists set_logs (
  id serial primary key,
  session_id int not null references sessions(id) on delete cascade,
  workout_exercise_id int not null references workout_exercises(id) on delete cascade,
  set_number int not null,
  weight_kg numeric(6,2),
  reps int,
  unique (session_id, workout_exercise_id, set_number)
);
create table if not exists login_attempts (
  id serial primary key,
  ip text not null,
  created_at timestamptz not null default now()
);
create index if not exists login_attempts_idx on login_attempts (ip, created_at);

-- validade da ficha: data em que o professor planeja trocar o treino do aluno
alter table students add column if not exists plan_until date;

-- avaliação física: histórico de peso e medidas
create table if not exists assessments (
  id serial primary key,
  student_id int not null references students(id) on delete cascade,
  measured_on date not null default current_date,
  weight_kg numeric(5,1),
  body_fat numeric(4,1),
  waist_cm numeric(5,1),
  hip_cm numeric(5,1),
  chest_cm numeric(5,1),
  arm_cm numeric(5,1),
  thigh_cm numeric(5,1),
  notes text
);
create index if not exists assessments_student_idx on assessments (student_id, measured_on);

-- "esqueci minha senha" do professor: só o hash do token é guardado, vale 1 hora e uma única vez
create table if not exists password_resets (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  token_hash text unique not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists password_resets_user_idx on password_resets (user_id, created_at);

-- cada aluno pertence a um professor: um professor só vê e altera os próprios alunos
alter table students add column if not exists owner_id int references users(id) on delete cascade;
create index if not exists students_owner_idx on students (owner_id);

-- LGPD: termo de consentimento do aluno (com responsável quando menor) e pedido de exclusão
alter table students add column if not exists consent_at timestamptz;
alter table students add column if not exists consent_version int;
alter table students add column if not exists consent_guardian text;
alter table students add column if not exists delete_requested_at timestamptz;

-- professores: nome e dono (quem convida outros professores)
alter table users add column if not exists name text;
alter table users add column if not exists is_owner boolean not null default false;
update users set is_owner = true where id = (select min(id) from users) and not exists (select 1 from users where is_owner);

-- convite de professor por e-mail: só o hash do token, vale 7 dias e uma única vez
create table if not exists invites (
  id serial primary key,
  email text not null,
  token_hash text unique not null,
  invited_by int references users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

-- modelos de ficha: owner_id nulo = modelo pronto, visível para todos os professores
create table if not exists templates (
  id serial primary key,
  owner_id int references users(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create table if not exists template_workouts (
  id serial primary key,
  template_id int not null references templates(id) on delete cascade,
  name text not null,
  focus text,
  position int not null default 0
);
create table if not exists template_exercises (
  id serial primary key,
  template_workout_id int not null references template_workouts(id) on delete cascade,
  name text not null,
  sets int not null default 3,
  reps text not null default '10',
  rest text not null default '90 s',
  notes text,
  video_url text,
  position int not null default 0
);
create index if not exists templates_owner_idx on templates (owner_id);

-- professor desligado pelo principal: não entra mais, mas nada é apagado (pode ser religado)
alter table users add column if not exists disabled_at timestamptz;

-- avisos para o professor principal (ex.: um professor excluiu a própria conta)
create table if not exists account_events (
  id serial primary key,
  kind text not null,
  user_email text,
  user_name text,
  students int,
  created_at timestamptz not null default now(),
  seen_at timestamptz
);

-- ---------- dieta: plano alimentar por refeição ----------
alter table students add column if not exists diet_notes text; -- orientações gerais (água, restrições, horários)
create table if not exists diet_meals (
  id serial primary key,
  student_id int not null references students(id) on delete cascade,
  name text not null,
  time_hint text, -- ex.: "07:30"
  position int not null default 0
);
create index if not exists diet_meals_student_idx on diet_meals (student_id, position);
create table if not exists diet_items (
  id serial primary key,
  meal_id int not null references diet_meals(id) on delete cascade,
  food text not null,
  quantity text, -- ex.: "2 fatias", "150 g"
  notes text,
  position int not null default 0
);
-- o aluno marca a refeição feita no dia (dia em horário de Brasília)
create table if not exists diet_checks (
  id serial primary key,
  student_id int not null references students(id) on delete cascade,
  meal_id int not null references diet_meals(id) on delete cascade,
  day date not null,
  unique (meal_id, day)
);
create index if not exists diet_checks_student_idx on diet_checks (student_id, day);

-- ---------- metas e desafios ----------
-- kind: weight (peso alvo), sessions_week (treinos por semana) = metas.
--       sessions (treinos no período), diet_days (dias com a dieta completa no período) = desafios com prazo
create table if not exists goals (
  id serial primary key,
  student_id int not null references students(id) on delete cascade,
  kind text not null check (kind in ('weight', 'sessions_week', 'sessions', 'diet_days')),
  title text not null,
  target numeric(7,1) not null,
  start_value numeric(7,1), -- peso no começo da meta (para medir o quanto já andou)
  starts_on date not null default current_date,
  ends_on date,
  done_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists goals_student_idx on goals (student_id, created_at);
