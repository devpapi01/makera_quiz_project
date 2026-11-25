-- Makera V3 · private-by-default schema for Supabase
create extension if not exists pgcrypto;

create type public.app_role as enum ('admin', 'candidate');
create type public.assessment_status as enum ('in_progress', 'completed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  name text not null check (char_length(trim(name)) between 2 and 120),
  role public.app_role not null default 'candidate',
  project text check (project is null or char_length(project) <= 200),
  authorized boolean not null default false,
  eligible_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  candidate_name text not null check (char_length(trim(candidate_name)) between 2 and 120),
  project text not null check (char_length(trim(project)) between 2 and 200),
  invited_by uuid not null references public.profiles(id),
  status text not null default 'pending' check (status in ('pending','sent','accepted','expired','revoked')),
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);
create index invitations_email_status_idx on public.invitations (lower(email), status, expires_at desc);
create unique index invitations_one_pending_email_idx on public.invitations (lower(email)) where status='pending';

create table public.assessments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status public.assessment_status not null default 'in_progress',
  responses jsonb not null default '[]'::jsonb check (jsonb_typeof(responses) = 'array'),
  reflections jsonb not null default '[]'::jsonb check (jsonb_typeof(reflections) = 'array'),
  result jsonb,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index assessments_owner_updated_idx on public.assessments (owner_id, updated_at desc);

create table public.business_models (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Mon modèle économique' check (char_length(title) between 1 and 120),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index business_models_owner_updated_idx on public.business_models (owner_id, updated_at desc);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 20000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index notes_owner_updated_idx on public.notes (owner_id, updated_at desc);

create table public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
insert into public.app_settings (key,value) values ('assessment_open','true'::jsonb);

create or replace function public.current_user_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = (select auth.uid())
$$;
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(public.current_user_role() = 'admin'::public.app_role, false)
$$;

create or replace function public.create_profile_for_invited_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare invite_record public.invitations%rowtype;
begin
  -- The first administrator is provisioned through trusted Supabase service-role app metadata.
  if new.raw_app_meta_data->>'makera_role' = 'admin' then
    insert into public.profiles(id,email,name,role,authorized)
      values (new.id,lower(new.email),coalesce(new.raw_user_meta_data->>'name','Équipe Makera'),'admin',true);
    return new;
  end if;
  if coalesce(new.raw_app_meta_data->>'provider','') = 'email' then
    select * into invite_record from public.invitations i
      where lower(i.email) = lower(new.email) and i.status = 'pending' and i.expires_at > now()
      order by i.created_at desc limit 1;
    if not found then
      raise exception 'An active Makera invitation is required.' using errcode = '42501';
    end if;
    insert into public.profiles(id,email,name,role,project,authorized)
      values (new.id,lower(new.email),invite_record.candidate_name,'candidate',invite_record.project,false);
    update public.invitations set status='sent' where id=invite_record.id;
  else
    -- Allows a trusted operator to provision the very first admin in Auth, then insert
    -- their profile through the SQL editor. Public Auth sign-up must remain disabled.
    return new;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_invited after insert on auth.users
for each row execute function public.create_profile_for_invited_user();

alter table public.profiles enable row level security;
alter table public.invitations enable row level security;
alter table public.assessments enable row level security;
alter table public.business_models enable row level security;
alter table public.notes enable row level security;
alter table public.app_settings enable row level security;

-- Profiles are read-only from clients: account roles can never be promoted through an update.
create policy "profiles_read_self_or_admin" on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));
create or replace function public.set_candidate_access(candidate_email text, access_enabled boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not (select public.is_admin()) then raise exception 'Réservé à l’administration.' using errcode='42501'; end if;
  update public.profiles set authorized=access_enabled,updated_at=now()
    where lower(email)=lower(candidate_email) and role='candidate';
  if not found then raise exception 'Candidat introuvable.' using errcode='P0002'; end if;
end;
$$;
grant execute on function public.set_candidate_access(text,boolean) to authenticated;
create or replace function public.accept_my_invitation()
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.invitations set status='accepted',accepted_at=now()
    where lower(email)=(select lower(u.email) from auth.users u where u.id=auth.uid()) and status='sent';
end;
$$;
grant execute on function public.accept_my_invitation() to authenticated;
create policy "invitations_admin_read" on public.invitations for select to authenticated
  using ((select public.is_admin()));
create policy "assessment_read_owner_or_admin" on public.assessments for select to authenticated
  using (owner_id = (select auth.uid()) or (select public.is_admin()));
create policy "assessment_insert_owner" on public.assessments for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate'
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.authorized=true and (p.eligible_at is null or p.eligible_at<=now()))
    and exists(select 1 from public.app_settings s where s.key='assessment_open' and s.value='true'::jsonb));
