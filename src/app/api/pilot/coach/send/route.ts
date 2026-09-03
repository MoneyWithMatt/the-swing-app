import { NextResponse } from "next/server";
import { isCoachAuthenticated } from "@/lib/server/coach-auth";
import { escapeEmailHtml, sendPilotEmail } from "@/lib/server/email";
import { requirePilotEnv } from "@/lib/server/pilot-env";
import { capturePaymentIntent } from "@/lib/server/stripe-rest";
import { deleteStoredObjects, supabaseRest } from "@/lib/server/supabase-rest";
import { getAuthenticatedUser } from "@/lib/server/supabase-auth";
import { getCoachProfile } from "@/lib/server/coach-profiles";

type Submission = {
  id: string;
  public_token: string;
  golfer_name: string;
  golfer_email: string;
  stripe_payment_intent_id?: string;
  payment_status: string;
  video_path: string;
  face_on_video_path?: string;
  video_deleted_at?: string;
  recording_path?: string;
};

export async function POST(request: Request) {
  if (!(await isCoachAuthenticated())) {
    return NextResponse.json({ error: "Coach access required." }, { status: 401 });
  }

  try {
    const { submissionId, summary, drills } = (await request.json()) as {
      submissionId?: string;
      summary?: string;
      drills?: string[];
    };
    if (!submissionId || !summary?.trim() || !Array.isArray(drills)) {
      return NextResponse.json({ error: "A summary and submission are required." }, { status: 400 });
    }
    const user = await getAuthenticatedUser();
    const profile = user ? await getCoachProfile(user.id) : undefined;
    if (!profile) return NextResponse.json({ error: "Coach profile required." }, { status: 403 });

    const submissions = await supabaseRest<Submission[]>(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submissionId)}&coach_profile_id=eq.${encodeURIComponent(profile.id)}&select=id,public_token,golfer_name,golfer_email,stripe_payment_intent_id,payment_status,video_path,face_on_video_path,video_deleted_at,recording_path&limit=1`);
    const submission = submissions[0];
    if (!submission) return NextResponse.json({ error: "Submission not found." }, { status: 404 });
    if (!submission.recording_path) return NextResponse.json({ error: "Save the recorded video response before sending the analysis." }, { status: 409 });
    const recordingFolder = submission.recording_path.slice(0, submission.recording_path.lastIndexOf("/"));
    const recordingFilename = submission.recording_path.slice(submission.recording_path.lastIndexOf("/") + 1);
    const recordingObjects = await supabaseRest<Array<{ id?: string | null; name?: string }>>(`/storage/v1/object/list/swing-videos`, {
      method: "POST",
      body: JSON.stringify({ prefix: recordingFolder, limit: 10, offset: 0, search: recordingFilename })
    });
    if (!recordingObjects.some((object) => object.id && object.name === recordingFilename)) {
      return NextResponse.json({ error: "The recorded video response has not finished uploading." }, { status: 409 });
    }

    let paymentStatus = submission.payment_status;
    if (submission.stripe_payment_intent_id && paymentStatus === "authorized") {
      const captured = await capturePaymentIntent(submission.stripe_payment_intent_id);
      paymentStatus = captured.status === "succeeded" ? "captured" : paymentStatus;
    }

    const sentAt = new Date();
    const resultExpiresAt = new Date(sentAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    await supabaseRest(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submission.id)}`, {
      method: "PATCH",
      prefer: "return=minimal",
      body: JSON.stringify({
        summary: summary.trim(),
        drills: drills.map((drill) => String(drill).trim()).filter(Boolean),
        status: "ready",
        payment_status: paymentStatus,
        sent_at: sentAt.toISOString(),
        video_expires_at: sentAt.toISOString(),
        result_expires_at: resultExpiresAt.toISOString()
      })
    });

    const env = requirePilotEnv();
    const golferName = escapeEmailHtml(submission.golfer_name);
    const coachName = escapeEmailHtml(profile.display_name);
    await sendPilotEmail({
      to: submission.golfer_email,
      subject: `Your swing analysis from ${profile.display_name} is ready`,
      html: `<p>Hi ${golferName},</p><p>${coachName} has returned your swing analysis.</p><p><a href="${env.appUrl}/request/${submission.public_token}">Watch and download your analysis</a></p><p>Your analysis video is available for 14 days, so please download it if you want to keep it.</p>`,
      idempotencyKey: `analysis-${submission.id}`
    });

    if (!submission.video_deleted_at) {
      try {
        await deleteStoredObjects([submission.video_path, submission.face_on_video_path].filter(Boolean) as string[]);
        await supabaseRest(`/rest/v1/pilot_submissions?id=eq.${encodeURIComponent(submission.id)}`, {
          method: "PATCH",
          prefer: "return=minimal",
          body: JSON.stringify({ video_deleted_at: new Date().toISOString() })
        });
      } catch (deletionError) {
        // Delivery should not fail because cleanup can be retried by the daily job.
        console.error("Original video cleanup will be retried.", deletionError);
      }
    }

    return NextResponse.json({ ok: true, paymentStatus });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Analysis could not be sent." }, { status: 500 });
  }
}
