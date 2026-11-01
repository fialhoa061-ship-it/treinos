# Treinos

Web app de gestão de treinos de musculação. Next.js (App Router) + Postgres (Neon), pronto para a Vercel e instalável no celular.

- **Professor:** `/login` (e-mail + senha). Gerencia alunos, treinos, exercícios, biblioteca, histórico com gráfico e backup JSON.
- **Aluno:** `/aluno/<token>`, sem senha. Vê só o próprio treino, marca séries, registra cargas e usa o timer de descanso. O progresso fica no celular e o envio ao finalizar tem fila offline.

## Rodar localmente

```bash
npm install
vercel link && vercel env pull .env.local     # DATABASE_URL (Neon) e SESSION_SECRET
node --env-file=.env.local scripts/db.mjs schema
SEED_EMAIL=voce@email.com SEED_PASSWORD='sua-senha' node --env-file=.env.local scripts/db.mjs seed
npm run dev
```

Sem a Vercel: crie um Postgres (Neon, Supabase…), defina `DATABASE_URL` e `SESSION_SECRET` (32+ caracteres aleatórios) em `.env.local` e rode os mesmos comandos.

O seed cria o professor, a aluna "Mãe" e os 4 treinos (sem vídeos) e imprime o token da aluna.

## Deploy (Vercel)

1. Banco: Marketplace da Vercel → Neon (`vercel integration add neon`). As variáveis entram no projeto sozinhas.
2. `SESSION_SECRET` nos três ambientes (`vercel env add SESSION_SECRET`).
3. `vercel deploy --prod`.

## Notas

- Admin protegido por cookie de sessão (JWT assinado, HttpOnly). Server Actions checam a sessão em toda ação.
- Login com limite de tentativas: 5 erros por IP bloqueiam por 15 minutos.
- Vídeos: YouTube (watch, youtu.be, shorts), Vimeo e `.mp4`; abrem só ao clicar em "▶ Ver execução".
- Backup: **Backup → Exportar JSON**. Importar **substitui todos os dados** e aceita o formato do backup da versão PHP. O arquivo inclui os tokens dos alunos.
- `legacy-php/` guarda a versão anterior em PHP/MySQL (hospedagem compartilhada). Não é usada pelo app novo.
