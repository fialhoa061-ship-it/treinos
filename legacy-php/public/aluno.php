<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';

$t = (string)($_GET['t'] ?? '');
$t = preg_match('/^[a-f0-9]{64}$/', $t) ? $t : '';

// Dados e gravação no próprio arquivo: não há endpoint separado.
if ($_SERVER['REQUEST_METHOD'] === 'POST' || isset($_GET['json'])) {
    $s = $t ? q('SELECT id,name,notes FROM students WHERE token=?', [$t])->fetch() : false;
    if (!$s) json_out(['error' => 'Link inválido'], 404);
    $sid = (int)$s['id'];

    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
        $in = json_decode(file_get_contents('php://input') ?: '', true);
        $wid = (int)($in['workout_id'] ?? 0);
        if (!q('SELECT 1 FROM workouts WHERE id=? AND student_id=?', [$wid, $sid])->fetch()) json_out(['error' => 'Treino inválido'], 400);
        $valid = array_map('intval', array_column(q('SELECT id FROM workout_exercises WHERE workout_id=?', [$wid])->fetchAll(), 'id'));
        $rows = [];
        foreach ((array)($in['logs'] ?? []) as $l) {
            $we = (int)($l['we_id'] ?? 0); $n = (int)($l['set'] ?? 0);
            if (!in_array($we, $valid, true) || $n < 1 || $n > 20) continue;
            $w = isset($l['weight']) && $l['weight'] !== '' ? round((float)$l['weight'], 2) : null;
            $r = isset($l['reps']) && $l['reps'] !== '' ? (int)$l['reps'] : null;
            if ($w !== null && ($w < 0 || $w > 2000)) $w = null;
            if ($r !== null && ($r < 0 || $r > 999)) $r = null;
            $rows["$we-$n"] = [$we, $n, $w, $r];
        }
        // data do treino pode vir do celular (envio atrasado); só aceita passado recente
        $at = strtotime((string)($in['at'] ?? ''));
        $when = ($at && $at <= time() && $at > time() - 30 * 86400) ? date('Y-m-d H:i:s', $at) : date('Y-m-d H:i:s');
        $pdo = db();
        $pdo->beginTransaction();
        q('INSERT INTO sessions (student_id,workout_id,finished_at) VALUES (?,?,?)', [$sid, $wid, $when]);
        $ses = (int)$pdo->lastInsertId();
        foreach ($rows as [$we, $n, $w, $r]) {
            q('INSERT INTO set_logs (session_id,workout_exercise_id,set_number,weight_kg,reps) VALUES (?,?,?,?,?)', [$ses, $we, $n, $w, $r]);
        }
        $pdo->commit();
        json_out(['ok' => true, 'saved' => count($rows)]);
    }

    $last = [];
    $cur = [];
    $st = q('SELECT sl.workout_exercise_id we, sl.session_id ses, sl.set_number n, sl.weight_kg w, sl.reps r, s.finished_at d
             FROM set_logs sl JOIN sessions s ON s.id=sl.session_id
             WHERE s.student_id=? ORDER BY s.finished_at DESC, s.id DESC, sl.set_number', [$sid]);
    foreach ($st as $r) {
        $we = $r['we'];
        $cur[$we] ??= $r['ses'];
        if ($cur[$we] !== $r['ses']) continue;
        $last[$we]['date'] = $r['d'];
        $last[$we]['sets'][] = ['n' => (int)$r['n'], 'w' => $r['w'] === null ? null : (float)$r['w'], 'r' => $r['r'] === null ? null : (int)$r['r']];
    }
    $lw = q('SELECT workout_id FROM sessions WHERE student_id=? ORDER BY finished_at DESC, id DESC LIMIT 1', [$sid])->fetchColumn();
    json_out([
        'name' => $s['name'], 'notes' => $s['notes'],
        'workouts' => student_workouts($sid),
        'last' => (object)$last,
        'last_workout_id' => $lw ? (int)$lw : null,
    ]);
}
?><!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#0f1115">
<title>Meu treino</title>
<link rel="stylesheet" href="assets/app.css">
</head>
<body class="aluno">
<main id="app"><p class="muted">Carregando…</p></main>
<div id="timer" hidden>
  <span id="tleft">0:00</span>
  <button id="tplus" type="button">+15 s</button>
  <button id="tskip" type="button">Pular</button>
</div>
<script>window.TOKEN = <?= json_encode($t) ?>;</script>
<script src="assets/aluno.js"></script>
</body>
</html>
