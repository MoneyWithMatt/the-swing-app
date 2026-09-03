import { NextResponse } from "next/server";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";
import { createSignedUpload, supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await isCoachAuthenticated())) return NextResponse.json({ error: "Coach access required." }, { status: 401 });
  try {
    const { studentName, studentEmail, title, videoMimeType, videoSizeBytes, fileExtension } = (await request.json()) as {
      studentName?: string;
      studentEmail?: string;
      title?: string;
      videoMimeType?: string;
      videoSizeBytes?: number;
      fileExtension?: string;
    };
    const cleanName = studentName?.trim();
    const cleanEmail = studentEmail?.trim().toLowerCase() || null;
    const cleanTitle = title?.trim() || null;
    if (!cleanName || cleanName.length > 100) return NextResponse.json({ error: "Enter the student's name." }, { status: 400 });
    if (cleanEmail && (cleanEmail.length > 320 || !cleanEmail.includes("@"))) return NextResponse.json({ error: "Enter a valid student email or leave it blank." }, { status: 400 });
    if (cleanTitle && cleanTitle.length > 120) return NextResponse.json({ error: "Keep the lesson title under 120 characters." }, { status: 400 });
    if (!videoMimeType?.startsWith("video/") || !videoSizeBytes || videoSizeBytes > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "Choose a video up to 50 MB." }, { status: 400 });
    }
    const user = await getAuthenticatedUser();
    const profile = user ? await getCoachProfile(user.id) : undefined;
    if (!profile) return NextResponse.json({ error: "Coach profile required." }, { status: 403 });
    const analysisId = crypto.randomUUID();
    const safeExtension = (fileExtension || "mp4").replace(/[^a-z0-9]/gi, "").toLowerCase().slice(0, 8) || "mp4";
    const videoPath = `workspace/${profile.id}/${analysisId}/source.${safeExtension}`;
    await supabaseRest("/rest/v1/coach_analyses", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        id: analysisId,
        coach_profile_id: profile.id,
        student_name: cleanName,
        student_email: cleanEmail,
        title: cleanTitle,
        video_path: videoPath,
        video_mime_type: videoMimeType,
        video_size_bytes: videoSizeBytes
      })
    });
    const signedUpload = await createSignedUpload(videoPath);
    return NextResponse.json({ id: analysisId, uploadUrl: signedUpload.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Private analysis could not be created." }, { status: 500 });
  }
}
