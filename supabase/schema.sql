-- Ohmni Bid core schema (Supabase + pgvector)

create extension if not exists pgcrypto;
create schema if not exists extensions;
create extension if not exists vector with schema extensions;
alter extension vector set schema extensions;

set search_path = public, extensions;

-- Organizations (multi-tenant)
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  subscription_status text,
  price_id text,
  current_period_end timestamptz,
  trial_end timestamptz,
  billing_email text,
  created_at timestamptz default now()
);

alter table organizations
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists price_id text,
  add column if not exists current_period_end timestamptz,
  add column if not exists trial_end timestamptz,
  add column if not exists billing_email text;

create table if not exists org_members (
  org_id uuid references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz default now(),
  primary key (org_id, user_id)
);

create index if not exists org_members_user_idx on org_members(user_id);

create or replace function is_org_member(check_org_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from org_members
    where org_id = check_org_id
      and user_id = auth.uid()
  );
$$;

create or replace function is_org_owner(check_org_id uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1
    from org_members
    where org_id = check_org_id
      and user_id = auth.uid()
      and role = 'owner'
  );
$$;

-- Pricing catalog
create table if not exists pricing_items (
  id uuid primary key default gen_random_uuid(),
  category text not null,
  subcategory text,
  name text not null,
  external_ref text,
  description text,
  size text,
  unit_type text not null default 'E',
  material_cost numeric(12, 2) not null default 0,
  labor_hours numeric(10, 3) not null default 0,
  market_price numeric(12, 2),
  markup_percent numeric(6, 4),
  embedding vector(1536),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists pricing_items_category_idx on pricing_items(category);
create index if not exists pricing_items_subcategory_idx on pricing_items(subcategory);
create index if not exists pricing_items_name_idx on pricing_items(name);
create unique index if not exists pricing_items_external_ref_idx on pricing_items(external_ref);

-- Vector index for semantic catalog search
create index if not exists pricing_items_embedding_idx
  on pricing_items using ivfflat (embedding vector_cosine_ops) with (lists = 100);

-- Estimates
create table if not exists estimates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete set null,
  project_name text not null,
  project_number text,
  project_location text,
  project_type text,
  square_footage integer,
  gc_name text,
  contact_name text,
  contact_email text,
  contact_phone text,
  labor_rate numeric(10, 2) not null default 118.00,
  material_tax_rate numeric(6, 4) not null default 0.1025,
  overhead_profit_rate numeric(6, 4) not null default 0,
  total_material numeric(12, 2) not null default 0,
  total_material_with_tax numeric(12, 2) not null default 0,
  total_labor_hours numeric(12, 2) not null default 0,
  total_labor_cost numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) not null default 0,
  overhead_profit numeric(12, 2) not null default 0,
  final_bid numeric(12, 2) not null default 0,
  price_per_sqft numeric(10, 2),
  status text not null default 'draft',
  estimate_metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists estimates_user_idx on estimates(user_id);
create index if not exists estimates_org_idx on estimates(org_id);
create index if not exists estimates_status_idx on estimates(status);

