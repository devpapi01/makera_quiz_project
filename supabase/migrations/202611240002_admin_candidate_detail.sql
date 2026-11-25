-- Candidate detail support for the administrator workspace.
alter table public.assessments
  add column if not exists admin_feedback text
  check (admin_feedback is null or char_length(admin_feedback) <= 5000);

create or replace function public.admin_set_candidate_eligibility(
  p_candidate_id uuid,
  p_eligible_at timestamptz
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
  update public.profiles
    set eligible_at = p_eligible_at, updated_at = now()
    where id = p_candidate_id and role = 'candidate';
  if not found then
    raise exception 'Candidat introuvable.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.admin_set_candidate_eligibility(uuid,timestamptz)
  from public, anon;
grant execute on function public.admin_set_candidate_eligibility(uuid,timestamptz)
  to authenticated;

create or replace function public.admin_save_assessment_feedback(
  p_assessment_id uuid,
  p_feedback text
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
  if char_length(coalesce(p_feedback, '')) > 5000 then
    raise exception 'Le commentaire ne peut pas dépasser 5 000 caractères.'
      using errcode = '22023';
  end if;
  update public.assessments
    set admin_feedback = nullif(trim(coalesce(p_feedback, '')), '')
    where id = p_assessment_id and status = 'completed';
  if not found then
    raise exception 'Passation terminée introuvable.' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.admin_save_assessment_feedback(uuid,text)
  from public, anon;
grant execute on function public.admin_save_assessment_feedback(uuid,text)
  to authenticated;
