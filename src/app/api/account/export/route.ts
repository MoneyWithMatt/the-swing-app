import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";
import { supabaseRest } from "@/lib/server/supabase-rest";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user?.email) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  const submissions = await supabaseRest<Record<string, unknown>[]>(`/rest/v1/pilot_submissions?user_id=eq.${encodeURIComponent(user.id)}&select=id,sport,golfer_name,golfer_email,question,camera_angle,handedness,status,payment_status,summary,drills,chapters,annotations,created_at,sent_at,video_expires_at,video_deleted_at,result_expires_at,result_deleted_at&order=created_at.desc`).catch(() => []);
  const profiles = await supabaseRest<Record<string, unknown>[]>(`/rest/v1/coach_profiles?user_id=eq.${encodeURIComponent(user.id)}&select=display_name,description,sports,active,created_at,updated_at`).catch(() => []);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email, createdAt: user.created_at, lastSignInAt: user.last_sign_in_at, name: user.user_metadata.full_name ?? null }, coachProfile: profiles[0] ?? null, submissions }, null, 2);
  return new NextResponse(body, { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="swing-app-data-${new Date().toISOString().slice(0, 10)}.json"`, "Cache-Control": "private, no-store" } });
}
