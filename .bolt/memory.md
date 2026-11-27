# Project memory

## Product intent & audience

- Application for managing candidate files, action plans, questionnaire opening/closing, and individual authorizations.
- Admin role can read candidate dossiers, manage action plans, open/close the questionnaire, and authorize individuals.
- Audience includes administrators and candidates (likely a recruitment or evaluation workflow).

## Brand personality & voice

- UI copy is in French.

## Visual design & UX direction

- Login screen includes a "Mot de passe oublié ?" (forgot password) flow.
- Admin space is distinct from the candidate-facing questionnaire area.

## Decisions, constraints & rationale

- **Backend**: Supabase (Auth + PostgreSQL).
- **Auth table**: `auth.users`; profiles are created via a database trigger `create_profile_for_invited_user` that reads `raw_app_meta_data->>'makera_role'`.
- **Roles**: stored in `makera_role` metadata field; known value `admin`.
- **Profiles table**: contains `authorized` (boolean) and role fields; admin profiles auto-set to `authorized = true`.
- Admin accounts are seeded via direct insert into `auth.users` with bcrypt-hashed password; `confirmed_at` is a generated column (must not be set manually).
- Recommended: admin passwords ≥ 10 characters for production; current seed password is short and should be rotated.

## Open questions & assumptions

- Exact non-admin roles and their permissions are not yet documented.
- Whether the questionnaire is a single global instance or per-candidate is unconfirmed.
- Frontend routing structure and admin dashboard component inventory are not yet inferred.