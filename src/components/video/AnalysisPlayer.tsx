"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Play } from "lucide-react";
import type { Analysis, Annotation, VideoAsset } from "@/lib/types";
import { Button, SectionHeading } from "@/components/ui/primitives";

const AnnotatedVideo = dynamic(
  () => import("./AnnotatedVideo").then((module) => module.AnnotatedVideo),
  {
    ssr: false,
    loading: () => <div className="aspect-video rounded-lg border border-ink/10 bg-ink" />
  }
);

type AnalysisPlayerProps = {
  video: VideoAsset;
  analysis: Analysis;
  annotations: Annotation[];
};

export function AnalysisPlayer({ video, analysis, annotations }: AnalysisPlayerProps) {
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number }>();
  const annotationLookup = useMemo(() => new Set(annotations.map((annotation) => annotation.id)), [annotations]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <AnnotatedVideo
        videoUrl={video.url}
        posterUrl={video.posterUrl}
        annotations={annotations}
        readOnly
        seekRequest={seekRequest}
      />

      <aside className="rounded-lg border border-ink/10 bg-white p-4">
        <SectionHeading title="Matt's breakdown" detail={analysis.summary} />
        <div className="space-y-3">
          {analysis.chapters.map((chapter) => {
            const chapterAnnotations = chapter.annotationIds.filter((id) => annotationLookup.has(id));
            return (
              <article key={chapter.id} className="rounded-md border border-ink/10 p-3">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <h3 className="text-sm font-bold text-ink">{chapter.title}</h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSeekRequest({ time: chapter.startTime, nonce: Date.now() })}
                  >
                    <Play size={14} aria-hidden />
                    Play
                  </Button>
                </div>
                <p className="text-sm leading-6 text-ink/70">{chapter.body}</p>
                {chapterAnnotations.length ? (
                  <p className="mt-2 text-xs font-bold text-moss">{chapterAnnotations.length} annotation(s)</p>
                ) : null}
              </article>
            );
          })}
        </div>

        <div className="mt-5 border-t border-ink/10 pt-4">
          <h3 className="mb-2 text-sm font-bold text-ink">Range drill</h3>
          <ul className="space-y-2 text-sm leading-6 text-ink/70">
            {analysis.drills.map((drill) => (
              <li key={drill}>• {drill}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
