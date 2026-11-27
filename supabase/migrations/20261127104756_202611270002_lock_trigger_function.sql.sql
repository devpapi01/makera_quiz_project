/*
# Revoke direct RPC access to the auth trigger function

The `create_profile_for_invited_user` function is a trigger on `auth.users`
and must never be called directly via the REST/RPC API. Revoke EXECUTE from
all client roles so only the trigger (running as the table owner) can invoke it.
*/

revoke all on function public.create_profile_for_invited_user() from public, anon, authenticated;
