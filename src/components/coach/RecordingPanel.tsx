"use client";

import { useRef, useState } from "react";
import { Mic, Radio, Square } from "lucide-react";
import { getVideoDuration } from "@/lib/video-utils";
import type { VideoAsset } from "@/lib/types";
import { Button, SectionHeading } from "@/components/ui/primitives";

type RecordingPanelProps = {
  recordingVideo?: VideoAsset;
  onRecordingReady: (recording: { url: string; mimeType: string; duration?: number }) => void;
};

function supportedRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  return (
    [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm",
      "video/mp4"
    ].find((type) => MediaRecorder.isTypeSupported(type)) ?? ""
  );
}

function stopStream(stream?: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

export function RecordingPanel({ recordingVideo, onRecordingReady }: RecordingPanelProps) {
  const recorderRef = useRef<MediaRecorder | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [recording, setRecording] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function startRecording() {
    setError("");

    if (!navigator.mediaDevices?.getDisplayMedia || typeof MediaRecorder === "undefined") {
      setError("This browser cannot record the analysis screen.");
      return;
    }

    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      screenStreamRef.current = screenStream;
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      const combinedStream = new MediaStream([
        ...screenStream.getVideoTracks(),
        ...micStream.getAudioTracks()
      ]);
      const mimeType = supportedRecordingMimeType();
      const recorder = new MediaRecorder(
        combinedStream,
        mimeType ? { mimeType } : undefined
      );

      recorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        setSaving(true);
        setRecording(false);
        stopStream(screenStreamRef.current);
        stopStream(micStreamRef.current);

        const type = mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        const duration = await getVideoDuration(url);
        onRecordingReady({ url, mimeType: type, duration });
        setSaving(false);
      };

      screenStream.getVideoTracks()[0]?.addEventListener("ended", () => {
        stopRecording();
      });

      recorder.start(250);
      setRecording(true);
    } catch {
      stopStream(screenStreamRef.current);
      stopStream(micStreamRef.current);
      setRecording(false);
      setSaving(false);
      setError("Recording was not started.");
    }
  }

  function stopRecording() {
    const recorder = recorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
      return;
    }

    stopStream(screenStreamRef.current);
    stopStream(micStreamRef.current);
    setRecording(false);
  }

  return (
    <section className="rounded-lg border border-ink/10 bg-white p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <SectionHeading title="Recording" />
        {recording ? (
          <Button type="button" variant="danger" onClick={stopRecording}>
            <Square size={16} aria-hidden />
            Stop
          </Button>
        ) : (
          <Button type="button" variant="secondary" disabled={saving} onClick={startRecording}>
            <Radio size={16} aria-hidden />
            Record
          </Button>
        )}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-md border border-ink/10 bg-paper px-3 py-2 text-sm font-bold text-ink/70">
        <Mic size={16} className={recording ? "text-clay" : "text-moss"} aria-hidden />
        {recording ? "Recording in progress" : saving ? "Saving recording" : "Ready"}
      </div>

      {error ? (
        <p className="mt-3 rounded-md border border-clay/30 bg-clay/10 px-3 py-2 text-sm font-bold text-clay">
          {error}
        </p>
      ) : null}

      {recordingVideo ? (
        <div className="mt-4 overflow-hidden rounded-md border border-ink/10 bg-ink">
          <video className="aspect-video w-full bg-black" src={recordingVideo.url} controls playsInline />
        </div>
      ) : null}
    </section>
  );
}
