---
version: 1
slug: "app-admin-page-tsx"
primary_target: "app/admin/page.tsx"
related_targets: ["app/treino/Aluno.tsx"]
---

# Surface: app (painel do professor + treino do aluno)

Scope: todas as telas exceto /login. Mode: Operate. Mobile-first (professor e aluno no celular).
Audience/job: aluno executa e registra séries no meio do treino; professor cadastra alunos, monta treinos, envia código.
Constraints: login intocado; sem fotos reais; sem métricas inventadas; pt-BR.
Pinned by user: replicar a gramática visual da referência (app fitness escuro, cards arredondados, pills, números grandes, barra de abas inferior com + central), trocando o verde-limão por azul elétrico.

## Direction contract

THESIS: o treino como painel de instrumentos escuro: números grandes em azul elétrico sobre grafite, cada tela lê como um app nativo de academia. Recusa o "glass" decorativo e o painel admin de tabela.

OWN-WORLD: fundo #111214, cards #1C1D21 raio 28px, linhas internas #26272C raio 20px, controles #313238; acento único azul elétrico (#2F6BFF preenchimento, #6F9DFF texto); Manrope; pills 999px; ícones SVG traço 1.75; barra inferior escura com botão + azul circular.

STORY: o aluno vê de cara quanto do treino de hoje já fez, escolhe A/B/C em pills e marca séries; ao finalizar recebe um card azul de conclusão. O professor vê a lista de alunos, abre um, envia o código pelo WhatsApp em um toque e edita treinos.

FIRST VIEWPORT: aluno: saudação com avatar de iniciais à esquerda e botão sair redondo à direita; card "Treino de hoje" com número grande "3/18 séries" e barra azul; pills de treino. Professor: título "Alunos", lista de linhas com avatar e chevron; barra inferior com + central.

FORM: referência fixada pelo usuário (posição 1, pinned; sem sorteio). Seed: pinned-by-user.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
