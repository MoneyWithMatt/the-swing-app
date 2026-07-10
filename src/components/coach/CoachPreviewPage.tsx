"use client";

import { useRouter } from "next/navigation";
import { Send } from "lucide-react";
import { createDraftAnalysis } from "@/lib/mock-data";
import { useSwingStore } from "@/lib/mock-store";
import { AnalysisPlayer } from "@/components/video/AnalysisPlayer";
import { Button, LinkButton, PageShell, SectionHeading, TopBar } from "@/components/ui/primitives";

export function CoachPreviewPage({ id }: { id: string }) {
  const router = useRouter();
  const {
    hydrated,
    getSubmission,
    getVideo,
    getAnnotationsForSubmission,
    getAnalysisForSubmission,
    sendAnalysis
  } = useSwingStore();
  const submission = getSubmission(id);
  const video = submission ? getVideo(submission.videoAssetId) : undefined;
  const annotations = submission ? getAnnotationsForSubmission(submission.id) : [];
  const analysis =
    submission && (getAnalysisForSubmission(submission.id) ?? createDraftAnalysis(submission.id, submission.coachId));
  const recordingVideo = analysis?.narrationAssetId ? getVideo(analysis.narrationAssetId) : undefined;

  function handleSend() {
    if (!submission) {
      return;
    }

    sendAnalysis(submission.id);
    router.push(`/golfer/requests/${submission.id}`);
  }

  if (!hydrated) {
    return (
      <PageShell>
        <TopBar eyebrow="Coach" title="Loading preview" />
      </PageShell>
    );
  }

  if (!submission || !video || !analysis) {
    return (
      <PageShell>
        <TopBar
          eyebrow="Coach"
          title="Preview not found"
          actions={<LinkButton href="/coach" variant="secondary">Dashboard</LinkButton>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopBar
        eyebrow="Coach preview"
        title="Golfer-facing analysis"
        actions={
          <>
            <LinkButton href={`/coach/submissions/${submission.id}`} variant="secondary">
              Edit
            </LinkButton>
            <Button type="button" onClick={handleSend} data-testid="send-analysis">
              <Send size={16} aria-hidden />
              Send to golfer
            </Button>
          </>
        }
      />

      <section className="mb-5 rounded-lg border border-ink/10 bg-white p-4">
        <SectionHeading title="Question" detail={submission.question} />
      </section>

      <AnalysisPlayer video={video} recordingVideo={recordingVideo} analysis={analysis} annotations={annotations} />
    </PageShell>
  );
}
