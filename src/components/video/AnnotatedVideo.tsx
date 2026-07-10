"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Ellipse, Group, Label, Layer, Line, Rect, Stage, Tag, Text } from "react-konva";
import { Pause, Play } from "lucide-react";
import {
  annotationVisibleAt,
  denormalizePoint,
  geometryFromPoints,
  normalizePoint,
  roundedTime,
  TOOL_STYLES
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
  annotationDuration?: number;
  onAddAnnotation?: (annotation: Omit<Annotation, "id">) => void;
  onTimeChange?: (time: number) => void;
  seekRequest?: SeekRequest;
  readOnly?: boolean;
  showAllAnnotations?: boolean;
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

function AnnotationShape({ annotation, size }: { annotation: Annotation; size: Size }) {
  const { first, second, third } = shapePoints(annotation, size);
  const stroke = annotation.style.stroke;
  const strokeWidth = annotation.style.strokeWidth;

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
  annotationDuration = 4,
  onAddAnnotation,
  onTimeChange,
  seekRequest,
  readOnly = false,
  showAllAnnotations = false,
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

  const visibleAnnotations = useMemo(() => {
    if (showAllAnnotations) {
      return annotations;
    }

    return annotations.filter((annotation) => annotationVisibleAt(annotation, currentTime));
  }, [annotations, currentTime, showAllAnnotations]);

  function handleTimeUpdate() {
    const nextTime = videoRef.current?.currentTime ?? 0;
    setCurrentTime(nextTime);
    onTimeChange?.(nextTime);
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

  function handlePointerDown(event: StagePointerEvent) {
    if (readOnly || !activeTool || !onAddAnnotation || !submissionId) {
      return;
    }

    const stage = event.target.getStage();
    const start = getPointer(stage, size);
    if (!start) {
      return;
    }

    const timeStart = roundedTime(videoRef.current?.currentTime ?? currentTime);
    const baseAnnotation = {
      submissionId,
      type: activeTool,
      timeStart,
      timeEnd: roundedTime(timeStart + annotationDuration),
      style: TOOL_STYLES[activeTool],
      normalizedGeometry: geometryFromPoints(activeTool, start, start)
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
    const dx = Math.abs((geometry.x2 ?? geometry.x1) - geometry.x1);
    const dy = Math.abs((geometry.y2 ?? geometry.y1) - geometry.y1);
    if (dx + dy > 0.02) {
      onAddAnnotation(draft);
    }

    setDragStart(null);
    setDraft(null);
  }

  return (
    <div className={cn("overflow-hidden rounded-lg border border-ink/10 bg-ink shadow-soft", className)}>
      <div ref={wrapperRef} className="relative aspect-video w-full bg-black">
        <video
          ref={videoRef}
          className="h-full w-full object-contain"
          src={videoUrl}
          poster={posterUrl}
          playsInline
          controls={false}
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
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
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-3 py-3">
        <Button type="button" size="sm" variant="secondary" onClick={togglePlayback}>
          {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
          {playing ? "Pause" : "Play"}
        </Button>
        <div className="flex min-w-36 flex-1 items-center gap-3">
          <input
            aria-label="Video scrubber"
            className="w-full accent-moss"
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={(event) => {
              const nextTime = Number(event.target.value);
              if (videoRef.current) {
                videoRef.current.currentTime = nextTime;
              }
              setCurrentTime(nextTime);
            }}
          />
          <span className="w-24 text-right text-xs font-bold text-ink/60">
            {formatDuration(currentTime)} / {formatDuration(duration)}
          </span>
        </div>
      </div>
    </div>
  );
}
