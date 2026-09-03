import { CreditCard, Download, Film, Plus, ReceiptText, Trash2 } from "lucide-react";
import { redirect } from "next/navigation";
import { logout } from "@/app/login/actions";
import { Button, LinkButton, PageShell, StatusBadge, TopBar } from "@/components/ui/primitives";
import { formatDateTime } from "@/lib/format";
import { getAuthenticatedUser, isCoachUser } from "@/lib/server/supabase-auth";
import { supabaseRest } from "@/lib/server/supabase-rest";
import type { SubmissionStatus } from "@/lib/types";
import { requestAccountDeletion } from "./privacy-actions";
import { ContinuePaymentButton } from "@/components/golfer/ContinuePaymentButton";

type Submission = { id: string; public_token: string; question: string; status: SubmissionStatus; payment_status: string; created_at: string; result_expires_at?: string; result_deleted_at?: string };
export const dynamic = "force-dynamic";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ privacy?: string; submitted?: string }> }) {
  const user = await getAuthenticatedUser();
  if (!user?.email) redirect("/login");
  if (isCoachUser(user)) redirect("/coach/pilot");
  const submissions = await supabaseRest<Submission[]>(`/rest/v1/pilot_submissions?golfer_email=eq.${encodeURIComponent(user.email.toLowerCase())}&select=id,public_token,question,status,payment_status,created_at,result_expires_at,result_deleted_at&order=created_at.desc`).catch(() => []);
  const name = typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : user.email.split("@")[0];
  const query = await searchParams;
  return <PageShell>
    <TopBar eyebrow="Golfer account" title={`Welcome back, ${name}`} actions={<><LinkButton href="/coaches"><Plus size={17} aria-hidden />Choose a coach</LinkButton><form action={logout}><Button variant="secondary">Log out</Button></form></>} />
    {query.submitted === "success" ? <div className="mb-5 rounded-lg border border-moss/30 bg-moss/10 p-4 text-sm leading-6 text-ink/70"><p className="font-bold text-moss">Swing submitted successfully.</p><p>Your coach has received it. You can follow its progress below.</p></div> : null}
    <div className="mb-5 rounded-lg border border-moss/20 bg-moss/5 p-4 text-sm leading-6 text-ink/70"><p className="font-bold text-moss">Your history stays; videos do not.</p><p>Original swings are deleted after 7 days. Coach videos are available for 14 days, so download any response you want to keep.</p></div>
    <section className="rounded-lg border border-ink/10 bg-white">
      <div className="flex items-center gap-3 border-b border-ink/10 p-4"><ReceiptText className="text-moss" aria-hidden /><div><h2 className="font-bold">Past transactions and requests</h2><p className="text-sm text-ink/55">Written details remain after videos expire.</p></div></div>
      <div className="divide-y divide-ink/10">{submissions.length ? submissions.map((submission) => <article key={submission.public_token} className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"><div><div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge status={submission.status} /><span className="text-xs font-bold text-ink/45">{formatDateTime(submission.created_at)}</span></div><p className="font-semibold">{submission.question}</p><p className="mt-1 flex items-center gap-1 text-xs font-bold text-ink/50">{submission.result_deleted_at ? <><Trash2 size={14} aria-hidden />Response video deleted</> : submission.status === "ready" ? <><Download size={14} aria-hidden />Download before {submission.result_expires_at ? formatDateTime(submission.result_expires_at) : "expiry"}</> : submission.payment_status === "not_started" || submission.payment_status === "checkout_created" ? <><CreditCard size={14} aria-hidden />Awaiting payment</> : <><Film size={14} aria-hidden />Response pending</>}</p></div><div className="grid gap-2">{submission.payment_status === "not_started" || submission.payment_status === "checkout_created" ? <ContinuePaymentButton submissionId={submission.id} /> : null}<LinkButton href={`/request/${submission.public_token}`} variant="secondary" size="sm">View details</LinkButton></div></article>) : <div className="p-6 text-center"><p className="font-bold">No swing requests yet.</p><LinkButton href="/new" className="mt-4">Submit your first swing</LinkButton></div>}</div>
    </section>
    <section className="mt-5 rounded-lg border border-ink/10 bg-white p-5">
      <h2 className="font-bold">Your privacy controls</h2>
      <p className="mt-1 text-sm leading-6 text-ink/60">Download a machine-readable copy of your account information, or ask us to erase your account and associated videos. Some transaction records may need to be retained for legal reasons.</p>
      {query.privacy === "requested" ? <p className="mt-3 rounded-md border border-moss/30 bg-moss/10 p-3 text-sm font-bold text-moss">Deletion request received. We will confirm the outcome by email.</p> : null}
      <div className="mt-4 flex flex-wrap gap-3"><LinkButton href="/api/account/export" variant="secondary"><Download size={17} aria-hidden />Download my data</LinkButton><form action={requestAccountDeletion}><Button variant="secondary"><Trash2 size={17} aria-hidden />Request account deletion</Button></form></div>
      <p className="mt-3 text-xs text-ink/50">See the <a className="font-bold text-moss underline" href="/privacy">privacy notice</a> for all your rights.</p>
    </section>
  </PageShell>;
}
