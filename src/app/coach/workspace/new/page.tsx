import { redirect } from "next/navigation";
import { NewWorkspaceAnalysisForm } from "@/components/coach/NewWorkspaceAnalysisForm";
import { LinkButton, PageShell, TopBar } from "@/components/ui/primitives";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";

export const dynamic = "force-dynamic";

export default async function NewCoachAnalysisPage() {
  if (!(await isCoachAuthenticated())) redirect("/login");
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  if (!(await getCoachProfile(user.id))) redirect("/coach/profile");
  return <PageShell><TopBar eyebrow="Coach Workspace" title="New Analysis" actions={<LinkButton href="/coach/workspace" variant="secondary">Workspace</LinkButton>} /><NewWorkspaceAnalysisForm /></PageShell>;
}