-- Line items
create table if not exists estimate_line_items (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  pricing_item_id uuid references pricing_items(id),
  category text not null,
  description text not null,
  quantity numeric(12, 2) not null default 0,
  unit_type text not null default 'E',
  material_unit_cost numeric(12, 2) not null default 0,
  labor_hours_per_unit numeric(10, 3) not null default 0,
  material_extension numeric(12, 2) not null default 0,
  labor_extension numeric(12, 3) not null default 0,
  total_cost numeric(12, 2) not null default 0,
  source text default 'manual',
  ai_confidence numeric(4, 3),
  ai_notes text,
  sort_order integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists estimate_line_items_estimate_idx on estimate_line_items(estimate_id);
create index if not exists estimate_line_items_category_idx on estimate_line_items(category);

-- Proposals
create table if not exists proposals (
  id uuid primary key default gen_random_uuid(),
  estimate_id uuid references estimates(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  org_id uuid references organizations(id) on delete set null,
  title text not null,
  content text,
  scope_of_work text,
  exclusions text,
  pdf_url text,
  valid_days integer default 30,
  valid_until timestamptz,
  version integer default 1,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists proposals_estimate_idx on proposals(estimate_id);
create index if not exists proposals_org_idx on proposals(org_id);

-- Walkthrough capture
create table if not exists walkthrough_sessions (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references organizations(id) on delete cascade,
  estimate_id uuid references estimates(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  status text not null default 'open',
  session_metadata jsonb default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists walkthrough_notes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references walkthrough_sessions(id) on delete cascade,
  transcript_text text not null,
  started_at timestamptz,
  ended_at timestamptz,
  raw_audio_path text,
  created_at timestamptz default now()
);

create table if not exists walkthrough_photos (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references walkthrough_sessions(id) on delete cascade,
  storage_path text,
  ai_counts_json jsonb,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists walkthrough_sessions_org_idx on walkthrough_sessions(org_id);
create index if not exists walkthrough_sessions_estimate_idx on walkthrough_sessions(estimate_id);
create index if not exists walkthrough_notes_session_idx on walkthrough_notes(session_id);
create index if not exists walkthrough_photos_session_idx on walkthrough_photos(session_id);

-- RLS policies
alter table organizations enable row level security;
alter table org_members enable row level security;
alter table pricing_items enable row level security;
alter table estimates enable row level security;
alter table estimate_line_items enable row level security;
alter table proposals enable row level security;
alter table walkthrough_sessions enable row level security;
alter table walkthrough_notes enable row level security;
alter table walkthrough_photos enable row level security;

drop policy if exists "orgs select for members" on organizations;
drop policy if exists "orgs insert for auth users" on organizations;
drop policy if exists "orgs update for owners" on organizations;
drop policy if exists "orgs delete for owners" on organizations;

drop policy if exists "org members select for org members" on org_members;
drop policy if exists "org members insert for owners or creator" on org_members;
drop policy if exists "org members update for owners" on org_members;
drop policy if exists "org members delete for owners" on org_members;

drop policy if exists "estimates select for org members" on estimates;
drop policy if exists "estimates insert for org members" on estimates;
drop policy if exists "estimates update for org members" on estimates;
drop policy if exists "estimates delete for org members" on estimates;

drop policy if exists "pricing items read for authenticated" on pricing_items;

drop policy if exists "line items select for org members" on estimate_line_items;
drop policy if exists "line items insert for org members" on estimate_line_items;
drop policy if exists "line items update for org members" on estimate_line_items;
drop policy if exists "line items delete for org members" on estimate_line_items;

drop policy if exists "proposals select for org members" on proposals;
drop policy if exists "proposals insert for org members" on proposals;
drop policy if exists "proposals update for org members" on proposals;
drop policy if exists "proposals delete for org members" on proposals;

drop policy if exists "walkthrough sessions select for org members" on walkthrough_sessions;
drop policy if exists "walkthrough sessions insert for org members" on walkthrough_sessions;
drop policy if exists "walkthrough sessions update for org members" on walkthrough_sessions;
drop policy if exists "walkthrough sessions delete for org members" on walkthrough_sessions;

drop policy if exists "walkthrough notes select for org members" on walkthrough_notes;
drop policy if exists "walkthrough notes insert for org members" on walkthrough_notes;
drop policy if exists "walkthrough notes update for org members" on walkthrough_notes;
drop policy if exists "walkthrough notes delete for org members" on walkthrough_notes;

drop policy if exists "walkthrough photos select for org members" on walkthrough_photos;
drop policy if exists "walkthrough photos insert for org members" on walkthrough_photos;
drop policy if exists "walkthrough photos update for org members" on walkthrough_photos;
drop policy if exists "walkthrough photos delete for org members" on walkthrough_photos;

create policy "orgs select for members" on organizations
  for select using (is_org_member(id) or created_by = auth.uid());

create policy "orgs insert for auth users" on organizations
  for insert with check (auth.uid() is not null and created_by = auth.uid());

create policy "orgs update for owners" on organizations
  for update using (is_org_owner(id)) with check (is_org_owner(id));

create policy "orgs delete for owners" on organizations
  for delete using (is_org_owner(id));

create policy "org members select for org members" on org_members
  for select using (is_org_member(org_id));

create policy "org members insert for owners or creator" on org_members
  for insert with check (
    (user_id = auth.uid()
      and exists (
        select 1 from organizations
        where id = org_id and created_by = auth.uid()
      ))
    or is_org_owner(org_id)
  );

create policy "org members update for owners" on org_members
  for update using (is_org_owner(org_id)) with check (is_org_owner(org_id));

create policy "org members delete for owners" on org_members
  for delete using (is_org_owner(org_id));

create policy "estimates select for org members" on estimates
  for select using (is_org_member(org_id));

create policy "estimates insert for org members" on estimates
  for insert with check (is_org_member(org_id) and user_id = auth.uid());

create policy "estimates update for org members" on estimates
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "pricing items read for authenticated" on pricing_items
  for select to authenticated using (auth.uid() is not null);

do $$
begin
  if exists (
    select 1 from pg_tables where schemaname = 'public' and tablename = 'profiles'
  ) then
    execute 'alter table public.profiles enable row level security';
    execute 'drop policy if exists "profiles select own" on public.profiles';
    execute 'drop policy if exists "profiles insert own" on public.profiles';
    execute 'drop policy if exists "profiles update own" on public.profiles';
    execute 'create policy "profiles select own" on public.profiles for select using (auth.uid() = id)';
    execute 'create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id)';
    execute 'create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id)';
  end if;
end $$;

create policy "estimates delete for org members" on estimates
  for delete using (is_org_member(org_id));

create policy "line items select for org members" on estimate_line_items
  for select using (
    exists (
      select 1 from estimates e
      where e.id = estimate_id
        and is_org_member(e.org_id)
    )
  );

create policy "line items insert for org members" on estimate_line_items
  for insert with check (
    exists (
      select 1 from estimates e
      where e.id = estimate_id
        and is_org_member(e.org_id)
    )
  );

create policy "line items update for org members" on estimate_line_items
  for update using (
    exists (
      select 1 from estimates e
      where e.id = estimate_id
        and is_org_member(e.org_id)
    )
  ) with check (
    exists (
      select 1 from estimates e
      where e.id = estimate_id
        and is_org_member(e.org_id)
    )
  );

create policy "line items delete for org members" on estimate_line_items
  for delete using (
    exists (
      select 1 from estimates e
      where e.id = estimate_id
        and is_org_member(e.org_id)
    )
  );

create policy "proposals select for org members" on proposals
  for select using (is_org_member(org_id));

create policy "proposals insert for org members" on proposals
  for insert with check (is_org_member(org_id) and user_id = auth.uid());

create policy "proposals update for org members" on proposals
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "proposals delete for org members" on proposals
  for delete using (is_org_member(org_id));

create policy "walkthrough sessions select for org members" on walkthrough_sessions
  for select using (is_org_member(org_id));

create policy "walkthrough sessions insert for org members" on walkthrough_sessions
  for insert with check (is_org_member(org_id) and created_by = auth.uid());

create policy "walkthrough sessions update for org members" on walkthrough_sessions
  for update using (is_org_member(org_id)) with check (is_org_member(org_id));

create policy "walkthrough sessions delete for org members" on walkthrough_sessions
  for delete using (is_org_member(org_id));

create policy "walkthrough notes select for org members" on walkthrough_notes
  for select using (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  );

create policy "walkthrough notes insert for org members" on walkthrough_notes
  for insert with check (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  );

create policy "walkthrough notes update for org members" on walkthrough_notes
  for update using (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  ) with check (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  );

create policy "walkthrough notes delete for org members" on walkthrough_notes
  for delete using (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  );

create policy "walkthrough photos select for org members" on walkthrough_photos
  for select using (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  );

create policy "walkthrough photos insert for org members" on walkthrough_photos
  for insert with check (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  );

create policy "walkthrough photos update for org members" on walkthrough_photos
  for update using (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  ) with check (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  );

create policy "walkthrough photos delete for org members" on walkthrough_photos
  for delete using (
    exists (
      select 1 from walkthrough_sessions s
      where s.id = session_id
        and is_org_member(s.org_id)
    )
  );

-- Storage for walkthrough assets
insert into storage.buckets (id, name, public)
values ('walkthrough', 'walkthrough', false)
on conflict (id) do nothing;

drop policy if exists "walkthrough objects select for org members" on storage.objects;
create policy "walkthrough objects select for org members" on storage.objects
  for select using (
    bucket_id = 'walkthrough'
    and split_part(name, '/', 1) ~ '^org-[0-9a-fA-F-]{36}$'
    and public.is_org_member(replace(split_part(name, '/', 1), 'org-', '')::uuid)
  );

drop policy if exists "walkthrough objects insert for org members" on storage.objects;
create policy "walkthrough objects insert for org members" on storage.objects
  for insert with check (
    bucket_id = 'walkthrough'
    and split_part(name, '/', 1) ~ '^org-[0-9a-fA-F-]{36}$'
    and public.is_org_member(replace(split_part(name, '/', 1), 'org-', '')::uuid)
  );

drop policy if exists "walkthrough objects update for org members" on storage.objects;
create policy "walkthrough objects update for org members" on storage.objects
  for update using (
    bucket_id = 'walkthrough'
    and split_part(name, '/', 1) ~ '^org-[0-9a-fA-F-]{36}$'
    and public.is_org_member(replace(split_part(name, '/', 1), 'org-', '')::uuid)
  ) with check (
    bucket_id = 'walkthrough'
    and split_part(name, '/', 1) ~ '^org-[0-9a-fA-F-]{36}$'
    and public.is_org_member(replace(split_part(name, '/', 1), 'org-', '')::uuid)
  );

drop policy if exists "walkthrough objects delete for org members" on storage.objects;
create policy "walkthrough objects delete for org members" on storage.objects
  for delete using (
    bucket_id = 'walkthrough'
    and split_part(name, '/', 1) ~ '^org-[0-9a-fA-F-]{36}$'
    and public.is_org_member(replace(split_part(name, '/', 1), 'org-', '')::uuid)
  );

-- Vector search RPC
create or replace function match_pricing_items(
  query_embedding vector(1536),
  match_count int default 10,
  category_filter text default null
)
returns table (
  id uuid,
  category text,
  subcategory text,
  name text,
  description text,
  size text,
  unit_type text,
  material_cost numeric,
  labor_hours numeric,
  market_price numeric,
  similarity float
)
language sql stable
set search_path = public, extensions
as $$
  select
    pricing_items.id,
    pricing_items.category,
    pricing_items.subcategory,
    pricing_items.name,
    pricing_items.description,
    pricing_items.size,
    pricing_items.unit_type,
    pricing_items.material_cost,
    pricing_items.labor_hours,
    pricing_items.market_price,
    1 - (pricing_items.embedding <=> query_embedding) as similarity
  from pricing_items
  where pricing_items.embedding is not null
    and (category_filter is null or pricing_items.category = category_filter)
  order by pricing_items.embedding <=> query_embedding
  limit match_count;
$$;
