"use client";

import { useState } from "react";
import { PilotVideoReviewTool } from "@/components/coach/PilotVideoReviewTool";
import { cn } from "@/components/ui/primitives";

type ReviewVideo = { label: string; url: string };

export function CoachVideoReviewSwitcher({ videos, submissionId, initialRecordingUrl }: { videos: ReviewVideo[]; submissionId: string; initialRecordingUrl?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState(initialRecordingUrl);
  return <div>
    {videos.length > 1 ? <div className="mb-3 flex rounded-lg border border-ink/10 bg-white p-1" aria-label="Choose video angle">
      {videos.map((video, index) => <button key={video.label} type="button" className={cn("focus-ring flex-1 rounded-md px-3 py-2 text-sm font-bold", activeIndex === index ? "bg-moss text-white" : "text-ink hover:bg-moss/5")} onClick={() => setActiveIndex(index)}>{video.label}</button>)}
    </div> : null}
    <PilotVideoReviewTool key={videos[activeIndex].url} videoUrl={videos[activeIndex].url} submissionId={submissionId} initialRecordingUrl={recordingUrl} onRecordingSaved={setRecordingUrl} onRecordingDeleted={() => setRecordingUrl(undefined)} />
  </div>;
}
