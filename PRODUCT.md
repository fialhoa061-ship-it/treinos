# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Professor (personal trainer):** cadastra alunos, monta os treinos (A, B, C…), mantém a biblioteca de exercícios, acompanha o histórico de cargas e faz backup. Usa o painel principalmente no **celular**.
- **Aluno:** abre o próprio treino no celular durante a academia, marca as séries, registra carga e repetições e usa o timer de descanso. Muitas vezes com uma mão só, entre séries, às vezes sem internet.

## Product Purpose

Substituir a planilha e o PDF de treino: o professor monta e ajusta o treino num lugar só e o aluno executa e registra a evolução de carga no celular. Sucesso é o aluno abrir, treinar e finalizar sem atrito, e o professor ver a evolução de cada exercício.

## Positioning

App pessoal de um professor e seus alunos, não uma plataforma de academia. Acesso do aluno por código de 6 números enviado pelo WhatsApp, sem cadastro nem senha.

## Operating Context

- Aluno: na academia, entre séries, tela do celular, iluminação variada, conexão instável (fila offline ao finalizar).
- Professor: no celular, entre atendimentos; envia o código ao aluno pelo WhatsApp.

## Capabilities and Constraints

- Next.js (App Router) + Postgres (Neon), deploy na Vercel, instalável como PWA.
- Professor: login por e-mail e senha. Aluno: código de 6 dígitos, sessão de 30 dias.
- Treinos com exercícios (séries, repetições, descanso, observações, vídeo do YouTube/Vimeo/mp4), sugestão de subir carga, calendário de frequência, histórico com gráfico, backup JSON.
- Interface em português do Brasil.
- Não há fotos de exercícios nem de pessoas no produto; vídeos são links externos.

## Brand Commitments

- Nome no app: "Treinos" / abertura "FIT APP".
- Cor de destaque: **azul elétrico** (substitui o verde-limão da referência visual escolhida pelo usuário).
- A tela de login mantém o visual atual e não entra em redesenhos do resto do app.

## Evidence on Hand

Nenhum depoimento, número de clientes ou foto real. Não inventar.

## Product Principles

1. O aluno no meio do treino vem primeiro: alvos grandes, números legíveis, nada que exija precisão.
2. Nunca perder registro de treino (fila offline, salvamento local).
3. O professor resolve tudo pelo celular, em poucos toques.
4. Simples e pessoal: sem gamificação nem métricas inventadas.
