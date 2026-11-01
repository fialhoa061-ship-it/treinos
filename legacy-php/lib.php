<?php
declare(strict_types=1);

function cfg(): array {
    static $c;
    return $c ??= require __DIR__ . '/config/config.php';
}

function db(): PDO {
    static $pdo;
    if (!$pdo) {
        $c = cfg();
        $pdo = new PDO("mysql:host={$c['db_host']};dbname={$c['db_name']};charset=utf8mb4", $c['db_user'], $c['db_pass'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function q(string $sql, array $args = []): PDOStatement {
    $st = db()->prepare($sql);
    $st->execute($args);
    return $st;
}

function e($s): string { return htmlspecialchars((string)$s, ENT_QUOTES, 'UTF-8'); }

function start_session(): void {
    if (session_status() === PHP_SESSION_NONE) {
        session_set_cookie_params(['httponly' => true, 'samesite' => 'Lax', 'secure' => !empty($_SERVER['HTTPS'])]);
        session_start();
    }
}

function csrf(): string {
    start_session();
    return $_SESSION['csrf'] ??= bin2hex(random_bytes(16));
}

function csrf_field(): string { return '<input type="hidden" name="csrf" value="' . e(csrf()) . '">'; }

function csrf_check(): void {
    start_session();
    $t = $_POST['csrf'] ?? $_SERVER['HTTP_X_CSRF'] ?? '';
    if (!is_string($t) || !hash_equals($_SESSION['csrf'] ?? '', $t)) {
        http_response_code(403);
        exit('CSRF inválido');
    }
}

function is_admin(): bool { start_session(); return !empty($_SESSION['uid']); }

function require_admin(): void {
    if (!is_admin()) { header('Location: login.php'); exit; }
}

function json_out($data, int $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function new_token(): string { return bin2hex(random_bytes(32)); }

function imc(?string $kg, ?string $m): ?float {
    return ($kg && $m && (float)$m > 0) ? round((float)$kg / ((float)$m ** 2), 1) : null;
}

function student_url(string $token): string {
    $base = cfg()['base_url'] ?: ((!empty($_SERVER['HTTPS']) ? 'https' : 'http') . '://' . $_SERVER['HTTP_HOST']);
    $dir = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/\\');
    return $base . $dir . '/aluno.php?t=' . $token;
}

/** Treinos + exercícios de um aluno (array aninhado). */
function student_workouts(int $sid): array {
    $ws = q('SELECT * FROM workouts WHERE student_id=? ORDER BY position,id', [$sid])->fetchAll();
    foreach ($ws as &$w) {
        $w['exercises'] = q('SELECT * FROM workout_exercises WHERE workout_id=? ORDER BY position,id', [$w['id']])->fetchAll();
    }
    return $ws;
}
