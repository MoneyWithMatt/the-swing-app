"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, FieldLabel, TextArea } from "@/components/ui/primitives";

export function PilotFulfilmentForm({ submissionId, initialSummary = "", initialDrills = [] }: {
  submissionId: string;
  initialSummary?: string | null;
  initialDrills?: string[] | null;
}) {
  const router = useRouter();
  const [summary, setSummary] = useState(initialSummary ?? "");
  const [drills, setDrills] = useState((initialDrills ?? []).join("\n"));
  const [status, setStatus] = useState("");
  const [sending, setSending] = useState(false);

  async function sendAnalysis() {
    setSending(true);
    setStatus("");
    const response = await fetch("/api/pilot/coach/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        submissionId,
        summary,
        drills: drills.split("\n").map((value) => value.trim()).filter(Boolean)
      })
    });
    const result = (await response.json()) as { error?: string };
    setSending(false);
    if (!response.ok) {
      setStatus(result.error || "The analysis could not be sent.");
      return;
    }
    router.push("/coach/pilot?sent=success");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-ink/10 bg-white p-5">
      <div>
        <FieldLabel>Matt&apos;s breakdown</FieldLabel>
        <TextArea value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Explain the main cause and the simplest correction." />
      </div>
      <div className="mt-4">
        <FieldLabel>Range drills (one per line)</FieldLabel>
        <TextArea value={drills} onChange={(event) => setDrills(event.target.value)} placeholder="Three slow rehearsals..." />
      </div>
      {status ? <p className="mt-3 text-sm font-bold text-moss">{status}</p> : null}
      <Button type="button" className="mt-4 w-full" disabled={sending || !summary.trim()} onClick={sendAnalysis}>
        {sending ? "Sending..." : "Send analysis and capture test £5"}
      </Button>
    </div>
  );
}
