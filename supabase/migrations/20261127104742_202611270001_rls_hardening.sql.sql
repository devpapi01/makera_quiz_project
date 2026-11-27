/*
# Tighten Row Level Security and grants

## Problem
The initial schema left `anon` with full CRUD on every table and used `FOR ALL`
policies on several tables. SECURITY DEFINER functions were also callable by
`anon`. The app requires authentication (invitation-only), so `anon` must have
no direct table access; all client access goes through `authenticated` with
ownership/admin predicates.

## Changes
1. Revoke ALL privileges from `anon` on all application tables.
2. Split the `FOR ALL` policies on business_models, notes, and app_settings
   into separate per-verb (INSERT/UPDATE/DELETE) policies with matching USING
   and WITH CHECK predicates.
3. Revoke EXECUTE on helper/admin functions from `anon` and `public`, keeping
   `authenticated` only. The SECURITY DEFINER body checks admin role internally.
4. Keep `profiles` read-only from clients (SELECT only) so roles can never be
   promoted through a client update.

## Notes
- `current_user_role` and `is_admin` are kept executable by `authenticated`
  (they are used inside policies and RPCs). `anon` can no longer call them.
- No data is changed or deleted.
*/

-- 1. Revoke anon access on all application tables.
revoke all on table public.profiles from anon;
revoke all on table public.invitations from anon;
revoke all on table public.assessments from anon;
revoke all on table public.business_models from anon;
revoke all on table public.notes from anon;
revoke all on table public.app_settings from anon;
revoke all on table public.assessment_action_plans from anon;

-- 2. Re-grant the minimum to authenticated only (no anon).
-- profiles: read-only (role can never be promoted from client)
revoke all on table public.profiles from authenticated;
grant select on public.profiles to authenticated;

-- invitations: admin read-only
revoke all on table public.invitations from authenticated;
grant select on public.invitations to authenticated;

-- assessments: candidate insert/update (in_progress), read by owner or admin
revoke all on table public.assessments from authenticated;
grant select, insert, update on public.assessments to authenticated;

-- business_models & notes: owner CRUD
revoke all on table public.business_models from authenticated;
grant select, insert, update, delete on public.business_models to authenticated;
revoke all on table public.notes from authenticated;
grant select, insert, update, delete on public.notes to authenticated;

-- app_settings: read for all authenticated, update admin-only (via policy)
revoke all on table public.app_settings from authenticated;
grant select, update on public.app_settings to authenticated;

-- assessment_action_plans: admin read-only (writes via RPC)
revoke all on table public.assessment_action_plans from authenticated;
grant select on public.assessment_action_plans to authenticated;

-- 3. Split FOR ALL policies into per-verb policies.

-- business_models: drop the FOR ALL policy, add separate insert/update/delete.
drop policy if exists "business_model_owner_write" on public.business_models;
drop policy if exists "business_model_owner_insert" on public.business_models;
drop policy if exists "business_model_owner_update" on public.business_models;
drop policy if exists "business_model_owner_delete" on public.business_models;

create policy "business_model_owner_insert" on public.business_models for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate');
create policy "business_model_owner_update" on public.business_models for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate')
  with check (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate');
create policy "business_model_owner_delete" on public.business_models for delete to authenticated
  using (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate');

-- notes: same split.
drop policy if exists "notes_owner_write" on public.notes;
drop policy if exists "notes_owner_insert" on public.notes;
drop policy if exists "notes_owner_update" on public.notes;
drop policy if exists "notes_owner_delete" on public.notes;

create policy "notes_owner_insert" on public.notes for insert to authenticated
  with check (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate');
create policy "notes_owner_update" on public.notes for update to authenticated
  using (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate')
  with check (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate');
create policy "notes_owner_delete" on public.notes for delete to authenticated
  using (owner_id = (select auth.uid()) and (select public.current_user_role()) = 'candidate');

-- app_settings: split the FOR ALL admin-write into update-only.
drop policy if exists "settings_admin_write" on public.app_settings;
drop policy if exists "settings_admin_update" on public.app_settings;
create policy "settings_admin_update" on public.app_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- 4. Revoke EXECUTE on helper/admin functions from anon/public.
revoke all on function public.current_user_role() from public, anon;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.current_user_role() to authenticated;
grant execute on function public.is_admin() to authenticated;

revoke all on function public.set_candidate_access(text, boolean) from public, anon;
revoke all on function public.accept_my_invitation() from public, anon;
revoke all on function public.admin_dashboard_overview(uuid[]) from public, anon;
revoke all on function public.admin_set_candidate_eligibility(uuid, timestamptz) from public, anon;
revoke all on function public.admin_save_assessment_feedback(uuid, text) from public, anon;
revoke all on function public.admin_save_assessment_action_plan(uuid, jsonb) from public, anon;
revoke all on function public.submit_assessment(uuid, jsonb, jsonb, jsonb) from public, anon;
