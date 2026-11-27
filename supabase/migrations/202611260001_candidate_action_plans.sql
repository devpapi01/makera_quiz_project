create table if not exists public.assessment_action_plans (
  assessment_id uuid primary key references public.assessments(id) on delete cascade,
  action_plan jsonb not null
  default '{"aspects":{},"globalActions":[],"reassessmentDate":"","coachName":""}'::jsonb,
  updated_at timestamptz not null default now(),
  check (
    jsonb_typeof(action_plan) = 'object'
    and char_length(action_plan::text) <= 50000
    and jsonb_typeof(action_plan->'aspects') = 'object'
    and jsonb_typeof(action_plan->'globalActions') = 'array'
  ));
alter table public.assessment_action_plans enable row level security;
create policy "assessment_action_plans_admin_read"
  on public.assessment_action_plans for select to authenticated
  using ((select public.is_admin()));
revoke all on table public.assessment_action_plans from public, anon, authenticated;
grant select on public.assessment_action_plans to authenticated;

create or replace function public.admin_save_assessment_action_plan(
  p_assessment_id uuid,
  p_action_plan jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Réservé à l’administration.' using errcode = '42501';
  end if;
  if p_action_plan is null
    or jsonb_typeof(p_action_plan) is distinct from 'object'
    or char_length(p_action_plan::text) > 50000
    or jsonb_typeof(p_action_plan->'aspects') is distinct from 'object'
    or jsonb_typeof(p_action_plan->'globalActions') is distinct from 'array'
    or case when jsonb_typeof(p_action_plan->'globalActions') = 'array'
      then jsonb_array_length(p_action_plan->'globalActions') > 80 else false end
    or char_length(coalesce(p_action_plan->>'coachName', '')) > 120
    or char_length(coalesce(p_action_plan->>'reassessmentDate', '')) > 10
  then
    raise exception 'Le plan d’action est invalide.' using errcode = '22023';
  end if;
  insert into public.assessment_action_plans (assessment_id, action_plan, updated_at)
    select id, p_action_plan, now()
    from public.assessments
    where id = p_assessment_id and status = 'completed'
    on conflict (assessment_id) do update
      set action_plan = excluded.action_plan, updated_at = excluded.updated_at;
  if not found then
    raise exception 'Passation terminée introuvable.' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.admin_save_assessment_action_plan(uuid,jsonb)
  from public, anon;
grant execute on function public.admin_save_assessment_action_plan(uuid,jsonb)
  to authenticated;
