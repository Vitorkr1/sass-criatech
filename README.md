# Cria Tech — Painel de Servicos e Contratos

Sistema para a Cria Tech controlar os servicos prestados (Site, Sistema, Designer, Midia),
gerar contratos em PDF automaticamente e acompanhar a divisao de valores 50/50 entre
**Vitor** e **Lucas**, com relatorios financeiros.

Banco de dados: **PostgreSQL** (funciona com Supabase, com o Postgres do proprio Render,
ou com um Postgres local).

## O que o sistema faz

- Cadastra um novo servico/contrato: cliente, tipo de servico, periodo, valor e descricao.
- Gera automaticamente um **contrato em PDF** (na hora, sem precisar de disco/arquivo salvo).
- Divide o valor automaticamente **50% para Vitor e 50% para Lucas** e guarda isso no banco.
- Lista todos os contratos, com busca e filtros por tipo/status.
- Permite marcar contrato como **pago / pendente / cancelado**.
- Gera **relatorio financeiro** por periodo, total geral, total de cada socio e total por tipo de servico.
- Layout responsivo (funciona bem no computador e no celular).

---

## OPCAO 1 — Rodar online (Render + Supabase) — recomendado

### Passo 1: criar o banco no Supabase

1. Va em [supabase.com](https://supabase.com) e crie uma conta gratis.
2. Clique em **New Project**. Escolha um nome (ex: `cria-tech`) e defina uma senha do
   banco — **anote essa senha**, voce vai precisar dela.
3. Aguarde o projeto ser criado (leva cerca de 1-2 minutos).
4. No menu lateral, va em **SQL Editor** > **New query**.
5. Abra o arquivo `database/schema.sql` deste projeto, copie todo o conteudo, cole no
   editor do Supabase e clique em **Run**. Isso cria a tabela `contratos`.
6. Agora va em **Project Settings** (icone de engrenagem) > **Database**.
7. Em **Connection string**, escolha a aba **URI** e copie a string. Ela se parece com:
   ```
   postgresql://postgres:[SUA-SENHA]@db.xxxxxxxxxxxx.supabase.co:5432/postgres
   ```
8. Substitua `[SUA-SENHA]` pela senha que voce definiu no passo 2. Guarde essa URL
   completa — e o seu `DATABASE_URL`.

> Dica: se sua senha tiver caracteres especiais (@, #, %, etc.), o Supabase ja mostra a
> string com eles corretamente codificados na aba URI — use exatamente o que ele gerar.

### Passo 2: subir o codigo no GitHub

O Render precisa de um repositorio para fazer o deploy.

1. Crie um repositorio novo no [GitHub](https://github.com/new) (pode ser privado).
2. Suba os arquivos deste projeto para o repositorio (pelo GitHub Desktop, ou:
   ```bash
   git init
   git add .
   git commit -m "Cria Tech SaaS"
   git branch -M main
   git remote add origin https://github.com/SEU-USUARIO/SEU-REPO.git
   git push -u origin main
   ```
   ).

### Passo 3: deploy no Render

1. Va em [render.com](https://render.com) e crie uma conta (da para entrar com o GitHub).
2. Clique em **New +** > **Web Service**.
3. Conecte sua conta do GitHub e selecione o repositorio que voce acabou de criar.
4. O Render deve detectar o `render.yaml` automaticamente e preencher tudo (Build
   Command: `npm install`, Start Command: `npm start`). Se nao detectar, preencha
   manualmente:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free
5. Antes de clicar em criar, va em **Environment Variables** e adicione:
   | Key | Value |
   |---|---|
   | `DATABASE_URL` | a connection string do Supabase (passo 1.8) |
   | `DB_SSL` | `true` |
6. Clique em **Create Web Service**. O Render vai instalar as dependencias e subir o
   servidor — acompanhe pelos logs.
7. Quando terminar, o Render te da uma URL tipo `https://cria-tech-saas.onrender.com`.
   Abra essa URL e o painel vai carregar.

**Pronto — o sistema esta no ar, com banco de dados online no Supabase.**

### Sobre o plano gratuito

- O Render free "dorme" o servico apos alguns minutos sem uso — a primeira requisicao
  depois disso demora ~30-50s para acordar. Normal, os proximos acessos ficam rapidos.
- O Supabase free tier pausa o projeto apos 7 dias sem uso; e so entrar no painel do
  Supabase para reativar.
- Os PDFs sao gerados **na hora**, a partir dos dados salvos no banco — nao dependem do
  disco do servidor, entao continuam funcionando normalmente mesmo com o Render
  reiniciando o container (o que acontece com frequencia no plano free).

---

## OPCAO 2 — Rodar na sua maquina (local)

### Requisitos

- [Node.js](https://nodejs.org) 18+
- Uma conta gratuita no [Supabase](https://supabase.com) (mais simples) **ou**
  PostgreSQL instalado localmente.

### Passo a passo

1. Instale as dependencias:
   ```bash
   npm install
   ```
2. Crie o banco: siga o **Passo 1** da secao do Render acima (ou, se preferir Postgres
   local, importe `database/schema.sql` com `psql -U postgres -d cria_tech -f database/schema.sql`).
3. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```
4. Edite o `.env` e cole seu `DATABASE_URL`. Se for Postgres local sem SSL, mude
   `DB_SSL` para `false`.
5. Rode:
   ```bash
   npm start
   ```
6. Abra **http://localhost:3000**.

---

## Estrutura do projeto

```
cria-tech-saas/
├── server.js           -> servidor Express e rotas da API
├── db.js                -> conexao com o PostgreSQL (Supabase/Render/local)
├── pdfGenerator.js       -> geracao dos contratos em PDF (em memoria)
├── database/schema.sql   -> script para criar a tabela no Postgres
├── render.yaml            -> configuracao de deploy automatico no Render
├── public/
│   ├── index.html         -> tela do sistema
│   ├── style.css          -> visual (tema escuro, responsivo)
│   └── script.js          -> logica do painel (chama a API)
└── .env                  -> suas credenciais do banco (voce cria a partir do .env.example)
```

## Como funciona a divisao de valores

Toda vez que um contrato e criado com um `valor_total`, o sistema calcula automaticamente:

- `valor_vitor` = metade do valor
- `valor_lucas` = metade do valor (resto, para casos de centavos impares)

Esses dois valores ficam guardados no banco, junto com o contrato, e aparecem no
Painel e no Relatorio somados por socio.

## Duvidas comuns

**"Erro ao carregar painel / nao foi possivel conectar ao banco"**
→ Confira se o `DATABASE_URL` no `.env` (local) ou nas variaveis de ambiente do Render
esta correto e se voce rodou o `schema.sql` no Supabase.

**Erro de SSL ao conectar**
→ Supabase e Render exigem conexao SSL. Deixe `DB_SSL=true`. So use `false` se for
Postgres local sem SSL configurado.

**Quero mudar o texto padrao dos contratos**
→ Edite o arquivo `pdfGenerator.js`, no objeto `OBJETOS_POR_TIPO` (texto do objeto do
contrato) e nas secoes `doc.text(...)` dentro da funcao `gerarContratoPDF`.

**O Render "dormiu" e demorou pra abrir**
→ Normal no plano free. Depois do primeiro acesso, fica rapido ate ele dormir de novo
por inatividade.
