import { Clock, CreditCard, Download, Film, MessageSquare } from "lucide-react";
import { LinkButton, PageShell, SectionHeading, StatusBadge, TopBar } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { getPilotEnv } from "@/lib/server/pilot-env";
import { createSignedDownload } from "@/lib/server/supabase-rest";
import { supabaseRest } from "@/lib/server/supabase-rest";
import type { SubmissionStatus } from "@/lib/types";
import { ContinuePaymentButton } from "@/components/golfer/ContinuePaymentButton";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";

export const dynamic = "force-dynamic";

type Submission = {
  id: string;
  user_id?: string;
  public_token: string;
  golfer_name: string;
  question: string;
  status: SubmissionStatus;
  payment_status: string;
  summary?: string;
  drills: string[];
  created_at: string;
  video_deleted_at?: string;
  result_expires_at?: string;
  result_deleted_at?: string;
  recording_path?: string;
};

export default async function PilotRequestPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const env = getPilotEnv();
  const submissions = env
    ? await supabaseRest<Submission[]>(
        `/rest/v1/pilot_submissions?public_token=eq.${encodeURIComponent(token)}&select=id,user_id,public_token,golfer_name,question,status,payment_status,summary,drills,recording_path,created_at,video_deleted_at,result_expires_at,result_deleted_at&limit=1`
      ).catch(() => [])
    : [];
  const submission = submissions[0];
  const user = await getAuthenticatedUser();

  if (!submission) {
    return (
      <PageShell>
        <TopBar eyebrow="Golfer" title="Request not found" actions={<LinkButton href="/">Home</LinkButton>} />
      </PageShell>
    );
  }

  const ready = submission.status === "ready" && !submission.result_deleted_at;
  const canContinuePayment = user?.id === submission.user_id && (submission.payment_status === "not_started" || submission.payment_status === "checkout_created");
  const recordingUrl = ready && submission.recording_path ? await createSignedDownload(submission.recording_path, 60 * 60 * 4) : undefined;
  const recordingDownloadUrl = recordingUrl ? `${recordingUrl}${recordingUrl.includes("?") ? "&" : "?"}download=${encodeURIComponent("swing-analysis.mp4")}` : undefined;
  return (
    <PageShell>
      <TopBar
        eyebrow="Golfer"
        title={submission.result_deleted_at ? "Your private analysis has expired" : ready ? `Your analysis is ready, ${submission.golfer_name}` : "Matt has your swing"}
        actions={<LinkButton href="/" variant="secondary">Home</LinkButton>}
      />
      <section className="mb-5 rounded-lg border border-ink/10 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <StatusBadge status={submission.status} />
          <span className="text-sm font-bold text-ink/50">{formatDateTime(submission.created_at)}</span>
        </div>
        <p className="text-base font-semibold leading-7 text-ink">{submission.question}</p>
        {canContinuePayment ? <ContinuePaymentButton submissionId={submission.id} className="mt-4 max-w-xs" /> : null}
      </section>

      {submission.result_deleted_at ? (
        <section className="rounded-lg border border-flag/40 bg-flag/10 p-5">
          <SectionHeading title="This private analysis has expired" detail="Pilot results are removed after 14 days to minimise video and personal-data storage." />
        </section>
      ) : ready ? (
        <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {recordingUrl ? (
            <div className="lg:col-span-2">
              <video className="mx-auto aspect-[9/16] w-full max-w-md rounded-lg bg-black object-contain" src={recordingUrl} controls playsInline />
              {recordingDownloadUrl ? (
                <div className="mt-3 flex justify-end">
                  <a className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-moss px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-moss/90" href={recordingDownloadUrl} download="swing-analysis.mp4">
                    <Download size={18} aria-hidden />Download your analysis video
                  </a>
                </div>
              ) : null}
            </div>
          ) : null}
          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <SectionHeading title="Matt's breakdown" />
            <p className="text-base leading-7 text-ink/75">{submission.summary}</p>
          </div>
          <aside className="rounded-lg border border-moss/20 bg-moss/5 p-5">
            <SectionHeading title="Take this to the range" />
            <ul className="space-y-3 text-sm leading-6 text-ink/75">
              {(submission.drills || []).map((drill) => <li key={drill}>• {drill}</li>)}
            </ul>
            {submission.result_expires_at ? <p className="mt-5 border-t border-moss/20 pt-4 text-xs font-bold text-moss">Available until {formatDateTime(submission.result_expires_at)}.</p> : null}
          </aside>
        </section>
      ) : (
        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-moss/20 bg-moss/5 p-4">
            <MessageSquare className="mb-3 text-moss" size={22} aria-hidden />
            <h2 className="font-bold">Submitted</h2>
            <p className="mt-1 text-sm text-ink/60">Your question and swing are held temporarily and privately.</p>
          </div>
          <div className="rounded-lg border border-flag/40 bg-flag/10 p-4">
            <Film className="mb-3" size={22} aria-hidden />
            <h2 className="font-bold">Coach review</h2>
            <p className="mt-1 text-sm text-ink/60">Matt will review the key move.</p>
          </div>
          <div className="rounded-lg border border-ink/10 bg-white p-4">
            {submission.payment_status === "authorized" || submission.payment_status === "discounted" ? <CreditCard className="mb-3 text-moss" size={22} aria-hidden /> : <Clock className="mb-3" size={22} aria-hidden />}
            <h2 className="font-bold">{submission.payment_status === "discounted" ? "Friends-and-family code applied" : "Test payment authorized"}</h2>
            <p className="mt-1 text-sm text-ink/60">{submission.payment_status === "discounted" ? "Nothing was charged." : "No real money has moved in Stripe sandbox."}</p>
          </div>
          <p className="sm:col-span-3 text-xs font-bold text-ink/50">The original swing is deleted when Matt sends the analysis, or automatically after seven days.</p>
        </section>
      )}
    </PageShell>
  );
}
