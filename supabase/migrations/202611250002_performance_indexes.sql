-- Indexes for the admin candidate directory and global status counters.
create index if not exists profiles_role_created_at_idx
  on public.profiles (role, created_at desc);

create index if not exists assessments_status_idx
  on public.assessments (status);

create index if not exists invitations_status_created_at_idx
  on public.invitations (status, created_at desc);

-- Keep the admin dashboard payload small: aggregate global counters and only
-- return the latest assessment for candidates on the requested page.
create or replace function public.admin_dashboard_overview(p_candidate_ids uuid[])
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin()) then
    raise exception 'Réservé à l’administration.' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'metrics', jsonb_build_object(
      'completed', (select count(*) from public.assessments where status = 'completed'),
      'active', (select count(*) from public.assessments where status = 'in_progress'),
      'authorized', (select count(*) from public.profiles where role = 'candidate' and authorized = true)
    ),
    'latest_assessments', coalesce((
      select jsonb_agg(jsonb_build_object(
        'owner_id', latest.owner_id,
        'status', latest.status,
        'result', latest.result,
        'updated_at', latest.updated_at
      ))
      from (
        select distinct on (assessment.owner_id)
          assessment.owner_id, assessment.status, assessment.result, assessment.updated_at
        from public.assessments as assessment
        where assessment.owner_id = any(coalesce(p_candidate_ids, '{}'::uuid[]))
        order by assessment.owner_id, assessment.updated_at desc
      ) as latest
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_dashboard_overview(uuid[]) from public, anon;
grant execute on function public.admin_dashboard_overview(uuid[]) to authenticated;
