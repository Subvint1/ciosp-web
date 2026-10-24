-- =====================================================================
-- CIOSP Web - esquema do banco (Supabase / Postgres)
-- Rodar UMA vez, num projeto vazio: SQL Editor > New query > colar > Run.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Tipos
-- ---------------------------------------------------------------------
create type public.papel as enum
  ('operador', 'supervisor_turno', 'supervisor_geral', 'admin');

create type public.turno as enum
  ('madrugada', 'manha', 'tarde', 'noite');

-- Turno de uma hora, no fuso de Cuiaba: 00-06, 06-12, 12-18, 18-24.
-- E "immutable" para poder alimentar uma coluna calculada.
create or replace function public.turno_de(ts timestamptz)
returns public.turno
language sql
immutable
parallel safe
set search_path = ''
as $$
  select (case
            when h < 6  then 'madrugada'
            when h < 12 then 'manha'
            when h < 18 then 'tarde'
            else 'noite'
          end)::public.turno
  from (select extract(hour from ts at time zone 'America/Cuiaba')::int as h) s
$$;

-- ---------------------------------------------------------------------
-- 2. Tabelas
-- ---------------------------------------------------------------------

-- Uma linha por pessoa. O "id" e o mesmo do login (auth.users).
-- "turno" do perfil serve so para identificacao e para saber qual
-- supervisor cuida da conta. NUNCA decide onde a checagem conta.
create table public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  login         text not null unique check (login ~ '^[a-z0-9._-]{3,30}$'),
  nome          text not null check (length(trim(nome)) between 1 and 80),
  papel         public.papel not null default 'operador',
  turno         public.turno,
  meta_diaria   int not null default 70 check (meta_diaria between 1 and 2000),
  ativo         boolean not null default true,
  trocar_senha  boolean not null default true,
  criado_em     timestamptz not null default now(),
  constraint turno_obrigatorio
    check (papel in ('supervisor_geral', 'admin') or turno is not null)
);
create index on public.perfis (turno);

-- Cada checagem contada. O "id" vem da extensao: se ela reenviar a
-- mesma checagem (fila offline), o banco ignora a repeticao.
-- "turno" e "dia" sao calculados pela hora em que a checagem aconteceu.
create table public.checagens (
  id           uuid primary key,
  usuario_id   uuid not null references public.perfis (id),
  ocorreu_em   timestamptz not null,
  recebida_em  timestamptz not null default now(),
  turno        public.turno
    generated always as (public.turno_de(ocorreu_em)) stored,
  dia          date
    generated always as ((ocorreu_em at time zone 'America/Cuiaba')::date) stored
);
create index on public.checagens (usuario_id, dia);
create index on public.checagens (turno, dia);

-- Historico da planilha antiga: so existe o total por dia.
create table public.contagens_importadas (
  usuario_id  uuid not null references public.perfis (id),
  dia         date not null,
  total       int  not null check (total >= 0),
  primary key (usuario_id, dia)
);

-- Quem fez o que (criar conta, trocar turno, gerar senha...).
create table public.auditoria (
  id         bigint generated always as identity primary key,
  autor_id   uuid references public.perfis (id),
  acao       text not null,
  alvo_id    uuid,
  detalhes   jsonb,
  criado_em  timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3. Funcoes auxiliares das regras de acesso
--    "security definer" = rodam com permissao do dono, para consultar
--    perfis sem cair em recursao das proprias regras.
-- ---------------------------------------------------------------------
create or replace function public.meu_papel()
returns public.papel
language sql stable security definer
set search_path = ''
as $$
  select papel from public.perfis where id = auth.uid() and ativo
$$;

create or replace function public.meu_turno()
returns public.turno
language sql stable security definer
set search_path = ''
as $$
  select turno from public.perfis where id = auth.uid() and ativo
$$;

-- Quem pode ver os dados de uma pessoa (pelo turno do PERFIL dela).
create or replace function public.pode_ver_usuario(alvo uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select a.id = auth.uid()
        or public.meu_papel() in ('supervisor_geral', 'admin')
        or (public.meu_papel() = 'supervisor_turno'
            and a.turno = public.meu_turno())
    from public.perfis a
    where a.id = alvo
  ), false)
$$;

-- Quem pode criar uma conta com esse papel e turno.
-- A API de cadastro consulta isto ANTES de usar a chave de servico.
create or replace function public.pode_criar(p_papel public.papel, p_turno public.turno)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(
    case public.meu_papel()
      when 'admin' then true
      when 'supervisor_geral'
        then p_papel in ('operador', 'supervisor_turno') and p_turno is not null
      when 'supervisor_turno'
        then p_papel = 'operador' and p_turno = public.meu_turno()
      else false
    end, false)
