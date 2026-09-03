import { NextResponse } from "next/server";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";
import { createSignedUpload, deleteStoredObjects, supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";

const MAX_RECORDING_BYTES = 50 * 1024 * 1024;

type RecordingConfig = {
  idField: "submissionId" | "analysisId";
  table: "pilot_submissions" | "coach_analyses";
  storageFolder: "results" | "workspace-results";
  notFoundMessage: string;
};

export async function handleCoachRecording(request: Request, config: RecordingConfig) {
  if (!(await isCoachAuthenticated())) {
    return NextResponse.json({ error: "Coach access required." }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const action = body.action as "prepare" | "confirm" | "delete" | undefined;
    const resourceId = body[config.idField] as string | undefined;
    const mimeType = body.mimeType as string | undefined;
    const sizeBytes = body.sizeBytes as number | undefined;
    const extension = body.extension as string | undefined;
    const recordingPath = body.recordingPath as string | undefined;
    if (!resourceId) return NextResponse.json({ error: "Analysis is required." }, { status: 400 });

    const user = await getAuthenticatedUser();
    const profile = user ? await getCoachProfile(user.id) : undefined;
    const owned = profile
      ? await supabaseRest<Array<{ id: string; recording_path?: string }>>(
          `/rest/v1/${config.table}?id=eq.${encodeURIComponent(resourceId)}&coach_profile_id=eq.${encodeURIComponent(profile.id)}&select=id,recording_path&limit=1`
        )
      : [];
    if (!owned.length) return NextResponse.json({ error: config.notFoundMessage }, { status: 404 });

    if (action === "delete") {
      if (owned[0].recording_path) await deleteStoredObjects([owned[0].recording_path]);
      await supabaseRest(`/rest/v1/${config.table}?id=eq.${encodeURIComponent(resourceId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ recording_path: null, result_expires_at: null, result_deleted_at: null })
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "confirm") {
      const expectedPrefix = `${config.storageFolder}/${resourceId}/analysis.`;
      if (!recordingPath?.startsWith(expectedPrefix)) {
        return NextResponse.json({ error: "Invalid recording confirmation." }, { status: 400 });
      }
      const folder = `${config.storageFolder}/${resourceId}`;
      const filename = recordingPath.slice(folder.length + 1);
      const objects = await supabaseRest<Array<{ id?: string | null; name?: string }>>(
        "/storage/v1/object/list/swing-videos",
        { method: "POST", body: JSON.stringify({ prefix: folder, limit: 10, offset: 0, search: filename }) }
      );
      if (!objects.some((object) => object.id && object.name === filename)) {
        return NextResponse.json({ error: "The recorded file is not present in private storage." }, { status: 409 });
      }
      await supabaseRest(`/rest/v1/${config.table}?id=eq.${encodeURIComponent(resourceId)}`, {
        method: "PATCH",
        prefer: "return=minimal",
        body: JSON.stringify({ recording_path: recordingPath, result_deleted_at: null })
      });
      return NextResponse.json({ ok: true });
    }

    if (!mimeType?.startsWith("video/") || !sizeBytes || sizeBytes > MAX_RECORDING_BYTES) {
      return NextResponse.json({ error: "Record a video up to 50 MB." }, { status: 400 });
    }
    const safeExtension = extension === "mp4" ? "mp4" : "webm";
    const preparedPath = `${config.storageFolder}/${resourceId}/analysis.${safeExtension}`;
    const signedUpload = await createSignedUpload(preparedPath, true);
    return NextResponse.json({ uploadUrl: signedUpload.url, recordingPath: preparedPath });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Recording could not be prepared." }, { status: 500 });
  }
}
