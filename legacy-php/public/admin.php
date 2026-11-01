<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';
require_admin();

// ---------- helpers ----------
function post_str(string $k, int $max = 255): string { return mb_substr(trim((string)($_POST[$k] ?? '')), 0, $max); }
function post_num(string $k): ?string {
    $v = str_replace(',', '.', trim((string)($_POST[$k] ?? '')));
    return is_numeric($v) ? $v : null;
}
function post_url(): ?string {
    $u = post_str('video_url', 500);
    return preg_match('#^https?://#i', $u) ? $u : null;
}
function go(string $to, string $msg = '') {
    header('Location: admin.php?' . $to . ($msg ? '&m=' . urlencode($msg) : ''));
    exit;
}
/** Troca posição de $id com o vizinho (dir -1 sobe, +1 desce) e renumera. */
function move(string $table, string $parentCol, int $parent, int $id, int $dir): void {
    $ids = array_map('intval', array_column(q("SELECT id FROM $table WHERE $parentCol=? ORDER BY position,id", [$parent])->fetchAll(), 'id'));
    $i = array_search($id, $ids, true);
    $j = $i === false ? false : $i + $dir;
    if ($i === false || $j < 0 || $j >= count($ids)) return;
    [$ids[$i], $ids[$j]] = [$ids[$j], $ids[$i]];
    foreach ($ids as $p => $x) q("UPDATE $table SET position=? WHERE id=?", [$p + 1, $x]);
}
function next_pos(string $table, string $col, int $parent): int {
    return (int)q("SELECT COALESCE(MAX(position),0)+1 FROM $table WHERE $col=?", [$parent])->fetchColumn();
}

