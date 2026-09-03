import { redirect } from "next/navigation";
import { PilotFulfilmentForm } from "@/components/coach/PilotFulfilmentForm";
import { CoachVideoReviewSwitcher } from "@/components/coach/CoachVideoReviewSwitcher";
import { LinkButton, PageShell, SectionHeading, StatusBadge, TopBar } from "@/components/ui/primitives";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { createSignedDownload, supabaseRest } from "@/lib/server/supabase-rest";
import type { SubmissionStatus } from "@/lib/types";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";

export const dynamic = "force-dynamic";

type Submission = {
  id: string;
  golfer_name: string;
  golfer_email: string;
  question: string;
  camera_angle: string;
  handedness: string;
  video_path: string;
  face_on_video_path?: string;
  status: SubmissionStatus;
  payment_status: string;
  summary?: string;
  drills: string[];
  video_deleted_at?: string;
  recording_path?: string;
};

export default async function PilotSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  if (!(await isCoachAuthenticated())) redirect("/coach/pilot");
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const profile = await getCoachProfile(user.id);
  if (!profile) redirect("/coach/profile");
  const { id } = await params;
  const submissions = await supabaseRest<Submission[]>(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(id)}&coach_profile_id=eq.${encodeURIComponent(profile.id)}&select=*&limit=1`).catch(() => []);
  const submission = submissions[0];
  if (!submission) redirect("/coach/pilot");
  const videoUrl = submission.video_deleted_at ? undefined : await createSignedDownload(submission.video_path, 60 * 60 * 4);
  const faceOnVideoUrl = !submission.video_deleted_at && submission.face_on_video_path ? await createSignedDownload(submission.face_on_video_path, 60 * 60 * 4) : undefined;
  const recordingUrl = submission.recording_path ? await createSignedDownload(submission.recording_path, 60 * 60 * 4) : undefined;
  const videos = videoUrl ? [{ label: submission.camera_angle === "face_on" ? "Face On" : "Down the Line", url: videoUrl }, ...(faceOnVideoUrl ? [{ label: "Face On", url: faceOnVideoUrl }] : [])] : [];

  return (
    <PageShell>
      <TopBar eyebrow="Reviews" title={`${submission.golfer_name}'s swing`} actions={<><LinkButton href="/coach/workspace" variant="secondary">Coach Workspace</LinkButton><LinkButton href="/coach/pilot" variant="secondary">Reviews</LinkButton></>} />
      <section className="mb-5 rounded-lg border border-ink/10 bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2"><StatusBadge status={submission.status} /><span className="text-sm font-bold text-ink/55">{submission.payment_status}</span></div>
        <SectionHeading title="Golfer's question" detail={submission.question} />
        <p className="text-sm font-bold capitalize text-ink/55">{submission.camera_angle.replaceAll("_", " ")} · {submission.handedness} handed</p>
      </section>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        {videos.length ? <CoachVideoReviewSwitcher videos={videos} submissionId={submission.id} initialRecordingUrl={recordingUrl} /> : <section className="rounded-lg bg-black p-5 text-white">The original videos have been deleted under the pilot retention policy.</section>}
        <PilotFulfilmentForm submissionId={submission.id} initialSummary={submission.summary} initialDrills={submission.drills || []} />
      </div>
    </PageShell>
  );
}
