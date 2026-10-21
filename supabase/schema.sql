-- SOHO-Marks showroom schema (Supabase / PostgreSQL)
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run.
-- Safe to run once on a fresh project.

-- ---------- tables ----------

create table if not exists public.seasons (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  intro text,
  sort int not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  slug text not null,
  name text not null,
  sort int not null default 0,
  unique (season_id, slug)
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  code text,
  name text not null,
  subtitle text,
  description text,
  sort int not null default 0,
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  path text not null,
  kind text not null default 'look',
  sort int not null default 0,
  width int,
  height int
);

create table if not exists public.votes (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  voter_key text not null,
  created_at timestamptz not null default now(),
  unique (product_id, voter_key)
);

create table if not exists public.comments (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  author text,
  body text not null,
  is_approved boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.selections (
  id bigint generated always as identity primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  client_key text not null,
  created_at timestamptz not null default now(),
  unique (product_id, client_key)
);

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create index if not exists idx_categories_season on public.categories(season_id);
create index if not exists idx_products_season on public.products(season_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_images_product on public.product_images(product_id);
create index if not exists idx_votes_product on public.votes(product_id);
create index if not exists idx_comments_product on public.comments(product_id);
create index if not exists idx_selections_product on public.selections(product_id);

-- ---------- admin helper ----------

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

-- ---------- row level security ----------

alter table public.seasons enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.votes enable row level security;
alter table public.comments enable row level security;
alter table public.selections enable row level security;
alter table public.admins enable row level security;

-- public read
drop policy if exists "public read seasons" on public.seasons;
create policy "public read seasons" on public.seasons for select to anon, authenticated using (true);

drop policy if exists "public read categories" on public.categories;
create policy "public read categories" on public.categories for select to anon, authenticated using (true);

drop policy if exists "public read published products" on public.products;
create policy "public read published products" on public.products for select to anon, authenticated using (is_published or public.is_admin());

drop policy if exists "public read images" on public.product_images;
create policy "public read images" on public.product_images for select to anon, authenticated using (true);

drop policy if exists "public read votes" on public.votes;
create policy "public read votes" on public.votes for select to anon, authenticated using (true);

drop policy if exists "public read approved comments" on public.comments;
create policy "public read approved comments" on public.comments for select to anon, authenticated using (is_approved or public.is_admin());

-- public interaction writes
drop policy if exists "anon insert votes" on public.votes;
create policy "anon insert votes" on public.votes for insert to anon, authenticated with check (true);

drop policy if exists "anon insert comments" on public.comments;
create policy "anon insert comments" on public.comments for insert to anon, authenticated with check (true);

drop policy if exists "anon insert selections" on public.selections;
create policy "anon insert selections" on public.selections for insert to anon, authenticated with check (true);

-- admin writes
drop policy if exists "admin all seasons" on public.seasons;
create policy "admin all seasons" on public.seasons for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all categories" on public.categories;
create policy "admin all categories" on public.categories for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all products" on public.products;
create policy "admin all products" on public.products for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all images" on public.product_images;
create policy "admin all images" on public.product_images for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin all comments" on public.comments;
create policy "admin all comments" on public.comments for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "admin read selections" on public.selections;
create policy "admin read selections" on public.selections for select to authenticated using (public.is_admin());

drop policy if exists "admin read admins" on public.admins;
create policy "admin read admins" on public.admins for select to authenticated using (public.is_admin());

drop policy if exists "admin write admins" on public.admins;
create policy "admin write admins" on public.admins for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- storage ----------

insert into storage.buckets (id, name, public)
values ('showroom', 'showroom', true)
on conflict (id) do nothing;

drop policy if exists "public read showroom files" on storage.objects;
create policy "public read showroom files" on storage.objects for select to anon, authenticated using (bucket_id = 'showroom');

drop policy if exists "admin upload showroom files" on storage.objects;
create policy "admin upload showroom files" on storage.objects for insert to authenticated with check (bucket_id = 'showroom' and public.is_admin());

drop policy if exists "admin update showroom files" on storage.objects;
create policy "admin update showroom files" on storage.objects for update to authenticated using (bucket_id = 'showroom' and public.is_admin());

drop policy if exists "admin delete showroom files" on storage.objects;
create policy "admin delete showroom files" on storage.objects for delete to authenticated using (bucket_id = 'showroom' and public.is_admin());

-- ---------- seed: FW27 test season (products are added from /admin) ----------

insert into public.seasons (slug, name, intro, sort, is_active)
values ('fw27', 'FW27', 'FW27 男装测试系列', 10, true)
on conflict (slug) do nothing;

insert into public.categories (season_id, slug, name, sort)
select id, 'mens', 'MENS', 10 from public.seasons where slug = 'fw27'
on conflict (season_id, slug) do nothing;

insert into public.categories (season_id, slug, name, sort)
select id, 'womens', 'WOMENS', 20 from public.seasons where slug = 'fw27'
on conflict (season_id, slug) do nothing;

-- After creating your admin account in Authentication -> Users, register it:
-- insert into public.admins (user_id) values ('<auth-user-uuid>');
