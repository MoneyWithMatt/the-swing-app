import { ArrowRight, Plus } from "lucide-react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Button, LinkButton, PageShell, SectionHeading, TopBar } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";
import { getPilotEnv } from "@/lib/server/pilot-env";
import { supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";

export const dynamic = "force-dynamic";

type CoachAnalysis = { id: string; student_name: string; title?: string; status: "draft" | "completed"; created_at: string; video_deleted_at?: string };

export default async function CoachWorkspacePage({ searchParams }: { searchParams: Promise<{ saved?: string }> }) {
  if (!(await isCoachAuthenticated())) redirect("/login");
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const profile = await getCoachProfile(user.id);
  if (!profile) redirect("/coach/profile");
  const analyses = getPilotEnv()
    ? await supabaseRest<CoachAnalysis[]>(`/rest/v1/coach_analyses?coach_profile_id=eq.${encodeURIComponent(profile.id)}&select=id,student_name,title,status,created_at,video_deleted_at&order=created_at.desc`).catch(() => [])
    : [];
  const query = await searchParams;

  return (
    <PageShell>
      <TopBar eyebrow="Coach account" title="Coach Workspace" actions={<><LinkButton href="/coach/pilot" variant="secondary">Reviews</LinkButton><LinkButton href="/coach/profile" variant="secondary">Edit profile</LinkButton><form action={logout}><Button variant="secondary">Log out</Button></form></>} />
      {query.saved === "success" ? <div className="mb-5 rounded-lg border border-moss/30 bg-moss/10 p-4 text-sm text-ink/70"><p className="font-bold text-moss">Analysis saved.</p><p className="mt-1">It remains private to your coach account.</p></div> : null}
      <section className="mb-6 flex flex-col gap-4 rounded-lg border border-moss/20 bg-gradient-to-br from-moss/10 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="text-xl font-bold text-ink">Analyse a private student's swing</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-ink/65">Use the same drawing, frame and narrated recording tools without creating a paid review order.</p></div>
        <LinkButton href="/coach/workspace/new"><Plus size={18} aria-hidden />New Analysis</LinkButton>
      </section>
      <section className="rounded-lg border border-ink/10 bg-white">
        <div className="border-b border-ink/10 p-4"><SectionHeading title="Previous analyses" detail="Only analyses created in your workspace appear here." /></div>
        <div className="divide-y divide-ink/10">
          {analyses.length ? analyses.map((analysis) => (
            <article key={analysis.id} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_10rem_8rem] sm:items-center">
              <div><h3 className="font-bold text-ink">{analysis.student_name}</h3><p className="mt-1 text-sm text-ink/60">{analysis.title || "Private analysis"} · {formatDateTime(analysis.created_at)}</p>{analysis.video_deleted_at ? <p className="mt-1 text-xs font-bold text-clay">Original video expired under the retention policy.</p> : null}</div>
              <span className={`w-fit rounded-full px-2.5 py-1 text-xs font-bold ${analysis.status === "completed" ? "bg-moss/10 text-moss" : "bg-flag/20 text-ink"}`}>{analysis.status === "completed" ? "Saved" : "Draft"}</span>
              <LinkButton href={`/coach/workspace/${analysis.id}`} variant="secondary" size="sm">Open <ArrowRight size={16} aria-hidden /></LinkButton>
            </article>
          )) : <p className="p-5 text-sm font-bold text-ink/55">No private analyses yet.</p>}
        </div>
      </section>
    </PageShell>
  );
}
