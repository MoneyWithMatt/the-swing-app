import { NextResponse } from "next/server";
import { getPilotEnv } from "@/lib/server/pilot-env";
import { createSignedUpload, supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser, isCoachUser } from "@/lib/server/supabase-auth";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/quicktime", "video/webm"]);

type SubmissionInput = {
  golferName?: string;
  golferEmail?: string;
  question?: string;
  cameraAngle?: "face_on" | "down_the_line";
  handedness?: "right" | "left";
  videoMimeType?: string;
  videoSizeBytes?: number;
  fileExtension?: string;
  faceOnVideoMimeType?: string;
  faceOnVideoSizeBytes?: number;
  faceOnFileExtension?: string;
  coachProfileId?: string;
  sport?: "golf";
};

function cleanExtension(value?: string) {
  const extension = (value || "mp4").toLowerCase().replace(/[^a-z0-9]/g, "");
  return extension || "mp4";
}

export async function POST(request: Request) {
  if (!getPilotEnv()) {
    return NextResponse.json({ error: "Pilot backend is not configured." }, { status: 503 });
  }

  try {
    const user = await getAuthenticatedUser();
    if (!user?.email || isCoachUser(user)) return NextResponse.json({ error: "Log in with a golfer account first." }, { status: 401 });
    const input = (await request.json()) as SubmissionInput;
    const golferName = (typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : input.golferName)?.trim();
    const golferEmail = user.email.toLowerCase();
    const question = input.question?.trim();
    const videoSizeBytes = Number(input.videoSizeBytes);
    const faceOnVideoSizeBytes = Number(input.faceOnVideoSizeBytes);
    const hasFaceOnVideo = Boolean(input.faceOnVideoMimeType || input.faceOnVideoSizeBytes || input.faceOnFileExtension);
    const coaches = input.coachProfileId ? await supabaseRest<Array<{ id: string; sports: string[] }>>(`/rest/v1/coach_profiles?id=eq.${encodeURIComponent(input.coachProfileId)}&active=eq.true&select=id,sports&limit=1`) : [];
    const coach = coaches[0];

    if (!golferName || !golferEmail || !question || !golferEmail.includes("@")) {
      return NextResponse.json({ error: "Name, email, and a focused question are required." }, { status: 400 });
    }
    if (question.length > 180) {
      return NextResponse.json({ error: "The question must be 180 characters or fewer." }, { status: 400 });
    }
    if (!input.cameraAngle || !input.handedness) {
      return NextResponse.json({ error: "Camera angle and handedness are required." }, { status: 400 });
    }
    if (!coach || input.sport !== "golf" || !coach.sports.includes("golf")) {
      return NextResponse.json({ error: "Choose an available coach first." }, { status: 400 });
    }
    if (!input.videoMimeType || !ALLOWED_VIDEO_TYPES.has(input.videoMimeType)) {
      return NextResponse.json({ error: "Upload an MP4, MOV, or WebM video." }, { status: 400 });
    }
    if (!Number.isFinite(videoSizeBytes) || videoSizeBytes < 1 || videoSizeBytes > MAX_VIDEO_BYTES) {
      return NextResponse.json({ error: "The pilot accepts videos up to 50 MB." }, { status: 400 });
    }
    if (hasFaceOnVideo && (!input.faceOnVideoMimeType || !ALLOWED_VIDEO_TYPES.has(input.faceOnVideoMimeType) || !Number.isFinite(faceOnVideoSizeBytes) || faceOnVideoSizeBytes < 1 || faceOnVideoSizeBytes > MAX_VIDEO_BYTES)) {
      return NextResponse.json({ error: "The Face On video must be an MP4, MOV, or WebM file up to 50 MB." }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const publicToken = crypto.randomUUID();
    const videoPath = `submissions/${id}/${input.cameraAngle === "down_the_line" ? "down-the-line" : "face-on"}.${cleanExtension(input.fileExtension)}`;
    const faceOnVideoPath = hasFaceOnVideo ? `submissions/${id}/face-on.${cleanExtension(input.faceOnFileExtension)}` : undefined;
    const signedUpload = await createSignedUpload(videoPath);
    const faceOnSignedUpload = faceOnVideoPath ? await createSignedUpload(faceOnVideoPath) : undefined;

    await supabaseRest<unknown[]>("/rest/v1/pilot_submissions", {
      method: "POST",
      prefer: "return=minimal",
      body: JSON.stringify({
        id,
        user_id: user.id,
        coach_profile_id: coach.id,
        sport: input.sport,
        public_token: publicToken,
        golfer_name: golferName,
        golfer_email: golferEmail,
        question,
        camera_angle: input.cameraAngle,
        handedness: input.handedness,
        video_path: videoPath,
        video_mime_type: input.videoMimeType,
        video_size_bytes: videoSizeBytes,
        face_on_video_path: faceOnVideoPath,
        face_on_video_mime_type: hasFaceOnVideo ? input.faceOnVideoMimeType : undefined,
        face_on_video_size_bytes: hasFaceOnVideo ? faceOnVideoSizeBytes : undefined
      })
    });

    return NextResponse.json({ id, publicToken, uploadUrl: signedUpload.url, faceOnUploadUrl: faceOnSignedUpload?.url });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "The submission could not be prepared." }, { status: 500 });
  }
}
