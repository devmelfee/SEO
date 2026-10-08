-- SEO Local Agency — schema completo, idempotente.
-- Rode no Supabase: Dashboard → SQL Editor → cole tudo → Run.
-- Pode rodar de novo sem quebrar nada: cria o que falta e ajusta o que já existe.

create extension if not exists pgcrypto;

-- ── agency_settings (1 linha: dados da agência) ─────────────────────────────
create table if not exists public.agency_settings (
  id uuid primary key default gen_random_uuid()
);
alter table public.agency_settings
  add column if not exists name text default '',
  add column if not exists consultant text default '',
  add column if not exists email text default '',
  add column if not exists whatsapp text default '',
  add column if not exists currency text default 'BRL',
  add column if not exists default_vertical text default '',
  add column if not exists default_city text default '',
  add column if not exists default_pricing text default '',
  add column if not exists updated_at timestamptz default now();

-- O protótipo gravava a chave do Supabase nesta tabela. Apaga essas colunas se existirem.
alter table public.agency_settings drop column if exists supabase_key;
alter table public.agency_settings drop column if exists supabase_url;

-- ── clients ─────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id uuid primary key default gen_random_uuid()
);
alter table public.clients
  add column if not exists name text default '',
  add column if not exists url text default '',
  add column if not exists vertical text default '',
  add column if not exists city text default '',
  add column if not exists pricing text default '',
  add column if not exists goal text default '',
  add column if not exists real_data text default '',
  add column if not exists completed_phases jsonb default '[]'::jsonb,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();
create index if not exists clients_updated_at_idx on public.clients (updated_at desc);

-- ── client_phases (uma linha por seção gerada de cada cliente) ──────────────
create table if not exists public.client_phases (
  id uuid primary key default gen_random_uuid()
);
alter table public.client_phases
  add column if not exists client_id uuid,
  add column if not exists phase_label text,
  add column if not exists content text default '',
  add column if not exists original_content text default '',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'client_phases_client_id_fkey') then
    alter table public.client_phases
      add constraint client_phases_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete cascade;
  end if;
end $$;

-- Remove duplicatas antigas (mantém a mais recente) antes de criar a chave única.
delete from public.client_phases a
using public.client_phases b
where a.client_id = b.client_id and a.phase_label = b.phase_label
  and (a.updated_at, a.id) < (b.updated_at, b.id);

create unique index if not exists client_phases_client_label_key
  on public.client_phases (client_id, phase_label);

-- ── places_searches (histórico de buscas no Google Places) ──────────────────
create table if not exists public.places_searches (
  id uuid primary key default gen_random_uuid()
);
alter table public.places_searches
  add column if not exists client_id uuid,
  add column if not exists query text,
  add column if not exists results jsonb default '[]'::jsonb,
  add column if not exists created_at timestamptz default now();

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'places_searches_client_id_fkey') then
    alter table public.places_searches
      add constraint places_searches_client_id_fkey
      foreign key (client_id) references public.clients(id) on delete set null;
  end if;
end $$;

-- ── Segurança ───────────────────────────────────────────────────────────────
-- RLS ligada e SEM políticas: só o servidor (service_role) acessa. A chave anon,
-- se vazar, não lê nem grava nada.
alter table public.agency_settings enable row level security;
alter table public.clients enable row level security;
alter table public.client_phases enable row level security;
alter table public.places_searches enable row level security;

-- Remove políticas abertas que o protótipo possa ter criado.
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies
           where schemaname = 'public'
             and tablename in ('agency_settings','clients','client_phases','places_searches')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ── prospects (Radar: leads encontrados no Google Maps) ─────────────────────
create table if not exists public.prospects (
  id uuid primary key default gen_random_uuid(),
  place_id text not null unique,
  query text default '',
  name text default '',
  address text default '',
  phone text default '',
  website text default '',
  maps_url text default '',
  rating numeric,
  reviews_count int default 0,
  primary_type text default '',
  types jsonb default '[]'::jsonb,
  has_hours boolean default false,
  photos_count int default 0,
  business_status text default '',
  lat double precision,
  lng double precision,
  rank_in_search int,
  score int default 0,
  issues jsonb default '[]'::jsonb,
  status text not null default 'novo' check (status in ('novo','abordado','proposta','fechado','descartado')),
  notes text default '',
  client_id uuid references public.clients(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists prospects_score_idx on public.prospects (score desc);
create index if not exists prospects_query_idx on public.prospects (query);
alter table public.prospects enable row level security;
