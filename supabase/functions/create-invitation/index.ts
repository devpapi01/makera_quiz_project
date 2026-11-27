import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: { get(name: string): string | undefined };
  serve(handler: (request: Request) => Response | Promise<Response>): void;
};

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });
  if (request.method !== "POST")
    return Response.json(
      { error: "Méthode non autorisée." },
      { status: 405, headers: cors },
    );
  const url = Deno.env.get("SUPABASE_URL")!,
    anon = Deno.env.get("SUPABASE_ANON_KEY")!,
    service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return Response.json(
      { error: "Connexion requise." },
      { status: 401, headers: cors },
    );
  const caller = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const {
    data: { user },
    error: authError,
  } = await caller.auth.getUser();
  if (authError || !user)
    return Response.json(
      { error: "Session invalide." },
      { status: 401, headers: cors },
    );
  const admin = createClient(url, service, { auth: { persistSession: false } });
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin")
    return Response.json(
      { error: "Réservé à l’administration." },
      { status: 403, headers: cors },
    );
  const { count } = await admin
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("invited_by", user.id)
    .gte("created_at", new Date(Date.now() - 60_000).toISOString());
  if ((count || 0) >= 5)
    return Response.json(
      {
        error: "Trop d’invitations en peu de temps. Réessayez dans une minute.",
      },
      { status: 429, headers: cors },
    );
  let input: { email?: string; name?: string; project?: string };
  try {
    input = await request.json();
  } catch {
    return Response.json(
      { error: "Corps de requête invalide." },
      { status: 400, headers: cors },
    );
  }
  const email = input.email?.trim().toLowerCase() || "",
    name = input.name?.trim() || "",
    project = input.project?.trim() || "";
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    name.length < 2 ||
    name.length > 120 ||
    project.length < 2 ||
    project.length > 200
  )
    return Response.json(
      { error: "Vérifiez le nom, l’adresse e-mail et le projet." },
      { status: 400, headers: cors },
    );
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (existing)
    return Response.json(
      { error: "Un compte utilise déjà cette adresse." },
      { status: 409, headers: cors },
    );
  await admin
    .from("invitations")
    .update({ status: "revoked" })
    .eq("status", "pending")
    .ilike("email", email);
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const { data: invitation, error: insertError } = await admin
    .from("invitations")
    .insert({
      email,
      candidate_name: name,
      project,
      invited_by: user.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();
  if (insertError)
    return Response.json(
      { error: "L’invitation n’a pas pu être créée." },
      { status: 500, headers: cors },
    );
  const redirectTo = `${Deno.env.get("APP_SITE_URL") || request.headers.get("origin")}/invite/accept`;
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo, data: { name, project } },
  );
  if (inviteError) {
    await admin
      .from("invitations")
      .update({ status: "revoked" })
      .eq("id", invitation.id);
    return Response.json(
      {
        error:
          "E-mail non envoyé. Vérifiez le service e-mail Supabase et réessayez.",
      },
      { status: 502, headers: cors },
    );
  }
  return Response.json({ expiresAt }, { headers: cors });
});
