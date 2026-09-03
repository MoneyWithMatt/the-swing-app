"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Circle, Eraser, Maximize2, Mic, Minus, MonitorUp, Pause, Pencil, Play, RotateCcw, Shrink, Square, Trash2, Undo2 } from "lucide-react";
import { Button, cn, SectionHeading } from "@/components/ui/primitives";

type Point = { x: number; y: number };
type FrameRect = { x: number; y: number; width: number; height: number };
type DrawingTool = "line" | "freehand" | "circle" | "arrow";
type ActiveTool = DrawingTool | "eraser";
type ReviewShape = { tool: DrawingTool; color: string; points: Point[] };
type ViewTransform = { scale: number; x: number; y: number };

const DRAWING_COLORS = ["#f2b84b", "#ef4444", "#22c55e", "#3b82f6", "#ffffff"];

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${Math.floor(seconds % 60).toString().padStart(2, "0")}`;
}

function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (!lengthSquared) return Math.hypot(point.x - start.x, point.y - start.y);
  const position = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
  return Math.hypot(point.x - (start.x + position * dx), point.y - (start.y + position * dy));
}

function shapeContainsPoint(shape: ReviewShape, point: Point) {
  const threshold = 0.035;
  if (shape.tool === "circle") {
    const start = shape.points[0];
    const end = shape.points[shape.points.length - 1];
    const radiusX = Math.abs(end.x - start.x) / 2;
    const radiusY = Math.abs(end.y - start.y) / 2;
    if (!radiusX || !radiusY) return false;
    const centerX = (start.x + end.x) / 2;
    const centerY = (start.y + end.y) / 2;
    const ellipseDistance = Math.sqrt(((point.x - centerX) / radiusX) ** 2 + ((point.y - centerY) / radiusY) ** 2);
    return Math.abs(ellipseDistance - 1) * Math.min(radiusX, radiusY) <= threshold;
  }
  for (let index = 1; index < shape.points.length; index += 1) {
    if (distanceToSegment(point, shape.points[index - 1], shape.points[index]) <= threshold) return true;
  }
  return false;
}

function recordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    .find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function containedVideoRect(width: number, height: number, videoWidth: number, videoHeight: number): FrameRect {
  if (!videoWidth || !videoHeight) return { x: 0, y: 0, width, height };
  const scale = Math.min(width / videoWidth, height / videoHeight);
  const renderedWidth = videoWidth * scale;
  const renderedHeight = videoHeight * scale;
  return { x: (width - renderedWidth) / 2, y: (height - renderedHeight) / 2, width: renderedWidth, height: renderedHeight };
}

function drawShapes(context: CanvasRenderingContext2D, shapes: ReviewShape[], frame: FrameRect) {
  const { x, y, width, height } = frame;
  context.lineCap = "round";
  context.lineJoin = "round";
  for (const shape of shapes) {
    const points = shape.points;
    if (points.length < 2) continue;
    const start = points[0];
    const end = points[points.length - 1];
    context.strokeStyle = shape.color;
    context.fillStyle = shape.color;
    context.lineWidth = Math.max(4, Math.min(width, height) / 160);
    context.beginPath();
    if (shape.tool === "freehand") {
      context.moveTo(x + start.x * width, y + start.y * height);
      for (const point of points.slice(1)) context.lineTo(x + point.x * width, y + point.y * height);
    } else if (shape.tool === "circle") {
      const centerX = x + ((start.x + end.x) / 2) * width;
      const centerY = y + ((start.y + end.y) / 2) * height;
      context.ellipse(centerX, centerY, Math.abs(end.x - start.x) * width / 2, Math.abs(end.y - start.y) * height / 2, 0, 0, Math.PI * 2);
    } else {
      const startX = x + start.x * width;
      const startY = y + start.y * height;
      const endX = x + end.x * width;
      const endY = y + end.y * height;
      context.moveTo(startX, startY);
      context.lineTo(endX, endY);
      if (shape.tool === "arrow") {
        const angle = Math.atan2(endY - startY, endX - startX);
        const head = Math.max(14, width / 45);
        context.moveTo(endX, endY);
        context.lineTo(endX - head * Math.cos(angle - Math.PI / 6), endY - head * Math.sin(angle - Math.PI / 6));
        context.moveTo(endX, endY);
        context.lineTo(endX - head * Math.cos(angle + Math.PI / 6), endY - head * Math.sin(angle + Math.PI / 6));
      }
    }
    context.stroke();
  }
}

export function PilotVideoReviewTool({ videoUrl, reviewId, submissionId, recordingApiUrl = "/api/pilot/coach/recording", recordingIdField = "submissionId", initialRecordingUrl = "", onRecordingSaved, onRecordingDeleted }: { videoUrl: string; reviewId?: string; submissionId?: string; recordingApiUrl?: string; recordingIdField?: "submissionId" | "analysisId"; initialRecordingUrl?: string; onRecordingSaved?: (url: string) => void; onRecordingDeleted?: () => void }) {
  const resourceId = reviewId ?? submissionId;
  if (!resourceId) throw new Error("A review id is required.");
  const presentationRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const micRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const chunksRef = useRef<BlobPart[]>([]);
  const shapesRef = useRef<ReviewShape[]>([]);
  const draftRef = useRef<ReviewShape | null>(null);
  const pointersRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ distance: number; midpoint: Point; transform: ViewTransform } | null>(null);
  const viewTransformRef = useRef<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const [shapes, setShapes] = useState<ReviewShape[]>([]);
  const [draft, setDraft] = useState<ReviewShape | null>(null);
  const [activeTool, setActiveTool] = useState<ActiveTool>("line");
  const [activeColor, setActiveColor] = useState(DRAWING_COLORS[0]);
  const [videoDimensions, setVideoDimensions] = useState({ width: 0, height: 0 });
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [frameRate, setFrameRate] = useState(60);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [saving, setSaving] = useState(false);
  const [recordingUrl, setRecordingUrl] = useState(initialRecordingUrl);
  const [status, setStatus] = useState("");
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ scale: 1, x: 0, y: 0 });
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [presentationMode, setPresentationMode] = useState(false);

  useEffect(() => { viewTransformRef.current = viewTransform; }, [viewTransform]);

  useEffect(() => {
    const syncFullscreen = () => {
      if (!document.fullscreenElement && presentationMode) setPresentationMode(false);
    };
    document.addEventListener("fullscreenchange", syncFullscreen);
    return () => document.removeEventListener("fullscreenchange", syncFullscreen);
  }, [presentationMode]);

  async function togglePresentationMode() {
    if (presentationMode) {
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => undefined);
      setPresentationMode(false);
      return;
    }
    setPresentationMode(true);
    await presentationRef.current?.requestFullscreen?.().catch(() => undefined);
  }

  useEffect(() => {
    shapesRef.current = shapes;
    draftRef.current = draft;
    const canvas = overlayRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const frame = containedVideoRect(canvas.width, canvas.height, videoDimensions.width, videoDimensions.height);
    drawShapes(context, draft ? [...shapes, draft] : shapes, frame);
  }, [draft, shapes, videoDimensions]);

  useEffect(() => {
    const canvas = overlayRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = Math.max(1, Math.round(canvas.clientWidth));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight));
      const context = canvas.getContext("2d");
      if (context) {
        const video = videoRef.current;
        drawShapes(context, shapesRef.current, containedVideoRect(canvas.width, canvas.height, video?.videoWidth ?? 0, video?.videoHeight ?? 0));
      }
    };
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => {
    cancelAnimationFrame(animationRef.current ?? 0);
    recorderRef.current?.stream.getTracks().forEach((track) => track.stop());
    micRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds((seconds) => seconds + 1), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  function pointer(event: React.PointerEvent<HTMLCanvasElement>): Point | null {
    const rect = event.currentTarget.getBoundingClientRect();
    const video = videoRef.current;
    const frame = containedVideoRect(rect.width, rect.height, video?.videoWidth ?? 0, video?.videoHeight ?? 0);
    const x = event.clientX - rect.left - frame.x;
    const y = event.clientY - rect.top - frame.y;
    if (x < 0 || y < 0 || x > frame.width || y > frame.height) return null;
    return { x: x / frame.width, y: y / frame.height };
  }

  function startDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "touch" && pointersRef.current.size === 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      pinchRef.current = { distance: Math.hypot(second.x - first.x, second.y - first.y), midpoint: { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 }, transform: viewTransformRef.current };
      draftRef.current = null;
      setDraft(null);
      return;
    }
    const point = pointer(event);
    if (!point) return;
    if (activeTool === "eraser") {
      setShapes((current) => {
        for (let index = current.length - 1; index >= 0; index -= 1) {
          if (shapeContainsPoint(current[index], point)) return current.filter((_, shapeIndex) => shapeIndex !== index);
        }
        return current;
      });
      return;
    }
    const next = { tool: activeTool, color: activeColor, points: [point, point] } satisfies ReviewShape;
    draftRef.current = next;
    setDraft(next);
  }

  function continueDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pinchRef.current && pointersRef.current.size >= 2) {
      const [first, second] = Array.from(pointersRef.current.values());
      const distance = Math.hypot(second.x - first.x, second.y - first.y);
      const midpoint = { x: (first.x + second.x) / 2, y: (first.y + second.y) / 2 };
      const scale = Math.max(1, Math.min(4, pinchRef.current.transform.scale * distance / Math.max(pinchRef.current.distance, 1)));
      setViewTransform({ scale, x: pinchRef.current.transform.x + midpoint.x - pinchRef.current.midpoint.x, y: pinchRef.current.transform.y + midpoint.y - pinchRef.current.midpoint.y });
      return;
    }
    const current = draftRef.current;
    if (!current || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const nextPoint = pointer(event);
    if (!nextPoint) return;
    const next = {
      ...current,
      points: current.tool === "freehand" ? [...current.points, nextPoint] : [current.points[0], nextPoint]
    };
    draftRef.current = next;
    setDraft(next);
  }

  function finishDrawing(event: React.PointerEvent<HTMLCanvasElement>) {
    const wasPinching = Boolean(pinchRef.current);
    pointersRef.current.delete(event.pointerId);
    if (pointersRef.current.size < 2) pinchRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    const completed = draftRef.current;
    draftRef.current = null;
    setDraft(null);
    if (!completed || wasPinching) return;
    const start = completed.points[0];
    const end = completed.points[completed.points.length - 1];
    if (Math.hypot(end.x - start.x, end.y - start.y) < 0.01) return;
    setShapes((current) => [...current, completed]);
  }

  function stepFrame(direction: -1 | 1) {
    const video = videoRef.current;
    if (!video) return;
    video.pause();
    setPlaying(false);
    video.currentTime = Math.max(0, Math.min(video.duration || Infinity, video.currentTime + direction / frameRate));
    setCurrentTime(video.currentTime);
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play().catch(() => undefined);
    else video.pause();
  }

  async function uploadRecording(blob: Blob, mimeType: string) {
    const uploadMimeType = mimeType.split(";", 1)[0] || "video/webm";
    const extension = uploadMimeType === "video/mp4" ? "mp4" : "webm";
    const preparedResponse = await fetch(recordingApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "prepare", [recordingIdField]: resourceId, mimeType: uploadMimeType, sizeBytes: blob.size, extension })
    });
    const prepared = (await preparedResponse.json()) as { uploadUrl?: string; recordingPath?: string; error?: string };
    if (!preparedResponse.ok || !prepared.uploadUrl || !prepared.recordingPath) throw new Error(prepared.error || "Recording upload could not start.");
    const token = new URL(prepared.uploadUrl).searchParams.get("token");
    if (!token) throw new Error("Recording upload could not be authorised.");
    const uploadResponse = await fetch(prepared.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": uploadMimeType, Authorization: `Bearer ${token}`, "x-upsert": "true" },
      body: blob
    });
    if (!uploadResponse.ok) {
      const detail = await uploadResponse.text();
      throw new Error(detail || "Recording upload did not complete.");
    }
    const confirmResponse = await fetch(recordingApiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "confirm", [recordingIdField]: resourceId, recordingPath: prepared.recordingPath })
    });
    const confirmation = (await confirmResponse.json()) as { error?: string };
    if (!confirmResponse.ok) throw new Error(confirmation.error || "Recording could not be confirmed.");
  }

  async function startRecording() {
    setStatus("");
    const video = videoRef.current;
    if (!video || typeof MediaRecorder === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
      setStatus("This browser cannot create a video recording.");
      return;
    }
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      micRef.current = mic;
      const canvas = document.createElement("canvas");
      canvas.width = 720;
      canvas.height = 1280;
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Recording canvas unavailable.");

      const render = () => {
        context.fillStyle = "#000";
        context.fillRect(0, 0, canvas.width, canvas.height);
        const transform = viewTransformRef.current;
        const stage = stageRef.current;
        const displayWidth = stage?.clientWidth || canvas.width;
        const displayHeight = stage?.clientHeight || canvas.height;
        const videoFrame = containedVideoRect(canvas.width, canvas.height, video.videoWidth, video.videoHeight);
        context.save();
        context.translate(canvas.width / 2 + transform.x * canvas.width / displayWidth, canvas.height / 2 + transform.y * canvas.height / displayHeight);
        context.scale(transform.scale, transform.scale);
        context.translate(-canvas.width / 2, -canvas.height / 2);
        context.drawImage(video, videoFrame.x, videoFrame.y, videoFrame.width, videoFrame.height);
        drawShapes(context, shapesRef.current, videoFrame);
        context.restore();
        animationRef.current = requestAnimationFrame(render);
      };
      render();

      const canvasStream = canvas.captureStream(30);
      const stream = new MediaStream([...canvasStream.getVideoTracks(), ...mic.getAudioTracks()]);
      const mimeType = recordingMimeType();
      const recorder = new MediaRecorder(stream, {
        ...(mimeType ? { mimeType } : {}),
        videoBitsPerSecond: 2_500_000,
        audioBitsPerSecond: 96_000
      });
      recorderRef.current = recorder;
      chunksRef.current = [];
      recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
      recorder.onstop = async () => {
        cancelAnimationFrame(animationRef.current ?? 0);
        stream.getTracks().forEach((track) => track.stop());
        micRef.current?.getTracks().forEach((track) => track.stop());
        const type = recorder.mimeType || mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type });
        const nextRecordingUrl = URL.createObjectURL(blob);
        setRecordingUrl(nextRecordingUrl);
        setRecording(false);
        setSaving(true);
        try {
          await uploadRecording(blob, type);
          onRecordingSaved?.(nextRecordingUrl);
          setStatus("Recording saved.");
        } catch (error) {
          setStatus(error instanceof Error ? error.message : "Recording could not be saved.");
        } finally {
          setSaving(false);
        }
      };
      recorder.start(250);
      setRecordingSeconds(0);
      setRecording(true);
      setStatus("Recording video, drawings and microphone.");
    } catch {
      micRef.current?.getTracks().forEach((track) => track.stop());
      setStatus("Microphone or video recording permission was not granted.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state !== "inactive") recorderRef.current?.stop();
  }

  async function deleteRecording() {
    if (!window.confirm("Delete this recording so you can record it again?")) return;
    setSaving(true); setStatus("Deleting recording...");
    try {
      const response = await fetch(recordingApiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", [recordingIdField]: resourceId })
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Recording could not be deleted.");
      if (recordingUrl.startsWith("blob:")) URL.revokeObjectURL(recordingUrl);
      setRecordingUrl("");
      onRecordingDeleted?.();
      setStatus("Recording deleted. You can record a new response now.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Recording could not be deleted.");
    } finally { setSaving(false); }
  }

  return (
    <section ref={presentationRef} className={cn("rounded-lg border border-ink/10 bg-white p-4", presentationMode && "fixed inset-0 z-50 flex flex-col overflow-auto rounded-none border-0 bg-[#101612] p-3 text-white sm:p-4")}>
      <div className={cn("flex items-start justify-between gap-3", presentationMode && "mx-auto w-full max-w-6xl")}>
        {!presentationMode ? <SectionHeading title="Video review" detail="Drawings stay visible throughout the recording." /> : <div><p className="text-xs font-bold uppercase tracking-wider text-fairway">Presentation Mode</p><p className="text-sm text-white/70">Playback and drawing controls stay in place while you screen-share.</p></div>}
        <Button type="button" variant={presentationMode ? "secondary" : "ghost"} onClick={togglePresentationMode}>{presentationMode ? <Shrink size={17} aria-hidden /> : <MonitorUp size={17} aria-hidden />}{presentationMode ? "Exit" : "Presentation Mode"}</Button>
      </div>
      <div ref={stageRef} className={cn("relative mx-auto aspect-[9/16] w-full max-w-md overflow-hidden rounded-lg bg-black", presentationMode && "mt-3 h-[calc(100vh-13.5rem)] min-h-[24rem] w-auto max-w-full shrink-0")}>
        <div className="absolute inset-0 will-change-transform" style={{ transform: `translate(${viewTransform.x}px, ${viewTransform.y}px) scale(${viewTransform.scale})` }}>
        <video ref={videoRef} src={videoUrl} crossOrigin="anonymous" playsInline className="h-full w-full object-contain" onLoadedMetadata={(event) => { setVideoDimensions({ width: event.currentTarget.videoWidth, height: event.currentTarget.videoHeight }); setDuration(event.currentTarget.duration || 0); }} onDurationChange={(event) => setDuration(event.currentTarget.duration || 0)} onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)} onSeeked={(event) => setCurrentTime(event.currentTarget.currentTime)} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
        <canvas
          ref={overlayRef}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={startDrawing}
          onPointerMove={continueDrawing}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
        />
        </div>
        <div className="absolute left-2 right-2 top-2 z-30 overflow-hidden rounded-xl border border-white/20 bg-black/55 text-white shadow-lg backdrop-blur-md">
          <button type="button" className="focus-ring flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm font-bold" aria-expanded={toolbarOpen} onClick={() => setToolbarOpen((open) => !open)}>
            <span>Drawing tools</span>{toolbarOpen ? <ChevronUp size={18} aria-hidden /> : <ChevronDown size={18} aria-hidden />}
          </button>
          {toolbarOpen ? <div className="border-t border-white/15 p-2">
            <div className="flex flex-wrap items-center gap-2">
              {([[
                "line", Minus, "Line"
              ], ["freehand", Pencil, "Freehand"], ["circle", Circle, "Circle"], ["arrow", ArrowUpRight, "Arrow"]] as const).map(([tool, Icon, label]) => (
                <button key={tool} type="button" aria-label={label} title={label} className={`focus-ring rounded-lg border p-2 ${activeTool === tool ? "border-white bg-white text-ink" : "border-white/20 bg-white/10 text-white"}`} onClick={() => setActiveTool(tool)}><Icon size={18} aria-hidden /></button>
              ))}
              <button type="button" aria-label="Eraser" title="Eraser" className={`focus-ring rounded-lg border p-2 ${activeTool === "eraser" ? "border-white bg-white text-ink" : "border-white/20 bg-white/10 text-white"}`} onClick={() => setActiveTool("eraser")}><Eraser size={18} aria-hidden /></button>
              <span className="h-7 w-px bg-white/20" aria-hidden />
              {DRAWING_COLORS.map((color) => <button key={color} type="button" aria-label={`Use ${color} drawing colour`} className="focus-ring h-8 w-8 rounded-full border border-white/50" style={{ backgroundColor: color, boxShadow: activeColor === color ? "0 0 0 3px rgba(255,255,255,0.8)" : undefined }} onClick={() => setActiveColor(color)} />)}
            </div>
            <div className="mt-2 flex items-center gap-2 border-t border-white/15 pt-2">
              <button type="button" aria-label="Undo drawing" title="Undo" disabled={!shapes.length} className="focus-ring rounded-lg bg-white/10 p-2 disabled:opacity-35" onClick={() => setShapes((current) => current.slice(0, -1))}><Undo2 size={18} aria-hidden /></button>
              <button type="button" aria-label="Clear all drawings" title="Clear all" disabled={!shapes.length} className="focus-ring rounded-lg bg-white/10 p-2 disabled:opacity-35" onClick={() => setShapes([])}><RotateCcw size={18} aria-hidden /></button>
              <button type="button" aria-label="Reset zoom" title="Reset zoom" disabled={viewTransform.scale === 1 && !viewTransform.x && !viewTransform.y} className="focus-ring rounded-lg bg-white/10 p-2 disabled:opacity-35" onClick={() => setViewTransform({ scale: 1, x: 0, y: 0 })}><Maximize2 size={18} aria-hidden /></button>
            </div>
          </div> : null}
        </div>
        {recording ? (
          <div className="pointer-events-none absolute bottom-3 left-3 z-20 flex items-center gap-2 rounded-full bg-black/75 px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg backdrop-blur-sm">
            <span className="h-3 w-3 animate-pulse rounded-full bg-red-500 ring-4 ring-red-500/25" aria-hidden />
            Recording live · {formatTime(recordingSeconds)}
          </div>
        ) : null}
      </div>
      {!presentationMode ? <p className="mt-2 text-xs font-semibold text-ink/55">Pinch with two fingers to zoom. Move both fingers together to reposition the view. Zoom is included in the recorded response.</p> : null}
      <div className={cn("mt-3 rounded-lg border border-moss/15 bg-gradient-to-r from-moss/5 to-white px-4 py-3 shadow-sm", presentationMode && "mx-auto w-full max-w-4xl border-white/15 bg-white/10 text-white")}>
        <div className={cn("mb-2 flex items-center justify-between gap-3 text-xs font-bold text-ink/55", presentationMode && "text-white/75")}>
          <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
          <span>Frame {Math.round(currentTime * frameRate).toLocaleString()}</span>
        </div>
        <input
          aria-label="Move through the swing video"
          className="video-timeline focus-ring w-full"
          type="range"
          min={0}
          max={duration || 1}
          step={1 / frameRate}
          value={Math.min(currentTime, duration || 1)}
          style={{ background: `linear-gradient(to right, #2f6f4e ${duration ? (currentTime / duration) * 100 : 0}%, #dfe7df ${duration ? (currentTime / duration) * 100 : 0}%)` }}
          onChange={(event) => {
            const video = videoRef.current;
            if (!video) return;
            video.pause();
            video.currentTime = Number(event.target.value);
            setCurrentTime(Number(event.target.value));
          }}
        />
      </div>
      <div className={cn("mt-3 flex flex-wrap items-center gap-2", presentationMode && "mx-auto w-full max-w-4xl justify-center")}>
        <label className={cn("flex items-center gap-2 rounded-md border border-ink/10 bg-paper px-3 text-sm font-bold text-ink/70", presentationMode && "border-white/20 bg-white/10 text-white")}>
          Video FPS
          <select className="bg-transparent py-2" value={frameRate} onChange={(event) => setFrameRate(Number(event.target.value))}>
            {[30, 60, 120, 240].map((fps) => <option key={fps} value={fps}>{fps}</option>)}
          </select>
        </label>
        <button type="button" aria-label="Previous frame" title="Previous frame" className="focus-ring touch-manipulation rounded-full border border-ink/15 bg-white p-3 text-ink shadow-sm active:scale-95 active:bg-moss/10" onClick={() => stepFrame(-1)}><ChevronLeft size={22} aria-hidden /></button>
        <button type="button" aria-label={playing ? "Pause" : "Play"} title={playing ? "Pause" : "Play"} className="focus-ring touch-manipulation rounded-full bg-moss p-3.5 text-white shadow-sm active:scale-95" onClick={togglePlayback}>{playing ? <Pause size={22} aria-hidden /> : <Play size={22} aria-hidden />}</button>
        <button type="button" aria-label="Next frame" title="Next frame" className="focus-ring touch-manipulation rounded-full border border-ink/15 bg-white p-3 text-ink shadow-sm active:scale-95 active:bg-moss/10" onClick={() => stepFrame(1)}><ChevronRight size={22} aria-hidden /></button>
        {recording ? (
          <Button type="button" variant="danger" onClick={stopRecording}><Square size={16} aria-hidden />Stop recording</Button>
        ) : (
          <Button type="button" disabled={saving} onClick={startRecording}><Mic size={16} aria-hidden />Record with microphone</Button>
        )}
      </div>
      {status ? <p className={cn("mt-3 text-sm font-bold text-moss", presentationMode && "text-center text-fairway")}>{status}</p> : null}
      {activeTool === "eraser" ? <p className="mt-2 text-xs font-semibold text-ink/55">Tap any line, circle, arrow or freehand drawing to remove it.</p> : null}
      {recordingUrl && !presentationMode ? <div className="mt-4 rounded-lg border border-ink/10 bg-paper p-3"><video className="mx-auto aspect-[9/16] w-full max-w-sm rounded-lg bg-black object-contain" src={recordingUrl} controls playsInline /><div className="mt-3 flex flex-wrap gap-2"><a className="focus-ring inline-flex min-h-11 items-center justify-center rounded-md border border-ink/15 bg-white px-4 text-sm font-semibold text-ink hover:bg-mist" href={recordingUrl} download>Download recording</a><Button type="button" variant="danger" disabled={saving || recording} onClick={deleteRecording}><Trash2 size={16} aria-hidden />Delete recording and redo</Button></div></div> : null}
    </section>
  );
}
