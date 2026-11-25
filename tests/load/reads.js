import http from "k6/http";
import { check, sleep } from "k6";
import { Rate } from "k6/metrics";

const errors = new Rate("makera_request_errors");
const appUrl = (__ENV.APP_URL || "").replace(/\/$/, "");
const supabaseUrl = (__ENV.SUPABASE_URL || "").replace(/\/$/, "");
const supabaseKey = __ENV.SUPABASE_ANON_KEY;
const email = __ENV.LOAD_TEST_EMAIL;
const password = __ENV.LOAD_TEST_PASSWORD;

export const options = {
  stages: [
    { duration: "30s", target: 10 },
    { duration: "1m", target: 50 },
    { duration: "1m", target: 50 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<800"],
    makera_request_errors: ["rate<0.01"],
  },
};

export function setup() {
  if (!appUrl || !supabaseUrl || !supabaseKey || !email || !password) {
    throw new Error(
      "Set APP_URL, SUPABASE_URL, SUPABASE_ANON_KEY, LOAD_TEST_EMAIL and LOAD_TEST_PASSWORD.",
    );
  }

  const auth = http.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    JSON.stringify({ email, password }),
    {
      headers: {
        apikey: supabaseKey,
        "content-type": "application/json",
      },
      tags: { name: "auth_login_setup" },
    },
  );
  const ok = check(auth, {
    "staging test account can sign in": (response) => response.status === 200,
  });
  if (!ok) throw new Error("Staging login failed; check the test account.");

  const body = auth.json();
  return { token: body.access_token, userId: body.user.id };
}

export default function (session) {
  const app = http.get(appUrl, { tags: { name: "app_shell" } });
  const headers = {
    apikey: supabaseKey,
    authorization: `Bearer ${session.token}`,
  };
  const responses = http.batch([
    {
      method: "GET",
      url: `${supabaseUrl}/rest/v1/profiles?id=eq.${session.userId}&select=id,name,role`,
      params: { headers, tags: { name: "profile_read" } },
    },
    {
      method: "GET",
      url: `${supabaseUrl}/rest/v1/notes?select=id,title,updated_at&order=updated_at.desc&limit=20`,
      params: { headers, tags: { name: "notes_read" } },
    },
    {
      method: "GET",
      url: `${supabaseUrl}/rest/v1/business_models?select=id,title,updated_at&order=updated_at.desc&limit=1`,
      params: { headers, tags: { name: "business_model_read" } },
    },
    {
      method: "GET",
      url: `${supabaseUrl}/rest/v1/assessments?select=id,status,updated_at&order=updated_at.desc&limit=1`,
      params: { headers, tags: { name: "assessment_read" } },
    },
    {
      method: "GET",
      url: `${supabaseUrl}/rest/v1/app_settings?key=eq.assessment_open&select=key,value`,
      params: { headers, tags: { name: "settings_read" } },
    },
  ]);

  const shellOk = check(app, {
    "app shell returns successfully": (response) => response.status === 200,
  });
  errors.add(!shellOk);
  for (const response of responses) {
    const ok = check(response, {
      "workspace read succeeds": (item) => item.status === 200,
    });
    errors.add(!ok);
  }
  sleep(1);
}
