import { NextResponse } from "next/server";
import { deleteStoredObjects, supabaseRest } from "@/lib/server/supabase-rest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExpiredVideo = {
  id: string;
  video_path: string;
  face_on_video_path?: string;
};

type ExpiredResult = {
  id: string;
  recording_path?: string;
};

function isAuthorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret && request.headers.get("authorization") === `Bearer ${secret}`);
}

export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const now = new Date().toISOString();
  const expiredVideos = await supabaseRest<ExpiredVideo[]>(
    `/rest/v1/pilot_submissions?video_deleted_at=is.null&video_expires_at=lte.${encodeURIComponent(now)}&select=id,video_path,face_on_video_path&limit=100`
  );
  const expiredResults = await supabaseRest<ExpiredResult[]>(
    `/rest/v1/pilot_submissions?result_deleted_at=is.null&result_expires_at=not.is.null&result_expires_at=lte.${encodeURIComponent(now)}&select=id,recording_path&limit=100`
  );
  const expiredWorkspaceVideos = await supabaseRest<ExpiredVideo[]>(
    `/rest/v1/coach_analyses?video_deleted_at=is.null&video_expires_at=lte.${encodeURIComponent(now)}&select=id,video_path&limit=100`
  );
  const expiredWorkspaceResults = await supabaseRest<ExpiredResult[]>(
    `/rest/v1/coach_analyses?result_deleted_at=is.null&result_expires_at=not.is.null&result_expires_at=lte.${encodeURIComponent(now)}&select=id,recording_path&limit=100`
  );

  let videosDeleted = 0;
  for (const submission of expiredVideos) {
    await deleteStoredObjects([submission.video_path, submission.face_on_video_path].filter(Boolean) as string[]);
    await supabaseRest(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ video_deleted_at: now })
    });
    videosDeleted += 1;
  }

  let resultsDeleted = 0;
  for (const submission of expiredResults) {
    if (submission.recording_path) {
      await deleteStoredObjects([submission.recording_path]);
    }
    await supabaseRest(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        recording_path: null,
        summary: null,
        drills: [],
        chapters: [],
        annotations: [],
        result_deleted_at: now
      })
    });
    resultsDeleted += 1;
  }

  let workspaceVideosDeleted = 0;
  for (const analysis of expiredWorkspaceVideos) {
    await deleteStoredObjects([analysis.video_path]);
    await supabaseRest(`/rest/v1/coach_analyses?id=eq.${encodeURIComponent(analysis.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ video_deleted_at: now })
    });
    workspaceVideosDeleted += 1;
  }

  let workspaceResultsDeleted = 0;
  for (const analysis of expiredWorkspaceResults) {
    if (analysis.recording_path) await deleteStoredObjects([analysis.recording_path]);
    await supabaseRest(`/rest/v1/coach_analyses?id=eq.${encodeURIComponent(analysis.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({ recording_path: null, result_deleted_at: now })
    });
    workspaceResultsDeleted += 1;
  }

  return NextResponse.json({ videosDeleted, resultsDeleted, workspaceVideosDeleted, workspaceResultsDeleted, ranAt: now });
}
