import "server-only";

export type PilotEnv = {
  supabaseUrl: string;
  supabaseServiceKey: string;
  videoBucket: string;
  appUrl: string;
};

export function getPilotEnv(): PilotEnv | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseServiceKey,
    videoBucket: process.env.SUPABASE_VIDEO_BUCKET || "swing-videos",
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000").replace(/\/$/, "")
  };
}

export function requirePilotEnv() {
  const env = getPilotEnv();
  if (!env) {
    throw new Error("Pilot backend is not configured.");
  }
  return env;
}
