"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CreditCard, Video } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { SAMPLE_VIDEO_URL } from "@/lib/mock-data";
import { useSwingStore } from "@/lib/mock-store";
import { getVideoDuration, type PreparedVideo } from "@/lib/video-utils";
import { SwingVideoUpload, type SelectedSwingVideo } from "@/components/golfer/SwingVideoUpload";
import {
  Button,
  FieldLabel,
  LinkButton,
  PageShell,
  SectionHeading,
  TextArea,
  TextInput,
  TopBar,
  cn
} from "@/components/ui/primitives";

const QUESTION_PROMPTS = [
  "Why am I slicing this?",
  "Is my setup causing the miss?",
  "What is one drill I should use?"
];

export function NewSubmissionPage({ golferName, golferEmail, coachId, coachName, sport }: { golferName: string; golferEmail: string; coachId: string; coachName: string; sport: "golf" }) {
  const router = useRouter();
  const { state, createSubmission } = useSwingStore();
  const matt = state.coaches[0];
  const [question, setQuestion] = useState("");
  const [handedness, setHandedness] = useState<"right" | "left">("right");
  const [downLineVideo, setDownLineVideo] = useState<SelectedSwingVideo>();
  const [faceOnVideo, setFaceOnVideo] = useState<SelectedSwingVideo>();
  const [uploadResetKey, setUploadResetKey] = useState(0);
  const [video, setVideo] = useState<PreparedVideo>({
    url: SAMPLE_VIDEO_URL,
    mimeType: "video/mp4",
    storageKind: "remote",
    note: "Using the demo clip."
  });
  const [paymentApproved, setPaymentApproved] = useState(false);
  const [retentionUnderstood, setRetentionUnderstood] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function useSampleVideo() {
    setError("");
    setDownLineVideo(undefined);
    setFaceOnVideo(undefined);
    setUploadResetKey((value) => value + 1);
    const duration = await getVideoDuration(SAMPLE_VIDEO_URL);
    setVideo({
      url: SAMPLE_VIDEO_URL,
      mimeType: "video/mp4",
      storageKind: "remote",
      duration,
      note: "Using the demo clip."
    });
  }

  async function submit() {
    setError("");
    const trimmedQuestion = question.trim();
    const selectedVideos = [downLineVideo, faceOnVideo].filter(Boolean) as SelectedSwingVideo[];
    if (!trimmedQuestion) {
      setError("Ask Matt one focused question before submitting.");
      return;
    }

    if (!paymentApproved) {
      setError("Confirm that you are ready to continue to Stripe Checkout.");
      return;
    }
    if (!retentionUnderstood) {
      setError("Confirm that you understand how the temporary videos are shared and deleted.");
      return;
    }

    if (selectedVideos.length && (!golferName.trim() || !golferEmail.trim())) {
      setError("Add your name and email for the real pilot submission.");
      return;
    }

    if (selectedVideos.length) {
      setIsSubmitting(true);
      try {
        const primary = downLineVideo || faceOnVideo!;
        const extension = primary.file.name.split(".").pop() || "mp4";
        const preparedResponse = await fetch("/api/pilot/submissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            golferName,
            golferEmail,
            coachProfileId: coachId,
            sport,
            question: trimmedQuestion,
            cameraAngle: downLineVideo ? "down_the_line" : "face_on",
            handedness,
            videoMimeType: primary.file.type || "video/mp4",
            videoSizeBytes: primary.file.size,
            fileExtension: extension,
            faceOnVideoMimeType: downLineVideo && faceOnVideo ? faceOnVideo.file.type || "video/mp4" : undefined,
            faceOnVideoSizeBytes: downLineVideo && faceOnVideo ? faceOnVideo.file.size : undefined,
            faceOnFileExtension: downLineVideo && faceOnVideo ? faceOnVideo.file.name.split(".").pop() || "mp4" : undefined
          })
        });
        const prepared = (await preparedResponse.json()) as {
          id?: string;
          uploadUrl?: string; faceOnUploadUrl?: string;
          error?: string;
        };

        if (preparedResponse.status !== 503) {
          if (!preparedResponse.ok || !prepared.id || !prepared.uploadUrl) {
            throw new Error(prepared.error || "The upload could not be prepared.");
          }

          async function uploadFile(uploadUrl: string, file: File) {
            const uploadToken = new URL(uploadUrl).searchParams.get("token");
            if (!uploadToken) throw new Error("The video upload could not be authorised.");
            const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            headers: {
              "Content-Type": file.type || "video/mp4",
              Authorization: `Bearer ${uploadToken}`,
              "x-upsert": "false"
            },
              body: file
            });
            if (!uploadResponse.ok) throw new Error("A video upload did not complete. Please try again.");
          }
          await uploadFile(prepared.uploadUrl, primary.file);
          if (downLineVideo && faceOnVideo) {
            if (!prepared.faceOnUploadUrl) throw new Error("The Face On upload could not be prepared.");
            await uploadFile(prepared.faceOnUploadUrl, faceOnVideo.file);
          }

          const checkoutResponse = await fetch("/api/pilot/checkout", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ submissionId: prepared.id })
          });
          const checkout = (await checkoutResponse.json()) as { url?: string; error?: string };
          if (!checkoutResponse.ok || !checkout.url) {
            throw new Error(checkout.error || "Stripe checkout could not be started.");
          }
          window.location.assign(checkout.url);
          return;
        }
      } catch (submissionError) {
        setError(submissionError instanceof Error ? submissionError.message : "Submission failed.");
        setIsSubmitting(false);
        return;
      }
    }

    const submissionId = createSubmission({
      question: trimmedQuestion,
      videoUrl: video.url,
      videoMimeType: video.mimeType,
      videoStorageKind: video.storageKind,
      videoDuration: video.duration
    });

    router.push(`/golfer/requests/${submissionId}`);
    setIsSubmitting(false);
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
            <SectionHeading title="1. Swing videos" detail="Down the Line is preferable. Upload both angles if you have both." />
            <div className="grid gap-4 lg:grid-cols-2">
              <SwingVideoUpload key={`down-line-${uploadResetKey}`} label="Down the Line" detail="Film from behind, looking towards the target." recommended onChange={setDownLineVideo} />
              <SwingVideoUpload key={`face-on-${uploadResetKey}`} label="Face On" detail="Film from in front, facing the golfer." onChange={setFaceOnVideo} />
            </div>
            <div className="mt-4">
              <button
                type="button"
                className="focus-ring rounded-lg border border-ink/10 bg-ink p-4 text-left text-white transition hover:bg-moss"
                onClick={useSampleVideo}
              >
                <Video size={24} className="mb-4" aria-hidden />
                <span className="block font-bold">Use demo clip</span>
                <span className="mt-1 block text-sm text-white/70">Uses one sample Down the Line clip</span>
              </button>
            </div>
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-5">
            <SectionHeading title="2. Coach" detail="Golf swing analysis" />
            <div className="flex flex-col gap-4 rounded-lg border border-moss/30 bg-moss/5 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-moss text-sm font-bold text-white">
                    {coachName.charAt(0)}
                  </span>
                  <div>
                    <h3 className="font-bold text-ink">{coachName}</h3>
                    <p className="text-sm text-ink/60">Golf coach</p>
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
            <div className="mb-4 grid gap-3 sm:grid-cols-2">
              <div>
                <FieldLabel>Your name</FieldLabel>
                <TextInput
                  value={golferName}
                  autoComplete="name"
                  readOnly
                />
              </div>
              <div>
                <FieldLabel>Email</FieldLabel>
                <TextInput
                  type="email"
                  value={golferEmail}
                  autoComplete="email"
                  readOnly
                />
              </div>
              <div>
                <FieldLabel>Handedness</FieldLabel>
                <select
                  className="focus-ring w-full rounded-md border border-ink/15 bg-white px-3 py-2.5 text-sm text-ink"
                  value={handedness}
                  onChange={(event) => setHandedness(event.target.value as typeof handedness)}
                >
                  <option value="right">Right handed</option>
                  <option value="left">Left handed</option>
                </select>
              </div>
            </div>
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
          <SectionHeading title="4. Checkout" detail="Use a test card or enter MATT100 for free testing." />
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
                Continue to Stripe · {formatPrice(500)}
              </span>
              <span className="mt-1 block text-sm leading-6 text-ink/60">
                Stripe will show a promotion-code box. Enter <strong>MATT100</strong> to reduce the test payment to £0 and skip card entry.
              </span>
            </span>
          </button>
          <label className="mt-4 flex items-start gap-3 rounded-lg border border-ink/10 p-4 text-sm leading-6 text-ink/70">
            <input className="mt-1 h-4 w-4 shrink-0 accent-moss" type="checkbox" checked={retentionUnderstood} onChange={(event) => setRetentionUnderstood(event.target.checked)} />
            <span>I understand that my selected coach can view this video to provide feedback. The original is deleted within 7 days (or sooner after the response is sent), and the response video is deleted after 14 days. See the <a className="font-bold text-moss underline" href="/privacy" target="_blank" rel="noreferrer">privacy notice</a>.</span>
          </label>

          {error ? (
            <p className="mt-4 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm font-bold text-clay">
              {error}
            </p>
          ) : null}

          <Button
            type="button"
            data-testid="submit-swing"
            className="mt-5 w-full"
            disabled={isSubmitting}
            onClick={submit}
          >
            {isSubmitting ? "Preparing secure checkout..." : "Send to Matt"}
          </Button>
        </aside>
      </div>
    </PageShell>
  );
}
