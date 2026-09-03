import "server-only";
import { getPilotEnv } from "./pilot-env";
import { supabaseRest } from "./supabase-rest";

export type CoachSport = "golf";
export type CoachProfile = { id: string; user_id: string; display_name: string; description: string; photo_path?: string; sports: CoachSport[]; active: boolean };

export function coachPhotoUrl(path?: string) {
  const env = getPilotEnv();
  return path && env ? `${env.supabaseUrl}/storage/v1/object/public/coach-photos/${path}` : undefined;
}

export async function getCoachProfile(userId: string) {
  const rows = await supabaseRest<CoachProfile[]>(`/rest/v1/coach_profiles?user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`).catch(() => []);
  return rows[0];
}