create policy "assessment_update_owner_in_progress" on public.assessments for update to authenticated
  using (owner_id = (select auth.uid()) and status = 'in_progress'
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.authorized=true and (p.eligible_at is null or p.eligible_at<=now())))
  with check (owner_id = (select auth.uid()) and status = 'in_progress'
    and exists(select 1 from public.profiles p where p.id=auth.uid() and p.authorized=true and (p.eligible_at is null or p.eligible_at<=now())));
create policy "business_model_owner_read" on public.business_models for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "business_model_owner_write" on public.business_models for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate')
  with check (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate');
create policy "notes_owner_read" on public.notes for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "notes_owner_write" on public.notes for all to authenticated
  using (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate')
  with check (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate');
create policy "settings_authenticated_read" on public.app_settings for select to authenticated using (true);
create policy "settings_admin_write" on public.app_settings for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

grant usage on schema public to authenticated;
grant select on public.profiles,public.invitations,public.assessments,public.business_models,public.notes,public.app_settings to authenticated;
grant insert,update on public.assessments to authenticated;
grant insert,update,delete on public.business_models,public.notes to authenticated;
grant update on public.app_settings to authenticated;

-- Completion and the global score are calculated in PostgreSQL, never trusted from the browser.
create or replace function public.submit_assessment(assessment_id uuid, submitted_responses jsonb, submitted_reflections jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare answer_count integer; total_score integer; global_score integer; profile_index integer;
  profile_names text[] := array['Potentiel à découvrir','Potentiel à éveiller','Potentiel en construction','Potentiel prometteur','Potentiel affirmé','Potentiel élevé'];
  profile_readings text[] := array[
    'L’entrepreneuriat est encore éloigné du profil actuel. Le découvrir pas à pas, avec un accompagnement rapproché.',
    'Quelques bases existent. Une formation et un accompagnement sont nécessaires avant de se lancer.',
    'Des bases réelles mais encore fragiles. Travailler en priorité les aspects les plus faibles.',
    'Un profil d’entrepreneur qui prend forme. Consolider les points faibles pour gagner en solidité.',
    'Un bon profil d’entrepreneur. Consolider les derniers points faibles et passer à l’étape suivante.',
    'Un profil entrepreneurial très solide. Passer à l’action et viser la croissance.'
  ];
begin
  if jsonb_typeof(submitted_responses)<>'array' or jsonb_array_length(submitted_responses)<>8
    or jsonb_typeof(submitted_reflections)<>'array' or jsonb_array_length(submitted_reflections)<>8 then
    raise exception 'Les huit dimensions sont requises.' using errcode='22023';
  end if;
  if exists(select 1 from jsonb_array_elements(submitted_responses) as d(value) where jsonb_typeof(d.value)<>'array' or jsonb_array_length(d.value)<>7) then
    raise exception 'Chaque dimension doit contenir sept affirmations.' using errcode='22023';
  end if;
  select count(*),coalesce(sum((answer#>>'{}')::integer),0) into answer_count,total_score
    from jsonb_array_elements(submitted_responses) as dimension(value)
    cross join lateral jsonb_array_elements(dimension.value) as answer(value)
    where answer.value#>>'{}' ~ '^[0-5]$';
  if answer_count<>56 then raise exception 'Les 56 réponses doivent être comprises entre 0 et 5.' using errcode='22023'; end if;
  global_score:=round(total_score::numeric/280*100)::integer;
  profile_index:=least(5,floor(global_score::numeric/100*6)::integer)+1;
  update public.assessments set responses=submitted_responses,reflections=submitted_reflections,
    status='completed',completed_at=now(),updated_at=now(),result=jsonb_build_object(
      'score',global_score,'level',profile_index-1,'profile',profile_names[profile_index],'reading',profile_readings[profile_index])
    where id=assessment_id and owner_id=auth.uid() and status='in_progress';
  if not found then raise exception 'Passation inaccessible ou déjà terminée.' using errcode='42501'; end if;
  return jsonb_build_object('score',global_score,'level',profile_index-1,'profile',profile_names[profile_index],'reading',profile_readings[profile_index]);
end;
$$;
grant execute on function public.submit_assessment(uuid,jsonb,jsonb) to authenticated;
