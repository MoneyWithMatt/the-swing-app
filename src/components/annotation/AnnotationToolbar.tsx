"use client";

import type { ComponentType } from "react";
import { Circle, MoveRight, PenLine, Ruler, Type } from "lucide-react";
import type { AnnotationType } from "@/lib/types";
import { Button, cn } from "@/components/ui/primitives";

const TOOLS: Array<{
  type: AnnotationType;
  label: string;
  icon: ComponentType<{ size?: number; "aria-hidden"?: boolean }>;
}> = [
  { type: "line", label: "Line", icon: PenLine },
  { type: "arrow", label: "Arrow", icon: MoveRight },
  { type: "circle", label: "Circle", icon: Circle },
  { type: "angle", label: "Angle", icon: Ruler },
  { type: "text", label: "Text", icon: Type }
];

export function AnnotationToolbar({
  activeTool,
  onSelectTool
}: {
  activeTool: AnnotationType;
  onSelectTool: (tool: AnnotationType) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" aria-label="Annotation tools">
      {TOOLS.map((tool) => {
        const Icon = tool.icon;
        return (
          <Button
            key={tool.type}
            type="button"
            title={tool.label}
            aria-label={tool.label}
            variant={activeTool === tool.type ? "primary" : "secondary"}
            size="icon"
            className={cn(activeTool === tool.type && "shadow-sm")}
            onClick={() => onSelectTool(tool.type)}
          >
            <Icon size={18} aria-hidden />
          </Button>
        );
      })}
    </div>
  );
}