// ---------- ações (POST) ----------
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $a = post_str('a', 30);
    $id = (int)($_POST['id'] ?? 0);
    switch ($a) {
        case 'student_save':
            $name = post_str('name', 120);
            if ($name === '') go('p=list', 'Nome obrigatório');
            $f = [$name, post_num('weight_kg'), post_num('height_m'), post_num('age') !== null ? (int)post_num('age') : null, post_str('goal', 2000), post_str('notes', 4000)];
            if ($id) { q('UPDATE students SET name=?,weight_kg=?,height_m=?,age=?,goal=?,notes=? WHERE id=?', [...$f, $id]); }
            else { q('INSERT INTO students (name,weight_kg,height_m,age,goal,notes,token) VALUES (?,?,?,?,?,?,?)', [...$f, new_token()]); $id = (int)db()->lastInsertId(); }
            go("p=student&id=$id", 'Salvo');
        case 'student_del':
            q('DELETE FROM students WHERE id=?', [$id]);
            go('p=list', 'Aluno removido');
        case 'token_new':
            q('UPDATE students SET token=? WHERE id=?', [new_token(), $id]);
            go("p=student&id=$id", 'Novo link gerado; o antigo não funciona mais');
        case 'workout_save':
            $sid = (int)($_POST['student_id'] ?? 0);
            $name = post_str('name', 20);
            if ($name === '') go("p=student&id=$sid", 'Nome do treino obrigatório');
            if ($id) q('UPDATE workouts SET name=?,focus=? WHERE id=? AND student_id=?', [$name, post_str('focus', 120), $id, $sid]);
            else q('INSERT INTO workouts (student_id,name,focus,position) VALUES (?,?,?,?)', [$sid, $name, post_str('focus', 120), next_pos('workouts', 'student_id', $sid)]);
            go("p=student&id=$sid", 'Treino salvo');
        case 'workout_del':
            $sid = (int)($_POST['student_id'] ?? 0);
            q('DELETE FROM workouts WHERE id=? AND student_id=?', [$id, $sid]);
            go("p=student&id=$sid", 'Treino removido');
        case 'workout_move':
            $sid = (int)($_POST['student_id'] ?? 0);
            move('workouts', 'student_id', $sid, $id, (int)($_POST['dir'] ?? 0) < 0 ? -1 : 1);
            go("p=student&id=$sid");
        case 'workout_dup':
            $to = (int)($_POST['to_student'] ?? 0);
            $w = q('SELECT * FROM workouts WHERE id=?', [$id])->fetch();
            if (!$w || !q('SELECT 1 FROM students WHERE id=?', [$to])->fetch()) go('p=list', 'Destino inválido');
            $pdo = db(); $pdo->beginTransaction();
            q('INSERT INTO workouts (student_id,name,focus,position) VALUES (?,?,?,?)', [$to, $w['name'], $w['focus'], next_pos('workouts', 'student_id', $to)]);
            $nw = (int)$pdo->lastInsertId();
            q('INSERT INTO workout_exercises (workout_id,name,sets,reps,rest,notes,video_url,position)
               SELECT ?,name,sets,reps,rest,notes,video_url,position FROM workout_exercises WHERE workout_id=?', [$nw, $id]);
            $pdo->commit();
            go("p=student&id=$to", 'Treino duplicado');
        case 'ex_save':
            $wid = (int)($_POST['workout_id'] ?? 0);
            $sid = (int)q('SELECT student_id FROM workouts WHERE id=?', [$wid])->fetchColumn();
            $name = post_str('name', 150);
            if ($name === '') go("p=student&id=$sid", 'Nome do exercício obrigatório');
            $sets = max(1, min(20, (int)($_POST['sets'] ?? 3)));
            $f = [$name, $sets, post_str('reps', 40) ?: '10', post_str('rest', 40) ?: '90 s', post_str('notes', 2000) ?: null, post_url()];
            if ($id) q('UPDATE workout_exercises SET name=?,sets=?,reps=?,rest=?,notes=?,video_url=? WHERE id=? AND workout_id=?', [...$f, $id, $wid]);
            else q('INSERT INTO workout_exercises (name,sets,reps,rest,notes,video_url,workout_id,position) VALUES (?,?,?,?,?,?,?,?)', [...$f, $wid, next_pos('workout_exercises', 'workout_id', $wid)]);
            go("p=student&id=$sid", 'Exercício salvo');
        case 'ex_del':
            $wid = (int)($_POST['workout_id'] ?? 0);
            $sid = (int)q('SELECT student_id FROM workouts WHERE id=?', [$wid])->fetchColumn();
            q('DELETE FROM workout_exercises WHERE id=? AND workout_id=?', [$id, $wid]);
            go("p=student&id=$sid", 'Exercício removido');
        case 'ex_move':
            $wid = (int)($_POST['workout_id'] ?? 0);
            $sid = (int)q('SELECT student_id FROM workouts WHERE id=?', [$wid])->fetchColumn();
            move('workout_exercises', 'workout_id', $wid, $id, (int)($_POST['dir'] ?? 0) < 0 ? -1 : 1);
            go("p=student&id=$sid");
        case 'lib_save':
            $name = post_str('name', 150);
            if ($name === '') go('p=library', 'Nome obrigatório');
            $f = [$name, post_url(), post_str('notes', 2000) ?: null];
            try {
                if ($id) q('UPDATE exercise_library SET name=?,video_url=?,notes=? WHERE id=?', [...$f, $id]);
                else q('INSERT INTO exercise_library (name,video_url,notes) VALUES (?,?,?)', $f);
            } catch (PDOException $e) { go('p=library', 'Já existe exercício com esse nome'); }
            go('p=library', 'Salvo');
        case 'lib_del':
            q('DELETE FROM exercise_library WHERE id=?', [$id]);
            go('p=library', 'Removido');
        case 'import':
            $j = json_decode((string)@file_get_contents($_FILES['file']['tmp_name'] ?? ''), true);
            $tables = ['exercise_library', 'students', 'workouts', 'workout_exercises', 'sessions', 'set_logs'];
            if (!is_array($j) || ($j['app'] ?? '') !== 'treinos-backup') go('p=backup', 'Arquivo inválido');
            $pdo = db();
            try {
                $pdo->exec('SET FOREIGN_KEY_CHECKS=0');
                $pdo->beginTransaction();
                foreach (array_reverse($tables) as $t) $pdo->exec("DELETE FROM $t");
                foreach ($tables as $t) {
                    foreach ((array)($j[$t] ?? []) as $row) {
                        $cols = array_keys($row);
                        if (!$cols || array_filter($cols, fn($c) => !preg_match('/^[a-z_]+$/', $c))) throw new RuntimeException('coluna inválida');
                        q("INSERT INTO $t (" . implode(',', $cols) . ') VALUES (' . implode(',', array_fill(0, count($cols), '?')) . ')', array_values($row));
                    }
                }
                $pdo->commit();
            } catch (Throwable $ex) {
                if ($pdo->inTransaction()) $pdo->rollBack();
                $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
                go('p=backup', 'Falha ao importar: nada foi alterado');
            }
            $pdo->exec('SET FOREIGN_KEY_CHECKS=1');
            go('p=backup', 'Backup importado');
    }
    go('p=list');
}

