-- Beyblade X Workshop schema.
-- Public can read everything. Only admins (emails in public.admins) can write via the API.
-- The scraper uses the service-role key (bypasses RLS) and only writes parts/products/product_contents/scrape_runs.

create table public.parts (
  slug text primary key,
  kind text not null check (kind in ('blade','ratchet','bit','lock_chip','main_blade','assist_blade','metal_blade','over_blade')),
  name text not null,
  abbr text,
  line text check (line in ('BX','UX','CX')),
  codes text[] not null default '{}',
  type text check (type in ('attack','defense','stamina','balance')),
  type_source text,
  weight_g numeric,
  spin text check (spin in ('right','left','dual')),
  contact_points int,
  protrusions int,
  height numeric,
  official jsonb not null default '{}',
  behaviour text,
  gimmick boolean not null default false,
  description text,
  release_date text,
  image_original text,
  image_pixel text,
  source_url text,
  updated_at timestamptz not null default now()
);
create index parts_kind_idx on public.parts (kind);

create table public.products (
  slug text primary key,
  code text not null,
  name text not null,
  product_type text not null,
  line text,
  type text,
  spin text,
  weight_g numeric,
  release_date text,
  notes text,
  description text,
  image_original text,
  image_pixel text,
  source_url text,
  updated_at timestamptz not null default now()
);

create table public.product_contents (
  product_slug text not null references public.products (slug) on delete cascade,
  part_slug text not null references public.parts (slug) on delete cascade,
  qty int not null default 1,
  primary key (product_slug, part_slug)
);
create index product_contents_part_idx on public.product_contents (part_slug);

create table public.owner_tags (
  name text primary key,
  created_at timestamptz not null default now()
);

create table public.owned_parts (
  id bigint generated always as identity primary key,
  part_slug text not null references public.parts (slug) on delete cascade,
  owner text not null references public.owner_tags (name) on update cascade on delete cascade,
  qty int not null default 1 check (qty > 0),
  created_at timestamptz not null default now(),
  unique (part_slug, owner)
);

create table public.combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner text references public.owner_tags (name) on update cascade on delete set null,
  blade_slug text references public.parts (slug),
  lock_chip_slug text references public.parts (slug),
  main_blade_slug text references public.parts (slug),
  assist_blade_slug text references public.parts (slug),
  metal_blade_slug text references public.parts (slug),
  over_blade_slug text references public.parts (slug),
  ratchet_slug text references public.parts (slug),
  bit_slug text references public.parts (slug),
  scores jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create table public.scrape_runs (
  id bigint generated always as identity primary key,
  started_at timestamptz not null,
  finished_at timestamptz,
  status text not null default 'running',
  summary jsonb not null default '{}'
);

create table public.admins (
  email text primary key
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admins where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- RLS: public read, admin write. admins table itself is not readable by the public.
do $$
declare t text;
begin
  foreach t in array array['parts','products','product_contents','owner_tags','owned_parts','combos','scrape_runs'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "public read" on public.%I for select to anon, authenticated using (true)', t);
    execute format('create policy "admin write" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;
alter table public.admins enable row level security;

-- Default owner tag.
insert into public.owner_tags (name) values ('Andrew') on conflict do nothing;

-- Public image bucket (original + pixel art). Writes only via the service role.
insert into storage.buckets (id, name, public) values ('parts', 'parts', true) on conflict (id) do nothing;
