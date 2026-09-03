import { NewSubmissionPage } from "@/components/golfer/NewSubmissionPage";
import { redirect } from "next/navigation";
import { getAuthenticatedUser, isCoachUser } from "@/lib/server/supabase-auth";
import { type CoachProfile } from "@/lib/server/coach-profiles";
import { supabaseRest } from "@/lib/server/supabase-rest";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ coach?: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user?.email) redirect("/login");
  if (isCoachUser(user)) redirect("/coach/pilot");
  const query = await searchParams;
  const sport = "golf" as const;
  if (!query.coach) redirect("/coaches");
  const coaches = await supabaseRest<CoachProfile[]>(`/rest/v1/coach_profiles?id=eq.${encodeURIComponent(query.coach)}&active=eq.true&select=*&limit=1`).catch(() => []);
  const coach = coaches[0];
  if (!coach || !coach.sports.includes(sport)) redirect("/coaches");
  return <NewSubmissionPage golferName={typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : ""} golferEmail={user.email} coachId={coach.id} coachName={coach.display_name} sport={sport} />;
}
