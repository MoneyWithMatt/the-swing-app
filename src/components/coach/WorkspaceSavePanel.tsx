"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Save } from "lucide-react";
import { Button, FieldLabel, SectionHeading, TextArea } from "@/components/ui/primitives";

export function WorkspaceSavePanel({ analysisId, initialSummary = "" }: { analysisId: string; initialSummary?: string }) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setSaving(true);
    setError("");
    try {
      const response = await fetch(`/api/coach/workspace/analyses/${analysisId}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary })
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "Analysis could not be saved.");
      router.push("/coach/workspace?saved=success");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis could not be saved.");
      setSaving(false);
    }
  }

  return (
    <aside className="h-fit rounded-lg border border-ink/10 bg-white p-4">
      <SectionHeading title="Record Summary" detail="Optional private notes to keep with this lesson." />
      <FieldLabel>Summary</FieldLabel>
      <TextArea className="mt-2" maxLength={4000} value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Key observations, priorities or drills..." />
      {error ? <p className="mt-3 text-sm font-bold text-clay">{error}</p> : null}
      <Button className="mt-4 w-full" type="button" disabled={saving} onClick={save}>
        <Save size={17} aria-hidden />
        {saving ? "Saving..." : "Save Analysis"}
      </Button>
      <p className="mt-3 text-xs leading-5 text-ink/50">Saving does not charge or email the student.</p>
    </aside>
  );
}
