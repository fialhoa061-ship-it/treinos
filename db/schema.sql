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
