"use client";

import { useParams } from "next/navigation";
import { CoachPreviewPage } from "@/components/coach/CoachPreviewPage";

export default function Page() {
  const params = useParams<{ id: string }>();
  return <CoachPreviewPage id={params.id} />;
}
