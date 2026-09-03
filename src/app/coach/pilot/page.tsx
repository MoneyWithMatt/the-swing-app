import { ArrowRight } from "lucide-react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Button, LinkButton, PageShell, SectionHeading, StatusBadge, TopBar } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { getPilotEnv } from "@/lib/server/pilot-env";
import { supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";
import type { SubmissionStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type CoachSubmission = {
  id: string;
  golfer_name: string;
  question: string;
  camera_angle: string;
  handedness: string;
  status: SubmissionStatus;
  payment_status: string;
  created_at: string;
};

export default async function PilotCoachPage({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const authenticated = await isCoachAuthenticated();
  if (!authenticated) redirect("/login");
  const user = await getAuthenticatedUser();
  if (!user) redirect("/login");
  const profile = await getCoachProfile(user.id);
  if (!profile) redirect("/coach/profile");

  const submissions = getPilotEnv()
    ? await supabaseRest<CoachSubmission[]>(`/rest/v1/pilot_submissions?coach_profile_id=eq.${encodeURIComponent(profile.id)}&select=id,golfer_name,question,camera_angle,handedness,status,payment_status,created_at&order=created_at.desc`).catch(() => [])
    : [];
  const query = await searchParams;

  return (
    <PageShell>
      <TopBar eyebrow="Coach account" title={`${profile.display_name}'s live queue`} actions={<><LinkButton href="/coach/profile" variant="secondary">Edit profile</LinkButton><form action={logout}><Button variant="secondary">Log out</Button></form></>} />
      {query.sent === "success" ? <div className="mb-5 rounded-lg border border-moss/30 bg-moss/10 p-4 text-sm leading-6 text-ink/70"><p className="font-bold text-moss">Analysis sent successfully.</p><p>The golfer can now view and download your response.</p></div> : null}
      <section className="rounded-lg border border-ink/10 bg-white">
        <div className="border-b border-ink/10 p-4"><SectionHeading title="Real pilot submissions" detail="Newest requests appear first." /></div>
        <div className="divide-y divide-ink/10">
          {submissions.length ? submissions.map((submission) => (
            <article key={submission.id} className="grid gap-4 p-4 lg:grid-cols-[9rem_minmax(0,1fr)_10rem_8rem]">
              <div><StatusBadge status={submission.status} /><p className="mt-2 text-xs font-bold text-ink/45">{formatDateTime(submission.created_at)}</p></div>
              <div><h2 className="font-bold">{submission.golfer_name}</h2><p className="mt-1 text-sm text-ink/70">{submission.question}</p></div>
              <p className="text-sm font-bold capitalize text-ink/60">{submission.camera_angle.replaceAll("_", " ")}<br />{submission.handedness} handed</p>
              <LinkButton href={`/coach/pilot/submissions/${submission.id}`} variant="secondary" size="sm">Open <ArrowRight size={16} aria-hidden /></LinkButton>
            </article>
          )) : <p className="p-5 text-sm font-bold text-ink/55">No real pilot submissions yet.</p>}
        </div>
      </section>
    </PageShell>
  );
}
