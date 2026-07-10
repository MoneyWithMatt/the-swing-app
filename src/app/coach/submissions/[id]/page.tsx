"use client";

import { useParams } from "next/navigation";
import { CoachWorkspacePage } from "@/components/coach/CoachWorkspacePage";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <CoachWorkspacePage id={params.id} />;
}
