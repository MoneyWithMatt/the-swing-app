"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Save, Send, Trash2 } from "lucide-react";
import { AnnotationToolbar } from "@/components/annotation/AnnotationToolbar";
import {
  Button,
  FieldLabel,
  LinkButton,
  PageShell,
  SectionHeading,
  TextArea,
  TextInput,
  TopBar
} from "@/components/ui/primitives";
import { roundedTime } from "@/lib/annotation-utils";
import { formatDuration } from "@/lib/format";
import { createDraftAnalysis } from "@/lib/mock-data";
import { useSwingStore } from "@/lib/mock-store";
import type { Analysis, AnalysisChapter, Annotation, AnnotationType } from "@/lib/types";

const AnnotatedVideo = dynamic(
  () => import("@/components/video/AnnotatedVideo").then((module) => module.AnnotatedVideo),
  {
    ssr: false,
    loading: () => <div className="aspect-video rounded-lg border border-ink/10 bg-ink" />
  }
);

function updateChapter(chapters: AnalysisChapter[], chapterId: string, patch: Partial<AnalysisChapter>) {
  return chapters.map((chapter) => (chapter.id === chapterId ? { ...chapter, ...patch } : chapter));
}

export function CoachWorkspacePage({ id }: { id: string }) {
  const router = useRouter();
  const {
    hydrated,
    getSubmission,
    getCoach,
    getGolfer,
    getVideo,
    getAnnotationsForSubmission,
    getAnalysisForSubmission,
    updateSubmissionStatus,
    addAnnotation,
    deleteAnnotation,
    upsertAnalysis
  } = useSwingStore();
  const submission = getSubmission(id);
  const coach = submission ? getCoach(submission.coachId) : undefined;
  const golfer = submission ? getGolfer(submission.golferId) : undefined;
  const video = submission ? getVideo(submission.videoAssetId) : undefined;
  const annotations = submission ? getAnnotationsForSubmission(submission.id) : [];
  const storedAnalysis = submission ? getAnalysisForSubmission(submission.id) : undefined;
  const [activeTool, setActiveTool] = useState<AnnotationType>("line");
  const [annotationDuration, setAnnotationDuration] = useState(4);
  const [currentTime, setCurrentTime] = useState(0);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [savedLabel, setSavedLabel] = useState("");

  useEffect(() => {
    if (!hydrated || !submission) {
      return;
    }

    if (submission.status === "submitted") {
      updateSubmissionStatus(submission.id, "in_review");
    }
  }, [hydrated, submission, updateSubmissionStatus]);

  useEffect(() => {
    if (!hydrated || !submission) {
      return;
    }

    const nextAnalysis = storedAnalysis ?? createDraftAnalysis(submission.id, submission.coachId);
    setAnalysis(nextAnalysis);
    if (!storedAnalysis) {
      upsertAnalysis(nextAnalysis);
    }
  }, [hydrated, submission?.id, submission?.coachId, storedAnalysis?.id, upsertAnalysis]);

  const sortedAnnotations = useMemo(
    () => [...annotations].sort((a, b) => a.timeStart - b.timeStart),
    [annotations]
  );

  function persist(nextAnalysis = analysis) {
    if (!nextAnalysis) {
      return;
    }

    upsertAnalysis(nextAnalysis);
    setSavedLabel("Saved");
    window.setTimeout(() => setSavedLabel(""), 1400);
  }

  function patchAnalysis(patch: Partial<Analysis>) {
    setAnalysis((current) => (current ? { ...current, ...patch } : current));
  }

  function patchChapter(chapterId: string, patch: Partial<AnalysisChapter>) {
    setAnalysis((current) =>
      current ? { ...current, chapters: updateChapter(current.chapters, chapterId, patch) } : current
    );
  }

  function handleAddAnnotation(annotation: Omit<Annotation, "id">) {
    const annotationId = addAnnotation(annotation);
    setAnalysis((current) => {
      if (!current) {
        return current;
      }

      const activeChapter =
        current.chapters.find(
          (chapter) => currentTime >= chapter.startTime && currentTime <= chapter.endTime
        ) ?? current.chapters[0];
      const next = {
        ...current,
        chapters: current.chapters.map((chapter) =>
          chapter.id === activeChapter.id
            ? {
                ...chapter,
                annotationIds: Array.from(new Set([...chapter.annotationIds, annotationId]))
              }
            : chapter
        )
      };
      upsertAnalysis(next);
      return next;
    });
  }

  function saveAndPreview() {
    persist();
    router.push(`/coach/submissions/${id}/preview`);
  }

  if (!hydrated) {
    return (
      <PageShell>
        <TopBar eyebrow="Coach" title="Loading workspace" />
      </PageShell>
    );
  }

  if (!submission || !video || !analysis) {
    return (
      <PageShell>
        <TopBar
          eyebrow="Coach"
          title="Submission not found"
          actions={<LinkButton href="/coach" variant="secondary">Dashboard</LinkButton>}
        />
      </PageShell>
    );
  }

  return (
    <PageShell>
      <TopBar
        eyebrow="Coach workspace"
        title={`${golfer?.name ?? "Golfer"}'s swing`}
        actions={
          <>
            <LinkButton href="/coach" variant="secondary">Dashboard</LinkButton>
            <Button type="button" variant="secondary" onClick={() => persist()}>
              <Save size={16} aria-hidden />
              Save
            </Button>
            <Button type="button" onClick={saveAndPreview} data-testid="preview-analysis">
              <Send size={16} aria-hidden />
              Preview
            </Button>
          </>
        }
      />

      <section className="mb-5 rounded-lg border border-ink/10 bg-white p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-moss">{coach?.name ?? "Matt"} reviewing</p>
            <p className="mt-1 text-base font-semibold leading-7 text-ink">{submission.question}</p>
          </div>
          <div className="text-sm font-bold text-ink/60">
            Current timestamp: {formatDuration(currentTime)}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_25rem]">
        <section className="space-y-4">
          <div className="rounded-lg border border-ink/10 bg-white p-4">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <AnnotationToolbar activeTool={activeTool} onSelectTool={setActiveTool} />
              <label className="flex items-center gap-2 text-sm font-bold text-ink/70">
                Show for
                <input
                  className="focus-ring w-16 rounded-md border border-ink/15 px-2 py-1"
                  type="number"
                  min={1}
                  max={10}
                  value={annotationDuration}
                  onChange={(event) => setAnnotationDuration(Number(event.target.value))}
                />
                sec
              </label>
            </div>
            <AnnotatedVideo
              videoUrl={video.url}
              posterUrl={video.posterUrl}
              annotations={annotations}
              submissionId={submission.id}
              activeTool={activeTool}
              annotationDuration={annotationDuration}
              onAddAnnotation={handleAddAnnotation}
              onTimeChange={(time) => setCurrentTime(roundedTime(time))}
            />
          </div>

          <div className="rounded-lg border border-ink/10 bg-white p-4">
            <SectionHeading title="Annotations" detail="Timestamped marks are attached to the active chapter." />
            <div className="grid gap-2">
              {sortedAnnotations.length ? (
                sortedAnnotations.map((annotation) => (
                  <div
                    key={annotation.id}
                    className="flex items-center justify-between gap-3 rounded-md border border-ink/10 px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-bold capitalize text-ink">{annotation.type}</p>
                      <p className="text-xs font-semibold text-ink/50">
                        {formatDuration(annotation.timeStart)} - {formatDuration(annotation.timeEnd)}
                        {annotation.text ? ` · ${annotation.text}` : ""}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      title="Delete annotation"
                      aria-label="Delete annotation"
                      onClick={() => deleteAnnotation(annotation.id)}
                    >
                      <Trash2 size={16} aria-hidden />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="rounded-md border border-dashed border-ink/15 p-4 text-sm font-bold text-ink/50">
                  No annotations yet.
                </p>
              )}
            </div>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-ink/10 bg-white p-4">
            <SectionHeading title="Analysis script" />
            <FieldLabel>Summary</FieldLabel>
            <TextArea
              value={analysis.summary}
              onChange={(event) => patchAnalysis({ summary: event.target.value })}
            />

            <div className="mt-4 space-y-4">
              {analysis.chapters.map((chapter, index) => (
                <div key={chapter.id} className="rounded-md border border-ink/10 p-3">
                  <p className="mb-2 text-xs font-bold text-moss">Chapter {index + 1}</p>
                  <FieldLabel>Title</FieldLabel>
                  <TextInput
                    value={chapter.title}
                    onChange={(event) => patchChapter(chapter.id, { title: event.target.value })}
                  />
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <label className="text-xs font-bold text-ink/60">
                      Start
                      <TextInput
                        type="number"
                        min={0}
                        value={chapter.startTime}
                        onChange={(event) =>
                          patchChapter(chapter.id, { startTime: Number(event.target.value) })
                        }
                      />
                    </label>
                    <label className="text-xs font-bold text-ink/60">
                      End
                      <TextInput
                        type="number"
                        min={0}
                        value={chapter.endTime}
                        onChange={(event) => patchChapter(chapter.id, { endTime: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                  <div className="mt-3">
                    <FieldLabel>Coach note</FieldLabel>
                    <TextArea
                      value={chapter.body}
                      onChange={(event) => patchChapter(chapter.id, { body: event.target.value })}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4">
              <FieldLabel>Drills</FieldLabel>
              <TextArea
                value={analysis.drills.join("\n")}
                onChange={(event) =>
                  patchAnalysis({
                    drills: event.target.value
                      .split("\n")
                      .map((drill) => drill.trim())
                      .filter(Boolean)
                  })
                }
              />
            </div>

            <div className="mt-4 flex items-center gap-3">
              <Button type="button" variant="secondary" onClick={() => persist()}>
                <Save size={16} aria-hidden />
                Save script
              </Button>
              {savedLabel ? <span className="text-sm font-bold text-moss">{savedLabel}</span> : null}
            </div>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
