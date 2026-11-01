<?php
declare(strict_types=1);
require __DIR__ . '/../lib.php';
start_session();
$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    csrf_check();
    $ip = substr((string)($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
    q('DELETE FROM login_attempts WHERE created_at < NOW() - INTERVAL 1 DAY');
    $fails = (int)q('SELECT COUNT(*) FROM login_attempts WHERE ip=? AND created_at > NOW() - INTERVAL 15 MINUTE', [$ip])->fetchColumn();
    if ($fails >= 5) {
        http_response_code(429);
        $err = 'Muitas tentativas. Aguarde 15 minutos.';
    } else {
        $u = q('SELECT * FROM users WHERE email=?', [trim((string)($_POST['email'] ?? ''))])->fetch();
        if ($u && password_verify((string)($_POST['password'] ?? ''), $u['password_hash'])) {
            q('DELETE FROM login_attempts WHERE ip=?', [$ip]);
            session_regenerate_id(true);
            $_SESSION['uid'] = (int)$u['id'];
            header('Location: admin.php');
            exit;
        }
        q('INSERT INTO login_attempts (ip,created_at) VALUES (?,NOW())', [$ip]);
        $err = 'E-mail ou senha incorretos.';
    }
}
?><!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#02030a">
<title>Entrar</title>
<link rel="stylesheet" href="assets/login.css">
</head>
<body>
<div class="bg" aria-hidden="true">
  <i class="ring a"></i><i class="ring b"></i>
  <i class="streak s1"></i><i class="streak s2"></i><i class="streak s3"></i>
</div>
<main class="glass">
  <p class="brand">Treinos · Área do professor</p>
  <h1>Entrar</h1>
  <p class="sub">Bem-vindo de volta</p>
  <div class="seg" role="tablist" aria-label="Tipo de acesso">
    <button type="button" role="tab" id="tab-p" aria-selected="true" aria-controls="panel-p">Professor</button>
    <button type="button" role="tab" id="tab-a" aria-selected="false" aria-controls="panel-a" tabindex="-1">Aluno</button>
  </div>
  <?php if ($err): ?><p class="err" role="alert"><?= e($err) ?></p><?php endif ?>
  <form method="post" id="panel-p" role="tabpanel" aria-labelledby="tab-p">
    <?= csrf_field() ?>
    <label class="field">
      <input type="email" name="email" placeholder="E-mail" aria-label="E-mail" autocomplete="username" required autofocus>
      <span class="ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"/></svg></span>
    </label>
    <label class="field">
      <input type="password" id="pw" name="password" placeholder="Senha" aria-label="Senha" autocomplete="current-password" required>
      <button type="button" class="ico" id="eye" aria-label="Mostrar senha"><svg viewBox="0 0 24 24"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path id="slash" d="M4 4l16 16"/></svg></button>
    </label>
    <button class="go">Entrar</button>
  </form>
  <form id="panel-a" role="tabpanel" aria-labelledby="tab-a" hidden>
    <p class="hint">Cole o link que o professor enviou para você.</p>
    <label class="field">
      <input type="text" id="link" placeholder="Link do treino" aria-label="Link do treino" autocomplete="off" required>
    </label>
    <p class="err" id="aerr" role="alert" hidden>Link inválido. Confira se copiou o endereço inteiro.</p>
    <button class="go">Abrir treino</button>
  </form>
</main>
<script>
  const tabs = [document.getElementById('tab-p'), document.getElementById('tab-a')];
  const panels = [document.getElementById('panel-p'), document.getElementById('panel-a')];
  const seg = document.querySelector('.seg');
  function pick(i) {
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', j === i); t.tabIndex = j === i ? 0 : -1; panels[j].hidden = j !== i; });
    seg.dataset.on = i;
  }
  tabs.forEach((t, i) => {
    t.onclick = () => pick(i);
    t.onkeydown = e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { pick(1 - i); tabs[1 - i].focus(); } };
  });
  panels[1].onsubmit = e => {
    e.preventDefault();
    const m = document.getElementById('link').value.match(/[a-f0-9]{64}/i);
    document.getElementById('aerr').hidden = !!m;
    if (m) location.href = 'aluno.php?t=' + m[0].toLowerCase();
  };
  const pw = document.getElementById('pw'), eye = document.getElementById('eye'), slash = document.getElementById('slash');
  eye.onclick = () => {
    const show = pw.type === 'password';
    pw.type = show ? 'text' : 'password';
    slash.style.display = show ? 'none' : '';
    eye.setAttribute('aria-label', show ? 'Ocultar senha' : 'Mostrar senha');
  };
</script>
</body>
</html>
