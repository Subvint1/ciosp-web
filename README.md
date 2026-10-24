# CIOSP Contador (site)

Site do contador de checagens: login, painel do operador, placar do turno e perfil.
Next.js 15 + Supabase. O banco (tabelas e regras de acesso) está em `supabase/ciosp_schema.sql`.

## Rodar no computador

1. Instale o Node.js 22 (LTS).
2. Copie `.env.example` para `.env.local`.
3. `npm install` e depois `npm run dev`.
4. Abra http://localhost:3000.

## Publicar no Vercel

1. Suba esta pasta para um repositório no GitHub (sem `node_modules`, `.next` e `.env.local`).
2. No Vercel: Add New > Project > importe o repositório.
3. Em Environment Variables, cadastre as duas variáveis do `.env.example`.
4. Deploy.

## Como as regras funcionam

- Quem decide o que cada pessoa vê é o banco (Row Level Security), não o site.
- Cada checagem conta para o turno da hora em que foi feita e para o operador.
  O turno do perfil serve só para identificação.
- O login é curto (ex.: `victor`). Por baixo vira `victor@ciosp.interno`, só porque o
  Supabase exige um e-mail. Ninguém recebe mensagem nesse endereço.
