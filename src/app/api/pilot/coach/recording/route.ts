import { NextResponse } from "next/server";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { createSignedUpload, deleteStoredObjects, supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";

const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

export async function POST(request: Request) {
  if (!(await isCoachAuthenticated())) return NextResponse.json({ error: "Coach access required." }, { status: 401 });
  try {
    const { action, submissionId, mimeType, sizeBytes, extension, recordingPath } = (await request.json()) as {
      action?: "prepare" | "confirm" | "delete"; submissionId?: string; mimeType?: string; sizeBytes?: number; extension?: string; recordingPath?: string;
    };
    if (!submissionId) return NextResponse.json({ error: "Submission is required." }, { status: 400 });
    const user = await getAuthenticatedUser();
    const profile = user ? await getCoachProfile(user.id) : undefined;
    const owned = profile ? await supabaseRest<Array<{ id: string; recording_path?: string }>>(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submissionId)}&coach_profile_id=eq.${encodeURIComponent(profile.id)}&select=id,recording_path&limit=1`) : [];
    if (!owned.length) return NextResponse.json({ error: "Submission not found for this coach." }, { status: 404 });
    if (action === "delete") {
      if (owned[0].recording_path) await deleteStoredObjects([owned[0].recording_path]);
      await supabaseRest(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submissionId)}`, {
        method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ recording_path: null })
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "confirm") {
      const expectedPrefix = `results/${submissionId}/analysis.`;
      if (!submissionId || !recordingPath?.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: "Invalid recording confirmation." }, { status: 400 });
      }
      const folder = `results/${submissionId}`;
      const filename = recordingPath.slice(folder.length + 1);
      const objects = await supabaseRest<Array<{ id?: string | null; name?: string }>>(`/storage/v1/object/list/swing-videos`, {
        method: "POST",
        body: JSON.stringify({ prefix: folder, limit: 10, offset: 0, search: filename })
      });
      if (!objects.some((object) => object.id && object.name === filename)) {
        return NextResponse.json({ error: "The recorded file is not present in private storage." }, { status: 409 });
      }
      await supabaseRest(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submissionId)}`, {
        method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ recording_path: recordingPath })
      });
      return NextResponse.json({ ok: true });
    }
    if (!submissionId || !mimeType?.startsWith("video/") || !sizeBytes || sizeBytes > MAX_RECORDING_BYTES) {
      return NextResponse.json({ error: "Record a video up to 50 MB." }, { status: 400 });
    }
    const safeExtension = extension === "mp4" ? "mp4" : "webm";
    const preparedPath = `results/${submissionId}/analysis.${safeExtension}`;
    const signedUpload = await createSignedUpload(preparedPath, true);
    return NextResponse.json({ uploadUrl: signedUpload.url, recordingPath: preparedPath });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Recording could not be prepared." }, { status: 500 });
  }
}
