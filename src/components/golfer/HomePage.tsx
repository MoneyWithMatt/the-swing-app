"use client";

import Image from "next/image";
import { ArrowRight, ClipboardList, RotateCcw, Video } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { useSwingStore } from "@/lib/mock-store";
import { LinkButton, PageShell, StatusBadge, TopBar, Button } from "@/components/ui/primitives";

export function HomePage() {
  const { state, hydrated, resetDemo } = useSwingStore();
  const matt = state.coaches[0];
  const latestSubmission = state.submissions[0];

  return (
    <PageShell>
      <TopBar eyebrow="The Swing App" title="One swing. One question." />

      <section className="mx-auto grid max-w-md gap-4 lg:max-w-5xl lg:grid-cols-[minmax(0,1fr)_24rem] lg:items-stretch">
        <div className="overflow-hidden rounded-lg border border-ink/10 bg-ink shadow-soft lg:order-2">
          <div className="relative aspect-[5/4] lg:aspect-[4/5]">
            <Image
              src="/sample-images/golf-coach-range.png"
              alt="Golf coach reviewing a swing video on a tablet"
              fill
              priority
              sizes="(min-width: 1024px) 24rem, 100vw"
              className="object-cover"
            />
          </div>
        </div>

        <div className="flex flex-col justify-between rounded-lg border border-ink/10 bg-white p-5 shadow-soft">
          <div>
            <div className="mb-4 inline-flex rounded-full border border-moss/20 bg-moss/10 px-3 py-1 text-sm font-bold text-moss">
              Matt is the launch coach · {formatPrice(matt?.pricePence ?? 500)}
            </div>
            <h2 className="text-3xl font-bold leading-tight text-ink sm:text-4xl">
              Get Matt&apos;s swing feedback for £5.
            </h2>
            <p className="mt-3 text-base leading-7 text-ink/70">
              Upload a swing, ask a focused question, and get a polished human breakdown without booking a full lesson.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            <LinkButton href="/new" className="w-full" data-testid="start-submission">
              <Video size={18} aria-hidden />
              Submit a swing
            </LinkButton>
            {hydrated && latestSubmission ? (
              <LinkButton
                href={`/golfer/requests/${latestSubmission.id}`}
                variant="secondary"
                className="w-full"
              >
                View latest request
                <ArrowRight size={16} aria-hidden />
              </LinkButton>
            ) : null}
          </div>
        </div>
      </section>

      {hydrated && latestSubmission ? (
        <section className="mx-auto mt-4 max-w-md rounded-lg border border-ink/10 bg-white p-4 lg:max-w-5xl">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2">
                <StatusBadge status={latestSubmission.status} />
                <span className="text-sm font-bold text-ink/50">Latest request</span>
              </div>
              <p className="text-sm leading-6 text-ink/70">{latestSubmission.question}</p>
            </div>
            <LinkButton href={`/golfer/requests/${latestSubmission.id}`} variant="secondary" size="sm">
              Open
              <ArrowRight size={16} aria-hidden />
            </LinkButton>
          </div>
        </section>
      ) : null}

      <details className="mx-auto mt-4 max-w-md rounded-lg border border-ink/10 bg-white p-4 lg:max-w-5xl">
        <summary className="cursor-pointer text-sm font-bold text-ink/60">Prototype tools</summary>
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <LinkButton href="/coach" variant="secondary" data-testid="coach-dashboard-link">
            <ClipboardList size={18} aria-hidden />
            Coach dashboard
          </LinkButton>
          <Button type="button" variant="ghost" onClick={resetDemo}>
            <RotateCcw size={16} aria-hidden />
            Reset demo
          </Button>
        </div>
      </details>
    </PageShell>
  );
}
