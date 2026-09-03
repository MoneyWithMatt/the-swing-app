import { redirect } from "next/navigation";
import { PilotVideoReviewTool } from "@/components/coach/PilotVideoReviewTool";
import { WorkspaceSavePanel } from "@/components/coach/WorkspaceSavePanel";
import { LinkButton, PageShell, TopBar } from "@/components/ui/primitives";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";
import { createSignedDownload, supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";

export const dynamic = "force-dynamic";

type CoachAnalysis = { id: string; student_name: string; student_email?: string; title?: string; status: "draft" | "completed"; video_path: string; video_deleted_at?: string; recording_path?: string; result_deleted_at?: string; summary?: string };

export default async function CoachAnalysisPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isCoachAuthenticated())) redirect("/login");
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const profile = await getCoachProfile(user.id);
  if (!profile) redirect("/coach/profile");
  const { id } = await params;
  const analyses = await supabaseRest<CoachAnalysis[]>(`/rest/v1/coach_analyses?id=eq.${encodeURIComponent(id)}&coach_profile_id=eq.${encodeURIComponent(profile.id)}&select=*&limit=1`).catch(() => []);
  const analysis = analyses[0];
  if (!analysis) redirect("/coach/workspace");
  const videoUrl = analysis.video_deleted_at ? undefined : await createSignedDownload(analysis.video_path, 60 * 60 * 4);
  const recordingUrl = analysis.recording_path && !analysis.result_deleted_at ? await createSignedDownload(analysis.recording_path, 60 * 60 * 4) : undefined;

  return (
    <PageShell>
      <TopBar eyebrow="Coach Workspace" title={analysis.title || `${analysis.student_name}'s analysis`} actions={<><LinkButton href="/coach/pilot" variant="secondary">Reviews</LinkButton><LinkButton href="/coach/workspace" variant="secondary">Workspace</LinkButton></>} />
      <section className="mb-5 rounded-lg border border-ink/10 bg-white p-4"><p className="text-xs font-bold uppercase text-moss">Student</p><h2 className="mt-1 text-xl font-bold text-ink">{analysis.student_name}</h2>{analysis.student_email ? <p className="mt-1 text-sm text-ink/55">{analysis.student_email}</p> : null}</section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {videoUrl ? <PilotVideoReviewTool videoUrl={videoUrl} reviewId={analysis.id} recordingApiUrl="/api/coach/workspace/recording" recordingIdField="analysisId" initialRecordingUrl={recordingUrl} /> : <section className="rounded-lg bg-black p-5 text-white">The original video has expired under the retention policy. The lesson record remains available.</section>}
        <WorkspaceSavePanel analysisId={analysis.id} initialSummary={analysis.summary} />
      </div>
    </PageShell>
  );
}
