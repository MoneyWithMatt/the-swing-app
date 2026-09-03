"use client";

import { useState } from "react";
import { Camera, Check, Images } from "lucide-react";
import { prepareVideoFile, type PreparedVideo } from "@/lib/video-utils";

export type SelectedSwingVideo = { file: File; video: PreparedVideo };

export function SwingVideoUpload({ label, detail, recommended = false, onChange }: { label: string; detail: string; recommended?: boolean; onChange: (value?: SelectedSwingVideo) => void }) {
  const [selected, setSelected] = useState<SelectedSwingVideo>();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState("");

  async function selectFile(file?: File) {
    if (!file) return;
    setPreparing(true); setError("");
    try {
      const prepared = await prepareVideoFile(file);
      const value = { file, video: prepared };
      setSelected(value); onChange(value);
    } catch {
      setError("This video could not be opened. Try an MP4, MOV or WebM video.");
    } finally { setPreparing(false); }
  }

  return <div className="rounded-lg border border-ink/10 bg-paper/40 p-4">
    <div className="flex items-start justify-between gap-3">
      <div><h3 className="font-bold text-ink">{label}</h3><p className="mt-1 text-sm text-ink/60">{detail}</p></div>
      {recommended ? <span className="rounded-full bg-moss px-2.5 py-1 text-xs font-bold text-white">Recommended</span> : <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-ink/55">Optional</span>}
    </div>
    <div className="mt-4 grid grid-cols-2 gap-3">
      <label className="focus-ring flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-moss/40 bg-white p-4 text-center hover:bg-moss/5"><Camera size={22} className="mb-2 text-moss" aria-hidden /><span className="text-sm font-bold">Record</span><input className="sr-only" type="file" accept="video/*" capture="environment" onChange={(event) => selectFile(event.target.files?.[0])} /></label>
      <label className="focus-ring flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-moss/40 bg-white p-4 text-center hover:bg-moss/5"><Images size={22} className="mb-2 text-moss" aria-hidden /><span className="text-sm font-bold">Choose saved</span><input className="sr-only" type="file" accept="video/*" onChange={(event) => selectFile(event.target.files?.[0])} /></label>
    </div>
    {preparing ? <p className="mt-3 text-sm font-bold text-moss">Preparing video...</p> : null}
    {error ? <p className="mt-3 text-sm font-bold text-clay">{error}</p> : null}
    {selected ? <div className="mt-4 overflow-hidden rounded-lg border border-moss/30 bg-moss/5 sm:flex sm:items-center"><video className="aspect-video w-full bg-ink object-contain sm:w-40" src={selected.video.url} muted playsInline preload="metadata" /><div className="min-w-0 p-3"><p className="flex items-center gap-2 font-bold text-moss"><Check size={17} aria-hidden />Video selected</p><p className="mt-1 truncate text-sm font-bold">{selected.file.name}</p><p className="mt-1 text-xs text-ink/60">{(selected.file.size / 1048576).toFixed(1)} MB · uploads when submitted</p></div></div> : null}
  </div>;
}
