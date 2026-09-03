"use client";

import { ArrowRight, Clock, Inbox, Send } from "lucide-react";
import { formatDateTime, formatPrice } from "@/lib/format";
import { useSwingStore } from "@/lib/mock-store";
import { LinkButton, PageShell, SectionHeading, StatusBadge, TopBar } from "@/components/ui/primitives";

export function CoachDashboardPage() {
  const { state, hydrated, getGolfer } = useSwingStore();
  const submissions = [...state.submissions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const activeQueue = submissions.filter((submission) => submission.status !== "ready");
  const ready = submissions.filter((submission) => submission.status === "ready");

  return (
    <PageShell>
      <TopBar
        eyebrow="Coach"
        title="Matt's dashboard"
        actions={
          <>
            <LinkButton href="/" variant="secondary">Home</LinkButton>
            <LinkButton href="/coach/pilot" variant="secondary">Live pilot queue</LinkButton>
            <LinkButton href="/new" variant="ghost">New golfer request</LinkButton>
          </>
        }
      />

      <section className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <Inbox size={22} className="mb-3 text-moss" aria-hidden />
          <p className="text-3xl font-bold text-ink">{activeQueue.length}</p>
          <p className="text-sm font-semibold text-ink/60">Open requests</p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <Clock size={22} className="mb-3 text-flag" aria-hidden />
          <p className="text-3xl font-bold text-ink">{submissions.length}</p>
          <p className="text-sm font-semibold text-ink/60">Total prototype requests</p>
        </div>
        <div className="rounded-lg border border-ink/10 bg-white p-4">
          <Send size={22} className="mb-3 text-clay" aria-hidden />
          <p className="text-3xl font-bold text-ink">{ready.length}</p>
          <p className="text-sm font-semibold text-ink/60">Sent analyses</p>
        </div>
      </section>

      <section className="rounded-lg border border-ink/10 bg-white">
        <div className="border-b border-ink/10 p-4">
          <SectionHeading title="Submission queue" detail="Newest requests appear first." />
        </div>
        <div className="divide-y divide-ink/10">
          {!hydrated ? (
            <div className="p-5 text-sm font-bold text-ink/60">Loading queue...</div>
          ) : submissions.length ? (
            submissions.map((submission) => {
              const golfer = getGolfer(submission.golferId);
              return (
                <article
                  key={submission.id}
                  className="grid gap-4 p-4 transition hover:bg-mist/60 lg:grid-cols-[10rem_minmax(0,1fr)_8rem_8rem]"
                >
                  <div>
                    <StatusBadge status={submission.status} />
                    <p className="mt-2 text-xs font-bold text-ink/45">{formatDateTime(submission.createdAt)}</p>
                  </div>
                  <div>
                    <h3 className="font-bold text-ink">{golfer?.name ?? "Demo golfer"}</h3>
                    <p className="mt-1 text-sm leading-6 text-ink/70">{submission.question}</p>
                  </div>
                  <div className="text-sm font-bold text-ink">{formatPrice(submission.pricePence)}</div>
                  <div className="flex items-center justify-start lg:justify-end">
                    <LinkButton
                      href={
                        submission.status === "ready"
                          ? `/coach/submissions/${submission.id}/preview`
                          : `/coach/submissions/${submission.id}`
                      }
                      variant="secondary"
                      size="sm"
                    >
                      Open
                      <ArrowRight size={16} aria-hidden />
                    </LinkButton>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="p-5 text-sm font-bold text-ink/60">No submissions yet.</div>
          )}
        </div>
      </section>
    </PageShell>
  );
}