$$;

-- Quem pode editar, desativar ou gerar nova senha de uma conta existente.
-- Ninguem gerencia a propria conta por aqui.
create or replace function public.pode_gerir(alvo uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce((
    select public.pode_criar(a.papel, a.turno)
    from public.perfis a
    where a.id = alvo and a.id <> auth.uid()
  ), false)
$$;

-- Mudar o turno de alguem: so supervisor geral e admin.
create or replace function public.pode_mudar_turno()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select coalesce(public.meu_papel() in ('supervisor_geral', 'admin'), false)
$$;

-- ---------------------------------------------------------------------
-- 4. Row Level Security: ligada em tudo, e SEM policy de escrita.
--    Ninguem escreve direto nas tabelas; so pelas funcoes da secao 5
--    (e pela chave de servico no servidor, que ignora as regras).
-- ---------------------------------------------------------------------
alter table public.perfis               enable row level security;
alter table public.checagens            enable row level security;
alter table public.contagens_importadas enable row level security;
alter table public.auditoria            enable row level security;

create policy perfis_leitura on public.perfis
  for select to authenticated
  using (
    public.pode_ver_usuario(id)
    or (public.meu_papel() = 'operador' and turno = public.meu_turno())
  );

create policy checagens_leitura on public.checagens
  for select to authenticated
  using (
    usuario_id = auth.uid()
    or public.meu_papel() in ('supervisor_geral', 'admin')
    or (public.meu_papel() = 'supervisor_turno'
        and (turno = public.meu_turno() or public.pode_ver_usuario(usuario_id)))
  );

create policy importadas_leitura on public.contagens_importadas
  for select to authenticated
  using (public.pode_ver_usuario(usuario_id));

create policy auditoria_leitura on public.auditoria
  for select to authenticated
  using (public.meu_papel() = 'admin');

-- Visao com totais por dia e turno. "security_invoker" faz a visao
-- obedecer as regras de quem consulta, e nao as do dono.
create view public.contagem_diaria
with (security_invoker = true) as
  select c.usuario_id, c.dia, c.turno,
         count(*)::int as total,
         'extensao'::text as origem
  from public.checagens c
  group by c.usuario_id, c.dia, c.turno
  union all
  select i.usuario_id, i.dia, p.turno, i.total, 'importado'::text
  from public.contagens_importadas i
  join public.perfis p on p.id = i.usuario_id;

-- ---------------------------------------------------------------------
-- 5. Funcoes que o site e a extensao chamam
-- ---------------------------------------------------------------------

-- Registra UMA checagem do usuario logado. Devolve true se era nova e
-- false se o mesmo id ja existia. O usuario nunca escolhe "de quem" e.
create or replace function public.registrar_checagem(
  p_id uuid,
  p_ocorreu_em timestamptz default now()
)
returns boolean
language plpgsql security definer
set search_path = ''
as $$
declare
  v_linhas int;
begin
  if auth.uid() is null or public.meu_papel() is null then
    raise exception 'sem acesso';
  end if;
  if p_ocorreu_em > now() + interval '5 minutes'
     or p_ocorreu_em < now() - interval '7 days' then
    raise exception 'horario invalido';
  end if;

  insert into public.checagens (id, usuario_id, ocorreu_em)
  values (p_id, auth.uid(), p_ocorreu_em)
  on conflict (id) do nothing;

  get diagnostics v_linhas = row_count;
  return v_linhas = 1;
end
$$;

-- Cada um define a propria meta.
create or replace function public.definir_minha_meta(p_meta int)
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if public.meu_papel() is null then
    raise exception 'sem acesso';
  end if;
  update public.perfis set meta_diaria = p_meta where id = auth.uid();
end
$$;

-- Chamada depois que a pessoa troca a senha provisoria.
create or replace function public.concluir_troca_senha()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  update public.perfis set trocar_senha = false where id = auth.uid();
end
$$;

-- Placar de um turno (por hora da checagem) num dia, com total do mes.
-- Operador e supervisor de turno veem o turno do proprio perfil e o
-- turno em que estao agora. Supervisor geral e admin veem todos.
create or replace function public.placar(
  p_turno public.turno,
  p_dia   date default null
)
returns table (
  usuario_id   uuid,
  nome         text,
  turno_perfil public.turno,
  total_dia    int,
  total_mes    int
)
language plpgsql stable security definer
set search_path = ''
as $$
declare
  v_dia   date := coalesce(p_dia, (now() at time zone 'America/Cuiaba')::date);
  v_ini   date := date_trunc('month', coalesce(p_dia, (now() at time zone 'America/Cuiaba')::date))::date;
  v_papel public.papel := public.meu_papel();
begin
  if v_papel is null then
    raise exception 'sem acesso';
  end if;
  if v_papel in ('operador', 'supervisor_turno')
     and p_turno is distinct from public.meu_turno()
     and p_turno is distinct from public.turno_de(now()) then
    raise exception 'sem acesso a este turno';
  end if;

  return query
  with chk as (
    select c.usuario_id as uid,
           count(*) filter (where c.dia = v_dia)::int as dia_n,
           count(*)::int as mes_n
    from public.checagens c
    where c.turno = p_turno and c.dia between v_ini and v_dia
    group by c.usuario_id
  ),
  imp as (
    select i.usuario_id as uid,
           coalesce(sum(i.total) filter (where i.dia = v_dia), 0)::int as dia_n,
           sum(i.total)::int as mes_n
    from public.contagens_importadas i
    join public.perfis pp on pp.id = i.usuario_id
    where pp.turno = p_turno and i.dia between v_ini and v_dia
    group by i.usuario_id
  )
  select p.id, p.nome, p.turno,
         coalesce(chk.dia_n, 0) + coalesce(imp.dia_n, 0),
         coalesce(chk.mes_n, 0) + coalesce(imp.mes_n, 0)
  from public.perfis p
  left join chk on chk.uid = p.id
  left join imp on imp.uid = p.id
  where p.ativo
    and (chk.uid is not null or imp.uid is not null or p.turno = p_turno)
  order by 4 desc, p.nome;
end
$$;

-- ---------------------------------------------------------------------
-- 6. Permissoes de execucao
--    Visitante sem login (anon) nao pode nada. Logado so chama o que
--    esta listado aqui e so le (nunca escreve) as tabelas.
-- ---------------------------------------------------------------------
revoke all on public.perfis, public.checagens,
              public.contagens_importadas, public.auditoria,
              public.contagem_diaria from anon;

revoke insert, update, delete, truncate on public.perfis, public.checagens,
              public.contagens_importadas, public.auditoria from authenticated;
grant select on public.perfis, public.checagens,
              public.contagens_importadas, public.auditoria,
              public.contagem_diaria to authenticated;

revoke all on function
  public.meu_papel(), public.meu_turno(), public.pode_ver_usuario(uuid),
  public.pode_criar(public.papel, public.turno), public.pode_gerir(uuid),
  public.pode_mudar_turno(), public.registrar_checagem(uuid, timestamptz),
  public.definir_minha_meta(int), public.concluir_troca_senha(),
  public.placar(public.turno, date)
from public, anon;

grant execute on function
  public.meu_papel(), public.meu_turno(), public.pode_ver_usuario(uuid),
  public.pode_criar(public.papel, public.turno), public.pode_gerir(uuid),
  public.pode_mudar_turno(), public.registrar_checagem(uuid, timestamptz),
  public.definir_minha_meta(int), public.concluir_troca_senha(),
  public.placar(public.turno, date)
to authenticated;

commit;

-- =====================================================================
-- PASSOS MANUAIS DEPOIS DE RODAR (nao fazem parte do script):
--
-- A) Authentication > Providers > Email: desligar "Confirm email".
--    Authentication > Sign In / Providers: desligar "Allow new users to
--    sign up" (so o servidor cria contas).
--
-- B) Primeiro admin: Authentication > Users > Add user, com e-mail
--    victor@ciosp.interno e uma senha forte (marcar "Auto Confirm").
--    Copiar o UUID dele e rodar:
--
--    insert into public.perfis
--      (id, login, nome, papel, turno, meta_diaria, trocar_senha)
--    values
--      ('COLE-O-UUID-AQUI', 'victor', 'VICTOR', 'admin', 'tarde', 144, false);
--
-- C) Teste rapido de acesso (simula o usuario logado, sem alterar nada):
--
--    begin;
--    set local role authenticated;
--    select set_config('request.jwt.claims',
--                      '{"sub":"COLE-O-UUID-AQUI","role":"authenticated"}', true);
--    select public.registrar_checagem(gen_random_uuid());
--    select * from public.placar('tarde');
--    rollback;
-- =====================================================================
