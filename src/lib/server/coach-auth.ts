import "server-only";
import { createHash } from "crypto";
import { getAuthenticatedUser, isCoachUser } from "./supabase-auth";

export const COACH_COOKIE = "swing_coach_access";

export function coachKeyDigest(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export async function isCoachAuthenticated() {
  const user = await getAuthenticatedUser();
  return isCoachUser(user);
}
