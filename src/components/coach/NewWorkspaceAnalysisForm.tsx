"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { SwingVideoUpload, type SelectedSwingVideo } from "@/components/golfer/SwingVideoUpload";
import { Button, FieldLabel, TextInput } from "@/components/ui/primitives";

export function NewWorkspaceAnalysisForm() {
  const router = useRouter();
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [title, setTitle] = useState("");
  const [selectedVideo, setSelectedVideo] = useState<SelectedSwingVideo>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedVideo) {
      setError("Choose a swing video first.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      const extension = selectedVideo.file.name.split(".").pop() || "mp4";
      const response = await fetch("/api/coach/workspace/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentName,
          studentEmail,
          title,
          videoMimeType: selectedVideo.file.type || "video/mp4",
          videoSizeBytes: selectedVideo.file.size,
          fileExtension: extension
        })
      });
      const prepared = (await response.json()) as { id?: string; uploadUrl?: string; error?: string };
      if (!response.ok || !prepared.id || !prepared.uploadUrl) throw new Error(prepared.error || "Analysis could not be created.");
      const token = new URL(prepared.uploadUrl).searchParams.get("token");
      if (!token) throw new Error("The video upload could not be authorised.");
      const upload = await fetch(prepared.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": selectedVideo.file.type || "video/mp4", Authorization: `Bearer ${token}`, "x-upsert": "false" },
        body: selectedVideo.file
      });
      if (!upload.ok) throw new Error((await upload.text()) || "The video did not finish uploading.");
      router.push(`/coach/workspace/${prepared.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Analysis could not be created.");
      setSubmitting(false);
    }
  }

  return (
    <form className="mx-auto max-w-2xl space-y-5 rounded-lg border border-ink/10 bg-white p-5" onSubmit={submit}>
      <div>
        <FieldLabel>Student name</FieldLabel>
        <TextInput className="mt-2" value={studentName} maxLength={100} required onChange={(event) => setStudentName(event.target.value)} placeholder="e.g. Elliot Gower" />
      </div>
      <div>
        <FieldLabel>Student email (optional)</FieldLabel>
        <TextInput className="mt-2" type="email" value={studentEmail} maxLength={320} onChange={(event) => setStudentEmail(event.target.value)} placeholder="student@example.com" />
        <p className="mt-2 text-xs font-semibold text-ink/50">This is stored with the analysis only. No email will be sent.</p>
      </div>
      <div>
        <FieldLabel>Lesson / analysis label (optional)</FieldLabel>
        <TextInput className="mt-2" value={title} maxLength={120} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. September lesson" />
      </div>
      <SwingVideoUpload label="Swing video" detail="Upload the video you want to analyse during or after the lesson." recommended onChange={setSelectedVideo} />
      {error ? <p className="rounded-md border border-clay/30 bg-clay/10 p-3 text-sm font-bold text-clay">{error}</p> : null}
      <Button className="w-full" type="submit" disabled={submitting}>
        {submitting ? "Uploading video..." : "Open analysis"}
        {!submitting ? <ArrowRight size={17} aria-hidden /> : null}
      </Button>
    </form>
  );
}