// ---------- export ----------
$p = $_GET['p'] ?? 'list';
if ($p === 'export') {
    $out = ['app' => 'treinos-backup', 'version' => 1, 'date' => date('c')];
    foreach (['exercise_library', 'students', 'workouts', 'workout_exercises', 'sessions', 'set_logs'] as $t) $out[$t] = q("SELECT * FROM $t")->fetchAll();
    header('Content-Type: application/json; charset=utf-8');
    header('Content-Disposition: attachment; filename="backup-treinos-' . date('Ymd') . '.json"');
    echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// ---------- views ----------
function head(): void { ?>
<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Admin</title><link rel="stylesheet" href="assets/app.css"></head>
<body class="admin"><main>
<nav class="top">
  <a class="btn" href="admin.php">Alunos</a><a class="btn" href="admin.php?p=library">Biblioteca</a>
  <a class="btn" href="admin.php?p=backup">Backup</a><a class="btn" href="logout.php">Sair</a>
</nav>
<?php if (!empty($_GET['m'])): ?><p class="flash"><?= e($_GET['m']) ?></p><?php endif;
}
function foot(): void { echo '</main><script src="assets/admin.js"></script></body></html>'; }
function hid(string $a, $id = 0, array $x = []): string {
    $h = csrf_field() . '<input type="hidden" name="a" value="' . e($a) . '"><input type="hidden" name="id" value="' . (int)$id . '">';
    foreach ($x as $k => $v) $h .= '<input type="hidden" name="' . e($k) . '" value="' . e($v) . '">';
    return $h;
}
function mini(string $a, $id, string $label, array $x = [], string $cls = '', string $confirm = ''): string {
    return '<form method="post" class="inline"' . ($confirm ? ' onsubmit="return confirm(\'' . e($confirm) . '\')"' : '') . '>' . hid($a, $id, $x) . '<button class="' . $cls . '">' . $label . '</button></form>';
}

head();

if ($p === 'student') {
    $id = (int)($_GET['id'] ?? 0);
    $s = q('SELECT * FROM students WHERE id=?', [$id])->fetch();
    if (!$s) { echo '<p>Aluno não encontrado.</p>'; foot(); exit; }
    $link = student_url($s['token']);
    $imc = imc($s['weight_kg'], $s['height_m']);
    $others = q('SELECT id,name FROM students WHERE id<>? ORDER BY name', [$id])->fetchAll();
    $lib = q('SELECT * FROM exercise_library ORDER BY name')->fetchAll();
    ?>
    <h1><?= e($s['name']) ?> <?= $imc ? '<small>IMC ' . e(number_format($imc, 1, ',', '')) . '</small>' : '' ?></h1>
    <div class="card">
      <p><input readonly id="link" value="<?= e($link) ?>"></p>
      <div class="row">
        <button type="button" data-copy="#link">Copiar link do aluno</button>
        <a class="btn" target="_blank" rel="noopener" href="https://wa.me/?text=<?= urlencode('Seu treino: ' . $link) ?>">Enviar no WhatsApp</a>
        <?= mini('token_new', $id, 'Gerar novo link', [], '', 'O link antigo deixará de funcionar. Continuar?') ?>
        <a class="btn" href="admin.php?p=history&id=<?= $id ?>">Histórico de cargas</a>
      </div>
    </div>

    <form method="post" class="card"><?= hid('student_save', $id) ?>
      <div class="row">
        <label>Nome <input name="name" required value="<?= e($s['name']) ?>"></label>
        <label>Peso (kg) <input name="weight_kg" value="<?= e($s['weight_kg']) ?>"></label>
        <label>Altura (m) <input name="height_m" value="<?= e($s['height_m']) ?>"></label>
        <label>Idade <input name="age" value="<?= e($s['age']) ?>"></label>
      </div>
      <label>Objetivo <textarea name="goal" rows="2"><?= e($s['goal']) ?></textarea></label>
      <label>Observações / limitações <textarea name="notes" rows="4"><?= e($s['notes']) ?></textarea></label>
      <button>Salvar aluno</button>
    </form>

    <h2>Treinos</h2>
    <?php $ws = student_workouts($id); foreach ($ws as $w): ?>
    <div class="card">
      <form method="post" class="row"><?= hid('workout_save', $w['id'], ['student_id' => $id]) ?>
        <label>Treino <input name="name" value="<?= e($w['name']) ?>" required></label>
        <label>Foco <input name="focus" value="<?= e($w['focus']) ?>"></label>
        <button>Salvar</button>
      </form>
      <div class="row" style="margin:8px 0">
        <?= mini('workout_move', $w['id'], '↑', ['student_id' => $id, 'dir' => -1]) ?>
        <?= mini('workout_move', $w['id'], '↓', ['student_id' => $id, 'dir' => 1]) ?>
        <?= mini('workout_del', $w['id'], 'Excluir treino', ['student_id' => $id], 'danger', 'Excluir treino e seu histórico?') ?>
        <?php if ($others): ?>
        <form method="post" class="inline row"><?= hid('workout_dup', $w['id']) ?>
          <select name="to_student"><?php foreach ($others as $o): ?><option value="<?= $o['id'] ?>"><?= e($o['name']) ?></option><?php endforeach ?></select>
          <button>Duplicar para…</button>
        </form>
        <?php endif ?>
      </div>
      <?php foreach ($w['exercises'] as $i => $x): ?>
        <details class="card"><summary><b><?= $i + 1 ?>.</b> <?= e($x['name']) ?> — <?= (int)$x['sets'] ?> × <?= e($x['reps']) ?> · <?= e($x['rest']) ?></summary>
          <form method="post"><?= hid('ex_save', $x['id'], ['workout_id' => $w['id']]) ?>
            <label>Nome <input name="name" value="<?= e($x['name']) ?>" required></label>
            <div class="row">
              <label>Séries <input name="sets" type="number" min="1" max="20" value="<?= (int)$x['sets'] ?>"></label>
              <label>Repetições <input name="reps" value="<?= e($x['reps']) ?>"></label>
              <label>Descanso <input name="rest" value="<?= e($x['rest']) ?>"></label>
            </div>
            <label>Observações <textarea name="notes" rows="2"><?= e($x['notes']) ?></textarea></label>
            <label>URL do vídeo <input name="video_url" value="<?= e($x['video_url']) ?>"></label>
            <button>Salvar</button>
          </form>
          <div class="row" style="margin-top:8px">
            <?= mini('ex_move', $x['id'], '↑', ['workout_id' => $w['id'], 'dir' => -1]) ?>
            <?= mini('ex_move', $x['id'], '↓', ['workout_id' => $w['id'], 'dir' => 1]) ?>
            <?= mini('ex_del', $x['id'], 'Excluir', ['workout_id' => $w['id']], 'danger', 'Excluir exercício?') ?>
          </div>
        </details>
      <?php endforeach ?>
      <details><summary>+ Adicionar exercício</summary>
        <form method="post" class="exnew"><?= hid('ex_save', 0, ['workout_id' => $w['id']]) ?>
          <label>Da biblioteca
            <select class="libpick"><option value="">— escolher (preenche o formulário) —</option>
              <?php foreach ($lib as $l): ?><option value="<?= e(json_encode(['name' => $l['name'], 'video_url' => $l['video_url'], 'notes' => $l['notes']], JSON_UNESCAPED_UNICODE)) ?>"><?= e($l['name']) ?></option><?php endforeach ?>
            </select></label>
          <label>Nome <input name="name" required></label>
          <div class="row">
            <label>Séries <input name="sets" type="number" min="1" max="20" value="3"></label>
            <label>Repetições <input name="reps" value="10"></label>
            <label>Descanso <input name="rest" value="90 s"></label>
          </div>
          <label>Observações <textarea name="notes" rows="2"></textarea></label>
          <label>URL do vídeo <input name="video_url"></label>
          <button>Adicionar</button>
        </form>
      </details>
    </div>
    <?php endforeach ?>

    <form method="post" class="card row"><?= hid('workout_save', 0, ['student_id' => $id]) ?>
      <label>Novo treino (ex.: E) <input name="name" required></label>
      <label>Foco <input name="focus"></label>
      <button>Criar treino</button>
    </form>
    <?= mini('student_del', $id, 'Excluir aluno', [], 'danger', 'Excluir aluno e todo o histórico?') ?>
    <?php
} elseif ($p === 'library') {
    $rows = q('SELECT * FROM exercise_library ORDER BY name')->fetchAll();
    ?>
    <h1>Biblioteca de exercícios</h1>
    <form method="post" class="card"><?= hid('lib_save') ?>
      <div class="row"><label>Nome <input name="name" required></label><label>URL do vídeo <input name="video_url"></label></div>
      <label>Observações padrão <textarea name="notes" rows="2"></textarea></label>
      <button>Adicionar</button>
    </form>
    <?php foreach ($rows as $r): ?>
      <details class="card"><summary><?= e($r['name']) ?></summary>
        <form method="post"><?= hid('lib_save', $r['id']) ?>
          <div class="row"><label>Nome <input name="name" required value="<?= e($r['name']) ?>"></label><label>URL do vídeo <input name="video_url" value="<?= e($r['video_url']) ?>"></label></div>
          <label>Observações padrão <textarea name="notes" rows="2"><?= e($r['notes']) ?></textarea></label>
          <button>Salvar</button>
        </form>
        <?= mini('lib_del', $r['id'], 'Excluir', [], 'danger', 'Excluir da biblioteca? (treinos existentes não mudam)') ?>
      </details>
    <?php endforeach;
} elseif ($p === 'history') {
    $id = (int)($_GET['id'] ?? 0);
    $s = q('SELECT id,name FROM students WHERE id=?', [$id])->fetch();
    if (!$s) { echo '<p>Aluno não encontrado.</p>'; foot(); exit; }
    $st = q('SELECT we.name ex, DATE(se.finished_at) d, sl.set_number n, sl.weight_kg w, sl.reps r
             FROM set_logs sl JOIN sessions se ON se.id=sl.session_id JOIN workout_exercises we ON we.id=sl.workout_exercise_id
             WHERE se.student_id=? ORDER BY we.name, se.finished_at, sl.set_number', [$id]);
    $by = [];
    foreach ($st as $r) $by[$r['ex']][$r['d']][] = $r;
    ?>
    <h1>Histórico — <?= e($s['name']) ?></h1><p><a href="admin.php?p=student&id=<?= $id ?>">← voltar</a></p>
    <?php if (!$by) echo '<p class="muted">Nenhuma sessão registrada ainda.</p>';
    foreach ($by as $ex => $days):
        $pts = [];
        foreach ($days as $d => $sets) $pts[] = [$d, max(array_map(fn($x) => (float)$x['w'], $sets))];
        ?>
        <div class="card"><h2><?= e($ex) ?></h2>
          <svg class="chart" data-pts="<?= e(json_encode($pts)) ?>"></svg>
          <table><tr><th>Data</th><th>Séries (kg × reps)</th></tr>
            <?php foreach (array_reverse($days, true) as $d => $sets): ?>
              <tr><td><?= e(date('d/m/Y', strtotime($d))) ?></td><td><?= e(implode(' · ', array_map(fn($x) => ($x['w'] + 0) . ' × ' . ($x['r'] ?? '-'), $sets))) ?></td></tr>
            <?php endforeach ?>
          </table></div>
    <?php endforeach;
} elseif ($p === 'backup') {
    ?>
    <h1>Backup</h1>
    <div class="card"><a class="btn" href="admin.php?p=export">Exportar JSON</a></div>
    <form method="post" enctype="multipart/form-data" class="card" onsubmit="return confirm('Isso substitui TODOS os dados atuais. Continuar?')">
      <?= hid('import') ?>
      <label>Importar JSON (substitui tudo) <input type="file" name="file" accept=".json,application/json" required></label>
      <button class="danger">Importar</button>
    </form>
    <?php
} else {
    $rows = q('SELECT * FROM students ORDER BY name')->fetchAll();
    ?>
    <h1>Alunos</h1>
    <table><tr><th>Nome</th><th>IMC</th><th></th></tr>
    <?php foreach ($rows as $r): $i = imc($r['weight_kg'], $r['height_m']); ?>
      <tr><td><?= e($r['name']) ?></td><td><?= $i ? e(number_format($i, 1, ',', '')) : '-' ?></td><td><a class="btn" href="admin.php?p=student&id=<?= $r['id'] ?>">Abrir</a></td></tr>
    <?php endforeach ?></table>
    <form method="post" class="card"><?= hid('student_save') ?>
      <h2>Novo aluno</h2>
      <div class="row">
        <label>Nome <input name="name" required></label>
        <label>Peso (kg) <input name="weight_kg"></label>
        <label>Altura (m) <input name="height_m"></label>
        <label>Idade <input name="age"></label>
      </div>
      <label>Objetivo <textarea name="goal" rows="2"></textarea></label>
      <label>Observações / limitações <textarea name="notes" rows="3"></textarea></label>
      <button>Cadastrar</button>
    </form>
    <?php
}
foot();
