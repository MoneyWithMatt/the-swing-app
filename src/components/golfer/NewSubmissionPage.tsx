"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Upload, Video } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { SAMPLE_VIDEO_URL } from "@/lib/mock-data";
import { useSwingStore } from "@/lib/mock-store";
import { getVideoDuration, prepareVideoFile, type PreparedVideo } from "@/lib/video-utils";
import {
  Button,
  FieldLabel,
  LinkButton,
  PageShell,
  SectionHeading,
  TextArea,
  TopBar,
  cn
} from "@/components/ui/primitives";

const QUESTION_PROMPTS = [
  "Why am I slicing this?",
  "Is my setup causing the miss?",
  "What is one drill I should use?"
];

export function NewSubmissionPage() {
  const router = useRouter();
  const { state, createSubmission } = useSwingStore();
  const matt = state.coaches[0];
  const [question, setQuestion] = useState("");
  const [video, setVideo] = useState<PreparedVideo>({
    url: SAMPLE_VIDEO_URL,
    mimeType: "video/mp4",
    storageKind: "remote",
    note: "Using the demo clip."
  });
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(file?: File) {
    if (!file) {
      return;
    }

    setError("");
    setIsPreparing(true);
    try {
      const prepared = await prepareVideoFile(file);
      const duration = await getVideoDuration(prepared.url);
      setVideo({ ...prepared, duration });
    } catch {
      setError("This browser could not load that video. Try another MP4 or use the demo clip.");
    } finally {
      setIsPreparing(false);
    }
  }

  async function useSampleVideo() {
    setError("");
    const duration = await getVideoDuration(SAMPLE_VIDEO_URL);
    setVideo({
      url: SAMPLE_VIDEO_URL,
      mimeType: "video/mp4",
      storageKind: "remote",
      duration,
      note: "Using the demo clip."
    });
  }

  function submit() {
    setError("");
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError("Ask Matt one focused question before submitting.");
      return;
    }

    if (!paymentApproved) {
      setError("Approve the mock £5 payment to continue.");
      return;
    }

    const submissionId = createSubmission({
      question: trimmedQuestion,
      videoUrl: video.url,
      videoMimeType: video.mimeType,
      videoStorageKind: video.storageKind,
      videoDuration: video.duration
    });

    router.push(`/golfer/requests/${submissionId}`);
  }

  return (
    <PageShell>
      <TopBar
        eyebrow="Golfer"
        title="Submit a swing"
        actions={<LinkButton href="/" variant="secondary">Home</LinkButton>}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="space-y-5">
          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <SectionHeading title="1. Swing video" detail="Use one clip from face-on or down-the-line." />
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_12rem]">
              <label className="focus-ring flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-moss/40 bg-moss/5 p-5 text-center hover:bg-moss/10">
                <Upload size={28} className="mb-3 text-moss" aria-hidden />
                <span className="font-bold text-ink">Upload or record</span>
                <span className="mt-1 text-sm text-ink/60">MP4 or MOV works best</span>
                <input
                  className="sr-only"
                  type="file"
                  accept="video/*"
                  capture="environment"
                  onChange={(event) => handleFile(event.target.files?.[0])}
                />
              </label>
              <button
                type="button"
                className="focus-ring rounded-lg border border-ink/10 bg-ink p-4 text-left text-white transition hover:bg-moss"
                onClick={useSampleVideo}
              >
                <Video size={24} className="mb-4" aria-hidden />
                <span className="block font-bold">Use demo clip</span>
                <span className="mt-1 block text-sm text-white/70">Repeatable sample data</span>
              </button>
            </div>
            <p className="mt-3 text-sm font-bold text-moss">
              {isPreparing ? "Preparing video..." : video.note}
            </p>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <SectionHeading title="2. Coach" detail="Launch version keeps choice simple." />
            <div className="flex flex-col gap-4 rounded-lg border border-moss/30 bg-moss/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-moss text-sm font-bold text-white">
                    M
                  </span>
                  <div>
                    <h3 className="font-bold text-ink">{matt?.name ?? "Matt"}</h3>
                    <p className="text-sm text-ink/60">Beginner-friendly golf coach</p>
                  </div>
                </div>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-sm font-bold text-ink">
                <Check size={16} className="text-moss" aria-hidden />
                {formatPrice(matt?.pricePence ?? 500)}
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <SectionHeading title="3. Focused question" detail="One useful answer beats a general lesson." />
            <div className="mb-3 flex flex-wrap gap-2">
              {QUESTION_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  className="focus-ring rounded-full border border-ink/10 bg-paper px-3 py-1.5 text-sm font-bold text-ink hover:border-moss"
                  onClick={() => setQuestion(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <FieldLabel>Question for Matt</FieldLabel>
            <TextArea
              data-testid="question-input"
              value={question}
              maxLength={180}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Example: Why do I keep slicing this driver?"
            />
            <p className="mt-2 text-right text-xs font-bold text-ink/45">{question.length}/180</p>
          </div>
        </section>

        <aside className="h-fit rounded-lg border border-ink/10 bg-white p-5">
          <SectionHeading title="4. Payment" detail="Prototype authorization only." />
          <button
            type="button"
            data-testid="payment-toggle"
            className={cn(
              "focus-ring flex w-full items-start gap-3 rounded-lg border p-4 text-left transition",
              paymentApproved ? "border-moss bg-moss/10" : "border-ink/10 hover:border-moss"
            )}
            onClick={() => setPaymentApproved((value) => !value)}
          >
            <span
              className={cn(
                "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                paymentApproved ? "border-moss bg-moss text-white" : "border-ink/20 bg-white"
              )}
            >
              {paymentApproved ? <Check size={14} aria-hidden /> : null}
            </span>
            <span>
              <span className="flex items-center gap-2 font-bold text-ink">
                <CreditCard size={16} aria-hidden />
                Authorise {formatPrice(500)}
              </span>
              <span className="mt-1 block text-sm leading-6 text-ink/60">
                Captured only when the analysis is sent.
              </span>
            </span>
          </button>

          {error ? (
            <p className="mt-4 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm font-bold text-clay">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            data-testid="submit-swing"
            className="mt-5 w-full"
            disabled={isPreparing}
            onClick={submit}
          >
            Send to Matt
          </Button>
        </aside>
      </div>
    </PageShell>
  );
}
