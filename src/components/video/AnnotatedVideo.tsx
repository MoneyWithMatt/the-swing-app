"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Ellipse, Group, Label, Layer, Line, Rect, Stage, Tag, Text } from "react-konva";
import {
  BookmarkPlus,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Redo2,
  RotateCcw,
  RotateCw,
  SkipBack,
  SkipForward,
  Trash2,
  Undo2,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import {
  annotationVisibleAt,
  denormalizePoint,
  geometryFromPoints,
  normalizePoint,
  PERSISTENT_ANNOTATION_END,
  styleForTool
} from "@/lib/annotation-utils";
import { formatDuration } from "@/lib/format";
import type { Annotation, AnnotationType, Point } from "@/lib/types";
import { Button, cn } from "@/components/ui/primitives";

type SeekRequest = {
  time: number;
  nonce: number;
};

type AnnotatedVideoProps = {
  videoUrl: string;
  posterUrl?: string;
  annotations: Annotation[];
  submissionId?: string;
  activeTool?: AnnotationType;
  annotationColor?: string;
  annotationStrokeWidth?: number;
  onAddAnnotation?: (annotation: Omit<Annotation, "id">) => void;
  onTimeChange?: (time: number) => void;
  seekRequest?: SeekRequest;
  readOnly?: boolean;
  showAllAnnotations?: boolean;
  chapters?: Array<{ id: string; title: string; startTime: number; endTime: number }>;
  onAddBookmark?: (bookmark: { title: string; time: number }) => void;
  onUndo?: () => void;
  onRedo?: () => void;
  onDeleteLatest?: () => void;
  className?: string;
};

type Size = {
  width: number;
  height: number;
};

type DraftAnnotation = Omit<Annotation, "id">;

type StagePointerEvent = {
  target: {
    getStage: () => {
      getPointerPosition: () => { x: number; y: number } | null;
    } | null;
  };
};

function getPointer(
  stage: { getPointerPosition: () => { x: number; y: number } | null } | null,
  size: Size
): Point | null {
  const pointer = stage?.getPointerPosition();
  if (!pointer) {
    return null;
  }

  return normalizePoint(pointer, size.width, size.height);
}

function shapePoints(annotation: Annotation, size: Size) {
  const geometry = annotation.normalizedGeometry;
  const first = denormalizePoint({ x: geometry.x1, y: geometry.y1 }, size.width, size.height);
  const second = denormalizePoint(
    { x: geometry.x2 ?? geometry.x1, y: geometry.y2 ?? geometry.y1 },
    size.width,
    size.height
  );
  const third = denormalizePoint(
    { x: geometry.x3 ?? geometry.x1, y: geometry.y3 ?? geometry.y1 },
    size.width,
    size.height
  );

  return { first, second, third };
}

function denormalizePath(points: Point[] | undefined, size: Size) {
  return (points ?? []).flatMap((point) => {
    const next = denormalizePoint(point, size.width, size.height);
    return [next.x, next.y];
  });
}

function annotationStartTime(seconds: number) {
  return Math.max(0, Math.floor((seconds - 0.08) * 10) / 10);
}

function distance(first: Point, second: Point) {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function AnnotationShape({ annotation, size }: { annotation: Annotation; size: Size }) {
  const { first, second, third } = shapePoints(annotation, size);
  const stroke = annotation.style.stroke;
  const strokeWidth = annotation.style.strokeWidth;

  if (annotation.type === "draw") {
    return (
      <Line
        points={denormalizePath(annotation.normalizedGeometry.points, size)}
        stroke={stroke}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
        tension={0.35}
      />
    );
  }

  if (annotation.type === "arrow") {
    return (
      <Arrow
        points={[first.x, first.y, second.x, second.y]}
        pointerLength={14}
        pointerWidth={14}
        stroke={stroke}
        fill={stroke}
        strokeWidth={strokeWidth}
        lineCap="round"
        lineJoin="round"
      />
    );
  }

  if (annotation.type === "circle") {
    return (
      <Ellipse
        x={(first.x + second.x) / 2}
        y={(first.y + second.y) / 2}
        radiusX={Math.max(8, Math.abs(second.x - first.x) / 2)}
        radiusY={Math.max(8, Math.abs(second.y - first.y) / 2)}
        stroke={stroke}
        fill={annotation.style.fill}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (annotation.type === "rectangle") {
    const left = Math.min(first.x, second.x);
    const top = Math.min(first.y, second.y);
    const width = Math.max(8, Math.abs(second.x - first.x));
    const height = Math.max(8, Math.abs(second.y - first.y));

    return (
      <Rect
        x={left}
        y={top}
        width={width}
        height={height}
        stroke={stroke}
        fill={annotation.style.fill}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (annotation.type === "angle") {
    return (
      <Group>
        <Line
          points={[first.x, first.y, second.x, second.y, third.x, third.y]}
          stroke={stroke}
          strokeWidth={strokeWidth}
          lineCap="round"
          lineJoin="round"
        />
        <Text
          x={second.x + 8}
          y={second.y + 8}
          text="angle"
          fontSize={14}
          fontStyle="bold"
          fill={stroke}
        />
      </Group>
    );
  }

  if (annotation.type === "text") {
    return (
      <Label x={first.x} y={first.y}>
        <Tag fill={annotation.style.fill ?? "#fbfcf8"} stroke={stroke} strokeWidth={1} cornerRadius={6} />
        <Text
          text={annotation.text || "Note"}
          padding={8}
          fontSize={14}
          fontStyle="bold"
          fill="#17211b"
          width={Math.min(240, Math.max(120, size.width - first.x - 16))}
        />
      </Label>
    );
  }

  return (
    <Line
      points={[first.x, first.y, second.x, second.y]}
      stroke={stroke}
      strokeWidth={strokeWidth}
      lineCap="round"
      lineJoin="round"
    />
  );
}

export function AnnotatedVideo({
  videoUrl,
  posterUrl,
  annotations,
  submissionId,
  activeTool,
  annotationColor = "#f2b84b",
  annotationStrokeWidth = 5,
  onAddAnnotation,
  onTimeChange,
  seekRequest,
  readOnly = false,
  showAllAnnotations = false,
  chapters = [],
  onAddBookmark,
  onUndo,
  onRedo,
  onDeleteLatest,
  className
}: AnnotatedVideoProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [size, setSize] = useState<Size>({ width: 960, height: 540 });
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [draft, setDraft] = useState<DraftAnnotation | null>(null);
  const [dragStart, setDragStart] = useState<Point | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => {
      const rect = entry.contentRect;
      setSize({ width: rect.width, height: rect.height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (seekRequest && videoRef.current) {
      videoRef.current.currentTime = seekRequest.time;
      videoRef.current.play().catch(() => undefined);
    }
  }, [seekRequest]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const visibleAnnotations = useMemo(() => {
    if (showAllAnnotations) {
      return annotations;
    }

    const videoTime = videoRef.current?.currentTime;
    const visibleTime = Number.isFinite(videoTime) ? Math.max(currentTime, videoTime ?? currentTime) : currentTime;
    return annotations.filter((annotation) => annotationVisibleAt(annotation, visibleTime));
  }, [annotations, currentTime, showAllAnnotations]);

  function syncVideoClock() {
    const nextTime = videoRef.current?.currentTime ?? 0;
    setCurrentTime(nextTime);
    onTimeChange?.(nextTime);
    return nextTime;
  }

  function handleTimeUpdate() {
    syncVideoClock();
  }

  function togglePlayback() {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    if (video.paused) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }

  function seekToTime(nextTime: number) {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    const clampedTime = Math.max(0, Math.min(nextTime, duration || nextTime));
    video.currentTime = clampedTime;
    setCurrentTime(clampedTime);
    onTimeChange?.(clampedTime);
  }

  function moveFrame(direction: -1 | 1) {
    const frameStep = 1 / 30;
    seekToTime(currentTime + direction * frameStep);
  }

  function toggleFullscreen() {
    const element = wrapperRef.current;
    if (!element) {
      return;
    }

    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => undefined);
      return;
    }

    element.requestFullscreen().catch(() => undefined);
  }

  function handleBookmark() {
    const title = window.prompt("Bookmark title", "Key position")?.trim();
    if (!title) {
      return;
    }

    onAddBookmark?.({ title, time: currentTime });
  }

  function handlePointerDown(event: StagePointerEvent) {
    if (readOnly || !activeTool || !onAddAnnotation || !submissionId) {
      return;
    }

    const stage = event.target.getStage();
    const start = getPointer(stage, size);
    if (!start) {
      return;
    }

    const videoTime = syncVideoClock();
    const timeStart = annotationStartTime(videoTime);
    const baseAnnotation: DraftAnnotation = {
      submissionId,
      type: activeTool,
      timeStart,
      timeEnd: PERSISTENT_ANNOTATION_END,
      style: styleForTool(activeTool, annotationColor, annotationStrokeWidth),
      normalizedGeometry:
        activeTool === "draw"
          ? { x1: start.x, y1: start.y, x2: start.x, y2: start.y, points: [start] }
          : geometryFromPoints(activeTool, start, start)
    };

    if (activeTool === "text") {
      const text = window.prompt("Text note", "Keep chest turning");
      if (!text) {
        return;
      }

      onAddAnnotation({
        ...baseAnnotation,
        text,
        normalizedGeometry: {
          x1: start.x,
          y1: start.y,
          x2: Math.min(1, start.x + 0.18),
          y2: Math.min(1, start.y + 0.08)
        }
      });
      setCurrentTime(videoTime);
      return;
    }

    setDragStart(start);
    setDraft(baseAnnotation);
  }

  function handlePointerMove(event: StagePointerEvent) {
    if (!draft || !dragStart) {
      return;
    }

    const end = getPointer(event.target.getStage(), size);
    if (!end) {
      return;
    }

    if (draft.type === "draw") {
      const points = draft.normalizedGeometry.points ?? [
        { x: draft.normalizedGeometry.x1, y: draft.normalizedGeometry.y1 }
      ];
      const lastPoint = points[points.length - 1];
      if (lastPoint && distance(lastPoint, end) < 0.004) {
        return;
      }

      setDraft({
        ...draft,
        normalizedGeometry: {
          ...draft.normalizedGeometry,
          x2: end.x,
          y2: end.y,
          points: [...points, end]
        }
      });
      return;
    }

    setDraft({
      ...draft,
      normalizedGeometry: geometryFromPoints(draft.type, dragStart, end)
    });
  }

  function handlePointerUp() {
    if (!draft || !onAddAnnotation) {
      setDragStart(null);
      setDraft(null);
      return;
    }

    const geometry = draft.normalizedGeometry;
    const points = geometry.points ?? [];
    const hasEnoughInk =
      draft.type === "draw"
        ? points.length > 2 && points.some((point) => distance(point, points[0]) > 0.01)
        : Math.abs((geometry.x2 ?? geometry.x1) - geometry.x1) +
            Math.abs((geometry.y2 ?? geometry.y1) - geometry.y1) >
          0.02;

    if (hasEnoughInk) {
      syncVideoClock();
      onAddAnnotation(draft);
    }

    setDragStart(null);
    setDraft(null);
  }

  const timelineMarkers = useMemo(
    () => [
      ...chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, time: chapter.startTime, kind: "chapter" as const })),
      ...annotations.map((annotation) => ({ id: annotation.id, title: annotation.type, time: annotation.timeStart, kind: "annotation" as const }))
    ],
    [annotations, chapters]
  );

  return (
    <div className={cn("overflow-hidden rounded-lg border border-ink/10 bg-ink shadow-soft", className)}>
      <div ref={wrapperRef} className="relative aspect-video w-full overflow-hidden bg-black">
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
            width: `${100 / zoom}%`,
            height: `${100 / zoom}%`,
            left: `${(100 - 100 / zoom) / 2}%`,
            top: `${(100 - 100 / zoom) / 2}%`
          }}
        >
          <video
            ref={videoRef}
            className="h-full w-full object-contain"
            src={videoUrl}
            poster={posterUrl}
            playsInline
            controls={false}
            crossOrigin="anonymous"
            onTimeUpdate={handleTimeUpdate}
            onSeeking={handleTimeUpdate}
            onSeeked={handleTimeUpdate}
            onLoadedMetadata={() => setDuration(videoRef.current?.duration ?? 0)}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <Stage
            width={size.width}
            height={size.height}
            className="absolute inset-0"
            onMouseDown={handlePointerDown}
            onMouseMove={handlePointerMove}
            onMouseUp={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchMove={handlePointerMove}
            onTouchEnd={handlePointerUp}
          >
            <Layer listening={!readOnly}>
              <Rect x={0} y={0} width={size.width} height={size.height} fill="rgba(0,0,0,0)" />
              {visibleAnnotations.map((annotation) => (
                <AnnotationShape key={annotation.id} annotation={annotation} size={size} />
              ))}
              {draft ? <AnnotationShape annotation={{ ...draft, id: "draft" }} size={size} /> : null}
            </Layer>
          </Stage>
        </div>
      </div>
      <div className="space-y-3 bg-white px-3 py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={togglePlayback}>
            {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            {playing ? "Pause" : "Play"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => moveFrame(-1)}>
            <SkipBack size={16} aria-hidden />
            -1f
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => moveFrame(1)}>
            <SkipForward size={16} aria-hidden />
            +1f
          </Button>
          <label className="flex items-center gap-2 rounded-md border border-ink/10 bg-paper px-2 py-1 text-xs font-bold text-ink/70">
            <span>Speed</span>
            <select
              aria-label="Playback speed"
              className="bg-transparent text-sm font-semibold text-ink"
              value={playbackRate}
              onChange={(event) => setPlaybackRate(Number(event.target.value))}
            >
              <option value={0.5}>0.5x</option>
              <option value={0.75}>0.75x</option>
              <option value={1}>1x</option>
              <option value={1.25}>1.25x</option>
              <option value={1.5}>1.5x</option>
              <option value={2}>2x</option>
            </select>
          </label>
          <Button type="button" size="sm" variant="secondary" onClick={() => setZoom((value) => Math.max(1, Number((value - 0.25).toFixed(2))))}>
            <ZoomOut size={16} aria-hidden />
            Zoom-
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => setZoom((value) => Math.min(2.5, Number((value + 0.25).toFixed(2))))}>
            <ZoomIn size={16} aria-hidden />
            Zoom+
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize2 size={16} aria-hidden /> : <Maximize2 size={16} aria-hidden />}
            {isFullscreen ? "Exit full" : "Full"}
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={handleBookmark}>
            <BookmarkPlus size={16} aria-hidden />
            Add bookmark
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onUndo} disabled={!onUndo}>
            <Undo2 size={16} aria-hidden />
            Undo
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onRedo} disabled={!onRedo}>
            <Redo2 size={16} aria-hidden />
            Redo
          </Button>
          <Button type="button" size="sm" variant="secondary" onClick={onDeleteLatest} disabled={!onDeleteLatest}>
            <Trash2 size={16} aria-hidden />
            Delete
          </Button>
        </div>
        <div className="flex min-w-36 flex-1 items-center gap-3">
          <input
            aria-label="Video scrubber"
            className="w-full accent-moss"
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={(event) => seekToTime(Number(event.target.value))}
          />
          <span className="w-24 text-right text-xs font-bold text-ink/60">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>
        <div className="rounded-md border border-ink/10 bg-paper p-3">
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-ink/55">Timeline</p>
            <span className="text-xs font-semibold text-ink/60">{formatDuration(currentTime)}</span>
          </div>
          {timelineMarkers.length ? (
            <div className="flex flex-wrap gap-2">
              {timelineMarkers.map((marker) => (
                <button
                  key={`${marker.kind}-${marker.id}`}
                  type="button"
                  className="rounded-full border border-moss/20 bg-white px-2.5 py-1 text-xs font-semibold text-moss"
                  onClick={() => seekToTime(marker.time)}
                >
                  {marker.title}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm font-semibold text-ink/55">Add bookmarks or chapters to jump between key positions.</p>
          )}
        </div>
      </div>
    </div>
  );
}
