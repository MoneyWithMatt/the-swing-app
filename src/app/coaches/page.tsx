import { redirect } from "next/navigation";
import { CoachDirectory } from "@/components/golfer/CoachDirectory";
import { LinkButton, PageShell, TopBar } from "@/components/ui/primitives";
import { coachPhotoUrl, type CoachProfile } from "@/lib/server/coach-profiles";
import { getAuthenticatedUser, isCoachUser } from "@/lib/server/supabase-auth";
import { supabaseRest } from "@/lib/server/supabase-rest";

export const dynamic = "force-dynamic";
export default async function CoachesPage() {
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (isCoachUser(user)) redirect("/coach/pilot");
  const profiles = await supabaseRest<CoachProfile[]>("/rest/v1/coach_profiles?active=eq.true&select=id,user_id,display_name,description,photo_path,sports,active&order=display_name.asc").catch(() => []);
  const coaches = profiles.map((profile) => ({ id: profile.id, displayName: profile.display_name, description: profile.description, photoUrl: coachPhotoUrl(profile.photo_path), sports: profile.sports }));
  return <PageShell><TopBar eyebrow="Golfer" title="Choose your coach" actions={<LinkButton href="/account" variant="secondary">My account</LinkButton>} /><p className="mb-5 max-w-2xl text-sm leading-6 text-ink/65">Select the golf coach you want to review your swing video.</p><CoachDirectory coaches={coaches} /></PageShell>;
}
