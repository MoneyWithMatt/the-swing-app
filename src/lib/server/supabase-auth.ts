import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { requirePilotEnv } from "./pilot-env";
import { supabaseRest } from "./supabase-rest";

export async function createAuthClient() {
  const env = requirePilotEnv();
  const cookieStore = await cookies();
  return createServerClient(env.supabaseUrl, process.env.SUPABASE_PUBLISHABLE_KEY || env.supabaseServiceKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll(cookiesToSet) {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* proxy.ts refreshes cookies for Server Components. */ }
      }
    }
  });
}

export async function getAuthenticatedUser() {
  const client = await createAuthClient();
  const { data, error } = await client.auth.getUser();
  return error ? null : data.user;
}

export function isCoachUser(user?: { email?: string | null; app_metadata?: Record<string, unknown> } | null) {
  return Boolean(user?.app_metadata?.role === "coach");
}

export async function getAuthUserEmail(userId: string) {
  const user = await supabaseRest<{ email?: string }>(`/auth/v1/admin/users/${encodeURIComponent(userId)}`);
  return user.email?.toLowerCase();
}
