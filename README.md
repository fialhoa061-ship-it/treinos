# Treinos

App de gestão de treinos de musculação. PHP 8+ (PDO/MySQL), HTML/CSS/JS puro, sem build.

- **Professor:** `/login.php` (e-mail + senha). Gerencia alunos, treinos, exercícios, biblioteca, histórico e backup.
- **Aluno:** `/aluno.php?t=TOKEN`, sem senha. Vê só o próprio treino.

## Rodar localmente

1. Crie o banco e importe o SQL:
   ```
   mysql -u root -e "CREATE DATABASE treinos CHARACTER SET utf8mb4"
   mysql -u root treinos < sql/schema.sql
   mysql -u root treinos < sql/seed.sql
   ```
2. `copy config\config.example.php config\config.php` e preencha as credenciais.
3. `php -S localhost:8000 -t public`
4. Abra:
   - Professor: http://localhost:8000/login.php — `professor@exemplo.com` / `trocar123` (**troque a senha**).
   - Aluna "Mãe": http://localhost:8000/aluno.php?t=a1b2c3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e8f90
     (token de teste do seed; no admin, "Gerar novo link" cria um token aleatório e invalida este).

Para trocar a senha do professor, gere um hash com `php -r "echo password_hash('NOVA', PASSWORD_DEFAULT);"` e rode `UPDATE users SET password_hash='...' WHERE email='professor@exemplo.com';`.

## Hospedagem compartilhada (Hostinger/cPanel)

1. No hPanel/cPanel crie o banco MySQL e o usuário. Anote host, nome, usuário e senha.
2. Em **phpMyAdmin → Importar**, importe `sql/schema.sql` e depois `sql/seed.sql`.
3. Envie os arquivos. Ideal: `public/` vira o conteúdo de `public_html/`, e `config/`, `sql/` e `lib.php` ficam **um nível acima**, fora da web. Nesse caso ajuste o caminho em `public/*.php` (`require __DIR__ . '/../lib.php'`) para onde `lib.php` estiver.
   Se enviar tudo dentro de `public_html/`, bloqueie `config/`, `sql/` e `lib.php` com um `.htaccess` (`Require all denied`) e aponte o domínio para a subpasta `public/`.
4. Copie `config/config.example.php` para `config/config.php` e preencha. Se estiver atrás de proxy/domínio diferente, preencha `base_url`.
5. Use HTTPS. Escolha PHP 8.1+ no painel.
6. Apague o `seed.sql` do servidor depois de importar e troque a senha do professor.

## Notas

- Sessão em andamento fica no `localStorage` do celular (por treino) e vai ao servidor em "Finalizar treino".
- Vídeos: YouTube (watch, youtu.be, shorts), Vimeo e `.mp4`; carregam só ao clicar em "▶ Ver execução". Sem vídeo, mostra busca no YouTube.
- Backup: **Backup → Exportar JSON**. Importar **substitui todos os dados**. O arquivo inclui os tokens dos alunos; guarde com cuidado.
