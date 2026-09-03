import { NextResponse } from "next/server";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";
import { supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isCoachAuthenticated())) return NextResponse.json({ error: "Coach access required." }, { status: 401 });
  try {
    const { id } = await params;
    const { summary } = (await request.json()) as { summary?: string };
    const cleanSummary = summary?.trim() || "";
    if (cleanSummary.length > 4000) return NextResponse.json({ error: "Keep the summary under 4,000 characters." }, { status: 400 });
    const user = await getAuthenticatedUser();
    const profile = user ? await getCoachProfile(user.id) : undefined;
    const owned = profile ? await supabaseRest<Array<{ id: string }>>(`/rest/v1/coach_analyses?id=eq.${encodeURIComponent(id)}&coach_profile_id=eq.${encodeURIComponent(profile.id)}&select=id&limit=1`) : [];
    if (!owned.length) return NextResponse.json({ error: "Private analysis not found for this coach." }, { status: 404 });
    const now = new Date();
    const resultExpiry = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    await supabaseRest(`/rest/v1/coach_analyses?id=eq.${encodeURIComponent(id)}&coach_profile_id=eq.${encodeURIComponent(profile!.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ status: "completed", summary: cleanSummary, completed_at: now.toISOString(), updated_at: now.toISOString(), result_expires_at: resultExpiry.toISOString() })
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Analysis could not be saved." }, { status: 500 });
  }
}
