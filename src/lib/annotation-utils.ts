import type { Annotation, AnnotationStyle, AnnotationType, NormalizedGeometry, Point } from "./types";

export const PERSISTENT_ANNOTATION_END = 60 * 60;
const FRAME_VISIBILITY_GRACE_SECONDS = 0.12;

export const TOOL_STYLES: Record<AnnotationType, AnnotationStyle> = {
  draw: { stroke: "#f2b84b", strokeWidth: 5 },
  line: { stroke: "#f2b84b", strokeWidth: 5 },
  arrow: { stroke: "#f2b84b", strokeWidth: 5 },
  circle: { stroke: "#5ba86c", fill: "rgba(91, 168, 108, 0.12)", strokeWidth: 4 },
  angle: { stroke: "#c96f4a", strokeWidth: 5 },
  text: { stroke: "#17211b", fill: "#fbfcf8", strokeWidth: 2 }
};

export function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

export function normalizePoint(point: Point, width: number, height: number): Point {
  return {
    x: clamp01(point.x / Math.max(width, 1)),
    y: clamp01(point.y / Math.max(height, 1))
  };
}

export function denormalizePoint(point: Point, width: number, height: number): Point {
  return {
    x: point.x * width,
    y: point.y * height
  };
}

export function colorWithAlpha(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const value = Number.parseInt(clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean, 16);
  if (!Number.isFinite(value)) {
    return `rgba(91, 168, 108, ${alpha})`;
  }

  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function styleForTool(type: AnnotationType, color: string, strokeWidth: number): AnnotationStyle {
  if (type === "text") {
    return { stroke: color, fill: "#fbfcf8", strokeWidth: 2 };
  }

  if (type === "circle") {
    return { stroke: color, fill: colorWithAlpha(color, 0.14), strokeWidth };
  }

  return { stroke: color, strokeWidth };
}

export function geometryFromPoints(type: AnnotationType, start: Point, end: Point): NormalizedGeometry {
  if (type === "angle") {
    return {
      x1: start.x,
      y1: start.y,
      x2: end.x,
      y2: start.y,
      x3: end.x,
      y3: end.y
    };
  }

  return {
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y
  };
}

export function annotationVisibleAt(annotation: Annotation, time: number) {
  return time + FRAME_VISIBILITY_GRACE_SECONDS >= annotation.timeStart && time <= annotation.timeEnd;
}

export function roundedTime(seconds: number) {
  return Math.max(0, Math.round(seconds * 10) / 10);
}
