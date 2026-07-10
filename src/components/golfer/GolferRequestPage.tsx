"use client";

import { ArrowRight, Clock, CreditCard, Film, MessageSquare } from "lucide-react";
import { formatDateTime, formatPrice } from "@/lib/format";
import { useSwingStore } from "@/lib/mock-store";
import { AnalysisPlayer } from "@/components/video/AnalysisPlayer";
import { LinkButton, PageShell, SectionHeading, StatusBadge, TopBar } from "@/components/ui/primitives";

export function GolferRequestPage({ id }: { id: string }) {
  const {
    hydrated,
    getSubmission,
    getCoach,
    getVideo,
    getAnnotationsForSubmission,
    getAnalysisForSubmission
  } = useSwingStore();
  const submission = getSubmission(id);

  if (!hydrated) {
    return (
      <PageShell>
        <TopBar eyebrow="Golfer" title="Loading request" />
      </PageShell>
    );
  }

  if (!submission) {
    return (
      <PageShell>
        <TopBar
          eyebrow="Golfer"
          title="Request not found"
          actions={<LinkButton href="/" variant="secondary">Home</LinkButton>}
        />
      </PageShell>
    );
  }

  const coach = getCoach(submission.coachId);
  const video = getVideo(submission.videoAssetId);
  const analysis = getAnalysisForSubmission(submission.id);
  const recordingVideo = analysis?.narrationAssetId ? getVideo(analysis.narrationAssetId) : undefined;
  const annotations = getAnnotationsForSubmission(submission.id);
  const isReady = submission.status === "ready" && video && analysis;

  return (
    <PageShell>
      <TopBar
        eyebrow="Golfer"
        title={isReady ? "Your analysis is ready" : "Matt has your swing"}
        actions={<LinkButton href="/" variant="secondary">Home</LinkButton>}
      />

      <section className="mb-5 rounded-lg border border-ink/10 bg-white p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <StatusBadge status={submission.status} />
              <span className="text-sm font-bold text-ink/50">{formatDateTime(submission.createdAt)}</span>
            </div>
            <p className="max-w-3xl text-base font-semibold leading-7 text-ink">{submission.question}</p>
          </div>
          <div className="rounded-md border border-moss/20 bg-moss/5 px-3 py-2 text-sm font-bold text-moss">
            {coach?.name ?? "Matt"} · {formatPrice(submission.pricePence)}
          </div>
        </div>
      </section>

      {isReady ? (
        <AnalysisPlayer video={video} recordingVideo={recordingVideo} analysis={analysis} annotations={annotations} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section className="rounded-lg border border-ink/10 bg-white p-5">
            <SectionHeading title="Status" detail="The request is ready for Matt's review." />
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-md border border-moss/20 bg-moss/5 p-4">
                <MessageSquare className="mb-3 text-moss" size={22} aria-hidden />
                <h3 className="font-bold text-ink">Submitted</h3>
                <p className="mt-1 text-sm leading-6 text-ink/60">Question and swing received.</p>
              </div>
              <div className="rounded-md border border-flag/40 bg-flag/10 p-4">
                <Film className="mb-3 text-ink" size={22} aria-hidden />
                <h3 className="font-bold text-ink">Coach review</h3>
                <p className="mt-1 text-sm leading-6 text-ink/60">Matt annotates the key moments.</p>
              </div>
              <div className="rounded-md border border-ink/10 bg-paper p-4">
                <Clock className="mb-3 text-ink/60" size={22} aria-hidden />
                <h3 className="font-bold text-ink">Ready</h3>
                <p className="mt-1 text-sm leading-6 text-ink/60">The polished breakdown appears here.</p>
              </div>
            </div>
          </section>

          <aside className="h-fit rounded-lg border border-ink/10 bg-white p-5">
            <SectionHeading title="Payment" detail="Mock authorization is active." />
            <div className="flex items-center gap-3 rounded-md border border-ink/10 p-3">
              <CreditCard size={20} className="text-moss" aria-hidden />
              <div>
                <p className="font-bold text-ink">{formatPrice(submission.pricePence)} authorized</p>
                <p className="text-sm text-ink/60">No real payment was taken.</p>
              </div>
            </div>
            <details className="mt-4 rounded-md border border-ink/10 p-3">
              <summary className="cursor-pointer text-sm font-bold text-ink/60">Prototype handoff</summary>
              <LinkButton
                href={`/coach/submissions/${submission.id}`}
                className="mt-3 w-full"
                data-testid="open-coach-workspace-from-status"
              >
                Open as Matt
                <ArrowRight size={16} aria-hidden />
              </LinkButton>
            </details>
          </aside>
        </div>
      )}
    </PageShell>
  );
}
